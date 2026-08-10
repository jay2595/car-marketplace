# Jenkins with the toolchain stages 1-9 need: Docker CLI, Node 24, Trivy.
# Deliberately avoids third-party apt repositories - they break whenever the
# base image moves to a new Debian release. Static binaries instead.
FROM jenkins/jenkins:lts-jdk17

USER root

# Debian's own repos only
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates git unzip xz-utils gettext-base jq \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# ---- Docker CLI (client only; drives the mounted host socket) --------------
ARG DOCKER_VERSION=27.5.1
RUN set -eux; \
    url="https://download.docker.com/linux/static/stable/x86_64"; \
    if ! curl -fsSL -o /tmp/docker.tgz "$url/docker-${DOCKER_VERSION}.tgz"; then \
      echo "pinned version not found, resolving latest"; \
      DOCKER_VERSION="$(curl -fsSL $url/ | grep -oE 'docker-[0-9]+\.[0-9]+\.[0-9]+\.tgz' | sed 's/docker-//;s/\.tgz//' | sort -V | tail -1)"; \
      curl -fsSL -o /tmp/docker.tgz "$url/docker-${DOCKER_VERSION}.tgz"; \
    fi; \
    tar -xzf /tmp/docker.tgz -C /tmp; \
    mv /tmp/docker/docker /usr/local/bin/docker; \
    rm -rf /tmp/docker /tmp/docker.tgz; \
    docker --version

# ---- Node.js 24 (official tarball, latest v24 resolved at build time) ------
RUN set -eux; \
    NODE_VER="$(curl -fsSL https://nodejs.org/dist/index.json | jq -r '[.[] | select(.version|startswith("v24."))][0].version')"; \
    echo "installing Node $NODE_VER"; \
    curl -fsSL "https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-linux-x64.tar.xz" -o /tmp/node.tar.xz; \
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 --no-same-owner \
        --exclude=CHANGELOG.md --exclude=LICENSE --exclude=README.md; \
    rm /tmp/node.tar.xz; \
    node --version; npm --version

# ---- Trivy (official installer, pulls from GitHub releases) ----------------
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
      | sh -s -- -b /usr/local/bin \
 && trivy --version

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt --latest true

USER jenkins