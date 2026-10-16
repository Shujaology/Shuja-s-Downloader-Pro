<#
.SYNOPSIS
    Shuja Downloader Pro v2 - High-Performance Multi-Threaded PowerShell Download Manager
.DESCRIPTION
    Accelerates file downloads by splitting files into concurrent byte-range chunks
    using .NET HttpClient and multi-threaded PowerShell Runspaces.
    Features live real-time progress bars, per-chunk and overall speed in MB/s,
    and Estimated Time Remaining (ETA) for each chunk and the total file.
.PARAMETER Url
    Target URL to download.
.PARAMETER OutFile
    Destination path or filename. If omitted, extracted from headers or URL.
.PARAMETER Threads
    Number of parallel download connections (default: 4, range: 1-32).
.PARAMETER BufferSize
    Stream read buffer size in bytes (default: 65536 = 64 KB).
.PARAMETER UserAgent
    Custom HTTP User-Agent string.
.EXAMPLE
    .\shuja_downloader_v2.ps1 -Url "https://speed.hetzner.de/100MB.bin" -Threads 4
.EXAMPLE
    .\shuja_downloader_v2.ps1 -Url "https://example.com/file.zip" -OutFile "C:\Downloads\file.zip" -Threads 8
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false, Position = 0)]
    [string]$Url,

    [Parameter(Mandatory = $false, Position = 1)]
    [string]$OutFile,

    [Parameter(Mandatory = $false)]
    [ValidateRange(1, 32)]
    [int]$Threads = 8,

    [Parameter(Mandatory = $false)]
    [int]$BufferSize = 65536,

    [Parameter(Mandatory = $false)]
    [string]$UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 ShujaDownloader/2.0",

    [Parameter(Mandatory = $false)]
    [switch]$NoConsoleDashboard
)

# Ensure UTF-8 console encoding for Unicode progress bars
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

# Ensure required .NET assemblies are loaded
Add-Type -AssemblyName System.Net.Http -ErrorAction SilentlyContinue

# Ensure modern TLS protocols and uncap .NET parallel connection throttle
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
[Net.ServicePointManager]::DefaultConnectionLimit = 64

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
function Format-Bytes {
    param ([long]$Bytes)
    if ($Bytes -ge 1GB) { return "{0:N2} GB" -f ($Bytes / 1GB) }
    if ($Bytes -ge 1MB) { return "{0:N2} MB" -f ($Bytes / 1MB) }
    if ($Bytes -ge 1KB) { return "{0:N2} KB" -f ($Bytes / 1KB) }
    return "$Bytes B"
}

function Format-TimeSpan {
    param ([double]$Seconds)
    if ([double]::IsNaN($Seconds) -or [double]::IsInfinity($Seconds) -or $Seconds -lt 0) {
        return "--:--"
    }
    $ts = [TimeSpan]::FromSeconds([Math]::Min($Seconds, 863999)) # cap at 10 days
    if ($ts.TotalHours -ge 1) {
        return "{0:D2}:{1:D2}:{2:D2}" -f [int]$ts.TotalHours, $ts.Minutes, $ts.Seconds
    }
    return "{0:D2}:{1:D2}" -f $ts.Minutes, $ts.Seconds
}

function Get-ProgressBar {
    param (
        [double]$Percent,
        [int]$Width = 24
    )
    $Percent = [Math]::Max(0.0, [Math]::Min(100.0, $Percent))
    $filledChars = [int][Math]::Round(($Percent / 100.0) * $Width)
    $emptyChars = $Width - $filledChars
    if ($emptyChars -lt 0) { $emptyChars = 0 }
    $filled = [string]::new([char]0x2588, $filledChars)  # Unicode full block '█'
    $empty  = [string]::new([char]0x2591, $emptyChars)   # Unicode light shade '░'
    return "[$filled$empty]"
}

function Get-FileNameFromUrl {
    param ([string]$DownloadUrl, [System.Net.Http.HttpResponseMessage]$Response)

    # 1. Try Content-Disposition Header
    if ($Response -and $Response.Content.Headers.ContentDisposition) {
        $cd = $Response.Content.Headers.ContentDisposition
        if ($cd.FileNameStar) { return [System.IO.Path]::GetFileName($cd.FileNameStar.Trim('"')) }
        if ($cd.FileName) { return [System.IO.Path]::GetFileName($cd.FileName.Trim('"')) }
    }

    # 2. Try URL path
    try {
        $uri = [System.Uri]::new($DownloadUrl)
        $leaf = [System.IO.Path]::GetFileName($uri.LocalPath)
        if (-not [string]::IsNullOrWhiteSpace($leaf) -and $leaf.IndexOfAny([System.IO.Path]::GetInvalidFileNameChars()) -lt 0) {
            return $leaf
        }
    } catch {}

    # 3. Default fallback
    return "download_file_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".bin"
}

# -----------------------------------------------------------------------------
# yt-dlp and FFmpeg Helper Functions
# -----------------------------------------------------------------------------
function Get-YtDlpPath {
    $cmd = Get-Command yt-dlp -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @(
        "C:\Python314\Scripts\yt-dlp.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\Scripts\yt-dlp.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\Scripts\yt-dlp.exe",
        "$env:USERPROFILE\AppData\Local\Microsoft\WindowsApps\yt-dlp.exe"
    )
    foreach ($cand in $candidates) {
        if (Test-Path $cand) { return $cand }
    }
    return $null
}

function Get-FFmpegPath {
    $cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @(
        "C:\Program Files\Softdeluxe\Free Download Manager\ffmpeg.exe",
        "C:\ffmpeg\bin\ffmpeg.exe",
        "C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        "C:\ProgramData\chocolatey\bin\ffmpeg.exe",
        "$env:USERPROFILE\scoop\shims\ffmpeg.exe"
    )
    foreach ($cand in $candidates) {
        $expanded = [System.Environment]::ExpandEnvironmentVariables($cand)
        if (Test-Path $expanded) { return $expanded }
    }
    $winget = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "ffmpeg.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($winget) { return $winget.FullName }
    return $null
}

