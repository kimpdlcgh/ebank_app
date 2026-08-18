# First-time setup for Safeguard Securities Android (Capacitor).
# Run from repo root:  .\mobile\setup.ps1
# Or from mobile/:    .\setup.ps1

$ErrorActionPreference = "Stop"
$MobileDir = $PSScriptRoot
Set-Location $MobileDir

# Use Windows trust store (fixes UNABLE_TO_VERIFY_LEAF_SIGNATURE on many PCs)
$env:NODE_OPTIONS = "--use-system-ca"

Write-Host "Installing npm dependencies..."
npm install
if ($LASTEXITCODE -ne 0) {
  Write-Error "npm install failed. Fix network/SSL and retry."
}

Write-Host "Syncing Capacitor (copies www + updates native project)..."
npx cap sync android
if ($LASTEXITCODE -ne 0) {
  Write-Error "cap sync failed."
}

Write-Host "Applying launcher icons..."
& (Join-Path $MobileDir "scripts\generate-android-icons.ps1")

Write-Host ""
Write-Host "Done. Open Android Studio with:"
Write-Host "  npm run cap:open:android"
Write-Host "Or: npx cap open android"
