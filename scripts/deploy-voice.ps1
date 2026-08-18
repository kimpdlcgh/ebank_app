# Deploy Safeguard voice IVR (Firebase function).
$ErrorActionPreference = "Stop"
$env:NODE_OPTIONS = if ($env:NODE_OPTIONS) { $env:NODE_OPTIONS } else { "--use-system-ca" }
$root = Split-Path $PSScriptRoot -Parent
$project = "e-bank-dashboard"
$envFile = Join-Path $root "functions\.env"
$envExample = Join-Path $root "functions\.env.example"

Write-Host ""
Write-Host "Safeguard Voice IVR — deploy" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $envFile)) {
  Write-Host "Creating functions\.env from .env.example" -ForegroundColor Yellow
  Copy-Item $envExample $envFile
  Write-Host ""
  Write-Host "Edit functions\.env now:" -ForegroundColor Yellow
  Write-Host "  TWILIO_AUTH_TOKEN     = main Auth Token (Twilio Console)" -ForegroundColor Gray
  Write-Host "  VOICE_RECEPTIONIST_PHONE = your cell E.164 e.g. +12162507891" -ForegroundColor Gray
  Write-Host ""
  notepad $envFile
  Read-Host "Press Enter after saving .env"
}

$envContent = Get-Content $envFile -Raw
if ($envContent -match "your_main_auth_token" -or $envContent -notmatch "TWILIO_AUTH_TOKEN=.+" ) {
  Write-Host "functions\.env still has placeholders. Fill TWILIO_AUTH_TOKEN and VOICE_RECEPTIONIST_PHONE." -ForegroundColor Red
  exit 1
}

Write-Host "Installing function dependencies..." -ForegroundColor Yellow
Set-Location (Join-Path $root "functions")
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploying functions:voice to $project ..." -ForegroundColor Yellow
Set-Location $root
firebase deploy --only functions:voice --project $project
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$voiceUrl = "https://us-central1-$project.cloudfunctions.net/voice"
Write-Host ""
Write-Host "Deployed." -ForegroundColor Green
Write-Host ""
Write-Host "Twilio — paste this webhook (Voice, POST):" -ForegroundColor Cyan
Write-Host "  $voiceUrl" -ForegroundColor White
Write-Host ""
Write-Host "Trial: add your cell under Verified Caller IDs before testing ring-through." -ForegroundColor Gray
Write-Host "Guide: $root\VOICE-IVR.md" -ForegroundColor Gray
Write-Host ""
