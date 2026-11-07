param(
    [Parameter(Mandatory = $true)][string]$Project,
    [Parameter(Mandatory = $true)][string]$Logo,
    [Parameter(Mandatory = $true)][string]$Preview
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore, WindowsBase

# Rasterize the existing vector paths. No downloaded graphics or image libraries
# are needed, and every Android density uses the exact same artwork.
[xml]$svg = Get-Content -Raw -LiteralPath $Logo
$paths = @($svg.SelectNodes("//*[local-name()='path']"))
$palette = @{ st0 = '#76e4d0'; st1 = '#8db8ff'; st2 = '#18272f' }
$resources = Join-Path $Project 'app/src/main/res'

function Write-LogoPng {
    param([string]$Target, [int]$Width, [int]$Height, [string]$Mode = 'full')
    $visual = New-Object System.Windows.Media.DrawingVisual
    $drawing = $visual.RenderOpen()
    if ($Mode -eq 'splash') {
        $drawing.DrawRectangle([System.Windows.Media.BrushConverter]::new().ConvertFromString('#18272f'), $null, [System.Windows.Rect]::new(0, 0, $Width, $Height))
    }
    if ($Mode -eq 'round') {
        $drawing.PushClip([System.Windows.Media.EllipseGeometry]::new([System.Windows.Point]::new($Width / 2, $Height / 2), $Width / 2, $Height / 2))
    }
    $side = [Math]::Min($Width, $Height)
    if ($Mode -eq 'splash') { $side = [Math]::Min(256, [Math]::Max(48, $side * 0.28)) }
    $drawing.PushTransform([System.Windows.Media.TranslateTransform]::new(($Width - $side) / 2, ($Height - $side) / 2))
    $drawing.PushTransform([System.Windows.Media.ScaleTransform]::new($side / 2560, $side / 2560))
    foreach ($shape in $paths) {
        if ($Mode -eq 'foreground' -and $shape.class -eq 'st2') { continue }
        $geometry = [System.Windows.Media.Geometry]::Parse($shape.d)
        $brush = [System.Windows.Media.BrushConverter]::new().ConvertFromString($palette[$shape.class])
        $drawing.DrawGeometry($brush, $null, $geometry)
    }
    $drawing.Pop()
    $drawing.Pop()
    if ($Mode -eq 'round') { $drawing.Pop() }
    $drawing.Close()
    $bitmap = [System.Windows.Media.Imaging.RenderTargetBitmap]::new($Width, $Height, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
    $bitmap.Render($visual)
    $encoder = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
    $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bitmap))
    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($Target)) | Out-Null
    $stream = [System.IO.File]::Create($Target)
    try { $encoder.Save($stream) } finally { $stream.Dispose() }
}

foreach ($density in @(
    @{ Name = 'mdpi'; Icon = 48; Foreground = 108 },
    @{ Name = 'hdpi'; Icon = 72; Foreground = 162 },
    @{ Name = 'xhdpi'; Icon = 96; Foreground = 216 },
    @{ Name = 'xxhdpi'; Icon = 144; Foreground = 324 },
    @{ Name = 'xxxhdpi'; Icon = 192; Foreground = 432 }
)) {
    $folder = Join-Path $resources ('mipmap-' + $density.Name)
    Write-LogoPng (Join-Path $folder 'ic_launcher.png') $density.Icon $density.Icon 'full'
    Write-LogoPng (Join-Path $folder 'ic_launcher_round.png') $density.Icon $density.Icon 'round'
    Write-LogoPng (Join-Path $folder 'ic_launcher_foreground.png') $density.Foreground $density.Foreground 'foreground'
}
foreach ($splash in Get-ChildItem -LiteralPath $resources -Filter splash.png -Recurse) {
    $inputStream = [System.IO.File]::OpenRead($splash.FullName)
    try {
        $decoder = [System.Windows.Media.Imaging.PngBitmapDecoder]::new($inputStream, [System.Windows.Media.Imaging.BitmapCreateOptions]::PreservePixelFormat, [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
        $width = $decoder.Frames[0].PixelWidth
        $height = $decoder.Frames[0].PixelHeight
    } finally { $inputStream.Dispose() }
    Write-LogoPng $splash.FullName $width $height 'splash'
}
Write-LogoPng $Preview 512 512 'full'
Write-Output 'Prepared blue/mint launcher icons, adaptive foregrounds, and splash artwork.'
