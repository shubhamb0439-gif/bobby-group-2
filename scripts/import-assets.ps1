$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$dl = "$env:USERPROFILE\Downloads"
New-Item -ItemType Directory -Force -Path "public/spices" | Out-Null
New-Item -ItemType Directory -Force -Path "public/team" | Out-Null

# source pattern -> destination file
$map = [ordered]@{
    "cardamom.jpg"  = "close-up-of-cardamom-pods*"
    "chilli.jpg"    = "pile-of-fiery-red-chili*"
    "cinnamon.jpg"  = "cinnamon-sticks-stacked*"
    "pepper.jpg"    = "close-up-texture-of-fresh-black-peppercorns*"
    "turmeric.jpg"  = "turmeric-roots-and-powder*"
    "staranise.jpg" = "star-anise-spice-pods*"
    "cumin.jpg"     = "aromatic-caraway-seeds*"
    "cloves.jpg"    = "aromatic-pile-of-cloves*"
    "coffee.jpg"    = "roasted-coffee-beans-close-up*"
}

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)

function Save-Resized {
    param([string]$Src, [string]$Dest, [int]$MaxW)
    $img = [System.Drawing.Image]::FromFile($Src)
    $w = $img.Width; $h = $img.Height
    $nw = $w; $nh = $h
    if ($w -gt $MaxW) { $nw = $MaxW; $nh = [int]($h * $MaxW / $w) }
    $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $nw, $nh)
    $img.Dispose()
    $tmp = [System.IO.Path]::GetTempFileName() + ".jpg"
    $bmp.Save($tmp, $codec, $ep)
    $g.Dispose(); $bmp.Dispose()
    Copy-Item $tmp $Dest -Force
    Remove-Item $tmp -Force
    Write-Host ("  ok  {0}  ({1}x{2}, {3} KB)" -f (Split-Path $Dest -Leaf), $nw, $nh, [int]((Get-Item $Dest).Length / 1KB))
}

Write-Host "Spices:"
foreach ($k in $map.Keys) {
    $src = Get-ChildItem $dl -Filter $map[$k] -File | Select-Object -First 1
    if ($src) { Save-Resized -Src $src.FullName -Dest ("public/spices/" + $k) -MaxW 1400 }
    else { Write-Host "  MISS $k" }
}

Write-Host "Client photo:"
$p = Get-ChildItem $dl -Filter "IMG_0108*" -File | Select-Object -First 1
if ($p) { Save-Resized -Src $p.FullName -Dest "public/team/founder.jpg" -MaxW 1000 }
else { Write-Host "  MISS founder photo" }

Write-Host "Done."
