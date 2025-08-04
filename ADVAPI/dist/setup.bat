@echo off
echo ===================================
echo ADVAPI Application Setup
echo ===================================
echo.

echo Creating desktop shortcut...
echo.

set SCRIPT="%TEMP%\%RANDOM%-%RANDOM%-%RANDOM%-%RANDOM%.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") >> %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\ADVAPI.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%~dp0start-advapi.bat" >> %SCRIPT%
echo oLink.WorkingDirectory = "%~dp0" >> %SCRIPT%
echo oLink.Description = "ADVAPI Application" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
if exist %SCRIPT% del %SCRIPT%

echo Desktop shortcut created!
echo.

echo Creating system tray controller shortcut...
set SCRIPT3="%TEMP%\%RANDOM%-%RANDOM%-%RANDOM%-%RANDOM%.vbs"
echo Set oWS = CreateObject("WScript.Shell") > %SCRIPT3%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\ADVAPI Tray.lnk" >> %SCRIPT3%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT3%
echo oLink.TargetPath = "%~dp0ADVAPI_with_tray.bat" >> %SCRIPT3%
echo oLink.WorkingDirectory = "%~dp0" >> %SCRIPT3%
echo oLink.Description = "ADVAPI Tray Controller" >> %SCRIPT3%
echo oLink.Save >> %SCRIPT3%
cscript /nologo %SCRIPT3%
if exist %SCRIPT3% del %SCRIPT3%

echo System tray controller shortcut created!
echo.

echo Would you like ADVAPI to start automatically when Windows starts? (Y/N)
set /p autostart=
if /i "%autostart%"=="Y" (
    echo Creating startup shortcut...
    set SCRIPT2="%TEMP%\%RANDOM%-%RANDOM%-%RANDOM%-%RANDOM%.vbs"
    echo Set oWS = CreateObject("WScript.Shell") > %SCRIPT2%
    echo sLinkFile = oWS.SpecialFolders("Startup") ^& "\ADVAPI.lnk" >> %SCRIPT2%
    echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT2%
    echo oLink.TargetPath = "%~dp0start-advapi.bat" >> %SCRIPT2%
    echo oLink.WorkingDirectory = "%~dp0" >> %SCRIPT2%
    echo oLink.Description = "ADVAPI Application" >> %SCRIPT2%
    echo oLink.Save >> %SCRIPT2%
    cscript /nologo %SCRIPT2%
    if exist %SCRIPT2% del %SCRIPT2%
    echo Startup shortcut created!
) else (
    echo Skipping startup configuration.
)
echo.

echo Setup complete! You can now start ADVAPI by:
echo 1. Double-clicking the "ADVAPI Tray" icon for system tray control (RECOMMENDED), or
echo 2. Double-clicking the ADVAPI icon on your desktop, or
echo 3. Double-clicking start-advapi.bat in this folder
echo.
echo Press any key to exit setup...
pause > nul