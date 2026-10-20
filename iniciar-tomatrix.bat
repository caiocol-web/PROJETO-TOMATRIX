@echo off
cd /d C:\Users\caioc\Downloads\PROJETO-TOMATRIX
start /min "Tomatrix servidor" cmd /c node server.js
timeout /t 2 >nul
start http://localhost:3000