function Merge-MediaTracksWithFFmpeg {
    param (
        [string]$VideoTrackPath,
        [string]$AudioTrackPath,
        [string]$OutputFile
    )
    $ffmpeg = Get-FFmpegPath
    if (-not $ffmpeg) {
        Write-Host "[!] Local ffmpeg not found. Keeping separate video/audio tracks." -ForegroundColor Yellow
        return $false
    }

    Write-Host "[+] Muxing video and audio tracks with local ffmpeg..." -ForegroundColor Cyan
    Write-Host "    FFmpeg Engine : $ffmpeg" -ForegroundColor DarkGray
    Write-Host "    Video Track   : $([System.IO.Path]::GetFileName($VideoTrackPath))" -ForegroundColor DarkGray
    Write-Host "    Audio Track   : $([System.IO.Path]::GetFileName($AudioTrackPath))" -ForegroundColor DarkGray
    Write-Host "    Output MP4    : $([System.IO.Path]::GetFileName($OutputFile))" -ForegroundColor DarkGray

    # Losslessly copy video stream; if audio is m4a/aac copy losslessly, otherwise convert to standard aac
    $audioCodec = if ($AudioTrackPath -match '\.(m4a|aac)$') { "copy" } else { "aac" }
    $muxArgs = @(
        "-y",
        "-hide_banner",
        "-loglevel", "warning",
        "-i", $VideoTrackPath,
        "-i", $AudioTrackPath,
        "-c:v", "copy",
        "-c:a", $audioCodec,
        "-movflags", "+faststart",
        $OutputFile
    )

    $muxSw = [System.Diagnostics.Stopwatch]::StartNew()
    & $ffmpeg $muxArgs
    $muxSw.Stop()

    if ($LASTEXITCODE -eq 0 -and (Test-Path $OutputFile) -and ((Get-Item $OutputFile).Length -gt 0)) {
        Write-Host "[+] Muxing complete in $($muxSw.Elapsed.TotalSeconds.ToString('N2'))s! Non-silent MP4 generated: $OutputFile" -ForegroundColor Green
        # Clean up temporary track files
        Remove-Item $VideoTrackPath -Force -ErrorAction SilentlyContinue
        Remove-Item $AudioTrackPath -Force -ErrorAction SilentlyContinue
        return $true
    } else {
        Write-Host "[!] ffmpeg muxing encountered an error (exit code $LASTEXITCODE)." -ForegroundColor Yellow
        return $false
    }
}

function Is-YouTubeUrl {
    param ([string]$TestUrl)
    if ([string]::IsNullOrWhiteSpace($TestUrl)) { return $false }
    return ($TestUrl -match "^https?://([a-zA-Z0-9-]+\.)*(youtube\.com|youtu\.be)/")
}

function Extract-YouTubeMediaStream {
    param (
        [string]$VideoUrl
    )
    $ytdlp = Get-YtDlpPath
    if (-not $ytdlp) {
        throw "yt-dlp executable not found. Install it with: python -m pip install -U yt-dlp"
    }

    Write-Host "[+] Resolving YouTube DASH media streams (1080p/4K) with yt-dlp..." -ForegroundColor Cyan

    $argsList = @(
        "--no-warnings",
        "--no-playlist",
        "--js-runtimes", "node",
        "--remote-components", "ejs:github",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
        "-j",
        $VideoUrl
    )

    $output = & $ytdlp $argsList 2>&1
    $jsonObj = $null
    try {
        $jsonObj = $output | ConvertFrom-Json
    } catch {
        $jsonObj = $null
    }

    if ($jsonObj) {
        $title = $jsonObj.title
        $invalidChars = [System.IO.Path]::GetInvalidFileNameChars()
        $safeTitle = -join ($title.ToCharArray() | ForEach-Object { if ($invalidChars -contains $_) { '_' } else { $_ } })
        $safeTitle = $safeTitle.Trim(" ._")
        if ([string]::IsNullOrWhiteSpace($safeTitle)) { $safeTitle = "YouTube_Video_" + (Get-Date -Format "yyyyMMdd_HHmmss") }
        $cleanFileName = "$safeTitle.mp4"

        # Check if DASH (separate video and audio streams)
        $isDash = ($jsonObj.requested_formats -and $jsonObj.requested_formats.Count -ge 2)
        if ($isDash) {
            $vFmt = $jsonObj.requested_formats[0]
            $aFmt = $jsonObj.requested_formats[1]

            $vUrl = $vFmt.url
            $vExt = if ($vFmt.ext) { $vFmt.ext } else { "mp4" }
            $vSize = if ($vFmt.filesize) { [long]$vFmt.filesize } elseif ($vFmt.filesize_approx) { [long]$vFmt.filesize_approx } else { -1 }
            $res = if ($vFmt.resolution) { $vFmt.resolution } else { "$($vFmt.width)x$($vFmt.height)" }

            $aUrl = $aFmt.url
            $aExt = if ($aFmt.ext) { $aFmt.ext } else { "m4a" }
            $aSize = if ($aFmt.filesize) { [long]$aFmt.filesize } elseif ($aFmt.filesize_approx) { [long]$aFmt.filesize_approx } else { -1 }

            return [PSCustomObject]@{
                Success      = $true
                IsDash       = $true
                Title        = $title
                FileName     = $cleanFileName
                Resolution   = $res
                VideoUrl     = $vUrl
                VideoExt     = $vExt
                VideoSize    = $vSize
                AudioUrl     = $aUrl
                AudioExt     = $aExt
                AudioSize    = $aSize
                TotalSize    = if ($vSize -gt 0 -and $aSize -gt 0) { $vSize + $aSize } else { -1 }
                StreamUrl    = $vUrl
                ErrorMessage = ""
            }
        } else {
            # Single progressive stream
            $pSize = if ($jsonObj.filesize) { [long]$jsonObj.filesize } elseif ($jsonObj.filesize_approx) { [long]$jsonObj.filesize_approx } else { -1 }
            $pExt = if ($jsonObj.ext) { $jsonObj.ext } else { "mp4" }

            return [PSCustomObject]@{
                Success      = $true
                IsDash       = $false
                Title        = $title
                FileName     = "$safeTitle.$pExt"
                Resolution   = $jsonObj.resolution
                VideoUrl     = $jsonObj.url
                VideoExt     = $pExt
                VideoSize    = $pSize
                AudioUrl     = $null
                AudioExt     = $null
                AudioSize    = 0
                TotalSize    = $pSize
                StreamUrl    = $jsonObj.url
                ErrorMessage = ""
            }
        }
    }

    # Fallback with raw line extraction
    return [PSCustomObject]@{
        Success      = $false
        IsDash       = $false
        Title        = ""
        FileName     = ""
        Resolution   = ""
        VideoUrl     = ""
        VideoExt     = ""
        VideoSize    = -1
        AudioUrl     = ""
        AudioExt     = ""
        AudioSize    = -1
        TotalSize    = -1
        StreamUrl    = ""
        ErrorMessage = ($output | Out-String).Trim()
    }
}

