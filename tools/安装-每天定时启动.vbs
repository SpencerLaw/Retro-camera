' Auto-install Daily Scheduled Task for Broadcast Assistant
' (安装-每天定时启动广播助手)
'
' Right-click -> Run as Administrator
' (请右键 -> 以管理员身份运行)
'
' Default: Opens browser every day at 07:30
' Change startTime below to adjust the time.

Dim objShell, objFSO
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Task name (English only - avoid Chinese in VBScript strings)
Dim taskName, startTime, scriptPath
taskName = "BroadcastAssistant-AutoOpen"
startTime = "07:30"

' Path to the launcher VBS (same folder as this script)
scriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName) & "\launcher.vbs"

' Copy the launcher script name - make sure the launcher file matches
Dim launcherSrc
launcherSrc = objFSO.GetParentFolderName(WScript.ScriptFullName) & "\broadcast-launcher.vbs"
If Not objFSO.FileExists(launcherSrc) Then
    launcherSrc = objFSO.GetParentFolderName(WScript.ScriptFullName) & "\broadcast-launcher.vbs"
End If

' Find the launcher VBS in same directory
Dim folder, file, launcherFile
launcherFile = ""
Set folder = objFSO.GetFolder(objFSO.GetParentFolderName(WScript.ScriptFullName))
For Each file In folder.Files
    If LCase(Right(file.Name, 4)) = ".vbs" And file.Name <> objFSO.GetFileName(WScript.ScriptFullName) Then
        launcherFile = file.Path
        Exit For
    End If
Next

If launcherFile = "" Then
    MsgBox "ERROR: Could not find the launcher .vbs file in the same folder." & Chr(13) & _
           "Please make sure both .vbs files are in the same folder.", 16, "Error"
    WScript.Quit
End If

Dim cmd, result
cmd = "schtasks /create /tn """ & taskName & """ /tr ""wscript.exe '" & launcherFile & "'"""
cmd = cmd & " /sc daily /st " & startTime & " /f"

result = objShell.Run("cmd /c " & cmd, 0, True)

If result = 0 Then
    MsgBox "OK! Task created successfully." & Chr(13) & Chr(10) & Chr(13) & Chr(10) & _
           "The browser will open every day at " & startTime & Chr(13) & Chr(10) & _
           "Task name: " & taskName & Chr(13) & Chr(10) & Chr(13) & Chr(10) & _
           "You can modify it in Task Scheduler (taskschd.msc).", _
           64, "Broadcast Assistant - Schedule Installed"
Else
    MsgBox "FAILED (code: " & result & ")" & Chr(13) & Chr(10) & Chr(13) & Chr(10) & _
           "Please make sure you right-clicked -> Run as Administrator.", _
           16, "Installation Failed"
End If

Set objShell = Nothing
Set objFSO = Nothing
