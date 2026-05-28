$taskName = 'Woody''s Realm Dashboard'
$repoRoot = 'C:\Github Repos\everything-claude-code\dashboard'
$batchPath = Join-Path $repoRoot 'scripts\tools\start-dashboard.bat'

<#
Run this once in PowerShell:

  powershell -ExecutionPolicy Bypass -File .\scripts\tools\install-autostart.ps1

This registers a user-scoped Scheduled Task that starts the dashboard dev server
30 seconds after login. Codex must not execute this automatically; Woody runs it manually.
#>

$action = New-ScheduledTaskAction -Execute $batchPath
$trigger = New-ScheduledTaskTrigger -AtLogOn
$trigger.Delay = 'PT30S'
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -Hidden
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force
