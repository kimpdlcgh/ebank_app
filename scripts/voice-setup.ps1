# Interactive checklist for Twilio + Firebase voice IVR setup.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "Safeguard Securities — Voice IVR setup" -ForegroundColor Cyan
Write-Host "Full guide: $root\VOICE-IVR.md" -ForegroundColor Gray
Write-Host ""

Write-Host "1) Install function dependencies" -ForegroundColor Yellow
Set-Location (Join-Path $root "functions")
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "2) Set Firebase secrets (you will be prompted)" -ForegroundColor Yellow
Write-Host "   TWILIO_AUTH_TOKEN     = from Twilio Console" -ForegroundColor Gray
Write-Host "   VOICE_RECEPTIONIST_PHONE = E.164 e.g. +12162507891" -ForegroundColor Gray
Write-Host ""

$project = "e-bank-dashboard"
firebase functions:secrets:set TWILIO_AUTH_TOKEN --project $project
firebase functions:secrets:set VOICE_RECEPTIONIST_PHONE --project $project

Write-Host ""
Write-Host "3) Optional params (press Enter to skip any prompt)" -ForegroundColor Yellow
firebase functions:params:set VOICE_CLIENT_SERVICES_PHONE --project $project
firebase functions:params:set VOICE_NEW_ACCOUNTS_PHONE --project $project
firebase functions:params:set VOICE_SUPPORT_PHONE --project $project

Write-Host ""
Write-Host "4) Deploy voice function" -ForegroundColor Yellow
Set-Location $root
firebase deploy --only functions:voice --project $project

Write-Host ""
Write-Host "5) Copy the voice URL from deploy output into Twilio:" -ForegroundColor Green
Write-Host "   Phone Number -> Voice -> A call comes in -> Webhook POST" -ForegroundColor Green
Write-Host ""
