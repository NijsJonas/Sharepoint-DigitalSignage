const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Store watchers for each folder
const folderWatchers = new Map();
const folderImages = new Map();

const getMediaFromFolder = require("./Functions/getMediaFromFolder")

// Serve static files (images)
app.use('/images', express.static(process.env.FOLDER_LOCATION));
console.log(`Serving images from ${process.env.FOLDER_LOCATION}`);
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
    const watcher = chokidar.watch(process.env.FOLDER_LOCATION+folderPath, {
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
    if (!folder) return res.status(400).send('Missing folder parameter');

    setupFolderWatcher(folder);

    const htmlPath = path.join(__dirname, 'Public', 'index.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Could not load page');
        const finalHtml = html.replace('{{FOLDER_PLACEHOLDER}}', folder);
        res.send(finalHtml);
    });
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