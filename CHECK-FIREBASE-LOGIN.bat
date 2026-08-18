@echo off
cd /d "%~dp0"
echo.
echo === Firebase login check ===
echo.
for /f "tokens=3*" %%a in ('firebase login:list 2^>^&1 ^| findstr /i "Logged in as"') do echo Logged in as: %%a %%b
echo.
echo Projects you can access:
call firebase projects:list
echo.
firebase projects:list 2>&1 | findstr /i "e-bank-dashboard" >nul
if errorlevel 1 (
  echo STATUS: WRONG ACCOUNT - e-bank-dashboard not visible
  echo Use scripts\firebase-login.cmd and sign in as mateenforjob@gmail.com
) else (
  echo STATUS: OK - ready to run DEPLOY.bat
)
echo.
pause
