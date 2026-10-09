# Fetches free/openly-licensed images from Wikimedia Commons via its API.
# Relevance-filtered (title must contain a keyword) and de-duplicated so we
# don't grab the same generic "spice mix" photo for several entries.

$ErrorActionPreference = "Stop"
$api = "https://commons.wikimedia.org/w/api.php"
$headers = @{ "User-Agent" = "BobbyGroupSite/1.0 (local dev image fetch; contact info@bobbygroup.in)" }
$script:used = @{}

# Titles containing any of these words are almost never clean product/logo shots.
$script:block = "Minister|launching|launch|preparation|preparing|drying|turns|harvest|field|plantation|market|Town Hall|Meeting|Roundtable|Conference|plaque|inaugurat|Secretary|unveiling|Park|Shri |woman|man |people|worker|farmer|seller|vendor|hand|basket|Festival"

function Get-CommonsImage {
    param(
        [string]$Term,
        [string]$Keyword,
        [string]$OutFile,
        [int]$Width = 1000,
        [switch]$AllowSvg
    )
    $q = [uri]::EscapeDataString($Term)
    $mimes = if ($AllowSvg) { "image/(jpeg|png|svg)" } else { "image/(jpeg|png)" }
    $url = "$api`?action=query&generator=search&gsrsearch=$q&gsrnamespace=6&gsrlimit=25&prop=imageinfo&iiprop=url|mime&iiurlwidth=$Width&format=json"
    $resp = $null
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            $resp = Invoke-RestMethod -Uri $url -Headers $headers
            break
        } catch {
            if ($attempt -eq 3) { Write-Host "  ! search failed for '$Term'"; return $false }
        }
    }
    if (-not $resp.query.pages) { Write-Host "  ! no results for '$Term'"; return $false }
    $pages = $resp.query.pages.PSObject.Properties.Value | Sort-Object index
    foreach ($p in $pages) {
        $info = $p.imageinfo[0]
        if (-not $info) { continue }
        if ($info.mime -notmatch $mimes) { continue }
        if ($Keyword -and ($p.title -notmatch $Keyword)) { continue }
        if ($p.title -match $script:block) { continue }
        if ($script:used.ContainsKey($p.title)) { continue }
        $src = $info.thumburl
        if (-not $src) { $src = $info.url }
        try {
            Invoke-WebRequest -Uri $src -Headers $headers -OutFile $OutFile
            $script:used[$p.title] = $true
            Write-Host "  ok  $OutFile  <-  $($p.title)"
            return $true
        } catch { continue }
    }
    Write-Host "  ! no clean candidate for '$Term' (keyword: $Keyword)"
    return $false
}

New-Item -ItemType Directory -Force -Path "public/spices" | Out-Null
New-Item -ItemType Directory -Force -Path "public/certs" | Out-Null

$spices = @(
    @{ term = "turmeric powder bowl";       kw = "turmeric";  file = "turmeric.jpg" },
    @{ term = "green cardamom pods";        kw = "cardamom";  file = "cardamom.jpg" },
    @{ term = "dried red chilli";           kw = "chil|chili|chilli"; file = "chilli.jpg" },
    @{ term = "cinnamon sticks bundle";     kw = "cinnamon";  file = "cinnamon.jpg" },
    @{ term = "cloves dried spice";         kw = "clove";     file = "cloves.jpg" },
    @{ term = "black peppercorns";          kw = "pepper";    file = "pepper.jpg" },
    @{ term = "star anise";                 kw = "anise";     file = "staranise.jpg" },
    @{ term = "cumin seeds";                kw = "cumin";     file = "cumin.jpg" },
    @{ term = "roasted coffee beans";       kw = "coffee";    file = "coffee.jpg" }
)

Write-Host "Spices:"
foreach ($s in $spices) {
    Get-CommonsImage -Term $s.term -Keyword $s.kw -OutFile ("public/spices/" + $s.file) -Width 1000 | Out-Null
}

$certs = @(
    @{ term = "FSSAI logo";                                       kw = "FSSAI|Food Safety";      file = "fssai.png" },
    @{ term = "APEDA logo";                                       kw = "APEDA|Agricultural and Processed"; file = "apeda.png" },
    @{ term = "Spices Board India logo";                          kw = "Spices Board";           file = "spicesboard.png" },
    @{ term = "Directorate General of Foreign Trade logo India";  kw = "DGFT|Foreign Trade";     file = "dgft.png" },
    @{ term = "Goods and Services Tax India logo";                kw = "GST|Goods and Services"; file = "gst.png" },
    @{ term = "Ministry of Corporate Affairs India logo";        kw = "Corporate Affairs|Emblem"; file = "mca.png" },
    @{ term = "Coffee Board India logo";                          kw = "Coffee Board";           file = "coffeeboard.png" }
)

Write-Host "Certificate logos:"
foreach ($c in $certs) {
    Get-CommonsImage -Term $c.term -Keyword $c.kw -OutFile ("public/certs/" + $c.file) -Width 600 -AllowSvg | Out-Null
}

Write-Host "Done."
