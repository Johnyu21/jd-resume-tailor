@echo off
chcp 65001 >nul
title 停止 AI 简历岗位定制台 (127.0.0.1:3845)
cd /d "%~dp0"

echo ================================================
echo   正在停止 AI 简历岗位定制台 (端口 3845)
echo ================================================
echo.

powershell -NoProfile -Command "$pids = Get-NetTCPConnection -LocalPort 3845 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($pids) { foreach ($p in $pids) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Host ('[已停止] 进程 PID: ' + $p) } } else { Write-Host '[提示] 当前 3845 端口未运行服务。' }"

echo.
timeout /t 2 /nobreak >nul
