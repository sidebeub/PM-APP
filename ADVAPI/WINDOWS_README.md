# ADVAPI Windows Application

This document explains how to package and distribute this application as a Windows executable.

## Prerequisites

- Node.js 14 or later
- npm 6 or later
- pkg (installed as a dev dependency)
- A Windows environment for testing the final executable (or Wine on Linux/macOS)

## Packaging Instructions

1. Ensure all dependencies are installed:
   ```
   npm install
   ```

2. Create a `.env` file with your configuration settings (if not already done)

3. Build the Windows application:
   ```
   npm run build:win
   ```

4. The executable and all necessary files will be created in the `dist` folder.

## Distributing the Application

When distributing the application, include the entire `dist` folder contents:

- `advapi.exe` - The main executable
- `public/` - Static files (HTML, CSS, JavaScript, images)
- `src/` - Application source files
- `uploads/` - Directory for uploaded files
- `data/` - Data files
- `.env` - Configuration file (may need to be created for each installation)
- `start-advapi.bat` - Startup script that launches the app and opens the browser
- `setup.bat` - Setup script that creates desktop and startup shortcuts

## Installation for End Users

1. Copy the entire `dist` folder to the desired location on the Windows machine
2. Run `setup.bat` to create desktop shortcuts
3. The setup script will ask if you want ADVAPI to start automatically with Windows

## Running the Application

### Option 1: Standard Mode (Hidden Window)
1. Double-click on the ADVAPI desktop shortcut (created by setup.bat) or `start-advapi.bat`
2. Your default web browser will automatically open to http://localhost:3002/db-login.html
3. The application runs in the background with no visible command window

**Note:** In this mode, to stop the application, you'll need to use Task Manager to end the 'advapi.exe' process.

### Option 2: System Tray Controller (Recommended)
1. Double-click on the "ADVAPI Tray" desktop shortcut (also created by setup.bat) or `ADVAPI_with_tray.bat`
2. A system tray icon will appear in the bottom-right corner of your screen
3. Right-click the icon to:
   - Start the ADVAPI server
   - Stop the ADVAPI server (shutdown properly)
   - Open the login page in your browser
   - Exit the tray controller

**Benefits of Using the Tray Controller:**
- Easily see if the server is running
- Properly shut down the server when done without using Task Manager
- Quickly access the login page anytime
- No additional software required (uses built-in Windows HTA technology)

### Auto-Shutdown Feature

For safety, the server includes an automatic shutdown feature:
- The server will automatically shut down after 3 hours of inactivity
- Activity is detected whenever anyone accesses any page or API endpoint
- This prevents servers from running indefinitely if users forget to stop them
- The server will restart automatically next time a user clicks the shortcut

## Configuration

Edit the `.env` file in the `dist` folder to configure:

- Port number (default: 3002)
- Database connection settings
- APS (Autodesk Platform Services) credentials
- Other environment-specific settings

## Troubleshooting

1. **Port already in use**: Edit the `.env` file to use a different port

2. **Database connection issues**: Verify PostgreSQL is running and accessible with the credentials in `.env`

3. **Virus scanner warnings**: This can happen with pkg-packaged apps. You may need to add an exception in your antivirus software.

4. **Missing files**: Ensure all necessary files were copied to the `dist` folder.

## Windows-Specific Notes

- The application runs its own web server, so no additional server software is needed
- The application will open a command prompt window when running (this is normal)
- To run the application at startup, create a shortcut in the Windows Startup folder