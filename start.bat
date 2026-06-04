@echo off
chcp 65001 >nul
title SaltMusic
cd /d "%~dp0"

echo.
echo  ========================================
echo   SaltMusic
echo  ========================================
echo.

node --version >nul 2>&1
if not errorlevel 1 (
    set "NODE_CMD=node"
    goto :start
)

if exist "%~dp0nodejs\node.exe" (
    set "NODE_CMD=%~dp0nodejs\node.exe"
    goto :start
)

echo Node.js not found
echo Download: https://nodejs.org/
pause
exit /b 1

:start
echo Starting...
echo http://localhost:3000
echo.

start "" cmd /c "timeout /t 2 >nul && start http://localhost:3000"
"%NODE_CMD%" "%~dp0server.js"
pause
