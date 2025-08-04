# ADVAPI Tray Controller

This folder contains an optional system tray controller for ADVAPI (`ADVAPI_Controller.ahk`). This is an AutoHotkey script that allows you to:

1. Start ADVAPI silently in the background
2. Stop ADVAPI when needed
3. Quickly open the ADVAPI login page
4. Control ADVAPI from the system tray icon

## Installation Requirements

To use the tray controller, you need to install AutoHotkey:

1. Download AutoHotkey from https://www.autohotkey.com/
2. Install AutoHotkey on your system
3. Double-click the ADVAPI_Controller.ahk file to run it

## Using the Tray Controller

Once running, you'll see a small green "H" icon in your system tray. Right-click this icon to:

- Open ADVAPI: Opens the login page in your browser
- Start ADVAPI: Starts the server in the background (if not already running)
- Stop ADVAPI: Stops the server
- Exit: Exits the tray controller

## Creating a Compiled Executable

If you want to distribute this without requiring AutoHotkey installation:

1. Right-click on ADVAPI_Controller.ahk
2. Select "Compile Script" (if you have AutoHotkey installed)
3. This will create ADVAPI_Controller.exe
4. Distribute this exe file instead of the .ahk script

## Automatic Startup

To have the controller start with Windows:

1. Press Win+R to open the Run dialog
2. Type `shell:startup` and press Enter
3. Copy a shortcut to ADVAPI_Controller.ahk (or .exe) into this folder

This will launch the tray controller whenever Windows starts.