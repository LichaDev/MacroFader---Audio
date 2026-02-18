@echo off
title Controlador MIDI Pro - Servidor Portable
color 0b
echo ===================================================
echo       Iniciando Controlador MIDI Pro V2...
echo ===================================================
echo.

:: Verificamos si el motor portable esta en la carpeta
if not exist "node.exe" (
    color 0c
    echo [ERROR] No se encontro el archivo node.exe en esta carpeta.
    echo Asegurate de haberlo copiado desde el ZIP de Node.js.
    pause
    exit
)

echo [OK] Motor Node.js Portable detectado.
echo [OK] Servidor en linea. Conecta tu celular a la IP de esta PC por el puerto 3000.
echo.

:: Usamos .\node.exe para forzar el uso del motor local
.\node.exe server.js

echo.
echo El servidor se ha detenido.
pause