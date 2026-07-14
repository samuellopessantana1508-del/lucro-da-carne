[CmdletBinding()]
param(
  [string]$OutputDirectory,
  [ValidateRange(1, 3650)]
  [int]$RetentionDays = 30
)

$ErrorActionPreference = 'Stop'
$cliVersion = '2.109.1'
$projectRef = 'arosnbldkgvbqhwnwfcr'

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $OutputDirectory = Join-Path $PSScriptRoot '..\.backups'
}

if (-not $env:SUPABASE_DB_URL) {
  throw 'Defina SUPABASE_DB_URL com a connection string Session pooler antes de executar o backup.'
}

if ($env:SUPABASE_DB_URL -notmatch '^postgres(ql)?://') {
  throw 'SUPABASE_DB_URL deve ser uma connection string PostgreSQL valida.'
}

$npx = Get-Command 'npx.cmd' -ErrorAction SilentlyContinue
if (-not $npx) {
  throw 'npx.cmd nao foi encontrado. Instale o Node.js antes de executar o backup.'
}

if (-not (Get-Command 'docker' -ErrorAction SilentlyContinue)) {
  throw 'Docker nao foi encontrado. O Supabase CLI usa Docker para executar o pg_dump compativel.'
}

$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stagingPath = Join-Path $outputPath ".staging-$timestamp-$([guid]::NewGuid().ToString('N'))"
$archivePath = Join-Path $outputPath "supabase-backup-$timestamp.zip"
$checksumPath = "$archivePath.sha256"

New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
New-Item -ItemType Directory -Path $stagingPath -Force | Out-Null

$outputPrefix = $outputPath.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$resolvedStagingPath = [System.IO.Path]::GetFullPath($stagingPath)
if (-not $resolvedStagingPath.StartsWith($outputPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'O diretorio temporario do backup ficou fora do diretorio de saida permitido.'
}

function Invoke-SupabaseDump {
  param([string[]]$DumpArguments)

  $arguments = @(
    '--yes',
    "supabase@$cliVersion",
    'db',
    'dump',
    '--db-url',
    $env:SUPABASE_DB_URL
  ) + $DumpArguments

  & $npx.Source $arguments
  if ($LASTEXITCODE -ne 0) {
    throw "supabase db dump falhou com codigo $LASTEXITCODE."
  }
}

try {
  $rolesPath = Join-Path $stagingPath 'roles.sql'
  $schemaPath = Join-Path $stagingPath 'schema.sql'
  $dataPath = Join-Path $stagingPath 'data.sql'

  Invoke-SupabaseDump @('--file', $rolesPath, '--role-only')
  Invoke-SupabaseDump @('--file', $schemaPath)
  Invoke-SupabaseDump @(
    '--file', $dataPath,
    '--use-copy',
    '--data-only',
    '--exclude', 'storage.buckets_vectors',
    '--exclude', 'storage.vector_indexes'
  )

  @{
    created_at = (Get-Date).ToUniversalTime().ToString('o')
    project_ref = $projectRef
    supabase_cli_version = $cliVersion
    files = @('roles.sql', 'schema.sql', 'data.sql')
  } | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $stagingPath 'manifest.json') -Encoding UTF8

  Compress-Archive -Path (Join-Path $stagingPath '*') -DestinationPath $archivePath -CompressionLevel Optimal
  $hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hash  $([System.IO.Path]::GetFileName($archivePath))" | Set-Content -LiteralPath $checksumPath -Encoding ASCII

  $retentionLimit = (Get-Date).AddDays(-$RetentionDays)
  Get-ChildItem -LiteralPath $outputPath -File -Filter 'supabase-backup-*' |
    Where-Object { $_.LastWriteTime -lt $retentionLimit } |
    Remove-Item -Force

  [pscustomobject]@{
    Backup = $archivePath
    Checksum = $checksumPath
    Sha256 = $hash
  }
}
finally {
  if (Test-Path -LiteralPath $resolvedStagingPath) {
    Remove-Item -LiteralPath $resolvedStagingPath -Recurse -Force
  }
}
