# Project 3 (DevSecOps) — Implementation Roadmap

Stack: **Jenkins · GitHub · SonarQube · Trivy · Docker · ACR · AKS · Helm**
(Snyk intentionally omitted — `trivy fs` covers dependency CVEs from the same feeds.)

Order matters. Each phase produces something the next one consumes.

---

## Phase 0 — Prerequisites (30 min)

| Need | Why |
|---|---|
| Azure subscription, Owner (or Contributor + User Access Administrator) | Creating a Service Principal needs directory permissions |
| GitHub account + empty `car-marketplace` repo | Source of truth, webhook origin |
| A DNS name, or use `nip.io` | Ingress host + TLS |
| Local `az` CLI logged in | Running `scripts/02-azure-setup.sh` |

> No domain? Use `car-marketplace.<INGRESS_IP>.nip.io` — resolves automatically, works with Let's Encrypt.

---

## Phase 1 — Validate locally, then push

```bash
npm install && npm test
docker build -t car-marketplace:local .

# The two gates the pipeline will apply — run them now, not at 2am on demo day
trivy fs --scanners vuln,secret --severity HIGH,CRITICAL --ignore-unfixed .
trivy image --severity HIGH,CRITICAL --ignore-unfixed car-marketplace:local
helm lint helm/car-marketplace
helm template car-marketplace helm/car-marketplace | head -50
```

Then:

```bash
git init && git add . && git commit -m "feat: car marketplace + DevSecOps pipeline"
git branch -M main
git remote add origin https://github.com/<you>/car-marketplace.git
git push -u origin main
```

---

## Phase 2 — Azure resources

Edit the variables at the top of `scripts/02-azure-setup.sh`, then run it. It creates
Resource Group → ACR → AKS (`--attach-acr`, managed identity) → Service Principal →
installs the NGINX Ingress Controller, and prints every credential you need for Phase 5.
**Copy that block — the SP password is shown once.**

```bash
bash scripts/02-azure-setup.sh
```

Checkpoints:

```bash
az aks show -g rg-car-marketplace -n aks-car-marketplace --query provisioningState
kubectl get nodes
kubectl get svc -n ingress-nginx      # note EXTERNAL-IP (this is the Azure Load Balancer)
```

---

## Phase 3 — Jenkins VM

Ubuntu 22.04, **Standard_B2ms or larger** (Trivy + SonarQube + Docker on a B2s will
thrash). 30 GB disk minimum. Open inbound **22, 8080, 9000**.

```bash
bash scripts/01-jenkins-vm-setup.sh
```

Installs Java 17, Jenkins, Docker, Node 24, Azure CLI, kubectl, **Helm 3**, **Trivy**,
sonar-scanner; adds `jenkins` to the `docker` group; pre-downloads the Trivy DB.

**Plugins**: `Git`, `GitHub`, `GitHub Integration`, `Pipeline`, `Docker Pipeline`,
`SonarQube Scanner`, `Credentials Binding`, `AnsiColor`, `Timestamper`, `Workspace Cleanup`.

---

## Phase 4 — SonarQube + Quality Gate

```bash
sudo docker run -d --name sonarqube --restart unless-stopped -p 9000:9000 \
  -v sonarqube_data:/opt/sonarqube/data \
  -v sonarqube_extensions:/opt/sonarqube/extensions \
  sonarqube:lts-community
```

1. Log in at `http://<VM-IP>:9000` (`admin`/`admin`, change it).
2. **Quality Gates → Create** — e.g. New Bugs > 0 fails, New Vulnerabilities > 0 fails,
   Coverage on New Code < 60% fails. Set as default.
3. **My Account → Security → Generate Token**.
4. **Administration → Configuration → Webhooks → Create**:
   `http://<JENKINS-IP>:8080/sonarqube-webhook/`
   ← **without this, stage 5 hangs for the full 10-minute timeout even when the gate is green.**

In Jenkins: **System → SonarQube servers** (name `SonarQube`) and
**Tools → SonarQube Scanner** (name `SonarScanner`, install automatically).

---

## Phase 5 — Jenkins credentials

Manage Jenkins → Credentials → System → Global. The IDs must match exactly:

| ID | Kind | Contents |
|---|---|---|
| `github-credentials` | Username with password | GitHub user + PAT (`repo`, `admin:repo_hook`) |
| `azure-service-principal` | Username with password | SP `appId` / `password` |
| `azure-tenant-id` | Secret text | SP `tenant` |
| `azure-subscription-id` | Secret text | Subscription ID |
| `acr-credentials` | Username with password | ACR admin username / password |
| `sonarqube-token` | Secret text | SonarQube token from Phase 4 |

---

## Phase 6 — Pipeline job + webhook

