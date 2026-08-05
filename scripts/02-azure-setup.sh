#!/usr/bin/env bash
# Creates the Azure resources: Resource Group, ACR, AKS, SP, and attaches ACR to AKS.
set -euo pipefail

# ---- Edit these -----------------------------------------------------------
RG="rg-car-marketplace"
LOCATION="eastus"
ACR_NAME="carmarketplaceacr"          # must be globally unique, lowercase alphanumeric
AKS_NAME="aks-car-marketplace"
NODE_COUNT=2
NODE_SIZE="Standard_B2s"
SP_NAME="sp-jenkins-car-marketplace"
# ---------------------------------------------------------------------------

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Subscription: $SUBSCRIPTION_ID"

echo "==> Resource group"
az group create --name "$RG" --location "$LOCATION" -o table

echo "==> Azure Container Registry"
az acr create --resource-group "$RG" --name "$ACR_NAME" --sku Basic --admin-enabled true -o table
ACR_USER=$(az acr credential show -n "$ACR_NAME" --query username -o tsv)
ACR_PASS=$(az acr credential show -n "$ACR_NAME" --query "passwords[0].value" -o tsv)

echo "==> AKS cluster (with ACR attached and monitoring)"
az aks create \
  --resource-group "$RG" \
  --name "$AKS_NAME" \
  --node-count "$NODE_COUNT" \
  --node-vm-size "$NODE_SIZE" \
  --enable-managed-identity \
  --attach-acr "$ACR_NAME" \
  --generate-ssh-keys \
  --enable-addons monitoring \
  -o table

echo "==> Service principal for Jenkins (Contributor on the resource group)"
SP_JSON=$(az ad sp create-for-rbac \
  --name "$SP_NAME" \
  --role Contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG" \
  -o json)

echo "==> Get kubeconfig locally"
az aks get-credentials --resource-group "$RG" --name "$AKS_NAME" --overwrite-existing

echo "==> NGINX Ingress Controller"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.2/deploy/static/provider/cloud/deploy.yaml
kubectl -n ingress-nginx rollout status deployment/ingress-nginx-controller --timeout=300s

echo "==> Metrics Server check (required by HPA - preinstalled on AKS)"
kubectl top nodes || echo "metrics-server still warming up"

cat <<SUMMARY

==========  ADD THESE TO JENKINS CREDENTIALS  ==========
azure-service-principal   (Username with password)
  Username : $(echo "$SP_JSON" | grep -o '"appId": *"[^"]*"' | cut -d'"' -f4)
  Password : $(echo "$SP_JSON" | grep -o '"password": *"[^"]*"' | cut -d'"' -f4)

azure-tenant-id           (Secret text)
  $(echo "$SP_JSON" | grep -o '"tenant": *"[^"]*"' | cut -d'"' -f4)

azure-subscription-id     (Secret text)
  $SUBSCRIPTION_ID

acr-credentials           (Username with password)
  Username : $ACR_USER
  Password : $ACR_PASS

Ingress external IP (may take a minute):
  kubectl get svc -n ingress-nginx ingress-nginx-controller
========================================================
SUMMARY
