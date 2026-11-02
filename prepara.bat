@echo off
REM Rode UMA VEZ, com o pendrive ja montado (pastas node, pgsql e PROJETO-TOMATRIX).
REM Instala as dependencias do projeto e cria o banco de dados dentro do pendrive.
setlocal
set "RAIZ=%~dp0"
set "PG=%RAIZ%pgsql"
set "PGPORT=15432"
set "PATH=%RAIZ%node;%PATH%"

if not exist "%RAIZ%node\node.exe" (
  echo Nao achei node\node.exe no pendrive.
  pause
  exit /b 1
)
if not exist "%PG%\bin\initdb.exe" (
  echo Nao achei pgsql\bin\initdb.exe no pendrive.
  pause
  exit /b 1
)
if not exist "%RAIZ%PROJETO-TOMATRIX\server.js" (
  echo Nao achei PROJETO-TOMATRIX\server.js no pendrive.
  pause
  exit /b 1
)

echo.
echo [1/4] Instalando as dependencias do projeto...
cd /d "%RAIZ%PROJETO-TOMATRIX"
call npm install
if errorlevel 1 (
  echo Falhou ao instalar as dependencias.
  pause
  exit /b 1
)

echo.
echo [2/4] Criando o banco de dados...
if exist "%PG%\dados\PG_VERSION" (
  echo O banco ja existe, pulando esta etapa.
) else (
  > "%TEMP%\pgsenha.txt" echo caio1201
  "%PG%\bin\initdb.exe" -D "%PG%\dados" -U postgres -A scram-sha-256 --pwfile="%TEMP%\pgsenha.txt" -E UTF8 --locale=C
  del "%TEMP%\pgsenha.txt" >nul 2>&1
  if not exist "%PG%\dados\PG_VERSION" (
    echo Falhou ao criar o banco.
    pause
    exit /b 1
  )
)

echo.
echo [3/4] Ligando o banco...
"%PG%\bin\pg_ctl.exe" -D "%PG%\dados" -o "-p %PGPORT%" -l "%PG%\log.txt" -w start
if errorlevel 1 (
  echo Nao foi possivel ligar o banco. Veja o arquivo pgsql\log.txt
  pause
  exit /b 1
)

echo.
echo [4/4] Criando o banco tomatrix...
set "PGPASSWORD=caio1201"
"%PG%\bin\psql.exe" -U postgres -p %PGPORT% -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='tomatrix'" | find "1" >nul || "%PG%\bin\createdb.exe" -U postgres -p %PGPORT% tomatrix

"%PG%\bin\pg_ctl.exe" -D "%PG%\dados" -m fast stop

echo.
echo Pronto! Agora use o iniciar.bat para abrir o sistema.
pause