function Download-WithYtDlp {
    param (
        [string]$VideoUrl,
        [string]$DestinationPath,
        [int]$ThreadCount = 8
    )
    $ytdlp = Get-YtDlpPath
    if (-not $ytdlp) {
        throw "yt-dlp is not installed. Run: python -m pip install -U yt-dlp"
    }
    $ffmpeg = Get-FFmpegPath

    Write-Host "[+] Downloading best video/audio tracks automatically via yt-dlp ($ThreadCount connections)..." -ForegroundColor Cyan
    if ($ffmpeg) {
        Write-Host "[+] Local FFmpeg detected: $ffmpeg" -ForegroundColor DarkGray
    }

    # Ensure destination ends in .mp4
    $finalMp4 = if ($DestinationPath.EndsWith(".mp4", [System.StringComparison]::OrdinalIgnoreCase)) {
        $DestinationPath
    } else {
        [System.IO.Path]::ChangeExtension($DestinationPath, "mp4")
    }

    $outDir = [System.IO.Path]::GetDirectoryName($finalMp4)
    if (-not [string]::IsNullOrWhiteSpace($outDir) -and -not (Test-Path $outDir)) {
        [System.IO.Directory]::CreateDirectory($outDir) | Out-Null
    }
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($finalMp4)

    # Use a track template for separate video and audio files
    $tempTemplate = [System.IO.Path]::Combine($outDir, "$baseName.track.%(format_id)s.%(ext)s")

    $dlArgs = @(
        "--no-warnings",
        "--no-playlist",
        "--js-runtimes", "node",
        "--remote-components", "ejs:github",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
        "-N", "$ThreadCount",
        "-o", $tempTemplate,
        $VideoUrl
    )

    & $ytdlp $dlArgs

    # Scan for downloaded track files
    $trackFiles = Get-ChildItem -Path $outDir -Filter "$baseName.track.*" -ErrorAction SilentlyContinue
    $vFile = $trackFiles | Where-Object { $_.Extension -match '^\.(mp4|webm|mkv)$' -and $_.Name -notmatch 'audio' } | Select-Object -First 1
    $aFile = $trackFiles | Where-Object { $_.Extension -match '^\.(m4a|webm|opus|aac)$' -or $_.Name -match 'audio' } | Select-Object -First 1

    if ($vFile -and $aFile) {
        Write-Host "[+] Best video track downloaded: $($vFile.Name) ($(Format-Bytes $vFile.Length))" -ForegroundColor Green
        Write-Host "[+] Best audio track downloaded: $($aFile.Name) ($(Format-Bytes $aFile.Length))" -ForegroundColor Green
        Write-Host "[+] Invoking local ffmpeg to mux video and audio into: $([System.IO.Path]::GetFileName($finalMp4))..." -ForegroundColor Cyan
        $ok = Merge-MediaTracksWithFFmpeg -VideoTrackPath $vFile.FullName -AudioTrackPath $aFile.FullName -OutputFile $finalMp4
        if ($ok) { return $true }
    } elseif ($trackFiles.Count -eq 1) {
        # Single file downloaded (already progressive)
        Move-Item -Path $trackFiles[0].FullName -Destination $finalMp4 -Force -ErrorAction SilentlyContinue
        return (Test-Path $finalMp4)
    }

    # Also check if already exists at $finalMp4
    if (Test-Path $finalMp4) {
        return $true
    }

    return $false
}

# -----------------------------------------------------------------------------
# Input Prompting & Validation
# -----------------------------------------------------------------------------
if ([string]::IsNullOrWhiteSpace($Url)) {
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "   SHUJA DOWNLOADER PRO v2.0 - MULTI-THREADED DOWNLOAD MANAGER    " -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
    $Url = Read-Host "Enter download URL"
    if ([string]::IsNullOrWhiteSpace($Url)) {
        Write-Error "No URL provided. Exiting."
        return
    }
}

$isYouTube = Is-YouTubeUrl $Url
$ytMedia = $null
$finalUrl = $Url

