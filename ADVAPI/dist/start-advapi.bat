@echo off
echo Starting ADVAPI application...
echo The application will start in hidden mode.
echo Browser will open automatically to the login page.
echo.
echo If you need to stop the application, use Task Manager to end 'advapi.exe'
timeout /t 3 /nobreak > nul
start "" wscript.exe "%~dp0start-hidden.vbs" "%~dp0advapi.exe"