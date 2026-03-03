' Broadcast Assistant - Auto-Setup & Launch
' ============================================
' Run this ONCE on the classroom computer.
' It will:
'   1. Open the broadcast page right now
'   2. Add itself to Windows Startup so it opens automatically on every boot
'
' To change the URL: right-click -> Edit with Notepad, change BASE_URL below.
' ============================================

Dim BASE_URL
BASE_URL = "https://www.anypok.com/broadcast?receiver=1&autostart=1"

' --- Find Browser ---
Dim objFSO, objShell
Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")

Dim browserPath
browserPath = ""

Dim e1, e2, e3, c1, c2, c3
e1 = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
e2 = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
e3 = objShell.ExpandEnvironmentStrings("%LocalAppData%") & "\Microsoft\Edge\Application\msedge.exe"
c1 = "C:\Program Files\Google\Chrome\Application\chrome.exe"
c2 = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
c3 = objShell.ExpandEnvironmentStrings("%LocalAppData%") & "\Google\Chrome\Application\chrome.exe"

If objFSO.FileExists(e1) Then
    browserPath = e1
ElseIf objFSO.FileExists(e2) Then
    browserPath = e2
ElseIf objFSO.FileExists(e3) Then
    browserPath = e3
ElseIf objFSO.FileExists(c1) Then
    browserPath = c1
ElseIf objFSO.FileExists(c2) Then
    browserPath = c2
ElseIf objFSO.FileExists(c3) Then
    browserPath = c3
End If

' --- Step 1: Add to Windows Startup Folder (runs on every boot) ---
Dim startupFolder, thisScript, destPath
startupFolder = objShell.SpecialFolders("Startup")
thisScript = WScript.ScriptFullName
destPath = startupFolder & "\" & objFSO.GetFileName(thisScript)

If Not objFSO.FileExists(destPath) Then
    On Error Resume Next
    objFSO.CopyFile thisScript, destPath
    On Error GoTo 0
End If

' --- Step 2: Open the broadcast page now ---
If browserPath = "" Then
    objShell.Run "explorer " & BASE_URL, 1, False
Else
    objShell.Run """" & browserPath & """ --app=" & BASE_URL & " --start-maximized", 1, False
End If

Set objFSO = Nothing
Set objShell = Nothing
