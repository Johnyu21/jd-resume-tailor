@echo off
chcp 65001 >nul
title AI Resume Tailor (127.0.0.1:3845)
cd /d "%~dp0"

echo ================================================
echo   AI 简历岗位定制台 - 一键启动器
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js ^(v18+^): https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [首次运行] 正在安装依赖包，请稍候...
  call npm.cmd install
  if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络或 npm 配置。
    pause
    exit /b 1
  )
)

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 http://127.0.0.1:3845/api/health; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 (
  echo [提示] 检测到 3845 端口服务已在运行，正在直接为您打开浏览器...
  start "" "http://127.0.0.1:3845"
  echo 如需重启服务，请双击「重启简历定制台.bat」。
  timeout /t 3 /nobreak >nul
  exit /b 0
)

echo [启动中] 正在启动本地服务 http://127.0.0.1:3845 ...
echo [提示] 使用期间请勿关闭此窗口；关闭窗口即停止服务。
echo.

start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process http://127.0.0.1:3845"

node server.js
echo.
echo [服务已停止] 按任意键关闭窗口...
pause >nul
