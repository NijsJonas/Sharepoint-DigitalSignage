const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Store watchers for each folder
const folderWatchers = new Map();
const folderImages = new Map();

// Supported media extensions
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv'];

// Serve static files (images)
app.use('/images', express.static('.'));

// Function to get media files from a folder
function getMediaFromFolder(folderPath) {
    try {
        if (!fs.existsSync(folderPath)) {
            return [];
        }

        const files = fs.readdirSync(folderPath);
        return files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return imageExtensions.includes(ext) || videoExtensions.includes(ext);
            })
            .map(file => {
                const ext = path.extname(file).toLowerCase();
                const isVideo = videoExtensions.includes(ext);
                return {
                    path: `/images/${folderPath}/${file}`,
                    type: isVideo ? 'video' : 'image'
                };
            })
            .sort((a, b) => a.path.localeCompare(b.path)); // Sort for consistent order
    } catch (error) {
        console.error(`Error reading folder ${folderPath}:`, error);
        return [];
    }
}

// Function to setup folder watcher
function setupFolderWatcher(folderPath) {
    if (folderWatchers.has(folderPath)) {
        return; // Already watching this folder
    }

    console.log(`Setting up watcher for folder: ${folderPath}`);

    // Initial scan
    const media = getMediaFromFolder(folderPath);
    folderImages.set(folderPath, media);

    // Create watcher
    const watcher = chokidar.watch(folderPath, {
        ignored: /^\./,
        persistent: true,
        ignoreInitial: true
    });

    watcher
        .on('add', () => updateFolderImages(folderPath))
        .on('unlink', () => updateFolderImages(folderPath))
        .on('change', () => updateFolderImages(folderPath))
        .on('error', error => console.error(`Watcher error for ${folderPath}:`, error));

    folderWatchers.set(folderPath, watcher);
}

// Function to update folder media and notify clients
function updateFolderImages(folderPath) {
    const media = getMediaFromFolder(folderPath);
    folderImages.set(folderPath, media);

    console.log(`Updated media for ${folderPath}:`, media);

    // Notify all clients watching this folder
    io.emit('mediaUpdated', { folder: folderPath, media });
}

// Main route
app.get('/', (req, res) => {
    const folder = req.query.folder;

    if (!folder) {
        return res.status(400).send('Missing folder parameter');
    }

    // Setup watcher for this folder if not already watching
    setupFolderWatcher(folder);

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fullscreen Image Display</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body, html {
            height: 100%;
            overflow: hidden;
            background: #000;
            font-family: Arial, sans-serif;
        }
        
        #imageContainer {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #000;
        }
        
        #mainImage, #mainVideo {
            max-width: 100vw;
            max-height: 100vh;
            object-fit: contain;
            display: block;
        }
        
        #loadingMessage {
            color: white;
            font-size: 24px;
            text-align: center;
        }
        
        #connectionStatus {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 5px 10px;
            border-radius: 5px;
            color: white;
            font-size: 12px;
            z-index: 1000;
        }
        
        .connected {
            background: rgba(0, 255, 0, 0.7);
        }
        
        .disconnected {
            background: rgba(255, 0, 0, 0.7);
        }
    </style>
