$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$NsisDir = Join-Path $Root "src-tauri\target\release\bundle\nsis"
$OutDir = Join-Path $Root "dist\windows"
$InstallerName = "指定医レポート作成_インストーラー.exe"
$GuideSrc = Join-Path $Root "docs\windows-install-guide.txt"
$GuideDst = Join-Path $OutDir "インストールのしかた.txt"
$ZipPath = Join-Path $OutDir "指定医レポート作成_Windows版.zip"

if (-not (Test-Path $NsisDir)) {
    throw "NSIS ビルド成果物が見つかりません。先に npm run build:win を実行してください。`nExpected: $NsisDir"
}

$setup = Get-ChildItem -Path $NsisDir -Filter "*-setup.exe" | Select-Object -First 1
if (-not $setup) {
    throw "setup.exe が見つかりません: $NsisDir\*-setup.exe"
}

if (-not (Test-Path $GuideSrc)) {
    throw "インストール手順書が見つかりません: $GuideSrc"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Copy-Item -Force $setup.FullName (Join-Path $OutDir $InstallerName)
Copy-Item -Force $GuideSrc $GuideDst

if (Test-Path $ZipPath) {
    Remove-Item -Force $ZipPath
}

Compress-Archive -Path (Join-Path $OutDir $InstallerName), $GuideDst -DestinationPath $ZipPath -Force

Write-Host "Packaged release:"
Write-Host "  Installer: $(Join-Path $OutDir $InstallerName)"
Write-Host "  Guide:     $GuideDst"
Write-Host "  ZIP:       $ZipPath"