if ($isYouTube) {
    try {
        $ytMedia = Extract-YouTubeMediaStream -VideoUrl $Url
        if ($ytMedia.Success) {
            Write-Host "[+] YouTube stream resolved: $($ytMedia.Title)" -ForegroundColor Green
            if ($ytMedia.IsDash) {
                Write-Host "[+] YouTube DASH stream detected (1080p/4K): Resolution $($ytMedia.Resolution)" -ForegroundColor Magenta
                Write-Host "    Best Video Track : $(Format-Bytes $ytMedia.VideoSize) ($($ytMedia.VideoExt))" -ForegroundColor Cyan
                Write-Host "    Best Audio Track : $(Format-Bytes $ytMedia.AudioSize) ($($ytMedia.AudioExt))" -ForegroundColor Cyan
                Write-Host "    Total Media Size : $(Format-Bytes $ytMedia.TotalSize)" -ForegroundColor Cyan
                if ([string]::IsNullOrWhiteSpace($OutFile)) {
                    $OutFile = [System.IO.Path]::Combine((Get-Location).Path, $ytMedia.FileName)
                }

                Write-Host "[+] Downloading best video and audio tracks via yt-dlp ($Threads connections)..." -ForegroundColor Green
                $ok = Download-WithYtDlp -VideoUrl $Url -DestinationPath $OutFile -ThreadCount $Threads
                if ($ok) {
                    if (Test-Path $OutFile) {
                        $finalLen = (Get-Item $OutFile).Length
                        Write-Host "[+] Computing SHA-256 checksum for merged file..." -ForegroundColor Cyan
                        $hashVal = (Get-FileHash -Path $OutFile -Algorithm SHA256).Hash
                        Write-Host ""
                        Write-Host "=================================================================" -ForegroundColor Green
                        Write-Host "   DOWNLOAD & MUX SUCCESSFUL - VIDEO IS NOT SILENT" -ForegroundColor Green
                        Write-Host "=================================================================" -ForegroundColor Green
                        Write-Host " File       : $OutFile" -ForegroundColor Yellow
                        Write-Host " Size       : $(Format-Bytes $finalLen) ($finalLen bytes)" -ForegroundColor Cyan
                        Write-Host " SHA-256    : $hashVal" -ForegroundColor Green
                        Write-Host " Status     : Merged MP4 (Video + Audio Synced with local FFmpeg)" -ForegroundColor Green
                        Write-Host "=================================================================" -ForegroundColor Green
                    }
                    return
                }
            } else {
                # Progressive single stream
                Write-Host "[+] Format: $($ytMedia.VideoExt) | Estimated Size: $(Format-Bytes $ytMedia.VideoSize)" -ForegroundColor Cyan
                Write-Host "[+] Piping direct stream into $Threads-thread Runspace accelerator..." -ForegroundColor Green
                $finalUrl = $ytMedia.StreamUrl
                if ([string]::IsNullOrWhiteSpace($OutFile)) {
                    $OutFile = [System.IO.Path]::Combine((Get-Location).Path, $ytMedia.FileName)
                }
            }
        } else {
            Write-Host "[!] Could not extract direct single stream: $($ytMedia.ErrorMessage)" -ForegroundColor Yellow
            Write-Host "[*] Falling back to automatic yt-dlp best video/audio download..." -ForegroundColor Yellow
            $outDest = if ([string]::IsNullOrWhiteSpace($OutFile)) { [System.IO.Path]::Combine((Get-Location).Path, "%(title)s.mp4") } else { $OutFile }
            $ok = Download-WithYtDlp -VideoUrl $Url -DestinationPath $outDest -ThreadCount $Threads
            if ($ok) { return }
        }
    } catch {
        Write-Host "[!] YouTube extraction error: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "[*] Attempting yt-dlp direct download fallback..." -ForegroundColor Yellow
        $outDest = if ([string]::IsNullOrWhiteSpace($OutFile)) { [System.IO.Path]::Combine((Get-Location).Path, "%(title)s.mp4") } else { $OutFile }
        $ok = Download-WithYtDlp -VideoUrl $Url -DestinationPath $outDest -ThreadCount $Threads
        if ($ok) { return }
    }
}

Write-Host "`n[+] Connecting to server to query file metadata..." -ForegroundColor Cyan
$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $true
$handler.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate

$client = [System.Net.Http.HttpClient]::new($handler)
$client.DefaultRequestHeaders.Add("User-Agent", $UserAgent)
$client.Timeout = [TimeSpan]::FromSeconds(15)

$contentLength = if ($ytMedia -and $ytMedia.FileSize -gt 0) { [long]$ytMedia.FileSize } else { -1 }
$acceptRanges = $false

try {
    # If already a YouTube stream or Range supported, probe with Range: bytes=0-0
    if ($isYouTube -and $ytMedia -and $ytMedia.Success) {
        $rangeProbe = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $finalUrl)
        $rangeProbe.Headers.Range = [System.Net.Http.Headers.RangeHeaderValue]::new(0, 0)
        $probeResponse = $client.SendAsync($rangeProbe, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()

        if ($probeResponse.StatusCode -eq [System.Net.HttpStatusCode]::PartialContent) {
            $acceptRanges = $true
            if ($probeResponse.Content.Headers.ContentRange -and $probeResponse.Content.Headers.ContentRange.Length) {
                $contentLength = [long]$probeResponse.Content.Headers.ContentRange.Length
            }
        } elseif ($probeResponse.Content.Headers.ContentLength) {
            $contentLength = [long]$probeResponse.Content.Headers.ContentLength
        }
        $probeResponse.Dispose()
    } else {
        $headRequest = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Head, $Url)
        $headResponse = $client.SendAsync($headRequest).GetAwaiter().GetResult()

        if ($headResponse.RequestMessage.RequestUri) {
            $finalUrl = $headResponse.RequestMessage.RequestUri.AbsoluteUri
        }

        if ($headResponse.Content.Headers.ContentLength) {
            $contentLength = [long]$headResponse.Content.Headers.ContentLength
        }

        if ($headResponse.Headers.AcceptRanges -contains "bytes") {
            $acceptRanges = $true
        }

        # Fallback to GET with Range 0-0 if HEAD did not confirm Content-Length or Range support
        if ($contentLength -le 0 -or -not $acceptRanges) {
            $rangeProbe = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $finalUrl)
            $rangeProbe.Headers.Range = [System.Net.Http.Headers.RangeHeaderValue]::new(0, 0)
            $probeResponse = $client.SendAsync($rangeProbe, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()

            if ($probeResponse.StatusCode -eq [System.Net.HttpStatusCode]::PartialContent) {
                $acceptRanges = $true
                if ($probeResponse.Content.Headers.ContentRange -and $probeResponse.Content.Headers.ContentRange.Length) {
                    $contentLength = [long]$probeResponse.Content.Headers.ContentRange.Length
                }
            } elseif ($contentLength -le 0 -and $probeResponse.Content.Headers.ContentLength) {
                $contentLength = [long]$probeResponse.Content.Headers.ContentLength
            }
            $probeResponse.Dispose()
        }
    }

    # Resolve filename
    if ([string]::IsNullOrWhiteSpace($OutFile)) {
        if ($ytMedia -and -not [string]::IsNullOrWhiteSpace($ytMedia.FileName)) {
            $OutFile = [System.IO.Path]::Combine((Get-Location).Path, $ytMedia.FileName)
        } else {
            $resolvedFileName = Get-FileNameFromUrl -DownloadUrl $finalUrl -Response (Get-Variable -Name headResponse -ValueOnly -ErrorAction SilentlyContinue)
            $OutFile = [System.IO.Path]::Combine((Get-Location).Path, $resolvedFileName)
        }
    } else {
        if (-not [System.IO.Path]::IsPathRooted($OutFile)) {
            $OutFile = [System.IO.Path]::Combine((Get-Location).Path, $OutFile)
        }
    }
} catch {
    Write-Host "`n[!] Failed to probe URL: $($_.Exception.Message)" -ForegroundColor Red
    if ($client) { $client.Dispose() }
    if ($handler) { $handler.Dispose() }
    return
}

