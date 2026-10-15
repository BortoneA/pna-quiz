@echo off
chcp 65001 >nul
title PNA Quiz -- Sincronizador Firebase

echo ============================================================
echo   PNA QUIZ -- Sincronizacao com Google Cloud Firestore
echo ============================================================
echo.

cd /d "%~dp0pna-quiz"
node "..\scripts\sync_to_firebase.js"

echo.
pause
