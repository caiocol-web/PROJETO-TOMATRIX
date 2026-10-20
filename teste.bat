```bat
@echo off
cd /d "%~dp0"

title TOMATRIX - Inicializacao

echo =====================================
echo       INICIANDO O TOMATRIX
echo =====================================

if not exist "node_modules" (
    echo Instalando dependencias do projeto...
    call npm install
)

if not exist "node_modules\browser-sync" (
    echo Instalando BrowserSync...
    call npm install --save-dev browser-sync
)

set /p DATABASE_URL=Cole a External Database URL do Render e pressione Enter: 

start "TOMATRIX - Servidor" cmd /k "set DATABASE_URL=%DATABASE_URL% && node --watch server.js"

timeout /t 3 /nobreak >nul

start "TOMATRIX - Atualizacao do site" cmd /k "npx.cmd browser-sync start --proxy localhost:3000 --files ""public/**/*"" --no-notify"

exit