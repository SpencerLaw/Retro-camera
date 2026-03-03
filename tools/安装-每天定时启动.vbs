' ==============================================================
'  广播助手 - 任务计划程序安装脚本
'  功能: 自动创建一个"每天早上7:30打开广播助手"的计划任务
'  使用方法: 右键 → 以管理员身份运行
' ==============================================================

Dim objShell, objFSO
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' ============ 🔧 请修改这些设置 ============
Dim taskName, startTime, scriptPath
taskName = "广播助手自动开启"
startTime = "07:30"   ' 每天启动时间 (24小时制)

' 获取当前脚本所在目录，定位 VBS 启动脚本
scriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName) & "\广播助手-开机启动.vbs"

' ============ 创建计划任务 ============
Dim cmd
cmd = "schtasks /create /tn """ & taskName & """ /tr ""wscript.exe '" & scriptPath & "'"""
cmd = cmd & " /sc daily /st " & startTime
cmd = cmd & " /f"  ' /f = 强制覆盖已存在的同名任务

Dim result
result = objShell.Run("cmd /c " & cmd, 0, True)

If result = 0 Then
    MsgBox "✅ 成功！" & Chr(13) & Chr(10) & Chr(13) & Chr(10) & _
           "广播助手将在每天 " & startTime & " 自动打开。" & Chr(13) & Chr(10) & Chr(13) & Chr(10) & _
           "任务名称: " & taskName & Chr(13) & Chr(10) & _
           "您可以在「任务计划程序」中修改时间。", _
           64, "广播助手 - 自动启动安装成功"
Else
    MsgBox "❌ 安装失败 (错误代码: " & result & ")" & Chr(13) & Chr(10) & Chr(13) & Chr(10) & _
           "请确保：" & Chr(13) & Chr(10) & _
           "1. 以管理员身份运行此脚本" & Chr(13) & Chr(10) & _
           "2. 同目录下存在「广播助手-开机启动.vbs」文件", _
           16, "安装失败"
End If

Set objShell = Nothing
Set objFSO = Nothing
