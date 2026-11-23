@echo off
chcp 65001 >nul
title AI 简历岗位定制台 (127.0.0.1:3845)
cd /d "%~dp0"

echo ================================================
echo   AI 简历岗位定制台 · 一键启动器
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js (建议 v18 及以上):
  echo        https://nodejs.org/
  echo.
  pause
  exit /b 1
)

:: 检测服务是否已在 3845 端口运行，避免重复双击报错
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 http://127.0.0.1:3845/api/health; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if %errorlevel%==0 (
  echo [提示] 本地服务已在运行中，正在直接为您打开浏览器...
  start "" "http://127.0.0.1:3845"
  timeout /t 2 /nobreak >nul
  exit /b 0
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

echo [启动中] 正在启动本地服务 http://127.0.0.1:3845 ...
echo [提示] 使用期间请勿关闭此窗口；关闭窗口即停止服务。
echo.

:: 延迟 2 秒后自动打开浏览器
start "" cmd /c "timeout /t 2 /nobreak >nul && start "" http://127.0.0.1:3845"

node server.js
echo.
echo [服务已停止] 按任意键关闭窗口...
pause >nul
