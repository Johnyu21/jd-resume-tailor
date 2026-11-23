@echo off
chcp 65001 >nul
title Restart AI Resume Tailor (127.0.0.1:3845)
cd /d "%~dp0"

echo ================================================
echo   正在重启 AI 简历岗位定制台 ^(端口 3845^)
echo ================================================
echo.

powershell -NoProfile -Command "$pids = Get-NetTCPConnection -LocalPort 3845 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($p in $pids) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Host ('[已停止旧进程] PID: ' + $p) }"

timeout /t 1 /nobreak >nul
call "%~dp0启动简历定制台.bat"
