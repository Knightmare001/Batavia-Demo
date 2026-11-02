@echo off
setlocal
cd /d "%~dp0.."
if exist ".runtime\node-v22.23.4-win-x64\node.exe" (
  set "PATH=%CD%\.runtime\node-v22.23.4-win-x64;%PATH%"
)
node scripts\lab.cjs %*
