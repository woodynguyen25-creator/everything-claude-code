@echo off
REM Auto-start the AIOS dashboard. Called by AIOS-Dashboard scheduled task on user logon.
REM Uses production build (next start) for instant cold loads. Falls back to dev mode on build failure.

setlocal
set DASHBOARD_DIR=%~dp0..
set LOG_FILE=%TEMP%\aios-dashboard.log

cd /d "%DASHBOARD_DIR%"

REM Wait up to 30 seconds for Tailscale to be ready (proxy script depends on it)
set /a TRIES=0
:WAIT_TAILSCALE
tailscale status >nul 2>&1
if %errorlevel% equ 0 goto STARTUP
set /a TRIES+=1
if %TRIES% geq 6 goto STARTUP
timeout /t 5 /nobreak >nul
goto WAIT_TAILSCALE

:STARTUP
echo [%date% %time%] Starting AIOS dashboard (production mode) >> "%LOG_FILE%"

REM Build if .next is missing
if not exist ".next\BUILD_ID" goto NEED_BUILD
goto START_PROD

:NEED_BUILD
echo [%date% %time%] No build found - running next build >> "%LOG_FILE%"
call npm run build >> "%LOG_FILE%" 2>&1
if errorlevel 1 goto FALLBACK_DEV

:START_PROD
echo [%date% %time%] Starting production server (next start) >> "%LOG_FILE%"
npm run start >> "%LOG_FILE%" 2>&1
goto END

:FALLBACK_DEV
echo [%date% %time%] Build failed - falling back to dev mode >> "%LOG_FILE%"
npm run dev >> "%LOG_FILE%" 2>&1

:END
