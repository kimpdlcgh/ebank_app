# Generates Android launcher icons, iOS icon, and Google Play store images from
# mobile/app-icon.png (square logo with background).
#
# Legacy icons use inset scaling so the mark is not clipped on device or in Play
# Console crops. Adaptive foreground uses the same inset (no extra zoom).
#
# Also writes:
#   mobile/play-store/icon-512.png
#   mobile/play-store/feature-graphic-1024x500.png
#
# Run: npm run icons --prefix mobile
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Source = Join-Path $Root "mobile\app-icon.png"
if (-not (Test-Path $Source)) {
  Write-Error "Source icon not found: $Source"
}
$Res = Join-Path $Root "mobile\android\app\src\main\res"
if (-not (Test-Path $Res)) { Write-Error "Android res folder not found. Run setup.ps1 first." }

# Fraction of canvas used by the artwork (centered). ~0.76 = ~12% margin per side.
$LegacyScale = 0.76
$AdaptiveForegroundScale = 0.72

Write-Host "Source: $Source"
$src = [System.Drawing.Bitmap]::FromFile($Source)

function New-Canvas { param([int]$Size)
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  return @{ Bmp = $bmp; G = $g }
}

function Draw-Inset {
  param($G, [int]$Size, [double]$Scale, [System.Drawing.Color]$ClearColor)
  $G.Clear($ClearColor)
  $draw = [int][Math]::Round($Size * $Scale)
  $off = [int](($Size - $draw) / 2)
  $G.DrawImage($src, $off, $off, $draw, $draw)
}

$densities = @(
  @{ Name = "mipmap-mdpi";    Legacy = 48;  Adaptive = 108 },
  @{ Name = "mipmap-hdpi";    Legacy = 72;  Adaptive = 162 },
  @{ Name = "mipmap-xhdpi";   Legacy = 96;  Adaptive = 216 },
  @{ Name = "mipmap-xxhdpi";  Legacy = 144; Adaptive = 324 },
  @{ Name = "mipmap-xxxhdpi"; Legacy = 192; Adaptive = 432 }
)

$white = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)

foreach ($d in $densities) {
  $dir = Join-Path $Res $d.Name
  New-Item -ItemType Directory -Force -Path $dir | Out-Null

  $legacy = New-Canvas -Size $d.Legacy
  Draw-Inset -G $legacy.G -Size $d.Legacy -Scale $LegacyScale -ClearColor $white
  $legacy.Bmp.Save((Join-Path $dir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $legacy.G.Dispose(); $legacy.Bmp.Dispose()

  $round = New-Canvas -Size $d.Legacy
  $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
  $clip.AddEllipse(0, 0, $d.Legacy, $d.Legacy)
  $round.G.SetClip($clip)
  Draw-Inset -G $round.G -Size $d.Legacy -Scale $LegacyScale -ClearColor $white
  $round.Bmp.Save((Join-Path $dir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $clip.Dispose(); $round.G.Dispose(); $round.Bmp.Dispose()

  $fg = New-Canvas -Size $d.Adaptive
  Draw-Inset -G $fg.G -Size $d.Adaptive -Scale $AdaptiveForegroundScale -ClearColor $white
  $fg.Bmp.Save((Join-Path $dir "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $fg.G.Dispose(); $fg.Bmp.Dispose()

  Write-Host ("  {0}: legacy {1}px, foreground {2}px (inset)" -f $d.Name, $d.Legacy, $d.Adaptive)
}

# iOS app icon: 1024x1024, inset, no alpha (white matte).
$iosFlat = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$ifg = [System.Drawing.Graphics]::FromImage($iosFlat)
$ifg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
Draw-Inset -G $ifg -Size 1024 -Scale $LegacyScale -ClearColor $white
$ifg.Dispose()
$iosAppIconDir = Join-Path $Root "mobile\ios\App\App\Assets.xcassets\AppIcon.appiconset"
if (Test-Path $iosAppIconDir) {
  $iosFlat.Save((Join-Path $iosAppIconDir "AppIcon-512@2x.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "  iOS: wrote AppIcon-512@2x.png into asset catalog"
} else {
  $iosFlat.Save((Join-Path $Root "mobile\icon-ios-1024.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "  iOS: wrote mobile/icon-ios-1024.png"
}
$iosFlat.Dispose()

# Google Play assets
$playDir = Join-Path $Root "mobile\play-store"
New-Item -ItemType Directory -Force -Path $playDir | Out-Null

$icon512 = New-Canvas -Size 512
Draw-Inset -G $icon512.G -Size 512 -Scale 0.74 -ClearColor $white
$icon512.Bmp.Save((Join-Path $playDir "icon-512.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$icon512.G.Dispose(); $icon512.Bmp.Dispose()
Write-Host "  Play: icon-512.png"

$fw = 1024
$fh = 500
$feat = New-Object System.Drawing.Bitmap($fw, $fh)
$fg = [System.Drawing.Graphics]::FromImage($feat)
$fg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$fg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$topColor = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
$bottomColor = [System.Drawing.Color]::FromArgb(255, 168, 218, 92)
$rect = New-Object System.Drawing.Rectangle(0, 0, $fw, $fh)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  $rect, $topColor, $bottomColor,
  [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$fg.FillRectangle($brush, $rect)
$brush.Dispose()

$logoHeight = [int]($fh * 0.78)
$logoWidth = [int]($logoHeight * ($src.Width / $src.Height))
if ($logoWidth -gt [int]($fw * 0.55)) {
  $logoWidth = [int]($fw * 0.55)
  $logoHeight = [int]($logoWidth * ($src.Height / $src.Width))
}
$lx = [int](($fw - $logoWidth) / 2)
$ly = [int](($fh - $logoHeight) / 2)
$fg.DrawImage($src, $lx, $ly, $logoWidth, $logoHeight)

$fg.Dispose()
$feat.Save((Join-Path $playDir "feature-graphic-1024x500.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$feat.Dispose()
Write-Host "  Play: feature-graphic-1024x500.png"

$src.Dispose()
Write-Host "Done. Icons use inset scale (legacy $LegacyScale, adaptive $AdaptiveForegroundScale)."
