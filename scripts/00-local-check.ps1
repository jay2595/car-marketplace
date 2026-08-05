# Phase 1 pre-flight for native Windows (PowerShell 5+ / 7+).
# Runs locally what Jenkins will run in CI.
#   usage:  powershell -ExecutionPolicy Bypass -File scripts\00-local-check.ps1
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)

$script:Pass = 0; $script:Fail = 0; $script:Skip = 0
function Ok   ($m) { Write-Host "  PASS  $m" -ForegroundColor Green;  $script:Pass++ }
function Bad  ($m) { Write-Host "  FAIL  $m" -ForegroundColor Red;    $script:Fail++ }
function Skp  ($m) { Write-Host "  SKIP  $m" -ForegroundColor Yellow; $script:Skip++ }
function Hdr  ($m) { Write-Host "`n$m" -ForegroundColor Cyan }
function Have ($c) { return [bool](Get-Command $c -ErrorAction SilentlyContinue) }

$Image = 'car-marketplace:local'

Hdr '0. Toolchain'
foreach ($t in 'node','npm','git') {
  if (Have $t) { Ok "$t installed" } else { Bad "$t not installed (required)" }
}
foreach ($t in 'docker','trivy','helm') {
  if (Have $t) { Ok "$t present" } else { Skp "$t not installed - related checks skipped" }
}
if ($script:Fail -gt 0) { Write-Host "`nInstall the required tools first."; exit 1 }

Hdr '1. Dependencies + lockfile'
if (Test-Path package-lock.json) {
  npm ci --no-audit --no-fund *>$null
  if ($LASTEXITCODE -eq 0) { Ok 'npm ci (lockfile respected)' } else { Bad 'npm ci failed' }
} else {
  Write-Host '  package-lock.json missing - generating it now (commit this file!)'
  npm install --no-audit --no-fund *>$null
  if ($LASTEXITCODE -eq 0) { Ok 'npm install created package-lock.json' } else { Bad 'npm install failed' }
}
if (Test-Path package-lock.json) { Ok 'package-lock.json present' }
else { Bad 'package-lock.json missing - Trivy has nothing to scan' }

Hdr '2. Tests + coverage'
npm test *> $env:TEMP\sc-test.log
if ($LASTEXITCODE -eq 0) { Ok 'npm test' } else { Bad "npm test - see $env:TEMP\sc-test.log" }
if (Test-Path coverage\lcov.info) { Ok 'coverage/lcov.info generated (SonarQube needs this)' }
else { Bad 'no coverage report' }

Hdr '3. Docker image'
if ((Have 'docker') -and (docker info *>$null; $LASTEXITCODE -eq 0)) {
  docker build -q -t $Image . *>$null
  if ($LASTEXITCODE -eq 0) { Ok 'docker build' } else { Bad 'docker build failed' }
  docker image inspect $Image *>$null
  if ($LASTEXITCODE -eq 0) {
    docker run -d --rm --name sc-check -p 3000:3000 $Image *>$null
    Start-Sleep -Seconds 4
    try {
      Invoke-WebRequest -Uri http://localhost:3000/health/ready -UseBasicParsing -TimeoutSec 5 *>$null
      Ok 'container serves /health/ready'
    } catch { Bad 'container did not become ready' }
    docker rm -f sc-check *>$null
  }
} else { Skp 'Docker Desktop not running - build, scan and smoke test skipped' }

Hdr '4. Trivy security gates (same settings as the pipeline)'
if (Have 'trivy') {
  New-Item -ItemType Directory -Force -Path reports *>$null
  trivy fs --scanners vuln,secret --severity HIGH,CRITICAL --ignore-unfixed `
    --no-progress --format table -o reports\trivy-fs.txt . *>$null
  trivy fs --scanners vuln,secret --severity CRITICAL --ignore-unfixed `
    --exit-code 1 --no-progress --quiet . *>$null
  if ($LASTEXITCODE -eq 0) { Ok 'GATE 3 - no CRITICAL dependency CVE or secret' }
  else { Bad 'GATE 3 would BLOCK - see reports\trivy-fs.txt' }

  docker image inspect $Image *>$null
  if ($LASTEXITCODE -eq 0) {
    trivy image --severity HIGH,CRITICAL --ignore-unfixed `
      --no-progress --format table -o reports\trivy-image.txt $Image *>$null
    trivy image --severity CRITICAL --ignore-unfixed `
      --exit-code 1 --no-progress --quiet $Image *>$null
    if ($LASTEXITCODE -eq 0) { Ok 'GATE 4 - image has no CRITICAL CVE' }
    else { Bad 'GATE 4 would BLOCK - see reports\trivy-image.txt' }
  } else { Skp 'no local image - image scan skipped' }
} else { Skp 'trivy not installed - both security gates skipped' }

Hdr '5. Helm chart'
if (Have 'helm') {
  helm lint helm/car-marketplace *>$null
  if ($LASTEXITCODE -eq 0) { Ok 'helm lint' } else { Bad 'helm lint'; helm lint helm/car-marketplace }
  helm template car-marketplace helm/car-marketplace `
    --set image.repository=myacr.azurecr.io/car-marketplace --set image.tag=1-abc1234 `
    > reports\helm-rendered.yaml
  if ($LASTEXITCODE -eq 0) { Ok 'helm template renders' } else { Bad 'helm template failed' }
  if (Test-Path reports\helm-rendered.yaml) {
    $r = Get-Content reports\helm-rendered.yaml -Raw
    if ($r -match 'myacr\.azurecr\.io/car-marketplace:1-abc1234') { Ok 'image tag is injected correctly' }
    else { Bad 'image tag not substituted' }
    foreach ($k in 'Deployment','Service','Ingress','HorizontalPodAutoscaler','ConfigMap') {
      if ($r -match "(?m)^kind: $k") { Ok "renders $k" } else { Bad "missing $k" }
    }
  }
} else { Skp 'helm not installed - chart checks skipped' }

Hdr 'Summary'
Write-Host ("  {0} passed, {1} failed, {2} skipped`n" -f $script:Pass, $script:Fail, $script:Skip)
if ($script:Fail -eq 0) {
  Write-Host '  Ready to push. Anything skipped will be exercised on the Jenkins VM instead.'
  exit 0
} else {
  Write-Host '  Fix the failures above before pushing - Jenkins will hit the same ones.'
  exit 1
}
