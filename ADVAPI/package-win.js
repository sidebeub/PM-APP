/**
 * Windows packaging script for ADVAPI application
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Create application directories in dist
const directories = ['public', 'src', 'uploads', 'data'];
directories.forEach(dir => {
  const dirPath = path.join('dist', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Copy all necessary files
console.log('Copying application files...');
try {
  // Copy public directory
  execSync('cp -r public/* dist/public/');
  
  // Copy src directory
  execSync('cp -r src/* dist/src/');
  
  // Copy data files if they exist
  if (fs.existsSync('src/data')) {
    execSync('cp -r src/data/* dist/data/');
  }
  
  // Ensure uploads directory exists
  execSync('mkdir -p dist/uploads');

  // Copy .env file if it exists
  if (fs.existsSync('.env')) {
    execSync('cp .env dist/');
  } else {
    console.warn('Warning: .env file not found. You may need to create one in the dist folder.');
    
    // Create a basic .env file with port 3002
    fs.writeFileSync('dist/.env', 'PORT=3002\n# Add your other environment variables here\n');
    console.log('Created a basic .env file with PORT=3002');
  }
  
  // Create start-advapi.bat file
  const batchContent = `@echo off
echo Starting ADVAPI application...
echo The application will start in hidden mode.
echo Browser will open automatically to the login page.
echo.
echo If you need to stop the application, use Task Manager to end 'advapi.exe'
timeout /t 3 /nobreak > nul
start "" wscript.exe "%~dp0start-hidden.vbs" "%~dp0advapi.exe"`;
  
  fs.writeFileSync('dist/start-advapi.bat', batchContent);
  console.log('Created startup batch file: start-advapi.bat');
  
  // Create tray controller batch file
  const trayBatchContent = `@echo off
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
echo.`;
  
  fs.writeFileSync('dist/ADVAPI_with_tray.bat', trayBatchContent);
  console.log('Created tray controller batch file: ADVAPI_with_tray.bat');
  
  // Create the HTA tray controller
  const htaContent = `<html>
<head>
<title>ADVAPI Controller</title>
<meta http-equiv="x-ua-compatible" content="ie=10">
<hta:application 
    id="ADVAPI_Tray"
    applicationname="ADVAPI Controller"
    icon="favicon.ico"
    showintaskbar="no"
    singleinstance="yes"
    sysmenu="yes"
    windowstate="minimize"
/>
<style>
    body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        padding: 10px;
        background-color: #f0f0f0;
    }
    button {
        width: 120px;
        padding: 5px;
        margin: 5px;
        cursor: pointer;
    }
    .header {
        font-weight: bold;
        margin-bottom: 10px;
    }
    .status {
        margin: 10px 0;
    }
</style>
<script language="VBScript">
    Dim oShell, serverProcess, serverStatus, fso, serverPID

    Sub Window_OnLoad
        Set oShell = CreateObject("WScript.Shell")
        Set fso = CreateObject("Scripting.FileSystemObject")
        
        ' Create system tray icon
        CreateSystemTrayIcon
        
        ' Check if server process is already running
        CheckServerProcessStatus
        
        ' Set the window to be nearly invisible
        window.resizeTo 1, 1
        window.moveTo -100, -100
    End Sub

    Sub CreateSystemTrayIcon
        ' Create system tray icon
        ' This is done using the VBScript Shell
        Set objWshShell = CreateObject("Wscript.Shell")
        
        ' Create the shortcut that will be in the system tray
        Set objShortcut = objWshShell.CreateShortcut(objWshShell.SpecialFolders("Desktop") & "\\~$TEMP_ADVAPI.lnk")
        objShortcut.TargetPath = "mshta.exe"
        objShortcut.Arguments = """" & window.location.href & """"
        objShortcut.WorkingDirectory = objWshShell.CurrentDirectory
        objShortcut.WindowStyle = 7  ' Minimized
        objShortcut.IconLocation = "favicon.ico"
        objShortcut.Description = "ADVAPI Controller"
        objShortcut.Save
        
        ' Delete the temporary shortcut
        On Error Resume Next
        fso.DeleteFile objWshShell.SpecialFolders("Desktop") & "\\~$TEMP_ADVAPI.lnk"
    End Sub

    Sub CheckServerProcessStatus
        Dim objWMIService, colProcesses, objProcess
        
        On Error Resume Next
        Set objWMIService = GetObject("winmgmts:\\\\.\\\root\\\\cimv2")
        
        If Err.Number <> 0 Then
            MsgBox "Error connecting to WMI: " & Err.Description, vbExclamation, "ADVAPI Controller"
            Err.Clear
            serverStatus = "Unknown"
            serverPID = 0
            Exit Sub
        End If
        
        Set colProcesses = objWMIService.ExecQuery("Select * from Win32_Process Where Name='advapi.exe'")
        
        If Err.Number <> 0 Then
            MsgBox "Error querying processes: " & Err.Description, vbExclamation, "ADVAPI Controller"
            Err.Clear
            serverStatus = "Unknown"
            serverPID = 0
            Exit Sub
        End If
        
        If colProcesses.Count > 0 Then
            serverStatus = "Running"
            For Each objProcess in colProcesses
                serverPID = objProcess.ProcessId
                Exit For
            Next
        Else
            serverStatus = "Stopped"
            serverPID = 0
        End If
        
        ' Update the status text in the UI
        If Not IsNull(document.getElementById("serverStatusText")) Then
            document.getElementById("serverStatusText").innerText = serverStatus
        End If
    End Sub

    Sub StartServer
        If serverStatus = "Stopped" Or serverStatus = "Unknown" Then
            ' Start the server using the regular start script
            Set WshShell = CreateObject("WScript.Shell")
            appPath = oShell.CurrentDirectory & "\\advapi.exe"
            WshShell.Run appPath, 0, False  ' 0 = hidden window, False = don't wait for completion
            
            ' Wait for server to start
            WScript.Sleep 3000
            CheckServerProcessStatus
            
            ' Open browser
            WshShell.Run "http://localhost:3002/db-login.html", 1, False
            
            MsgBox "ADVAPI server started successfully. The login page will open in your browser.", vbInformation, "ADVAPI Controller"
        Else
            MsgBox "ADVAPI server is already running.", vbInformation, "ADVAPI Controller"
        End If
    End Sub

    Sub StopServer
        If serverStatus = "Running" Then
            ' Stop the server process
            Dim objWMIService, colProcesses
            
            On Error Resume Next
            Set objWMIService = GetObject("winmgmts:\\\\.\\\root\\\\cimv2")
            
            If Err.Number <> 0 Then
                MsgBox "Error connecting to WMI: " & Err.Description, vbExclamation, "ADVAPI Controller"
                Err.Clear
                Exit Sub
            End If
            
            Set colProcesses = objWMIService.ExecQuery("Select * from Win32_Process Where Name='advapi.exe'")
            
            If Err.Number <> 0 Then
                MsgBox "Error querying processes: " & Err.Description, vbExclamation, "ADVAPI Controller"
                Err.Clear
                Exit Sub
            End If
            
            For Each objProcess in colProcesses
                objProcess.Terminate(0)
            Next
            
            serverStatus = "Stopped"
            serverPID = 0
            
            ' Update the status text in the UI
            If Not IsNull(document.getElementById("serverStatusText")) Then
                document.getElementById("serverStatusText").innerText = serverStatus
            End If
            
            MsgBox "ADVAPI server stopped successfully.", vbInformation, "ADVAPI Controller"
        Else
            MsgBox "ADVAPI server is not running.", vbInformation, "ADVAPI Controller"
        End If
    End Sub

    Sub OpenBrowser
        Set WshShell = CreateObject("WScript.Shell")
        WshShell.Run "http://localhost:3002/db-login.html", 1, False
    End Sub

    Sub ExitApplication
        Dim response
        
        If serverStatus = "Running" Then
            response = MsgBox("The ADVAPI server is still running. Do you want to stop it before exiting?", vbYesNoCancel + vbQuestion, "ADVAPI Controller")
            
            If response = vbYes Then
                StopServer
                window.close
            ElseIf response = vbNo Then
                window.close
            End If
        Else
            window.close
        End If
    End Sub

    ' Handle the system tray menu
    Sub document_oncontextmenu
        window.event.returnValue = False
        
        Dim objPopupMenu, hPopupMenu, menuItem
        
        On Error Resume Next
        ' Create popup menu
        Set objPopupMenu = CreateObject("WScript.Shell.1")
        hPopupMenu = objPopupMenu.CreatePopup
        
        If Err.Number <> 0 Then
            MsgBox "Error creating system tray menu: " & Err.Description, vbExclamation, "ADVAPI Controller"
            Err.Clear
            Exit Sub
        End If
        
        ' Add menu items
        If serverStatus = "Running" Then
            menuItem = "Open ADVAPI Login Page"
            hPopupMenu.AddItem menuItem, 1
            menuItem = "Stop ADVAPI Server"
            hPopupMenu.AddItem menuItem, 2
        Else
            menuItem = "Start ADVAPI Server"
            hPopupMenu.AddItem menuItem, 3
        End If
        
        ' Add separator
        hPopupMenu.AddSeparator
        
        ' Add exit item
        menuItem = "Exit"
        hPopupMenu.AddItem menuItem, 9
        
        ' Show the menu
        Dim result
        result = hPopupMenu.Show
        
        ' Handle menu selection
        Select Case result
            Case 1 ' Open ADVAPI Login Page
                OpenBrowser
            Case 2 ' Stop ADVAPI Server
                StopServer
            Case 3 ' Start ADVAPI Server
                StartServer
            Case 9 ' Exit
                ExitApplication
        End Select
    End Sub
</script>
</head>
<body>
<div class="header">ADVAPI Controller (System Tray)</div>
<div class="status">Server Status: <span id="serverStatusText"></span></div>
<button onclick="StartServer">Start Server</button>
<button onclick="OpenBrowser">Open Browser</button>
<button onclick="StopServer">Stop Server</button>
<button onclick="ExitApplication">Exit</button>
</body>
</html>`;
  
  fs.writeFileSync('dist/tray_controller.hta', htaContent);
  console.log('Created HTA tray controller: tray_controller.hta');
  
  // Create VBS script to hide command prompt
  const vbsContent = `Set WshShell = CreateObject("WScript.Shell")
appPath = WScript.Arguments(0)
WshShell.Run appPath, 0, False  ' 0 = hidden window, False = don't wait for completion

' Create a function to check server availability
Function CheckServerAvailable(url)
    On Error Resume Next
    
    Set http = CreateObject("MSXML2.XMLHTTP")
    http.open "HEAD", url, False
    http.send
    
    If http.status = 200 Then
        CheckServerAvailable = True
    Else
        CheckServerAvailable = False
    End If
    
    Set http = Nothing
End Function

' Try to ensure server is available before opening browser
Dim serverReady
Dim maxAttempts
Dim attempt

serverReady = False
maxAttempts = 10  ' Increased to give more time for server to start
attempt = 0

' Wait an initial 5 seconds to give server time to start
WScript.Sleep 5000

Do While Not serverReady And attempt < maxAttempts
    serverReady = CheckServerAvailable("http://localhost:3002/")
    If Not serverReady Then
        WScript.Sleep 2000 ' Wait 2 seconds between attempts
        attempt = attempt + 1
    End If
Loop

' Open browser only when server is ready or after max attempts
WshShell.Run "http://localhost:3002/db-login.html", 1, False`;

  fs.writeFileSync('dist/start-hidden.vbs', vbsContent);
  console.log('Created hidden startup VBS script: start-hidden.vbs');

  // Create setup.bat file for desktop/startup shortcuts
  const setupContent = `@echo off
echo ===================================
echo ADVAPI Application Setup
echo ===================================
echo.

echo Creating desktop shortcut...
echo.

set SCRIPT="%TEMP%\\%RANDOM%-%RANDOM%-%RANDOM%-%RANDOM%.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") >> %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\\ADVAPI.lnk" >> %SCRIPT%
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
set SCRIPT3="%TEMP%\\%RANDOM%-%RANDOM%-%RANDOM%-%RANDOM%.vbs"
echo Set oWS = CreateObject("WScript.Shell") > %SCRIPT3%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\\ADVAPI Tray.lnk" >> %SCRIPT3%
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
    set SCRIPT2="%TEMP%\\%RANDOM%-%RANDOM%-%RANDOM%-%RANDOM%.vbs"
    echo Set oWS = CreateObject("WScript.Shell") > %SCRIPT2%
    echo sLinkFile = oWS.SpecialFolders("Startup") ^& "\\ADVAPI.lnk" >> %SCRIPT2%
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
pause > nul`;

  fs.writeFileSync('dist/setup.bat', setupContent);
  console.log('Created setup batch file: setup.bat');
  
  // Package the app for Windows
  console.log('Packaging application for Windows...');
  execSync('npm run package:win', { stdio: 'inherit' });
  
  console.log('Windows packaging complete!');
  console.log('The executable is located at: dist/advapi.exe');
  console.log('\nNOTE: When distributing the application, include the entire dist folder contents.');
} catch (error) {
  console.error('Error during packaging:', error.message);
  process.exit(1);
}