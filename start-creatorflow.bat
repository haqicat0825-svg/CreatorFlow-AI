@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "CREATORFLOW_DIR=%~dp0"
set "CREATORFLOW_URL=http://localhost:3000"

cd /d "%CREATORFLOW_DIR%" || (
  echo [错误] 无法切换到 CreatorFlow AI 项目目录：
  echo %CREATORFLOW_DIR%
  pause
  exit /b 1
)

echo CreatorFlow AI 启动中...
echo 访问地址：http://localhost:3000
echo.

where node.exe >nul 2>&1 || (
  echo [错误] 未找到 Node.js。请先安装 Node.js，并确保 node.exe 已加入 PATH。
  pause
  exit /b 1
)

where npm.cmd >nul 2>&1 || (
  echo [错误] 未找到 npm。请确认 npm.cmd 已加入 PATH。
  pause
  exit /b 1
)

echo 正在检查端口 3000...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$connections = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue);" ^
  "if ($connections.Count -eq 0) { exit 0 };" ^
  "$processes = @(); foreach ($connection in $connections) { if ($null -eq ($processes.ProcessId) -or $connection.OwningProcess -notin $processes.ProcessId) { $item = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $connection.OwningProcess) -ErrorAction SilentlyContinue; if ($item) { $processes += $item } } };" ^
  "$notNext = @(); foreach ($process in $processes) { if ($process.Name -notmatch '(?i)^node(\.exe)?$' -or $process.CommandLine -notmatch '(?i)([\\/]next[\\/]|next-server|next\.js)') { $notNext += $process } };" ^
  "if ($notNext.Count -gt 0 -or $processes.Count -eq 0) { Write-Host ('[错误] 端口 3000 已被非 Next.js 程序占用，PID：' + ($connections.OwningProcess -join ', ')); exit 2 };" ^
  "foreach ($process in $processes) { Write-Host ('检测到 Next.js 进程占用端口 3000，正在结束 PID：' + $process.ProcessId); Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop };" ^
  "$deadline = (Get-Date).AddSeconds(10);" ^
  "do { Start-Sleep -Milliseconds 250; $remaining = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) } while ($remaining.Count -gt 0 -and (Get-Date) -lt $deadline);" ^
  "if ($remaining.Count -gt 0) { Write-Host '[错误] 无法释放端口 3000。'; exit 3 };" ^
  "Write-Host '端口 3000 已释放。'; exit 0"
set "PORT_CHECK_EXIT=%ERRORLEVEL%"

if not "%PORT_CHECK_EXIT%"=="0" (
  echo CreatorFlow AI 未启动。
  pause
  exit /b %PORT_CHECK_EXIT%
)

echo 正在启动 Next.js 开发服务器，请稍候...
echo 如果看到 workspace lockfile warning，可忽略；它不会阻止 CreatorFlow AI 启动。
echo.

start "" /b powershell.exe -NoProfile -Command "$deadline = (Get-Date).AddSeconds(120); while ((Get-Date) -lt $deadline) { try { $r = Invoke-WebRequest -UseBasicParsing -Uri $env:CREATORFLOW_URL -TimeoutSec 3; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { Write-Host ''; Write-Host 'CreatorFlow AI 已就绪，正在打开浏览器...'; Start-Process $env:CREATORFLOW_URL; exit 0 } } catch {}; Start-Sleep -Seconds 2 }; Write-Host ''; Write-Host '[提示] 120 秒内未检测到服务 Ready，请查看上方 Next.js 日志。'; exit 1"

call npm.cmd run dev -- -p 3000
set "DEV_EXIT=%ERRORLEVEL%"

echo.
if not "%DEV_EXIT%"=="0" echo [提示] CreatorFlow AI 开发服务器已退出，退出码：%DEV_EXIT%
echo 启动窗口将保持打开，按任意键关闭。
pause
exit /b %DEV_EXIT%
