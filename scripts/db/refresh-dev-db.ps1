# Copies the production `public` schema into the local dev database and scrubs it.
# Prod is read from DIRECT_URL in .env.prod (never auto-loaded by Next or Prisma); the target from DIRECT_URL in .env.
param(
  [string]$PgBin = "$env:LOCALAPPDATA\pgsql17\pgsql\bin",
  [string]$PgData = "$env:LOCALAPPDATA\pgsql17\data",
  [int]$Port = 5433
)
$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot\..\.."
$env:PATH = "$PgBin;$env:PATH"

function Get-EnvValue([string]$file, [string]$key) {
  $line = Get-Content (Join-Path $root $file) | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if (-not $line) { throw "$key not found in $file" }
  ($line -replace "^$key=", '').Trim('"')
}

$prodUrl = Get-EnvValue '.env.prod' 'DIRECT_URL'
$devUrl = Get-EnvValue '.env' 'DIRECT_URL'
if ($devUrl -notmatch '@(localhost|127\.0\.0\.1):') { throw "Refusing to overwrite non-local database: DIRECT_URL in .env must point at localhost" }

& pg_ctl -D $PgData status *> $null
if ($LASTEXITCODE -ne 0) { & pg_ctl -D $PgData -l "$PgData\..\postgres.log" -o "-p $Port" -w start }

$dumpDir = Join-Path $root '.db-dumps'
New-Item -ItemType Directory -Force $dumpDir | Out-Null
$dump = Join-Path $dumpDir 'prod-public.dump'

Write-Host 'Dumping production...'
& pg_dump $prodUrl --schema=public --no-owner --no-privileges --format=custom --file=$dump
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed' }

Write-Host 'Restoring into dev database...'
& psql $devUrl -X -q -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'supabase-roles.sql') -c 'drop schema if exists public cascade;'
if ($LASTEXITCODE -ne 0) { throw 'reset failed' }
& pg_restore -d $devUrl --no-owner --no-privileges --exit-on-error $dump
if ($LASTEXITCODE -ne 0) { throw 'pg_restore failed' }

Write-Host 'Scrubbing PII and secrets...'
& psql $devUrl -X -q -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'scrub-dev-db.sql')
if ($LASTEXITCODE -ne 0) { throw 'scrub failed' }

Write-Host 'Done.'
