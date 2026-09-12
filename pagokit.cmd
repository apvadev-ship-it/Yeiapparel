@echo off
REM Arranca Claude Code con el plugin PagoKit cargado.
REM Se usa un archivo para no tener que pegar comandos largos en la
REM terminal, que los estaba partiendo y corrompiendo al pegarlos.

REM El instalador de npm deja el ejecutable aqui; se agrega al PATH por si
REM esta ventana se abrio antes de instalarlo.
set "PATH=%PATH%;%APPDATA%\npm"

cd /d "%~dp0"

echo Abriendo Claude Code con PagoKit...
echo.

call claude --plugin-dir "%USERPROFILE%\agente-pagokit"
