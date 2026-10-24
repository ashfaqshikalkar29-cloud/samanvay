@echo off
cd /d "%~dp0"
echo.
echo  ============================================
echo   SAMANVAY - AICTE Integrated Grievance Dashboard
echo   Starting dev server at http://localhost:2001
echo  ============================================
echo.
npm run dev -- --port 2001
