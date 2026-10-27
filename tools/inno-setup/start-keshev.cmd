@echo off
setlocal

title Keshev Security Agent

if exist "%~dp0src\server.mjs" cd /d "%~dp0"
if exist "%~dp0..\..\on-client\src\server.mjs" cd /d "%~dp0..\..\on-client"
if exist "%CD%\on-client\src\server.mjs" cd /d "%CD%\on-client"

where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo ============================================================
    echo [ERROR] Node.js is not installed or not found in your PATH.
    echo Please install Node.js v22 or v24 from: https://nodejs.org/
    echo ============================================================
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Keshev Security Agent Dashboard Launcher
echo ============================================================
echo.

rem Auto-launch browser
start "" http://127.0.0.1:5189/

if "%~1"=="--demo" (
    echo [INFO] Starting Keshev in DEMO mode...
    node src\server.mjs --demo
) else (
    echo [INFO] Starting Keshev in ACTUAL/NORMAL mode [default]...
    node src\server.mjs
)

if errorlevel 1 (
    echo.
    echo ============================================================
    echo [NOTICE] If port 5189 was already in use, your dashboard
    echo is already active at: http://127.0.0.1:5189/
    echo.
    echo To stop all previous instances, run in PowerShell:
    echo   Get-Process node ^| Stop-Process -Force
    echo ============================================================
    echo.
    pause
)
