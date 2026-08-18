@echo off
REM Run from File Explorer (double-click) or:  scripts\deploy-site.cmd
cd /d "%~dp0.."
set NODE_OPTIONS=--use-system-ca
set RULES_OK=1
set HOSTING_OK=1
set NEED_PROJECT=e-bank-dashboard

echo.
echo Safeguard Securities - full site deploy
echo ========================================
echo.

for /f "tokens=3*" %%a in ('firebase login:list 2^>^&1 ^| findstr /i "Logged in as"') do set LOGGED_IN=%%a %%b
echo Logged in as: %LOGGED_IN%
echo Required project: %NEED_PROJECT%
echo Owner account: mateenforjob@gmail.com
echo.

firebase projects:list 2>&1 | findstr /i "%NEED_PROJECT%" >nul
if errorlevel 1 (
  echo WRONG GOOGLE ACCOUNT - deploy will fail.
  echo.
  echo You are NOT logged in as the Safeguard owner account.
  echo.
  echo Fix:
  echo   1. Double-click scripts\firebase-login.cmd
  echo   2. Sign in with mateenforjob@gmail.com  ^(not kimpdlc24@gmail.com^)
  echo   3. Run DEPLOY.bat again
  echo.
  echo Your projects right now:
  call firebase projects:list
  echo.
  pause
  exit /b 1
)

echo Project access OK. Starting deploy...
echo.

echo [1/2] Firestore rules
call firebase deploy --only firestore:rules --project %NEED_PROJECT%
if errorlevel 1 set RULES_OK=0

echo.
echo [2/2] Marketing hosting - safeguardsecurities.us
call firebase deploy --only hosting:marketing --project %NEED_PROJECT%
if errorlevel 1 set HOSTING_OK=0

echo.
echo ========================================
echo Deploy summary
echo ========================================
if "%RULES_OK%"=="1" (echo   Firestore rules:  OK) else (echo   Firestore rules:  FAILED)
if "%HOSTING_OK%"=="1" (echo   Marketing site:   OK) else (echo   Marketing site:   FAILED)
echo ========================================
echo.
if "%HOSTING_OK%"=="0" pause & exit /b 1
echo Done. Test: https://safeguardsecurities.us/signin
pause
exit /b 0
