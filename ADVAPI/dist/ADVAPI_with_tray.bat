@echo off
echo Starting ADVAPI with system tray controller...
echo This will create a system tray icon to control the ADVAPI server.
echo.
echo Right-click on the system tray icon to:
echo - Start the server
echo - Stop the server
echo - Open the login page
echo - Exit the application
echo.

start "" mshta.exe "%~dp0tray_controller.hta"
timeout /t 2 /nobreak > nul

echo System tray controller started.
echo You can now use the system tray icon (bottom right of your screen) to control ADVAPI.
echo.