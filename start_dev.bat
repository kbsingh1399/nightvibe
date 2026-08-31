@echo off
REM ============================================================
REM  NightVibe Dev Server Launcher v2
REM  Runs from C:\nightvibe_deps (not Google Drive node_modules)
REM ============================================================

echo =========================================
echo  NightVibe India - Dev Server Launcher
echo =========================================
echo.
echo App URL: http://localhost:3000
echo.

cd /d "G:\My Drive\Club_Business"

REM Check if C:\nightvibe_deps\node_modules exists, if not, install there
if not exist "C:\nightvibe_deps\node_modules" (
  echo Installing dependencies to C:\nightvibe_deps...
  if not exist "C:\nightvibe_deps" mkdir C:\nightvibe_deps
  copy "G:\My Drive\Club_Business\package.json" "C:\nightvibe_deps\package.json" >nul
  cd /d C:\nightvibe_deps
  npm install
  cd /d "G:\My Drive\Club_Business"
  echo.
  echo Dependencies installed!
  echo.
)

REM Start Vite using NODE_PATH to resolve modules from local C drive
echo Starting Vite...
set NODE_PATH=C:\nightvibe_deps\node_modules
node --require "C:\nightvibe_deps\node_modules\module-alias/register" "C:\nightvibe_deps\node_modules\vite\bin\vite.js" --port 3000 2>nul
if errorlevel 1 (
  REM Fallback: just start vite directly, it should find deps if node_modules exists locally
  node "C:\nightvibe_deps\node_modules\vite\bin\vite.js" --port 3000
)
