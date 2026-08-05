# Car Marketplace — DevSecOps Pipeline to AKS

A Canadian new / used / certified pre-owned vehicle marketplace, built as the payload for a
13-stage Jenkins DevSecOps pipeline that ships it to Azure Kubernetes Service with Helm.

**Jenkins · GitHub · SonarQube · Trivy · Docker · Azure Container Registry · Helm · AKS**

---

## The application

100 vehicles across 24 makes, 49 models, 7 provinces and 12 licensed dealers. Everything is
priced in CAD and taxed the way Canada actually taxes vehicles.

| Page | Route | What it does |
|---|---|---|
| Home | `#/` | Hero search, body-type and make browsing, new arrivals, EV section |
| Inventory | `#/inventory` | Faceted search — keyword, make, model, year, price, km, body, fuel, drivetrain, transmission, province, colour, history flags. Sort, paginate, live payment estimates |
| Vehicle detail | `#/vehicle/:id` | Gallery, full specs, features, history report, dealer info, live payment breakdown, similar vehicles |
| Compare | `#/compare` | Side-by-side up to 4 vehicles, best price and lowest km highlighted |
| Saved | `#/saved` | Favourites and recently viewed |
| Payment calculator | `#/calculator` | Full Canadian finance calculator with amortization schedule and affordability check |
| Reserve | `#/reserve/:id` | 48-hour hold, validated Canadian contact details, confirm-with-deposit |
| Test drive | `#/testdrive/:id` | Slot picker (dealers closed Sundays), licence and insurance reminder |
| Pre-approval | `#/preapproval` | Soft pre-approval sized by total debt service ratio |
| Trade-in | `#/tradein` | Wholesale value range by age, km, condition, accidents |
| Dealers | `#/dealers`, `#/dealer/:id` | Network by province, per-dealer inventory |
| Admin | `#/admin` | Inventory KPIs, stock by province and body type, live reservations and test drives |

### What makes it Canadian, specifically

- **GST / HST / PST / QST / RST by province** — all 13 provinces and territories.
  Nova Scotia is 14% following the 1 April 2025 cut from 15%.
- **A trade-in reduces the taxable amount**, not just the balance. On a $10,000 trade in
  Ontario that is $1,300 of tax you never pay — the app shows it explicitly.
- **Federal luxury tax** on new vehicles over $100,000: the lesser of 10% of the full price
  or 20% of the amount over $100,000, applied *before* sales tax, so HST is charged on it too.
- **Federal air conditioning excise tax** of $100 on new vehicles.
- **Payment frequencies Canadians are quoted** — monthly, semi-monthly, bi-weekly, weekly —
  each amortized at its own periodic rate rather than a divided monthly figure.
- **Postal code and phone validation** to Canadian rules (no D, F, I, O, Q, U, W or Z as the
  first postal letter; NANP area codes cannot start with 0 or 1).
- Kilometres, L/100 km, provincial dealer regulators (OMVIC, AMVIC, VSA BC, AMVOQ, SGI, MPI),
  Safety Standards Certificates, lien status, RIV notice on US imports, winter tires.

---

## Layout

```
.
├── server.js                     Express API + static host (routing and I/O only)
├── src/
│   ├── finance.js                Canadian tax, luxury tax, amortization, affordability
│   ├── inventory.js              Search, filter, sort, facets, pagination, similar vehicles
│   ├── validate.js               Postal code, phone, email, province, VIN
│   ├── reservations.js           48-hour hold state machine + test drives
│   ├── tradein.js                Trade-in valuation
│   ├── preapproval.js            TDS-ratio pre-approval
│   └── carimage.js               Deterministic SVG vehicle illustrations
├── data/                         cars.json (100), dealers.json, provinces.json
├── tools/generate-data.js        Regenerates the dataset (seeded — byte identical each run)
├── public/                       Vanilla-JS SPA. No bundler, no build step
│   ├── index.html  css/app.css
│   └── js/  (api, store, router, format, components + 12 views)
├── test/                         Jest: 118 domain tests + full API suite
├── Dockerfile                    Multi-stage, non-root, read-only rootfs, HEALTHCHECK
├── Jenkinsfile                   13 stages, 5 gates
├── helm/car-marketplace/         Chart: deployment, service, ingress, hpa, configmap,
│                                 secret, pdb, serviceaccount, helm test
├── k8s/                          Plain-manifest fallback (not used by the pipeline)
├── scripts/                      00-local-check · 01-jenkins-vm-setup · 02-azure-setup
└── docs/                         Implementation steps, Phase 1 guide, architecture diagrams
```

