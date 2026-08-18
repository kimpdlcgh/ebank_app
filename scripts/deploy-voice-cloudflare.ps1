# Deploy voice IVR to Cloudflare Workers (no Firebase Blaze required).
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$workerDir = Join-Path $root "voice-worker"

Write-Host ""
Write-Host "Safeguard Voice IVR — Cloudflare Worker" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Host "Node/npx required. Install Node.js first." -ForegroundColor Red
  exit 1
}

Set-Location $workerDir
if (-not (Test-Path "node_modules")) {
  npm install
}

Write-Host "First time only — set Worker secrets (paste Twilio Auth Token + your cell E.164):" -ForegroundColor Yellow
Write-Host "  npx wrangler secret put TWILIO_AUTH_TOKEN" -ForegroundColor Gray
Write-Host "  npx wrangler secret put VOICE_RECEPTIONIST_PHONE" -ForegroundColor Gray
Write-Host ""
$go = Read-Host "Run secret setup now? (y/n)"
if ($go -eq "y") {
  npx wrangler secret put TWILIO_AUTH_TOKEN
  npx wrangler secret put VOICE_RECEPTIONIST_PHONE
}

Write-Host "Deploying worker..." -ForegroundColor Yellow
npx wrangler deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Copy the workers.dev URL from output above." -ForegroundColor Green
Write-Host "Twilio -> your number -> Voice -> Webhook POST -> that URL" -ForegroundColor Green
Write-Host ""
