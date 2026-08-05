# Plain manifests (fallback / reference only)

The pipeline deploys with **Helm** (`helm/car-marketplace`). These raw manifests are kept
as a reference and as a manual fallback if Helm is unavailable during a demo:

```bash
kubectl create namespace car-marketplace
ACR_LOGIN_SERVER=<acr>.azurecr.io IMAGE_TAG=<build>-<sha> \
  sh -c 'for f in *.yaml; do envsubst < "$f"; echo ---; done' \
  | kubectl apply -n car-marketplace -f -
```

They are functionally equivalent to the chart rendered with default `values.yaml`.
If you change the chart, these will drift — the chart is the source of truth.