**All business logic is dependency-free.** `src/` imports nothing but Node built-ins and the
JSON data, so every rule is unit-testable without booting a server. `server.js` is routing only.

---

## Quick start

```bash
npm install                      # generates package-lock.json - commit it
bash scripts/00-local-check.sh   # or scripts\00-local-check.ps1 on Windows
npm start                        # http://localhost:3000
```

Regenerate the inventory (seeded, so tests stay green):

```bash
npm run generate:data
```

### Vehicle photography

Images are generated as SVG side profiles tinted to each vehicle's real exterior colour —
self-contained, no external calls, nothing to break during a demo. To use real photos, drop
files into `public/images/cars/<STOCK_NUMBER>/` (e.g. `public/images/cars/CM-1042/1.jpg`) and
the app picks them up automatically with no code change.

---

## Pipeline stages

| # | Stage | Fails the build when |
|---|---|---|
| 1 | Checkout | — |
| 2 | `npm ci` | dependency resolution fails |
| 3 | `npm test` + coverage | any test fails |
| 4 | SonarQube analysis | scanner errors |
| 5 | **Quality Gate** | gate is red (`abortPipeline: true`) |
| 6 | **Trivy filesystem scan** | CRITICAL dependency CVE or hardcoded secret |
| 7 | `docker build` | build fails |
| 8 | **Trivy image scan** | CRITICAL CVE — nothing reaches ACR |
| 9 | Push to ACR | auth or push failure |
| 10 | `az aks get-credentials` | Service Principal auth failure |
| 11 | `helm lint` + `template` + server dry-run | invalid chart |
| 12 | `helm upgrade --install --atomic --wait` | rollout unhealthy (auto-rolls back) |
| 13 | Verify + `helm test` | any pod not Ready, or smoke test fails |

Images are tagged `<BUILD_NUMBER>-<GIT_SHA>`. That unique tag is what makes `helm upgrade`
produce a genuinely new pod spec — `:latest` would be a no-op.

---

## Configuration

Injected from the Helm ConfigMap, visible at `/api/info` and on the Admin page:

| Variable | Default | Effect |
|---|---|---|
| `APP_ENV` | `production` | Shown in the footer and admin header |
| `CURRENCY` | `CAD` | Display currency |
| `DEFAULT_PROVINCE` | `ON` | Province used before the visitor picks one |
| `DEFAULT_APR` | `7.99` | Rate behind listing-tile payment estimates |
| `DEFAULT_TERM_MONTHS` | `60` | Default finance term |
| `LOG_LEVEL` | `info` | Set `silent` to suppress error logging |
| `PORT` | `3000` | Listen port |

Changing a ConfigMap value rolls the pods — the chart carries a `checksum/config` annotation,
without which running pods keep the old environment.

---

## API

`/health/live` · `/health/ready` · `/api/info` · `/api/cars` · `/api/cars/:id` ·
`/api/cars/:id/image.svg` · `/api/cars/:id/similar` · `/api/facets` · `/api/dealers` ·
`/api/dealers/:id` · `/api/provinces` · `/api/finance/quote` · `/api/finance/affordability` ·
`/api/finance/schedule` · `/api/finance/apr` · `/api/tradein/estimate` · `/api/preapproval` ·
`/api/reservations` (+ `/:ref`, `/:ref/confirm`, `/:ref/cancel`) · `/api/testdrives` (+ `/:ref`) ·
`/api/admin/summary` · `/api/admin/reservations` · `/api/admin/testdrives`

---

## Known limitations

Deliberate, and worth being able to name if a reviewer asks:

- **Reservations are in-memory.** Restarting a pod clears them. The demo is about the delivery
  pipeline, not persistence — swapping in Postgres means replacing `src/reservations.js` and
  nothing else.
- **Inventory is a static JSON file** baked into the image, so every replica serves identical
  data with no shared state.
- **No authentication.** The admin page is open; a real deployment would put it behind an
  ingress auth annotation or an identity provider.
- **Vehicle data is fictional.** Prices, VINs, dealers and history are generated.