# -----------------------------------------------------------------------------
# Display Download Specifications
# -----------------------------------------------------------------------------
$targetDirectory = [System.IO.Path]::GetDirectoryName($OutFile)
if (-not [string]::IsNullOrWhiteSpace($targetDirectory) -and -not (Test-Path $targetDirectory)) {
    [System.IO.Directory]::CreateDirectory($targetDirectory) | Out-Null
}

$fileName = [System.IO.Path]::GetFileName($OutFile)
Write-Host ""
Write-Host "-----------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " File Name      : " -NoNewline; Write-Host $fileName -ForegroundColor Yellow
Write-Host " Destination    : " -NoNewline; Write-Host $OutFile -ForegroundColor Gray
Write-Host " File Size      : " -NoNewline
if ($contentLength -gt 0) {
    Write-Host ("{0} ({1:N0} bytes)" -f (Format-Bytes $contentLength), $contentLength) -ForegroundColor Green
} else {
    Write-Host "Unknown (Server did not report Content-Length)" -ForegroundColor Yellow
}
Write-Host " Range Support  : " -NoNewline
if ($acceptRanges) {
    Write-Host "YES (Multi-thread chunk acceleration enabled)" -ForegroundColor Green
} else {
    Write-Host "NO (Falling back to single-stream download)" -ForegroundColor Yellow
}
Write-Host " Stream Threads : " -NoNewline; Write-Host $(if ($acceptRanges -and $contentLength -gt 0) { $Threads } else { 1 }) -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# If range is not supported or length is unknown, adjust thread count to 1
if (-not $acceptRanges -or $contentLength -le 0) {
    $Threads = 1
}

# -----------------------------------------------------------------------------
# Segment Calculation
# -----------------------------------------------------------------------------
$chunks = [System.Collections.Generic.List[PSObject]]::new()

if ($Threads -eq 1 -or $contentLength -le 0) {
    $chunkObj = [PSCustomObject]@{
        Id               = 1
        StartByte        = [long]0
        EndByte          = [long]($contentLength - 1)
        TotalBytes       = [long]$contentLength
        PartFile         = "$OutFile.part1"
    }
    $chunks.Add($chunkObj)
} else {
    $chunkSize = [long][Math]::Floor($contentLength / $Threads)
    for ($i = 0; $i -lt $Threads; $i++) {
        $start = [long]($i * $chunkSize)
        $end = if ($i -eq ($Threads - 1)) { [long]($contentLength - 1) } else { [long](($i + 1) * $chunkSize - 1) }
        $total = [long]($end - $start + 1)
        $chunkObj = [PSCustomObject]@{
            Id               = ($i + 1)
            StartByte        = $start
            EndByte          = $end
            TotalBytes       = $total
            PartFile         = "$OutFile.part$($i + 1)"
        }
        $chunks.Add($chunkObj)
    }
}

# -----------------------------------------------------------------------------
# Thread-Safe Shared State
# -----------------------------------------------------------------------------
$sharedState = [hashtable]::Synchronized(@{
    Chunks       = [hashtable]::Synchronized(@{})
    IsComplete   = $false
    HasError     = $false
    ErrorMessage = ""
})

foreach ($chk in $chunks) {
    $sharedState.Chunks[$chk.Id] = [hashtable]::Synchronized(@{
        Id               = $chk.Id
        StartByte        = $chk.StartByte
        EndByte          = $chk.EndByte
        TotalBytes       = $chk.TotalBytes
        PartFile         = $chk.PartFile
        DownloadedBytes  = [long]0
        SpeedMBs         = [double]0.0
        ETASeconds       = [double]0.0
        Status           = "Pending"   # Pending, Connecting, Downloading, Completed, Error
        ErrorMessage     = ""
        LastBytes        = [long]0
        LastTimeTicks    = [System.DateTime]::UtcNow.Ticks
    })
}

