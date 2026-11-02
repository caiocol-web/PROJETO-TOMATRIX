@echo off
REM Desliga o servidor e o banco. Rode ANTES de tirar o pendrive.
set "RAIZ=%~dp0"
set "PG=%RAIZ%pgsql"

taskkill /FI "WINDOWTITLE eq Tomatrix servidor*" /T /F >nul 2>&1
"%PG%\bin\pg_ctl.exe" -D "%PG%\dados" -m fast stop

echo.
echo Pronto. Se a janela do servidor ainda estiver aberta, feche-a.
echo Agora voce pode remover o pendrive com seguranca.
pause