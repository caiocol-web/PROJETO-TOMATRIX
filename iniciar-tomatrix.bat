@echo off
cd /d "%~dp0"
start "Tomatrix servidor" cmd /k node server.js
timeout /t 4 >nul
start http://localhost:3000