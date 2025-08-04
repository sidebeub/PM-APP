Set WshShell = CreateObject("WScript.Shell")
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
WshShell.Run "http://localhost:3002/db-login.html", 1, False