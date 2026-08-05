#!/usr/bin/env bash
# Phase 1 pre-flight: runs locally exactly what Jenkins will run in CI.
# Every failure here is a failure you would otherwise discover in a red build.
#   usage:  bash scripts/00-local-check.sh
set -uo pipefail
cd "$(dirname "$0")/.."

PASS=0; FAIL=0; SKIP=0
ok()   { printf '  \033[32mPASS\033[0m  %s\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; FAIL=$((FAIL+1)); }
skip() { printf '  \033[33mSKIP\033[0m  %s\n' "$1"; SKIP=$((SKIP+1)); }
hdr()  { printf '\n\033[1m%s\033[0m\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

IMAGE=car-marketplace:local

hdr "0. Toolchain"
for t in node npm git; do
  have $t && ok "$t $( $t --version 2>&1 | head -1 )" || bad "$t not installed (required)"
done
for t in docker trivy helm; do
  have $t && ok "$t present" || skip "$t not installed - related checks will be skipped"
done
[ $FAIL -gt 0 ] && { echo; echo "Install the required tools first."; exit 1; }

hdr "1. Dependencies + lockfile"
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund >/dev/null 2>&1 && ok "npm ci (lockfile respected)" || bad "npm ci failed"
else
  echo "  package-lock.json missing - generating it now (commit this file!)"
  npm install --no-audit --no-fund >/dev/null 2>&1 && ok "npm install created package-lock.json" || bad "npm install failed"
fi
[ -f package-lock.json ] && ok "package-lock.json present" || bad "package-lock.json still missing - Trivy has nothing to scan"

hdr "2. Tests + coverage"
npm test >/tmp/test.log 2>&1 && ok "npm test" || { bad "npm test - see /tmp/test.log"; tail -20 /tmp/test.log; }
[ -f coverage/lcov.info ] && ok "coverage/lcov.info generated (SonarQube needs this)" || bad "no coverage report"

hdr "3. Docker image"
if have docker && docker info >/dev/null 2>&1; then
  docker build -q -t $IMAGE . >/dev/null 2>&1 && ok "docker build" || bad "docker build failed"
  if docker image inspect $IMAGE >/dev/null 2>&1; then
    docker run -d --rm --name sc-check -p 3000:3000 $IMAGE >/dev/null 2>&1
    sleep 4
    curl -sf http://localhost:3000/health/ready >/dev/null 2>&1 \
      && ok "container serves /health/ready" || bad "container did not become ready"
    docker rm -f sc-check >/dev/null 2>&1 || true
  fi
else
  skip "docker not running - image build, scan and smoke test skipped"
fi

hdr "4. Trivy security gates (same settings as the pipeline)"
if have trivy; then
  mkdir -p reports
  trivy fs --scanners vuln,secret --severity HIGH,CRITICAL --ignore-unfixed \
    --no-progress --format table -o reports/trivy-fs.txt . >/dev/null 2>&1
  trivy fs --scanners vuln,secret --severity CRITICAL --ignore-unfixed \
    --exit-code 1 --no-progress --quiet . >/dev/null 2>&1 \
    && ok "GATE 3 - no CRITICAL dependency CVE or secret" \
    || bad "GATE 3 would BLOCK - see reports/trivy-fs.txt"
  if docker image inspect $IMAGE >/dev/null 2>&1; then
    trivy image --severity HIGH,CRITICAL --ignore-unfixed \
      --no-progress --format table -o reports/trivy-image.txt $IMAGE >/dev/null 2>&1
    trivy image --severity CRITICAL --ignore-unfixed \
      --exit-code 1 --no-progress --quiet $IMAGE >/dev/null 2>&1 \
      && ok "GATE 4 - image has no CRITICAL CVE" \
      || bad "GATE 4 would BLOCK - see reports/trivy-image.txt"
  else
    skip "no local image - image scan skipped"
  fi
else
  skip "trivy not installed - both security gates skipped"
fi

hdr "5. Helm chart"
if have helm; then
  helm lint helm/car-marketplace >/dev/null 2>&1 && ok "helm lint" || { bad "helm lint"; helm lint helm/car-marketplace; }
  helm template car-marketplace helm/car-marketplace \
    --set image.repository=myacr.azurecr.io/car-marketplace --set image.tag=1-abc1234 \
    > reports/helm-rendered.yaml 2>/dev/null \
    && ok "helm template renders" || bad "helm template failed"
  if [ -s reports/helm-rendered.yaml ]; then
    grep -q "myacr.azurecr.io/car-marketplace:1-abc1234" reports/helm-rendered.yaml \
      && ok "image tag is injected correctly" || bad "image tag not substituted"
    for k in Deployment Service Ingress HorizontalPodAutoscaler ConfigMap; do
      grep -q "^kind: $k" reports/helm-rendered.yaml && ok "renders $k" || bad "missing $k"
    done
  fi
else
  skip "helm not installed - chart checks skipped"
fi

hdr "Summary"
printf '  %d passed, %d failed, %d skipped\n\n' "$PASS" "$FAIL" "$SKIP"
if [ $FAIL -eq 0 ]; then
  echo "  Ready to push. Anything skipped will be exercised on the Jenkins VM instead."
  exit 0
else
  echo "  Fix the failures above before pushing - Jenkins will hit the same ones."
  exit 1
fi
