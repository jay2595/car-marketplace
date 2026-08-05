#!/usr/bin/env bash
# Run on a fresh Ubuntu 22.04 VM. Installs Java, Jenkins, Docker, Node.js, Azure CLI, kubectl.
set -euo pipefail

echo "==> System update"
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl wget gnupg lsb-release ca-certificates apt-transport-https software-properties-common git unzip gettext-base

echo "==> Java 17 (required by Jenkins)"
sudo apt-get install -y openjdk-17-jdk
java -version

echo "==> Jenkins"
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key \
  | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" \
  | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y jenkins
sudo systemctl enable --now jenkins

echo "==> Docker Engine"
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
sudo usermod -aG docker jenkins
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker

echo "==> Node.js 24 LTS"
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v

echo "==> Azure CLI"
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
az version

echo "==> kubectl"
sudo az aks install-cli || {
  curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
}
kubectl version --client

echo "==> Helm 3"
curl -fsSL https://baltocdn.com/helm/signing.asc | sudo gpg --dearmor -o /usr/share/keyrings/helm.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" \
  | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y helm
helm version --short

echo "==> Trivy"
curl -fsSL https://aquasecurity.github.io/trivy-repo/deb/public.key \
  | sudo gpg --dearmor -o /usr/share/keyrings/trivy.gpg
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" \
  | sudo tee /etc/apt/sources.list.d/trivy.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y trivy
trivy --version

echo "==> Warm the Trivy vulnerability DB so the first build is not slow"
sudo -u jenkins trivy image --download-db-only --no-progress || trivy image --download-db-only --no-progress

echo "==> SonarQube Scanner CLI (optional - Jenkins can also manage this as a tool)"
SCANNER_VER=5.0.1.3006
wget -q https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SCANNER_VER}-linux.zip
sudo unzip -q sonar-scanner-cli-${SCANNER_VER}-linux.zip -d /opt
sudo ln -sf /opt/sonar-scanner-${SCANNER_VER}-linux/bin/sonar-scanner /usr/local/bin/sonar-scanner
rm -f sonar-scanner-cli-${SCANNER_VER}-linux.zip

echo "==> Restart Jenkins so the docker group membership applies"
sudo systemctl restart jenkins

echo
echo "Jenkins URL : http://$(curl -s ifconfig.me):8080"
echo "Initial admin password:"
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
