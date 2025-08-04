@echo off
echo ===================================
echo ADVAPI Windows Application Builder
echo ===================================
echo.

echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo Error installing dependencies
  pause
  exit /b %ERRORLEVEL%
)

echo.
echo Building Windows application...
call npm run build:win
if %ERRORLEVEL% NEQ 0 (
  echo Error building Windows application
  pause
  exit /b %ERRORLEVEL%
)

echo.
echo ===================================
echo Build completed successfully!
echo.
echo The Windows application is in the 'dist' folder.
echo To test it, run 'dist\start-advapi.bat'
echo.
echo To distribute:
echo 1. Copy the entire 'dist' folder to the target machine
echo 2. Run 'setup.bat' on the target machine to create shortcuts
echo ===================================
echo.

pause