</head>
<body>
    <div id="connectionStatus" class="connected">Connected</div>
    <div id="imageContainer">
        <div id="loadingMessage">Loading media...</div>
        <img id="mainImage" style="display: none;" alt="Fullscreen Image">
        <video id="mainVideo" style="display: none;" muted autoplay loop>
            Your browser does not support the video tag.
        </video>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const folder = '${folder}';
        let media = [];
        let currentIndex = 0;
        let slideInterval;
        let lastLoadedMedia = null;
        let videoTimeout;
        
        const imageElement = document.getElementById('mainImage');
        const videoElement = document.getElementById('mainVideo');
        const loadingMessage = document.getElementById('loadingMessage');
        const connectionStatus = document.getElementById('connectionStatus');
        
        // Connection status
        socket.on('connect', () => {
            connectionStatus.textContent = 'Connected';
            connectionStatus.className = 'connected';
            console.log('Connected to server');
            
            // Request initial media for this folder
            socket.emit('requestMedia', folder);
        });
        
        socket.on('disconnect', () => {
            connectionStatus.textContent = 'Disconnected - Showing last image';
            connectionStatus.className = 'disconnected';
            console.log('Disconnected from server');
            
            // Keep showing the last loaded media
            if (lastLoadedMedia) {
                showMedia(lastLoadedMedia);
            }
        });
        
        // Listen for media updates
        socket.on('mediaUpdated', (data) => {
            if (data.folder === folder) {
                console.log('Media updated:', data.media);
                media = data.media;
                currentIndex = 0;
                startSlideshow();
            }
        });
        
        // Initial media response
        socket.on('initialMedia', (data) => {
            if (data.folder === folder) {
                console.log('Initial media:', data.media);
                media = data.media;
                currentIndex = 0;
                startSlideshow();
            }
        });
        
        function scheduleNextMedia() {
            if (media.length <= 1) return; // Don't schedule if only one item
            
            const currentMedia = media[currentIndex];
            if (currentMedia.type === 'image') {
                // For images, wait 5 seconds
                if (slideInterval) clearTimeout(slideInterval);
                slideInterval = setTimeout(() => {
                    nextMedia();
                }, 5000);
            }
            // For videos, timing is handled in showMedia() when video loads
        }
        
        function showMedia(mediaItem) {
            if (!mediaItem) return;
            
            // Hide both elements first
            imageElement.style.display = 'none';
            videoElement.style.display = 'none';
            
            // Clear any existing timeouts/intervals
            if (videoTimeout) {
                clearTimeout(videoTimeout);
                videoTimeout = null;
            }
            if (slideInterval) {
                clearTimeout(slideInterval);
                slideInterval = null;
            }
            
            if (mediaItem.type === 'video') {
                videoElement.onloadeddata = () => {
                    loadingMessage.style.display = 'none';
                    videoElement.style.display = 'block';
                    lastLoadedMedia = mediaItem;
                    
                    // Set timeout for video duration + 1 second buffer, but only if there are multiple items
                    if (media.length > 1) {
                        const duration = videoElement.duration * 1000 + 1000; // Convert to ms and add buffer
                        videoTimeout = setTimeout(() => {
                            nextMedia();
                        }, duration);
                    }
                };
                
                videoElement.onerror = () => {
                    console.error('Failed to load video:', mediaItem.path);
                    nextMedia();
                };
                
                videoElement.src = mediaItem.path;
                videoElement.load();
            } else {
                imageElement.onload = () => {
                    loadingMessage.style.display = 'none';
                    imageElement.style.display = 'block';
                    lastLoadedMedia = mediaItem;
                    
                    // Schedule next media for images
                    scheduleNextMedia();
                };
                
                imageElement.onerror = () => {
                    console.error('Failed to load image:', mediaItem.path);
                    nextMedia();
                };
                
                imageElement.src = mediaItem.path;
            }
        }
        
        function nextMedia() {
            if (media.length === 0) return;
            
            currentIndex = (currentIndex + 1) % media.length;
            showMedia(media[currentIndex]);
        }
        
        function startSlideshow() {
            // Clear existing interval
            if (slideInterval) {
                clearInterval(slideInterval);
            }
            
            if (media.length === 0) {
                loadingMessage.textContent = 'No images found in folder';
                loadingMessage.style.display = 'block';
                imageElement.style.display = 'none';
                return;
            }
            
            // Show first image immediately
            showMedia(media[currentIndex]);
            
            // Only set interval if there are multiple images
            if (media.length > 1) {
                
                if (slideInterval) {
                    clearInterval(slideInterval);
                }
                slideInterval = setInterval(nextMedia, 5000); // 5 seconds
            }
        }
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (slideInterval) {
                    clearInterval(slideInterval);
                }
            } else {
                if (media.length > 1) {
                    if (slideInterval) {
                        clearInterval(slideInterval);
                    }
                    slideInterval = setInterval(nextMedia, 5000);
                }
            }
        });
    </script>
</body>
</html>
    `);
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle request for initial media
    socket.on('requestMedia', (folder) => {
        console.log(`Client ${socket.id} requesting media for folder: ${folder}`);

        // Setup watcher if not already watching
        setupFolderWatcher(folder);

        // Send current media
        const media = folderImages.get(folder) || [];
        socket.emit('initialMedia', { folder, media });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Cleanup watchers on process exit
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    folderWatchers.forEach((watcher, folder) => {
        console.log(`Closing watcher for folder: ${folder}`);
        watcher.close();
    });
    process.exit(0);
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Usage: http://localhost:${PORT}?folder=your-folder-name');
});