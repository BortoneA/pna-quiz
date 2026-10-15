@echo off
title PNA Quiz - Inicializador de Bancos de Dados
echo ===================================================
echo   Iniciando PostgreSQL e Redis no WSL Ubuntu...
echo ===================================================
echo.

:: Executa a inicializacao de servicos dentro do WSL como root
wsl -d Ubuntu -u root -e sh -c "/etc/init.d/postgresql start && /etc/init.d/redis-server start"

echo.
echo ===================================================
echo   Verificando status de conectividade local...
echo ===================================================
echo.

:: Executa verificacao simples
wsl -d Ubuntu -u postgres -e pg_isready
wsl -d Ubuntu -u postgres -e redis-cli ping

echo.
echo ===================================================
echo   Bancos de dados iniciados e prontos para conexao!
echo   Pressione qualquer tecla para fechar esta janela.
echo ===================================================
pause > null
