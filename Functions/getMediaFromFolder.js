const fs = require("fs");
const path = require("path");

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

const getMediaFromFolder = (folderPath) => {
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

module.exports = getMediaFromFolder;