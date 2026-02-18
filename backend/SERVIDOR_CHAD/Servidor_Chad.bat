@echo off
:: 1. ESPERA DE SEGURIDAD
timeout /t 5 /nobreak > nul

:: 2. LANZAR FADERS (Modo silencioso)
echo Iniciando Faders...
cd /d "C:\Users\Lisandro\Desktop\Proyectos\MacroFader---Audio\backend\Faders"
start /b cmd /c "Iniciar_Controlador.bat"

:: 3. LANZAR DECK (Modo silencioso)
echo Iniciando Deck...
cd /d "C:\Users\Lisandro\Desktop\Proyectos\MacroFader---Audio\frontend\controlador"
start /b cmd /c "npx http-server -a 192.168.1.165 -p 5500"