# -----------------------------------------------------------------------------
# Worker ScriptBlock for Runspaces
# -----------------------------------------------------------------------------
$workerScript = {
    param(
        [int]$ChunkId,
        [string]$TargetUrl,
        [string]$UserAgent,
        [int]$BufferSize,
        [hashtable]$SharedChunks
    )

    Add-Type -AssemblyName System.Net.Http -ErrorAction SilentlyContinue
    [Net.ServicePointManager]::DefaultConnectionLimit = 64

    $chunkState = $SharedChunks[$ChunkId]
    $partFile = $chunkState.PartFile
    $startByte = $chunkState.StartByte
    $endByte = $chunkState.EndByte
    $totalBytes = $chunkState.TotalBytes

    # Stagger chunk starts slightly to avoid bursting CDN/server rate limits (HTTP 429)
    if ($ChunkId -gt 1) {
        Start-Sleep -Milliseconds (($ChunkId - 1) * 120)
    }

    $maxRetries = 6
    $retryCount = 0
    $retryDelayMs = 400
    $success = $false
    $lastError = ""

    while ($retryCount -lt $maxRetries -and -not $success) {
        $fileStream = $null
        $netStream = $null
        $response = $null
        $handler = $null
        $client = $null

        try {
            $currentDownloaded = [long]$chunkState.DownloadedBytes
            if ($totalBytes -gt 0 -and $currentDownloaded -ge $totalBytes) {
                $chunkState.Status = "Completed"
                $success = $true
                break
            }

            $currentStart = $startByte + $currentDownloaded
            if ($totalBytes -le 0 -or $endByte -ge $currentStart) {
                $chunkState.Status = if ($retryCount -gt 0) { "Connecting (Retry $retryCount)" } else { "Connecting" }

                $handler = [System.Net.Http.HttpClientHandler]::new()
                $handler.AllowAutoRedirect = $true
                $handler.AutomaticDecompression = [System.Net.DecompressionMethods]::None

                $client = [System.Net.Http.HttpClient]::new($handler)
                $client.DefaultRequestHeaders.Add("User-Agent", $UserAgent)
                $client.Timeout = [TimeSpan]::FromSeconds(60)

                $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $TargetUrl)
                if ($totalBytes -gt 0) {
                    $request.Headers.Range = [System.Net.Http.Headers.RangeHeaderValue]::new($currentStart, $endByte)
                }

                $response = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()

                # Handle HTTP 429 Too Many Requests or 503 Service Unavailable with backoff
                if ($response.StatusCode -eq [System.Net.HttpStatusCode]::TooManyRequests -or [int]$response.StatusCode -eq 503) {
                    $retryCount++
                    $chunkState.Status = "RateLimited"
                    Start-Sleep -Milliseconds ($retryDelayMs * $retryCount)
                    continue
                }

                $response.EnsureSuccessStatusCode() | Out-Null

                $netStream = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
                try {
                    if ($netStream.CanTimeout) {
                        $netStream.ReadTimeout = 20000
                    }
                } catch {}
                $fileMode = if ($currentDownloaded -gt 0) { [System.IO.FileMode]::Append } else { [System.IO.FileMode]::Create }
                $fileStream = [System.IO.FileStream]::new(
                    $partFile,
                    $fileMode,
                    [System.IO.FileAccess]::Write,
                    [System.IO.FileShare]::None,
                    $BufferSize,
                    [System.IO.FileOptions]::None
                )

                $buffer = [byte[]]::new($BufferSize)
                $chunkState.Status = "Downloading"
                $chunkState.LastTimeTicks = [System.DateTime]::UtcNow.Ticks

                while ($true) {
                    $bytesRead = $netStream.Read($buffer, 0, $buffer.Length)
                    if ($bytesRead -le 0) { break }

                    $fileStream.Write($buffer, 0, $bytesRead)
                    $chunkState.DownloadedBytes = [long]($chunkState.DownloadedBytes + $bytesRead)
                }

                $fileStream.Flush()
                $success = $true
                $chunkState.Status = "Completed"
                $chunkState.SpeedMBs = 0.0
                $chunkState.ETASeconds = 0.0
            } else {
                $success = $true
                $chunkState.Status = "Completed"
            }
        } catch {
            $lastError = $_.Exception.Message
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Start-Sleep -Milliseconds ($retryDelayMs * $retryCount)
            } else {
                $chunkState.Status = "Error"
                $chunkState.ErrorMessage = $lastError
            }
        } finally {
            if ($fileStream) { $fileStream.Dispose() }
            if ($netStream) { $netStream.Dispose() }
            if ($response) { $response.Dispose() }
            if ($client) { $client.Dispose() }
            if ($handler) { $handler.Dispose() }
        }
    }
}

# -----------------------------------------------------------------------------
# Initialize Runspace Pool
# -----------------------------------------------------------------------------
# Clean up any stale part files from prior runs
foreach ($chk in $chunks) {
    if (Test-Path $chk.PartFile) {
        Remove-Item $chk.PartFile -Force -ErrorAction SilentlyContinue
    }
}

$runspacePool = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspacePool($Threads, $Threads)
$runspacePool.Open()

$tasks = [System.Collections.Generic.List[PSObject]]::new()

foreach ($chk in $chunks) {
    $psInstance = [System.Management.Automation.PowerShell]::Create()
    $psInstance.RunspacePool = $runspacePool
    [void]$psInstance.AddScript($workerScript)
    [void]$psInstance.AddParameter("ChunkId", $chk.Id)
    [void]$psInstance.AddParameter("TargetUrl", $finalUrl)
    [void]$psInstance.AddParameter("UserAgent", $UserAgent)
    [void]$psInstance.AddParameter("BufferSize", $BufferSize)
    [void]$psInstance.AddParameter("SharedChunks", $sharedState.Chunks)

    $asyncHandle = $psInstance.BeginInvoke()
    $tasks.Add([PSCustomObject]@{
        Id          = $chk.Id
        PowerShell  = $psInstance
        AsyncHandle = $asyncHandle
    })
}

# -----------------------------------------------------------------------------
# Live UI Monitoring Loop (Progress Bar, Speed in MB/s, ETA per Chunk & Total)
# -----------------------------------------------------------------------------
$overallStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$lastSampleTime = [System.DateTime]::UtcNow
$lastTotalDownloaded = [long]0
$overallSpeedMBs = 0.0
$emaAlpha = 0.35 # Exponential Moving Average smoothing factor

# Save cursor top for clean redraw if supported
$isRedirected = [Console]::IsOutputRedirected
$supportsRawUI = $false
try {
    if (-not $NoConsoleDashboard -and -not $isRedirected -and $Host.UI -and $Host.UI.RawUI -and $Host.UI.RawUI.CursorPosition) {
        $startCursorTop = $Host.UI.RawUI.CursorPosition.Y
        $supportsRawUI = $true
    }
} catch {
    $supportsRawUI = $false
}

$lastPrintTime = [System.DateTime]::MinValue
$consoleLinesDrawn = 0

