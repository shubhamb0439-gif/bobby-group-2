Add-Type -AssemblyName System.Drawing
$maxW = 1400
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)

Get-ChildItem public/spices/*.jpg | ForEach-Object {
    $img = [System.Drawing.Image]::FromFile($_.FullName)
    $w = $img.Width; $h = $img.Height
    $nw = $w; $nh = $h
    if ($w -gt $maxW) { $nw = $maxW; $nh = [int]($h * $maxW / $w) }
    $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $nw, $nh)
    $img.Dispose()
    $tmp = $_.FullName + '.tmp'
    $bmp.Save($tmp, $codec, $ep)
    $g.Dispose(); $bmp.Dispose()
    Move-Item $tmp $_.FullName -Force
    $kb = [int]((Get-Item $_.FullName).Length / 1KB)
    Write-Host ("  {0}  ->  {1}x{2}  ({3} KB)" -f $_.Name, $nw, $nh, $kb)
}
$sum = (Get-ChildItem public/spices | Measure-Object Length -Sum).Sum / 1MB
Write-Host ("Total: {0:N1} MB" -f $sum)
