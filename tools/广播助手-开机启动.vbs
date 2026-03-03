' ====================================================
'  广播助手 - Windows 开机自动启动脚本
'  支持: Windows 7 / 8 / 10 / 11
'  使用方法: 双击运行 或 放入任务计划程序
' ====================================================

' ============ 🔧 请在这里修改配置 ============
Dim broadcastUrl
Dim browserPath
Dim profileArg

' 广播助手网址 (改成你的实际地址)
broadcastUrl = "https://www.anypok.com/broadcast"

' 浏览器路径 (自动检测，优先 Edge > Chrome > Firefox)
browserPath = ""
profileArg = ""

' ============ 自动检测浏览器 ============
Dim objFSO, objShell
Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")

Dim edgePaths(2)
edgePaths(0) = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
edgePaths(1) = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
edgePaths(2) = objShell.ExpandEnvironmentStrings("%LocalAppData%") & "\Microsoft\Edge\Application\msedge.exe"

Dim chromePaths(2)
chromePaths(0) = "C:\Program Files\Google\Chrome\Application\chrome.exe"
chromePaths(1) = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
chromePaths(2) = objShell.ExpandEnvironmentStrings("%LocalAppData%") & "\Google\Chrome\Application\chrome.exe"

Dim i
' 优先使用 Edge
For i = 0 To 2
    If objFSO.FileExists(edgePaths(i)) Then
        browserPath = edgePaths(i)
        profileArg = " --profile-directory=Default"
        Exit For
    End If
Next

' 没有 Edge 就用 Chrome
If browserPath = "" Then
    For i = 0 To 2
        If objFSO.FileExists(chromePaths(i)) Then
            browserPath = chromePaths(i)
            profileArg = " --profile-directory=Default"
            Exit For
        End If
    Next
End If

' 最后用系统默认浏览器打开
If browserPath = "" Then
    objShell.Run "cmd /c start " & broadcastUrl, 0, False
Else
    ' 以全屏 Kiosk 模式打开 (老师专用, 无地址栏)
    ' 如果需要显示地址栏，把 --kiosk 改成 --start-maximized
    Dim launchCmd
    launchCmd = """" & browserPath & """" & profileArg & " --app=" & broadcastUrl & " --start-maximized"
    objShell.Run launchCmd, 1, False
End If

Set objFSO = Nothing
Set objShell = Nothing
