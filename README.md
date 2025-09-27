# ServerGCKB

ServerGCKB is a Node.js server application designed to display fullscreen images and videos from sharepoint folders, with support for real-time updates. Ideal for digital signage solutions, this project allows instant reflection of changes in the folders on display screens.
This project was originally developed for a job on the Hive 2025, and then adapted for sharepoint usage on the signage screens of GCKB. For more information contact jonas.nijs@verto.be

Additionally the servers hosts the timetable with the bookings, that refreshes every minute.
## Features

- Shows images or videos from specified folders in fullscreen mode.
- Real-time updates: changes (additions, deletions, or modifications) in image folders are automatically reflected.
- Supports multiple display clients.
- Simple configuration and deployment.
- Timetable endpoint that refreshes every minute

## Tech Stack

- **Node.js**
- **Express** for HTTP server.
- **Socket.io** for real-time communication.
- **Chokidar** for efficient file watching.
- **Nodemon** for development.

## How to run
```
- npm run start
```

## Usage
Once the server is running, you can access it by going to the URL.

[http://localhost:3000/folder={folder-to-watch}&time={time-to-show-image}](http://localhost:3000/folder={folder-to-watch}&time={time-to-show-image})
[http://localhost:3000/TimeTable](http://localhost:3000/TimeTable})

### Parameters:
- **folder**: The folder to watch, relative to the node.JS server file
- **time**(optional): The time to show each image. defaults to 5 seconds

## Setting up on ubuntu
```
git clone https://github.com/NijsJonas/ServerGCKB.git
sudo apt-get install nodejs
sudo apt-get install npm
```
```
cd ServerGCKB
sudo npm i
```
```
sudo rm -rf /var/lib/dpkg/lock-frontend
sudo rm -rf /var/lib/dpkg/lock
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get dist-upgrade -y
sudo apt-get autoremove -y
sudo apt-get autoclean -y
```
```
wget -qO - https://download.opensuse.org/repositories/home:/npreining:/debian-ubuntu-onedrive/xUbuntu_25.04/Release.key | gpg --dearmor | sudo tee /usr/share/keyrings/obs-onedrive.gpg > /dev/null
```
```
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/obs-onedrive.gpg] https://download.opensuse.org/repositories/home:/npreining:/debian-ubuntu-onedrive/xUbuntu_25.04/ ./" | sudo tee /etc/apt/sources.list.d/onedrive.list
```
```
sudo apt install --no-install-recommends --no-install-suggests onedrive
```
```
onedrive --get-sharepoint-drive-id 'TEST'
```
```
mkdir ~/.config/GCKBSharepoint
mkdir ~/GCKBSharepoint
```
```
wget https://raw.githubusercontent.com/abraunegg/onedrive/master/config -O ~/.config/GCKBSharepoint/config
```
config bestand aanpassen:
- sync_dir = "~/GCKBSharepoint"
- drive_id = "insert the drive_id value from above here"
```
sudo reboot
```
```
onedrive --confdir="~/.config/GCKBSharepoint" --synchronize --verbose
onedrive --confdir="~/.config/GCKBSharepoint" --synchronize --verbose --dry-run
```
```
sudo cp /lib/systemd/system/onedrive@.service /lib/systemd/system/onedrive-GCKBSharepoint@.service
```
```
sudo nano /lib/systemd/system/onedrive-GCKBSharepoint@.service
```
ExecStart lijn aapassen:
- --confdir="/home/gckb/.config/GCKBSharepoint"
```
sudo systemctl enable --now onedrive-GCKBSharepoint@gckb.service
sudo systemctl start onedrive-GCKBSharepoint@gckb.service
```
OPTIONAL: checken: systemctl status onedrive-GCKBSharepoint@gckb.service
```
sudo loginctl enable-linger gckb
```
This deployment is build based on the default repository:
[https://github.com/abraunegg/onedrive/blob/master/docs/sharepoint-libraries.md](https://github.com/abraunegg/onedrive/blob/master/docs/sharepoint-libraries.md)