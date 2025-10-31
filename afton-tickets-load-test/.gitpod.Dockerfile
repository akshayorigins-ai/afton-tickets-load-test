FROM gitpod/workspace-full

# Install Docker
RUN curl -fsSL https://get.docker.com -o get-docker.sh && \
    sh get-docker.sh && \
    sudo usermod -aG docker gitpod

# Install Docker Compose
RUN sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
    sudo chmod +x /usr/local/bin/docker-compose

# Install K6
RUN curl -L https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz | tar xz && \
    sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/ && \
    rm -rf k6-v0.47.0-linux-amd64

USER gitpod
