' Morning Tree - Remove Startup
' ============================================

Dim objFSO, objShell
Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")

Dim startupFolder, targetFile
startupFolder = objShell.SpecialFolders("Startup")
' "早读树-开机启动.vbs" in Unicode codes
targetFile    = startupFolder & "\" & ChrW(&H65E9) & ChrW(&H8BFB) & ChrW(&H6811) & "-开机启动.vbs"

' English messaging to avoid encoding errors
Dim STR_TITLE, STR_SUCC, STR_NOTFOUND
STR_TITLE    = "Morning Tree - Startup Removal"
STR_SUCC     = "Successfully removed from startup!"
STR_NOTFOUND = "No startup entry found."

If objFSO.FileExists(targetFile) Then
    On Error Resume Next
    objFSO.DeleteFile targetFile, True
    If Err.Number <> 0 Then
        MsgBox "Failed to delete file: " & Err.Description, vbCritical, STR_TITLE
    Else
        MsgBox STR_SUCC, vbInformation, STR_TITLE
    End If
    On Error GoTo 0
Else
    MsgBox STR_NOTFOUND, vbInformation, STR_TITLE
End If
