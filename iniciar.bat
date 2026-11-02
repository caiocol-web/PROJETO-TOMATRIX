@echo off
REM Liga o banco, o servidor e abre o sistema no navegador.
set "RAIZ=%~dp0"
set "PG=%RAIZ%pgsql"
set "PGPORT=15432"
set "PATH=%RAIZ%node;%PATH%"

if not exist "%PG%\dados\PG_VERSION" (
  echo O banco ainda nao foi criado. Rode o preparar.bat uma vez.
  pause
  exit /b 1
)

"%PG%\bin\pg_ctl.exe" -D "%PG%\dados" status >nul 2>&1
if errorlevel 1 (
  echo Ligando o banco de dados...
  "%PG%\bin\pg_ctl.exe" -D "%PG%\dados" -o "-p %PGPORT%" -l "%PG%\log.txt" -w start
  if errorlevel 1 (
    echo Nao foi possivel ligar o banco. Veja o arquivo pgsql\log.txt
    pause
    exit /b 1
  )
)

cd /d "%RAIZ%PROJETO-TOMATRIX"
start "Tomatrix servidor" cmd /k node server.js
timeout /t 4 >nul
start http://localhost:3000