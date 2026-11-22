param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z0-9-]+$')]
  [string]$ProjectId
)

$ErrorActionPreference = 'Stop'
$supabaseCommand = Get-Command supabase -ErrorAction Stop
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$outputPath = Join-Path $workspaceRoot 'frontend\src\types\database.types.ts'
$temporaryPath = "$outputPath.tmp"

$generatedTypes = & $supabaseCommand.Source gen types typescript `
  --project-id $ProjectId `
  --schema public

if ($LASTEXITCODE -ne 0) {
  throw "Supabase type generation failed with exit code $LASTEXITCODE."
}

$generatedTypes | Set-Content -Path $temporaryPath -Encoding utf8
Move-Item -LiteralPath $temporaryPath -Destination $outputPath -Force
