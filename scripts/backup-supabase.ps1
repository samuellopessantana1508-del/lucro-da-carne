[CmdletBinding()]
param(
  [string]$OutputDirectory,
  [ValidateRange(1, 3650)]
  [int]$RetentionDays = 30
)

$ErrorActionPreference = 'Stop'
$cliVersion = '2.109.1'
$postgresImage = 'public.ecr.aws/supabase/postgres:17.6.1.143'
$projectRef = 'arosnbldkgvbqhwnwfcr'
$managementApiBaseUrl = "https://api.supabase.com/v1/projects/$projectRef"

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $OutputDirectory = Join-Path $PSScriptRoot '..\.backups'
}

$npx = Get-Command 'npx.cmd' -ErrorAction SilentlyContinue
if (-not $npx) {
  throw 'npx.cmd nao foi encontrado. Instale o Node.js antes de executar o backup.'
}

if (-not (Get-Command 'docker' -ErrorAction SilentlyContinue)) {
  throw 'Docker nao foi encontrado. O Supabase CLI usa Docker para executar o pg_dump compativel.'
}

& docker info --format '{{.ServerVersion}}' *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'O Docker Desktop esta instalado, mas o servico nao esta em execucao.'
}

& $npx.Source '--yes' "supabase@$cliVersion" '--version' *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'Nao foi possivel preparar a versao fixada do Supabase CLI.'
}

& docker image inspect $postgresImage *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Preparando a imagem PostgreSQL compativel antes de criar a credencial temporaria...'
  & docker pull $postgresImage
  if ($LASTEXITCODE -ne 0) {
    throw 'Nao foi possivel baixar a imagem PostgreSQL usada pelo Supabase CLI.'
  }
}

function Get-DatabaseConnection {
  if ($env:SUPABASE_DB_URL) {
    if ($env:SUPABASE_DB_URL -notmatch '^postgres(ql)?://') {
      throw 'SUPABASE_DB_URL deve ser uma connection string PostgreSQL valida.'
    }

    return [pscustomobject]@{
      Url = $env:SUPABASE_DB_URL
      Source = 'environment'
      ExpiresInSeconds = $null
    }
  }

  if (-not $env:SUPABASE_ACCESS_TOKEN) {
    throw 'Defina SUPABASE_ACCESS_TOKEN para uma credencial temporaria ou SUPABASE_DB_URL para uma conexao fixa.'
  }

  $authorizationHeaders = @{
    Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN"
    'Content-Type' = 'application/json'
  }
  $credentialRequest = @{
    Method = 'Post'
    Uri = "$managementApiBaseUrl/cli/login-role"
    Headers = $authorizationHeaders
    Body = (@{ read_only = $false } | ConvertTo-Json -Compress)
  }
  $credential = Invoke-RestMethod @credentialRequest

  $poolerRequest = @{
    Method = 'Get'
    Uri = "$managementApiBaseUrl/config/database/pooler"
    Headers = @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN" }
  }
  $poolers = @(Invoke-RestMethod @poolerRequest)
  $pooler = $poolers | Where-Object { $_.database_type -eq 'PRIMARY' } | Select-Object -First 1
  if (-not $pooler) {
    throw 'O Session pooler principal do Supabase nao foi encontrado.'
  }

  $hostMatch = [regex]::Match([string]$pooler.connection_string, '@([^:/]+):')
  if (-not $hostMatch.Success) {
    throw 'Nao foi possivel identificar o host do Session pooler.'
  }

  $encodedUser = [uri]::EscapeDataString("$($credential.role).$projectRef")
  $encodedPassword = [uri]::EscapeDataString([string]$credential.password)
  $databaseUrl = "postgresql://${encodedUser}:${encodedPassword}@$($hostMatch.Groups[1].Value):5432/postgres?sslmode=require"

  return [pscustomobject]@{
    Url = $databaseUrl
    Source = 'temporary_cli_role'
    ExpiresInSeconds = $credential.ttl_seconds
  }
}

