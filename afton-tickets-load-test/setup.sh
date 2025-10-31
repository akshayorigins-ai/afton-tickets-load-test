#!/bin/bash

echo "🚀 Setting up Afton Tickets Load Testing Environment in Browser..."

# Create directory structure
mkdir -p grafana/provisioning/datasources \
         grafana/provisioning/dashboards \
         grafana/dashboards \
         config \
         scripts \
         results

# Install K6 in the Play with Docker environment
echo "📦 Installing K6..."
curl -L https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz | tar xz
sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/
rm -rf k6-v0.47.0-linux-amd64

# Install Node.js and npm for cross-env
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install cross-env
echo "📦 Installing cross-env..."
npm install -g cross-env

# Start Docker infrastructure
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check if services are running
echo "🔍 Checking services status..."
docker ps

# Display access information
echo ""
echo "✅ SETUP COMPLETED!"
echo "===================="
echo "📊 Grafana Dashboard: http://localhost:3000"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📈 InfluxDB: http://localhost:8086"
echo "   Database: k6"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🚀 To run tests, use: ./run-all-tests.sh"
echo "🔍 To view logs: docker-compose logs -f"
echo ""