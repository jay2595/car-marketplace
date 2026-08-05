# Phase 1 — Local Validation & Push to GitHub

**Goal:** prove the code, the image, the security gates and the Helm chart all work on your
machine, so the first Jenkins run isn't also your first-ever run of any of these commands.

Debugging a Jenkins build is slow: push, wait, read logs, guess, repeat. Debugging locally
is a five-second loop. Everything you fix here is a red build you never have to sit through.

---

## Which environment to use

You're on Windows. Two options:

### Recommended — WSL2 + Ubuntu

The Jenkins VM is Ubuntu 22.04. Validating in WSL2 Ubuntu means one set of commands, the
same package managers, and the bash scripts get exercised before they hit the real VM.

```powershell
# In PowerShell as Administrator, then reboot:
wsl --install -d Ubuntu-22.04
```

Then everything below runs inside the Ubuntu shell.

### Alternative — native Windows

Works fine, but you'll use `scripts\00-local-check.ps1` instead of the `.sh`, and Trivy is
fiddlier to install. If you go this way and Trivy proves annoying, **skip it** — the Jenkins
VM installs it automatically and you'll validate the gates there instead.

---

## Step 0 — Install the toolchain

### WSL2 / Ubuntu

```bash
sudo apt-get update && sudo apt-get install -y curl git unzip

# Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# Helm 3
curl -fsSL https://baltocdn.com/helm/signing.asc | sudo gpg --dearmor -o /usr/share/keyrings/helm.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" \
  | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update && sudo apt-get install -y helm

# Trivy
curl -fsSL https://aquasecurity.github.io/trivy-repo/deb/public.key \
  | sudo gpg --dearmor -o /usr/share/keyrings/trivy.gpg
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" \
  | sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt-get update && sudo apt-get install -y trivy
```

**Docker:** install *Docker Desktop for Windows*, then Settings → Resources → WSL Integration
→ enable for Ubuntu-22.04. `docker` then works inside WSL. (Don't `apt install docker.io`
inside WSL — Desktop integration is cleaner.)

Verify: `node -v && npm -v && docker --version && trivy --version && helm version --short`