try {
    while ($true) {
        # Check task completion status
        $allDone = $true
        $anyError = $false
        $errorMsg = ""

        foreach ($task in $tasks) {
            $chkState = $sharedState.Chunks[$task.Id]
            if ($chkState.Status -eq "Error") {
                $anyError = $true
                $errorMsg = "Chunk #$($task.Id): $($chkState.ErrorMessage)"
            }
            if (-not $task.AsyncHandle.IsCompleted -or $chkState.Status -notin @("Completed", "Error")) {
                $allDone = $false
            }
        }

        if ($anyError) {
            $sharedState.HasError = $true
            $sharedState.ErrorMessage = $errorMsg
            break
        }

        # Calculate time delta for speed sampling
        $now = [System.DateTime]::UtcNow
        $dt = ($now - $lastSampleTime).TotalSeconds
        if ($dt -lt 0.1) { $dt = 0.1 }

        # Aggregate download progress
        $currentTotalDownloaded = [long]0
        $activeChunks = 0

        foreach ($chk in $chunks) {
            $st = $sharedState.Chunks[$chk.Id]
            $downloaded = [long]$st.DownloadedBytes
            $currentTotalDownloaded += $downloaded

            # Per-chunk speed and ETA calculation
            $chunkDelta = $downloaded - $st.LastBytes
            $chunkInstSpeed = if ($dt -gt 0) { ($chunkDelta / (1024 * 1024)) / $dt } else { 0.0 }
            
            # Smooth per-chunk speed (EMA)
            if ($st.Status -eq "Downloading") {
                $activeChunks++
                $st.SpeedMBs = if ($st.SpeedMBs -le 0.001) { $chunkInstSpeed } else { ($st.SpeedMBs * (1 - $emaAlpha)) + ($chunkInstSpeed * $emaAlpha) }
                $remBytes = [Math]::Max([long]0, ($st.TotalBytes - $downloaded))
                $st.ETASeconds = if ($st.SpeedMBs -gt 0.01) { ($remBytes / (1024 * 1024)) / $st.SpeedMBs } else { -1 }
            } elseif ($st.Status -eq "Completed") {
                $st.SpeedMBs = 0.0
                $st.ETASeconds = 0.0
            }

            $st.LastBytes = $downloaded
        }

        # Overall speed calculation (EMA)
        $totalDelta = $currentTotalDownloaded - $lastTotalDownloaded
        $instantOverallSpeed = if ($dt -gt 0) { ($totalDelta / (1024 * 1024)) / $dt } else { 0.0 }
        $overallSpeedMBs = if ($overallSpeedMBs -le 0.001) { $instantOverallSpeed } else { ($overallSpeedMBs * (1 - $emaAlpha)) + ($instantOverallSpeed * $emaAlpha) }
        
        $lastTotalDownloaded = $currentTotalDownloaded
        $lastSampleTime = $now

        # Overall ETA calculation
        $overallETASeconds = -1
        if ($contentLength -gt 0) {
            $remainingOverallBytes = [Math]::Max([long]0, ($contentLength - $currentTotalDownloaded))
            if ($overallSpeedMBs -gt 0.01) {
                $overallETASeconds = ($remainingOverallBytes / (1024 * 1024)) / $overallSpeedMBs
            }
        }

        $overallPercent = if ($contentLength -gt 0) { [Math]::Min(100.0, ($currentTotalDownloaded / $contentLength) * 100.0) } else { 0.0 }

        # ---------------------------------------------------------------------
        # Render Live Terminal Dashboard
        # ---------------------------------------------------------------------
        if ($supportsRawUI) {
            # Move cursor back to the start of the dashboard block to prevent flicker
            try {
                $Host.UI.RawUI.CursorPosition = [System.Management.Automation.Host.Coordinates]::new(0, $startCursorTop)
            } catch {
                $supportsRawUI = $false
            }
        }

        $uiLines = [System.Collections.Generic.List[string]]::new()
        $uiLines.Add("===================[ SHUJA DOWNLOADER LIVE PROGRESS ]===================")

        # Chunk progress rows
        foreach ($chk in $chunks) {
            $st = $sharedState.Chunks[$chk.Id]
            $cDownloaded = [long]$st.DownloadedBytes
            $cTotal = [long]$st.TotalBytes
            $cPercent = if ($cTotal -gt 0) { [Math]::Min(100.0, ($cDownloaded / $cTotal) * 100.0) } else { 0.0 }
            $cBar = Get-ProgressBar -Percent $cPercent -Width 18
            $cSpeedStr = "{0,6:N2} MB/s" -f $st.SpeedMBs
            $cETAStr = Format-TimeSpan -Seconds $st.ETASeconds
            $cStatusStr = switch -Wildcard ($st.Status) {
                "Completed"   { "[DONE] " }
                "Downloading" { "[BUSY] " }
                "Connecting*" { "[CONN] " }
                "RateLimited" { "[RATE] " }
                "Error"       { "[ERR]  " }
                Default       { "[WAIT] " }
            }

            $line = " Chunk #{0,-2} {1} {2,5:N1}% | {3} | ETA: {4,-5} | {5,9} / {6,-9} {7}" -f `
                $chk.Id, $cBar, $cPercent, $cSpeedStr, $cETAStr, (Format-Bytes $cDownloaded), (Format-Bytes $cTotal), $cStatusStr
            $uiLines.Add($line)
        }

        $uiLines.Add("-------------------------------------------------------------------------")
        
        # Overall Summary Section
        $overallBar = Get-ProgressBar -Percent $overallPercent -Width 24
        $totalETAStr = Format-TimeSpan -Seconds $overallETASeconds
        $elapsedStr = Format-TimeSpan -Seconds $overallStopwatch.Elapsed.TotalSeconds
        $totalBytesStr = if ($contentLength -gt 0) { Format-Bytes $contentLength } else { "Unknown" }

        $summaryLine1 = " Total:   {0} {1,5:N1}%  ({2} / {3})" -f `
            $overallBar, $overallPercent, (Format-Bytes $currentTotalDownloaded), $totalBytesStr
        $summaryLine2 = " Speed:   {0,6:N2} MB/s  |  Total ETA: {1,-5}  |  Elapsed: {2}" -f `
            $overallSpeedMBs, $totalETAStr, $elapsedStr

        $uiLines.Add($summaryLine1)
        $uiLines.Add($summaryLine2)
        $uiLines.Add("=========================================================================")

        $shouldRender = $true
        if (-not $supportsRawUI) {
            $timeSinceLastPrint = ($now - $lastPrintTime).TotalSeconds
            if ($timeSinceLastPrint -lt 1.0 -and -not $allDone) {
                $shouldRender = $false
            } else {
                $lastPrintTime = $now
            }
        }

        if (-not $NoConsoleDashboard -and $shouldRender) {
            if ($supportsRawUI) {
                foreach ($line in $uiLines) {
                    Write-Host ($line.PadRight(80))
                }
            } else {
                foreach ($line in $uiLines) {
                    Write-Host $line
                }
                Write-Host ""
            }
        }

        # Also update PowerShell's native Write-Progress bar
        Write-Progress -Activity "Downloading $fileName with $Threads threads" `
                       -Status ("Speed: {0:N2} MB/s | Total ETA: {1} | Downloaded: {2} of {3}" -f $overallSpeedMBs, $totalETAStr, (Format-Bytes $currentTotalDownloaded), $totalBytesStr) `
                       -PercentComplete ([int]$overallPercent)

        if ($allDone) { break }
        Start-Sleep -Milliseconds 150
    }
} finally {
    Write-Progress -Activity "Downloading $fileName with $Threads threads" -Completed
}

Write-Host ""
$overallStopwatch.Stop()

# -----------------------------------------------------------------------------
# Error Handling
# -----------------------------------------------------------------------------
if ($sharedState.HasError) {
    Write-Host "`n[!] Download Failed: $($sharedState.ErrorMessage)" -ForegroundColor Red
    
    # Clean up part files
    foreach ($chk in $chunks) {
        if (Test-Path $chk.PartFile) {
            Remove-Item $chk.PartFile -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Cleanup Runspace Pool
    $runspacePool.Close()
    $runspacePool.Dispose()
    return
}

# -----------------------------------------------------------------------------
# Chunk Reassembly & Verification
# -----------------------------------------------------------------------------
Write-Host "`n[+] All $($chunks.Count) stream chunks downloaded successfully!" -ForegroundColor Green
Write-Host "[+] Assembling chunk parts into final file: $fileName..." -ForegroundColor Cyan

$assemblyStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$finalFileStream = $null

try {
    # Check that all part files exist and are complete
    foreach ($chk in $chunks) {
        if (-not (Test-Path $chk.PartFile)) {
            throw "Missing chunk part file: $($chk.PartFile)"
        }
        $partSize = (Get-Item $chk.PartFile).Length
        if ($contentLength -gt 0 -and $chk.TotalBytes -gt 0 -and $partSize -ne $chk.TotalBytes) {
            throw "Chunk #$($chk.Id) size mismatch. Expected $($chk.TotalBytes) bytes, got $partSize bytes."
        }
    }

    # Stream-merge parts sequentially into final file
    $finalFileStream = [System.IO.FileStream]::new(
        $OutFile,
        [System.IO.FileMode]::Create,
        [System.IO.FileAccess]::Write,
        [System.IO.FileShare]::None,
        1048576, # 1 MB buffer for fast disk write
        [System.IO.FileOptions]::None
    )

    $mergeBuffer = [byte[]]::new(1048576) # 1MB reassembly buffer
    for ($i = 0; $i -lt $chunks.Count; $i++) {
        $part = $chunks[$i]
        Write-Progress -Activity "Assembling $fileName" `
                       -Status ("Merging chunk {0} of {1}..." -f ($i + 1), $chunks.Count) `
                       -PercentComplete ([int]((($i + 1) / $chunks.Count) * 100))

        $partStream = [System.IO.FileStream]::new(
            $part.PartFile,
            [System.IO.FileMode]::Open,
            [System.IO.FileAccess]::Read,
            [System.IO.FileShare]::Read,
            1048576,
            [System.IO.FileOptions]::SequentialScan
        )
        try {
            $partStream.CopyTo($finalFileStream, 1048576)
        } finally {
            $partStream.Dispose()
        }

        # Remove merged part file immediately to save disk space
        Remove-Item $part.PartFile -Force -ErrorAction SilentlyContinue
    }

    $finalFileStream.Flush()
} catch {
    Write-Host "`n[!] File reassembly failed: $($_.Exception.Message)" -ForegroundColor Red
    return
} finally {
    if ($finalFileStream) { $finalFileStream.Dispose() }
    Write-Progress -Activity "Assembling $fileName" -Completed
    $assemblyStopwatch.Stop()

    # Clean up Runspaces
    foreach ($task in $tasks) {
        $task.PowerShell.Dispose()
    }
    $runspacePool.Close()
    $runspacePool.Dispose()
}

# -----------------------------------------------------------------------------
# Completion Summary
# -----------------------------------------------------------------------------
$finalFileInfo = Get-Item $OutFile
$totalDownloadSeconds = [Math]::Max(0.01, $overallStopwatch.Elapsed.TotalSeconds)
$avgSpeedMBs = ($finalFileInfo.Length / (1024 * 1024)) / $totalDownloadSeconds

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "                    DOWNLOAD COMPLETE!                           " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host " File:           " -NoNewline; Write-Host $finalFileInfo.FullName -ForegroundColor Yellow
Write-Host " Size:           " -NoNewline; Write-Host ("{0} ({1:N0} bytes)" -f (Format-Bytes $finalFileInfo.Length), $finalFileInfo.Length) -ForegroundColor White
Write-Host " Download Time:  " -NoNewline; Write-Host ("{0:N2} seconds ({1})" -f $totalDownloadSeconds, (Format-TimeSpan $totalDownloadSeconds)) -ForegroundColor White
Write-Host " Assembly Time:  " -NoNewline; Write-Host ("{0:N2} seconds" -f $assemblyStopwatch.Elapsed.TotalSeconds) -ForegroundColor White
Write-Host " Average Speed:  " -NoNewline; Write-Host ("{0:N2} MB/s" -f $avgSpeedMBs) -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host ""

# -----------------------------------------------------------------------------
# SHA-256 Hash Calculation Block
# -----------------------------------------------------------------------------
Write-Host "[+] Calculating SHA-256 checksum..." -ForegroundColor Cyan
$hashStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$fileHash = (Get-FileHash -Path $finalFileInfo.FullName -Algorithm SHA256).Hash
$hashStopwatch.Stop()

Write-Host "-----------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " SHA-256 Hash   : " -NoNewline; Write-Host $fileHash -ForegroundColor Cyan
Write-Host " Hash Compute   : " -NoNewline; Write-Host ("{0:N2} seconds" -f $hashStopwatch.Elapsed.TotalSeconds) -ForegroundColor DarkGray
Write-Host "-----------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

