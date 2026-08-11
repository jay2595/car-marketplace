pipeline {
  agent any

  environment {
    // ---- Azure / registry -------------------------------------------------
    ACR_NAME           = 'carmarketplaceacr37ae61'                  // <-- change me
    ACR_LOGIN_SERVER   = "${ACR_NAME}.azurecr.io"
    IMAGE_NAME         = 'car-marketplace'

    // ---- AKS / Helm -------------------------------------------------------
    AKS_RESOURCE_GROUP = 'rg-car-marketplace'                 // <-- change me
    AKS_CLUSTER_NAME   = 'aks-car-marketplace'                // <-- change me
    K8S_NAMESPACE      = 'car-marketplace'
    HELM_RELEASE       = 'car-marketplace'
    HELM_CHART         = 'helm/car-marketplace'
    APP_HOST           = 'car-marketplace.20.175.163.47.nip.io'        // <-- change me

    // ---- Security gates ---------------------------------------------------
    // Report on HIGH+, but only fail the build on CRITICAL that has a fix.
    // Tighten to HIGH,CRITICAL once the base image is clean.
    TRIVY_REPORT_SEVERITY = 'HIGH,CRITICAL'
    TRIVY_FAIL_SEVERITY   = 'CRITICAL'
    TRIVY_CACHE_DIR       = "${WORKSPACE}/.trivycache"

    // ---- SonarQube --------------------------------------------------------
    SONAR_SERVER  = 'SonarQube-Local'      // Manage Jenkins > System > SonarQube servers
    SONAR_SCANNER = 'SonarScanner'   // Manage Jenkins > Tools > SonarQube Scanner
  }

  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
    timeout(time: 45, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  triggers {
    githubPush()          // fired by the GitHub webhook
  }

  stages {

    // ========================= BUILD =====================================
    stage('1. Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_COMMIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
          env.IMAGE_TAG        = "${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
          env.IMAGE_REPO       = "${env.ACR_LOGIN_SERVER}/${env.IMAGE_NAME}"
          env.FULL_IMAGE       = "${env.IMAGE_REPO}:${env.IMAGE_TAG}"
          currentBuild.displayName = "#${env.BUILD_NUMBER} · ${env.GIT_COMMIT_SHORT}"
        }
        echo "Target image: ${env.FULL_IMAGE}"
      }
    }

    stage('2. Install dependencies') {
      steps {
        sh '''
          node --version && npm --version
          npm ci || npm install
        '''
      }
    }

    stage('3. Unit tests') {
      steps {
        sh 'npm test'
      }
      post {
        always { archiveArtifacts artifacts: 'coverage/lcov.info', allowEmptyArchive: true }
      }
    }

    // ========================= CODE QUALITY ==============================
    stage('4. SonarQube analysis') {
      steps {
        script {
          def scannerHome = tool "${env.SONAR_SCANNER}"
          withSonarQubeEnv("${env.SONAR_SERVER}") {
            sh """
              ${scannerHome}/bin/sonar-scanner \
                -Dsonar.projectKey=car-marketplace \
                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
            """
          }
        }
      }
    }

    stage('5. Quality Gate') {
      steps {
        timeout(time: 10, unit: 'MINUTES') {
          // Requires the SonarQube -> Jenkins webhook. abortPipeline stops the build.
          waitForQualityGate abortPipeline: true
        }
      }
    }

    // ========================= SECURITY: SOURCE ==========================
    stage('6. Trivy filesystem scan') {
      steps {
        sh '''
          mkdir -p ${TRIVY_CACHE_DIR} reports
          trivy --cache-dir ${TRIVY_CACHE_DIR} image --download-db-only --no-progress || true

          # 1) Human-readable report (never fails the build)
          trivy --cache-dir ${TRIVY_CACHE_DIR} fs \
            --scanners vuln,secret,misconfig \
            --severity ${TRIVY_REPORT_SEVERITY} --ignore-unfixed \
            --no-progress --format table \
            --output reports/trivy-fs.txt .

          # 2) Gate: dependency CVEs and hardcoded secrets
          trivy --cache-dir ${TRIVY_CACHE_DIR} fs \
            --scanners vuln,secret \
            --severity ${TRIVY_FAIL_SEVERITY} --ignore-unfixed \
            --exit-code 1 --no-progress --quiet .
        '''
      }
      post {
        always { archiveArtifacts artifacts: 'reports/trivy-fs.txt', allowEmptyArchive: true }
        failure { echo 'BLOCKED: critical vulnerability or secret found in the source tree.' }
      }
    }

    // ========================= IMAGE =====================================
    stage('7. Build Docker image') {
      steps {
        sh '''
          docker build \
            --build-arg APP_VERSION=${IMAGE_TAG} \
            -t ${IMAGE_NAME}:${IMAGE_TAG} \
            -t ${FULL_IMAGE} \
            .
          docker images ${IMAGE_NAME} | head -5
        '''
      }
    }

    stage('8. Trivy image scan') {
      steps {
        sh '''
          mkdir -p reports
          # 1) Full report for the build artifacts
          trivy --cache-dir ${TRIVY_CACHE_DIR} image \
            --severity ${TRIVY_REPORT_SEVERITY} --ignore-unfixed \
            --no-progress --format table \
            --output reports/trivy-image.txt ${FULL_IMAGE}

          # 2) Machine-readable, useful for dashboards / evidence
          trivy --cache-dir ${TRIVY_CACHE_DIR} image \
            --severity ${TRIVY_REPORT_SEVERITY} --ignore-unfixed \
            --no-progress --format json \
            --output reports/trivy-image.json ${FULL_IMAGE}

          # 3) Gate: only an approved image reaches ACR
          trivy --cache-dir ${TRIVY_CACHE_DIR} image \
            --severity ${TRIVY_FAIL_SEVERITY} --ignore-unfixed \
            --exit-code 1 --no-progress --quiet ${FULL_IMAGE}

          echo "IMAGE APPROVED: ${FULL_IMAGE}"
        '''
      }
      post {
        always { archiveArtifacts artifacts: 'reports/trivy-image.*', allowEmptyArchive: true }
        failure {
          echo 'BLOCKED: image failed the vulnerability gate - nothing pushed to ACR.'
          sh 'docker rmi ${FULL_IMAGE} || true'
        }
      }
    }

    stage('9. Push image to ACR') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'acr-credentials',
                                          usernameVariable: 'ACR_USER',
                                          passwordVariable: 'ACR_PASS')]) {
          sh '''
            echo "$ACR_PASS" | docker login ${ACR_LOGIN_SERVER} -u "$ACR_USER" --password-stdin
            docker push ${FULL_IMAGE}
            docker logout ${ACR_LOGIN_SERVER}
          '''
        }
      }
    }

    // ========================= DEPLOY ====================================
    stage('10. Connect to AKS') {
      steps {
        withCredentials([
          usernamePassword(credentialsId: 'azure-service-principal',
                           usernameVariable: 'AZ_CLIENT_ID',
                           passwordVariable: 'AZ_CLIENT_SECRET'),
          string(credentialsId: 'azure-tenant-id',       variable: 'AZ_TENANT_ID'),
          string(credentialsId: 'azure-subscription-id', variable: 'AZ_SUBSCRIPTION_ID')
        ]) {
          sh '''
            az login --service-principal \
              -u "$AZ_CLIENT_ID" -p "$AZ_CLIENT_SECRET" -t "$AZ_TENANT_ID" >/dev/null
            az account set --subscription "$AZ_SUBSCRIPTION_ID"
            az aks get-credentials \
              --resource-group ${AKS_RESOURCE_GROUP} \
              --name ${AKS_CLUSTER_NAME} \
              --overwrite-existing
            kubectl cluster-info
            helm version --short
          '''
        }
      }
    }

    stage('11. Validate Helm chart') {
      steps {
        sh '''
          helm lint ${HELM_CHART} \
            --set image.repository=${IMAGE_REPO} \
            --set image.tag=${IMAGE_TAG}

          helm template ${HELM_RELEASE} ${HELM_CHART} \
            --namespace ${K8S_NAMESPACE} \
            --set image.repository=${IMAGE_REPO} \
            --set image.tag=${IMAGE_TAG} \
            --set ingress.hosts[0].host=${APP_HOST} --set ingress.hosts[0].paths[0].path=/ --set ingress.hosts[0].paths[0].pathType=Prefix \
            --set ingress.tls[0].secretName=car-marketplace-tls --set ingress.tls[0].hosts[0]=${APP_HOST} \
            > reports/helm-rendered.yaml

          # Server-side dry run catches schema errors before anything is applied
          kubectl get namespace ${K8S_NAMESPACE} >/dev/null 2>&1 \
            || kubectl create namespace ${K8S_NAMESPACE}
          kubectl apply --dry-run=server -f reports/helm-rendered.yaml -n ${K8S_NAMESPACE}
        '''
      }
      post {
        always { archiveArtifacts artifacts: 'reports/helm-rendered.yaml', allowEmptyArchive: true }
      }
    }

    stage('12. Helm deploy to AKS') {
      steps {
        sh '''
          helm upgrade --install ${HELM_RELEASE} ${HELM_CHART} \
            --namespace ${K8S_NAMESPACE} --create-namespace \
            --set image.repository=${IMAGE_REPO} \
            --set image.tag=${IMAGE_TAG} \
            --set ingress.hosts[0].host=${APP_HOST} --set ingress.hosts[0].paths[0].path=/ --set ingress.hosts[0].paths[0].pathType=Prefix \
            --set ingress.tls[0].secretName=car-marketplace-tls --set ingress.tls[0].hosts[0]=${APP_HOST} \
            --atomic --wait --timeout 6m \
            --history-max 10

          helm history ${HELM_RELEASE} -n ${K8S_NAMESPACE}
        '''
      }
    }

    stage('13. Verify deployment') {
      steps {
        sh '''
          echo "----- PODS -----";        kubectl get pods        -n ${K8S_NAMESPACE} -o wide
          echo "----- DEPLOYMENTS -----"; kubectl get deployments -n ${K8S_NAMESPACE}
          echo "----- SERVICES -----";    kubectl get svc         -n ${K8S_NAMESPACE}
          echo "----- INGRESS -----";     kubectl get ingress     -n ${K8S_NAMESPACE}
          echo "----- HPA -----";         kubectl get hpa         -n ${K8S_NAMESPACE}

          # Helm's own smoke test (templates/tests/test-connection.yaml)
          helm test ${HELM_RELEASE} -n ${K8S_NAMESPACE} --timeout 2m

          # External availability via the Ingress
          INGRESS_IP=$(kubectl get ingress -n ${K8S_NAMESPACE} \
            -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
          echo "Ingress IP: ${INGRESS_IP:-<pending>}"
          if [ -n "$INGRESS_IP" ]; then
            curl -skf --resolve ${APP_HOST}:443:${INGRESS_IP} \
              https://${APP_HOST}/health/ready && echo "  <- app reachable through Ingress"
          fi
        '''
      }
    }
  }

  post {
    success {
      echo "SUCCESS: ${env.FULL_IMAGE} live at https://${env.APP_HOST}"
    }
    failure {
      // --atomic already rolls back a failed upgrade; this reports the end state.
      sh 'helm status ${HELM_RELEASE} -n ${K8S_NAMESPACE} || true'
      sh 'kubectl get events -n ${K8S_NAMESPACE} --sort-by=.lastTimestamp 2>/dev/null | tail -20 || true'
    }
    always {
      sh 'docker image prune -f || true'
      cleanWs(patterns: [[pattern: '.trivycache/**', type: 'EXCLUDE']])
    }
  }
}