1. **New Item → Pipeline** → `car-marketplace-pipeline`.
2. Tick **GitHub hook trigger for GITScm polling**.
3. *Pipeline script from SCM* → Git → repo URL → `github-credentials` → `*/main` →
   Script Path `Jenkinsfile`.
4. GitHub → **Settings → Webhooks → Add**: `http://<JENKINS-IP>:8080/github-webhook/`,
   content type `application/json`, push events only. Delivery must show ✔ 200.
5. Edit the `environment` block in the `Jenkinsfile`: `ACR_NAME`, `AKS_RESOURCE_GROUP`,
   `AKS_CLUSTER_NAME`, `APP_HOST`.

---

## Phase 7 — First run

```bash
git commit --allow-empty -m "ci: first pipeline run" && git push
```

Thirteen stages. Where it will actually break:

| Symptom | Cause | Fix |
|---|---|---|
| `docker: permission denied` | jenkins not in docker group | `sudo usermod -aG docker jenkins && sudo systemctl restart jenkins` |
| Stage 5 hangs then fails on a green gate | SonarQube webhook missing | Phase 4 step 4 |
| Stage 6/8 fails on day one, every time | gate severity too strict for the base image | keep `TRIVY_FAIL_SEVERITY=CRITICAL` + `--ignore-unfixed`; see note below |
| Trivy: `failed to download vulnerability DB` | GHCR rate limit | `trivy image --download-db-only` once manually; the DB caches for 24h |
| `unauthorized` on `docker push` | wrong ACR credential | `az acr credential show -n <acr>` |
| `ImagePullBackOff` | ACR not attached to AKS | `az aks update -g <rg> -n <aks> --attach-acr <acr>` |
| `helm upgrade` fails and reverts | probe path wrong / image bad | that is `--atomic` working; read `kubectl get events` |
| `UPGRADE FAILED: another operation in progress` | previous run killed mid-deploy | `helm rollback <release> -n <ns>` then retry |
| HPA shows `<unknown>/60%` | metrics-server warming, or no resource requests | wait 2 min; requests are set in `values.yaml` |

### The Trivy tuning note — read this before you rage-quit

A stock `node:24-alpine` image will report HIGH CVEs that have **no fix available**.
If you gate on "any HIGH," the pipeline can never go green and you'll assume you
misconfigured something. The chart's defaults are deliberate:

- `--ignore-unfixed` — don't fail on things you cannot patch
- gate on `CRITICAL` only; **report** on `HIGH,CRITICAL` (archived as a build artifact)
- `.trivyignore` for individually risk-accepted CVEs, each with a reason and review date

Tighten `TRIVY_FAIL_SEVERITY` to `HIGH,CRITICAL` once you've seen a clean run — that
progression is itself a good thing to narrate in a demo.

---

## Phase 8 — Ingress, TLS, DNS

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller   # EXTERNAL-IP
```

Point DNS at it, or set `APP_HOST=car-marketplace.<IP>.nip.io` in the Jenkinsfile.
For real certificates:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.15.3/cert-manager.yaml
# create a ClusterIssuer named letsencrypt-prod, then uncomment the
# cert-manager.io/cluster-issuer annotation in helm/car-marketplace/values.yaml
```

---

## Phase 9 — Verify and demo

```bash
kubectl get pods,deploy,svc,ingress,hpa -n car-marketplace
helm status car-marketplace -n car-marketplace
helm history car-marketplace -n car-marketplace
curl -k https://car-marketplace.example.com/api/info
```

Four demo moments worth rehearsing:

1. **Quality Gate blocks a deploy** — push a hardcoded credential and an unused
   variable. Pipeline dies at stage 5. No image is ever built.
2. **Trivy blocks a deploy** — change the Dockerfile base to an old tag
   (`node:18.0-alpine`). Pipeline dies at stage 8. Nothing reaches ACR.
   Show `reports/trivy-image.txt` in the build artifacts.
3. **HPA scales** —
   ```bash
   kubectl run load --rm -it --image=busybox -n car-marketplace -- \
     /bin/sh -c "while true; do wget -q -O- http://car-marketplace/api/cart; done"
   kubectl get hpa -n car-marketplace -w        # 2 -> 10
   ```
4. **Helm rollback** — `helm rollback car-marketplace -n car-marketplace` and show
   `helm history`. This is the thing raw `kubectl apply` cannot do.

---

## Phase 10 — If you have time

- Azure Key Vault + Secrets Store CSI driver instead of the chart's plain `Secret`
- Publish `reports/trivy-image.json` to Azure Defender for Cloud, or via the
  HTML Publisher plugin for a browsable report
- `helm package` + `az acr helm push` so the chart itself is versioned in ACR
- Multi-environment: `values-dev.yaml` / `values-prod.yaml`, one release per namespace
