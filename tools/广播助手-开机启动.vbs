' Broadcast Assistant - Auto-Setup & Launch
' ============================================
' Run this ONCE on the classroom computer.
' It will:
'   1. Open the broadcast page right now (with room pre-filled if set)
'   2. Add itself to Windows Startup so it opens automatically on every boot
'
' To change the URL or ROOM_ID:
'   Right-click -> Edit with Notepad, change BASE_URL and ROOM_ID below.
'
' To use WITHOUT a fixed room (student enters manually), leave ROOM_ID = ""
' ============================================

Dim BASE_URL, ROOM_ID
BASE_URL = "https://lovedare.baby/broadcast/receiver?autostart=1"
ROOM_ID  = ""   ' <-- 填入6位房间号，例如 "123456"，留空则显示输入页面

' 拼接最终 URL
Dim FINAL_URL
If Len(ROOM_ID) = 6 Then
    FINAL_URL = BASE_URL & "&room=" & ROOM_ID
Else
    FINAL_URL = BASE_URL
End If

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
thisScript    = WScript.ScriptFullName
destPath      = startupFolder & "\" & objFSO.GetFileName(thisScript)

If Not objFSO.FileExists(destPath) Then
    On Error Resume Next
    objFSO.CopyFile thisScript, destPath
    If Err.Number <> 0 Then
        MsgBox "无法写入开机启动文件夹：" & vbCrLf & _
               Err.Description & vbCrLf & vbCrLf & _
               "请尝试：右键本脚本 -> 以管理员身份运行", _
               vbExclamation, "广播助手 - 开机启动设置失败"
    Else
        MsgBox "已成功加入开机启动！" & vbCrLf & _
               "下次开机将自动打开广播接收页面。", _
               vbInformation, "广播助手 - 设置成功"
    End If
    On Error GoTo 0
End If

' --- Step 2: Open the broadcast page now ---
If browserPath = "" Then
    ' 没找到 Edge/Chrome，用系统默认浏览器
    objShell.Run "explorer """ & FINAL_URL & """", 1, False
Else
    ' --app 模式全屏显示，URL 用引号包裹防止特殊字符截断
    objShell.Run """" & browserPath & """ --app=""" & FINAL_URL & """ --start-maximized", 1, False
End If

Set objFSO = Nothing
Set objShell = Nothing
