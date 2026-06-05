$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Tools = Join-Path $Root "tools\generate_docx"
$BinDir = Join-Path $Root "src-tauri\binaries"
$Target = "x86_64-pc-windows-msvc"
$OutName = "generate_docx-$Target.exe"
$Out = Join-Path $BinDir $OutName

New-Item -ItemType Directory -Force -Path $BinDir | Out-Null

function Get-Python {
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) { return @("python") }
    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) { return @("py", "-3") }
    throw "Python 3 が必要です（python または py -3）"
}

$pyCmd = Get-Python

& @pyCmd -m pip install -q -r (Join-Path $Tools "requirements.txt") pyinstaller
if ($LASTEXITCODE -ne 0) { throw "pip install failed" }

$distName = "generate_docx-$Target"
& @pyCmd -m PyInstaller --onefile --name $distName `
  --distpath $BinDir `
  --workpath (Join-Path $Tools "build") `
  --specpath $Tools `
  (Join-Path $Tools "generate_docx.py")
if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed" }

if (-not (Test-Path $Out)) {
    throw "Expected output not found: $Out"
}

Write-Host "Built sidecar: $Out"