### Native Windows (PowerShell)

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Docker.DockerDesktop
winget install Helm.Helm
```

Trivy has no reliable winget package. Easiest is Scoop:

```powershell
irm get.scoop.sh | iex
scoop install trivy
```

Or download the `_windows-64bit.zip` from the Trivy releases page on GitHub and put
`trivy.exe` somewhere on your `PATH`. **If this is more trouble than it's worth, skip Trivy
locally** — the check script marks those steps SKIP and the Jenkins VM handles it.

Close and reopen your terminal after installing, so `PATH` updates.

---

## Step 1 — Generate the lockfile (do not skip this)

```bash
cd car-marketplace
npm install
```

This creates `package-lock.json`, and **it must be committed.** Two things depend on it:

- `npm ci` in Jenkins requires a lockfile — without it you get non-reproducible installs.
- `trivy fs` reads `package-lock.json` to find dependency CVEs. **No lockfile means Gate 3
  scans nothing and silently passes** — a security gate that can never fail is worse than no
  gate, because you'll believe you're covered.

Confirm it exists and isn't ignored:

```bash
ls -l package-lock.json
git check-ignore package-lock.json && echo "PROBLEM: it's gitignored" || echo "good, will be committed"
```

---

## Step 2 — Run the pre-flight check

```bash
bash scripts/00-local-check.sh          # WSL / Linux / macOS
```
```powershell
powershell -ExecutionPolicy Bypass -File scripts\00-local-check.ps1    # native Windows
```

It runs, in order: toolchain presence → `npm ci` → `npm test` + coverage → `docker build` →
container smoke test on `/health/ready` → `trivy fs` (Gate 3) → `trivy image` (Gate 4) →
`helm lint` → `helm template` with tag substitution verified.

Every line is `PASS`, `FAIL` or `SKIP`. `SKIP` is fine — it means a tool isn't installed and
the Jenkins VM will cover it. `FAIL` is not fine: Jenkins will hit the identical failure.

**Target state:** `0 failed`.

---

## Step 3 — Expected failures and what they mean

| Output | Cause | Fix |
|---|---|---|
| `docker build failed` | Docker Desktop not started, or WSL integration off | Start Docker Desktop; Settings → Resources → WSL Integration |
| `container did not become ready` | Port 3000 already in use | `docker ps`, stop whatever holds it, or change the host port |
| `GATE 3 would BLOCK` | A CRITICAL CVE in a dependency | `npm audit fix`, or bump the package. Read `reports/trivy-fs.txt` first |
| `GATE 4 would BLOCK` | CRITICAL CVE in the base image | Rebuild — `node:24-alpine` moves. If it persists and has no fix, add it to `.trivyignore` **with a reason and a review date** |
| `trivy: failed to download vulnerability DB` | GHCR rate limit | `trivy image --download-db-only`, wait, retry. Caches 24h |
| `helm lint` errors | YAML indentation in a template | The message names the file and line |
| `npm test` fails | Node version too old | Needs Node 18+; `node -v` |

A note on the Trivy gates: they're deliberately calibrated to block on **CRITICAL** with
`--ignore-unfixed`, and to *report* on HIGH+. `node:24-alpine` regularly ships HIGH CVEs with
no available fix. If you gate on HIGH, the build can never go green — and a gate that always
fails gets switched off, which is the real failure mode. Tighten to `HIGH,CRITICAL` later,
once you've seen a clean run.

---

## Step 4 — Create the GitHub repo and push

Create an **empty** repo named `car-marketplace` on GitHub — no README, no .gitignore, no
licence. An initialised repo causes a merge conflict on your first push.

```bash
cd car-marketplace

git init
git branch -M main
git add .
git status                    # sanity-check before committing
```

Confirm before committing:
- `package-lock.json` **is** listed
- `node_modules/`, `coverage/`, `reports/` are **not**

```bash
git commit -m "feat: Node.js car marketplace with DevSecOps pipeline to AKS"
git remote add origin https://github.com/<your-username>/car-marketplace.git
git push -u origin main
```

Authentication: GitHub rejects passwords. Use a Personal Access Token as the password
(**Settings → Developer settings → Personal access tokens → Tokens (classic)**, scopes
`repo` and `admin:repo_hook`). **Save that token** — Phase 5 needs it for the
`github-credentials` entry in Jenkins.

Or use the GitHub CLI, which handles auth for you:

```bash
gh auth login
gh repo create car-marketplace --private --source=. --push
```

### The line-ending trap

The repo now ships a `.gitattributes` forcing LF on `*.sh`, `Dockerfile` and `Jenkinsfile`.
Without it, Git on Windows commits CRLF and the Ubuntu VM fails with:

```
/bin/bash^M: bad interpreter: No such file or directory
```

That error looks like a missing interpreter and sends people down entirely the wrong path.
If you've already committed CRLF files, fix with:

```bash
git add --renormalize .
git commit -m "chore: normalise line endings to LF"
```

---

## Definition of done

- [ ] `scripts/00-local-check.sh` reports **0 failed**
- [ ] `package-lock.json` is committed
- [ ] `.gitattributes` is committed
- [ ] `node_modules/`, `coverage/`, `reports/` are not in the repo
- [ ] The repo is on GitHub on branch `main`
- [ ] Your GitHub PAT is saved somewhere you can reach it in Phase 5
- [ ] `git log --oneline` shows your commit on `origin/main`

Next: **Phase 2 — provision Azure** (`docs/IMPLEMENTATION-STEPS.md`). You have the
subscription, so it's editing the variables at the top of `scripts/02-azure-setup.sh` and
running it. It prints the credential block you'll need later — keep that output.
