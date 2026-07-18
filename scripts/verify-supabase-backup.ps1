[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ArchivePath
)

$ErrorActionPreference = 'Stop'
$resolvedArchive = [System.IO.Path]::GetFullPath($ArchivePath)
$checksumPath = "$resolvedArchive.sha256"

if (-not (Test-Path -LiteralPath $resolvedArchive)) {
  throw "Backup nao encontrado: $resolvedArchive"
}

if (-not (Test-Path -LiteralPath $checksumPath)) {
  throw "Checksum nao encontrado: $checksumPath"
}

$expectedHash = ((Get-Content -LiteralPath $checksumPath -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
$actualHash = (Get-FileHash -LiteralPath $resolvedArchive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $expectedHash) {
  throw 'O checksum SHA-256 do backup nao confere.'
}

$temporaryPath = Join-Path ([System.IO.Path]::GetTempPath()) "lucro-da-carne-backup-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $temporaryPath -Force | Out-Null

try {
  Expand-Archive -LiteralPath $resolvedArchive -DestinationPath $temporaryPath
  $manifestPath = Join-Path $temporaryPath 'manifest.json'
  if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw 'O manifest.json nao foi encontrado no backup.'
  }

  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  if ($manifest.project_ref -ne 'arosnbldkgvbqhwnwfcr') {
    throw 'O backup pertence a outro projeto Supabase.'
  }

  $expectedFiles = @(
    'roles.sql',
    'schema.sql',
    'data.sql',
    'auth-data.sql',
    'storage-data.sql',
    'migration-history.sql'
  )
  $manifestFiles = @($manifest.files | ForEach-Object { $_.name })
  if ($manifestFiles.Count -ne $expectedFiles.Count -or @(Compare-Object $expectedFiles $manifestFiles).Count -gt 0) {
    throw 'O manifesto nao contem exatamente os arquivos obrigatorios do backup.'
  }

  foreach ($entry in $manifest.files) {
    $filePath = Join-Path $temporaryPath $entry.name
    if (-not (Test-Path -LiteralPath $filePath)) {
      throw "Arquivo ausente no backup: $($entry.name)"
    }

    $file = Get-Item -LiteralPath $filePath
    $fileHash = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($file.Length -ne [long]$entry.bytes -or $fileHash -ne $entry.sha256) {
      throw "Integridade interna invalida: $($entry.name)"
    }
  }

  [pscustomobject]@{
    Backup = $resolvedArchive
    CreatedAt = $manifest.created_at
    ProjectRef = $manifest.project_ref
    Sha256 = $actualHash
    Files = @($manifest.files).Count
    Valid = $true
  }
}
finally {
  if (Test-Path -LiteralPath $temporaryPath) {
    Remove-Item -LiteralPath $temporaryPath -Recurse -Force
  }
}
