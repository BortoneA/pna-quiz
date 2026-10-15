@echo off
chcp 65001 >nul
title PNA Quiz -- Inicializacao

echo.
echo ============================================================
echo   PNA QUIZ -- Iniciando todos os servicos
echo ============================================================
echo.

echo [1/4] Iniciando PostgreSQL no WSL...
wsl -d Ubuntu -u root -e sh -c "/etc/init.d/postgresql start" >nul 2>&1
echo       PostgreSQL OK

echo [2/4] Iniciando Redis no WSL...
wsl -d Ubuntu -u root -e sh -c "redis-cli ping >nul 2>&1 || redis-server --daemonize yes --bind 0.0.0.0 --protected-mode no" >nul 2>&1
echo       Redis OK

echo [3/4] Iniciando Backend NestJS no WSL (porta 3001)...
start "PNA Quiz - Backend" wsl -d Ubuntu -u root -e sh -c "cd ~/pna-quiz-backend && npm run dev"
echo       Aguardando compilacao do NestJS (60s)...
timeout /t 60 /nobreak >nul
echo       Backend OK

echo [4/4] Iniciando Frontend Next.js na porta 3000...
start "PNA Quiz - Frontend" cmd /k "cd /d ""%~dp0pna-quiz\frontend"" && pnpm dev"

timeout /t 10 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo ============================================================
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:3001
echo   Swagger  : http://localhost:3001/api/docs
echo ============================================================
echo.
pause
