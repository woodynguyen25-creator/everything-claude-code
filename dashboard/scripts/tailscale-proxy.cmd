@echo off
REM Wrapper batch that launches the Tailscale proxy with logging and crash auto-restart.
REM Called by the AIOS-TailscaleProxy scheduled task on user logon.
REM If node exits for any reason, wait 5s then relaunch. Loops forever until task is stopped.

setlocal
set DASHBOARD_DIR=%~dp0..
set LOG_FILE=%TEMP%\tailscale-proxy.log
set SCRIPT=%~dp0tailscale-proxy.js

cd /d "%DASHBOARD_DIR%"

:loop
echo [%date% %time%] launching node tailscale-proxy.js >> "%LOG_FILE%"
node "%SCRIPT%" >> "%LOG_FILE%" 2>&1
echo [%date% %time%] node exited with code %ERRORLEVEL% — restarting in 5s >> "%LOG_FILE%"
timeout /t 5 /nobreak >nul
goto loop
