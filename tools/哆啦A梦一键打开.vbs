' 哆啦A梦一键打开
' ============================================
' 直接打开哆啦A梦分贝仪页面，可以手动添加到开机启动。
' ============================================

Dim BASE_URL
BASE_URL = "https://lovedare.baby/doraemon"

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

' --- Open the page now ---
If browserPath = "" Then
    ' Fallback to default explorer if no Edge/Chrome found
    objShell.Run "explorer """ & BASE_URL & """", 1, False
Else
    ' Open in App Mode (no address bar) for better UI
    objShell.Run """" & browserPath & """ --app=""" & BASE_URL & """ --start-maximized", 1, False
End If

Set objFSO = Nothing
Set objShell = Nothing
