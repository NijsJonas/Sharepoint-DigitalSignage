# Sharepoint-DigitalSignage

Sharepoint-DigitalSignage is a Node.js server application designed to display fullscreen images and videos from sharepoint folders, with support for real-time updates. Ideal for digital signage solutions, this project allows instant reflection of changes in the folders on display screens.

This project was originally developed for a job on the Hive 2025, and then adapted for sharepoint usage on the signage screens of Verto Puurs. For more information contact jonas.nijs@verto.be

## Features

- Shows images or videos from specified folders in fullscreen mode.
- Real-time updates: changes (additions, deletions, or modifications) in image folders are automatically reflected.
- Supports multiple display clients.
- Simple configuration and deployment.

## Tech Stack

- **Node.js**
- **Express** for HTTP server.
- **Socket.io** for real-time communication.
- **Chokidar** for efficient file watching.
- **Nodemon** for development.

## How to run
```
npm run start
```

## Usage
Once the server is running, you can access it by going to the URL.

[http://localhost:3000/folder={folder-to-watch}&time={time-to-show-image}](http://localhost:3000/folder={folder-to-watch}&time={time-to-show-image})

### Parameters:
- **folder**: The folder to watch, relative to the node.JS server file
- **time**(optional): The time to show each image. defaults to 5 seconds
