#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
#SingleInstance Force
SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.

; Create system tray menu
Menu, Tray, NoStandard
Menu, Tray, Tip, ADVAPI Controller
Menu, Tray, Add, Open ADVAPI, OpenADVAPI
Menu, Tray, Add, Start ADVAPI, StartADVAPI
Menu, Tray, Add, Stop ADVAPI, StopADVAPI
Menu, Tray, Add
Menu, Tray, Add, Exit, ExitApp
Menu, Tray, Default, Open ADVAPI
Menu, Tray, Click, 1

; Check if ADVAPI is already running
Process, Exist, advapi.exe
If (ErrorLevel != 0) {
    Menu, Tray, Disable, Start ADVAPI
    Menu, Tray, Enable, Stop ADVAPI
    isRunning := true
} Else {
    Menu, Tray, Enable, Start ADVAPI
    Menu, Tray, Disable, Stop ADVAPI
    isRunning := false
}

Return

OpenADVAPI:
    Run, http://localhost:3002/db-login.html
Return

StartADVAPI:
    Run, wscript.exe "%A_WorkingDir%\start-hidden.vbs" "%A_WorkingDir%\advapi.exe"
    Sleep, 3000
    Menu, Tray, Disable, Start ADVAPI
    Menu, Tray, Enable, Stop ADVAPI
    isRunning := true
Return

StopADVAPI:
    Process, Close, advapi.exe
    Menu, Tray, Enable, Start ADVAPI
    Menu, Tray, Disable, Stop ADVAPI
    isRunning := false
Return

ExitApp:
    If (isRunning) {
        MsgBox, 4, ADVAPI Controller, ADVAPI is still running. Stop it before exiting?
        IfMsgBox Yes
        {
            Process, Close, advapi.exe
        }
    }
    ExitApp
Return