$databaseConnection = Get-DatabaseConnection

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
    $databaseConnection.Url
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
  $authDataPath = Join-Path $stagingPath 'auth-data.sql'
  $storageDataPath = Join-Path $stagingPath 'storage-data.sql'
  $migrationHistoryPath = Join-Path $stagingPath 'migration-history.sql'

  Invoke-SupabaseDump @('--file', $rolesPath, '--role-only')
  Invoke-SupabaseDump @('--file', $schemaPath)
  Invoke-SupabaseDump @(
    '--file', $dataPath,
    '--use-copy',
    '--data-only',
    '--schema', 'public',
    '--exclude', 'storage.buckets_vectors',
    '--exclude', 'storage.vector_indexes'
  )
  Invoke-SupabaseDump @('--file', $authDataPath, '--data-only', '--use-copy', '--schema', 'auth')
  Invoke-SupabaseDump @(
    '--file', $storageDataPath,
    '--data-only',
    '--use-copy',
    '--schema', 'storage',
    '--exclude', 'storage.buckets_vectors',
    '--exclude', 'storage.vector_indexes'
  )
  Invoke-SupabaseDump @(
    '--file', $migrationHistoryPath,
    '--data-only',
    '--use-copy',
    '--schema', 'supabase_migrations'
  )

  $requiredFiles = @(
    $rolesPath,
    $schemaPath,
    $dataPath,
    $authDataPath,
    $storageDataPath,
    $migrationHistoryPath
  )
  foreach ($requiredFile in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $requiredFile) -or (Get-Item -LiteralPath $requiredFile).Length -eq 0) {
      throw "O dump obrigatorio nao foi gerado corretamente: $requiredFile"
    }
  }

  $semanticChecks = @(
    @{ Path = $schemaPath; Pattern = '^CREATE TABLE( IF NOT EXISTS)? "public"\.'; Description = 'tabelas public no schema' },
    @{ Path = $dataPath; Pattern = '^COPY "public"\.'; Description = 'dados do aplicativo' },
    @{ Path = $authDataPath; Pattern = '^COPY "auth"\."users"'; Description = 'estrutura de dados do Auth' },
    @{ Path = $storageDataPath; Pattern = '^COPY "storage"\.'; Description = 'estrutura de dados do Storage' },
    @{ Path = $migrationHistoryPath; Pattern = '^COPY "supabase_migrations"\."schema_migrations"'; Description = 'historico de migracoes' }
  )
  foreach ($check in $semanticChecks) {
    if (-not (Select-String -LiteralPath $check.Path -Pattern $check.Pattern -Quiet)) {
      throw "O dump nao contem $($check.Description): $($check.Path)"
    }
  }

  if (Select-String -LiteralPath $dataPath -Pattern '^COPY "(auth|storage|supabase_migrations)"\.' -Quiet) {
    throw 'data.sql contem schemas que devem permanecer nos dumps dedicados.'
  }

  $fileInventory = $requiredFiles | ForEach-Object {
    $file = Get-Item -LiteralPath $_
    [pscustomobject]@{
      name = $file.Name
      bytes = $file.Length
      sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
  }

  @{
    created_at = (Get-Date).ToUniversalTime().ToString('o')
    project_ref = $projectRef
    supabase_cli_version = $cliVersion
    credential_source = $databaseConnection.Source
    credential_ttl_seconds = $databaseConnection.ExpiresInSeconds
    files = $fileInventory
  } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $stagingPath 'manifest.json') -Encoding UTF8

  Compress-Archive -Path (Join-Path $stagingPath '*') -DestinationPath $archivePath -CompressionLevel Optimal

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
  try {
    $archiveEntries = @($archive.Entries | ForEach-Object { $_.FullName })
    $expectedEntries = @($fileInventory.name) + 'manifest.json'
    foreach ($expectedEntry in $expectedEntries) {
      if ($archiveEntries -notcontains $expectedEntry) {
        throw "O arquivo compactado nao contem $expectedEntry."
      }
    }
  }
  finally {
    $archive.Dispose()
  }

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
    Files = $fileInventory
  }
}
finally {
  $databaseConnection = $null
  if (Test-Path -LiteralPath $resolvedStagingPath) {
    Remove-Item -LiteralPath $resolvedStagingPath -Recurse -Force
  }
}
