@echo off
REM Codex Bridge launcher — auto-restart wrapper for AIOS-CodexBridge scheduled task.
setlocal
set DASHBOARD_DIR=%~dp0..
set LOG_FILE=%TEMP%\codex-bridge.log
set SCRIPT=%~dp0codex-bridge.cjs
REM Ensure npm global bin is on PATH so `codex` resolves under Task Scheduler context.
set PATH=%PATH%;%APPDATA%\npm;C:\Program Files\nodejs
set CODEX_BIN=%APPDATA%\npm\codex.cmd

cd /d "%DASHBOARD_DIR%"

:loop
echo [%date% %time%] launching codex-bridge >> "%LOG_FILE%"
node "%SCRIPT%" >> "%LOG_FILE%" 2>&1
echo [%date% %time%] node exited code %ERRORLEVEL% — restart in 5s >> "%LOG_FILE%"
timeout /t 5 /nobreak >nul
goto loop
