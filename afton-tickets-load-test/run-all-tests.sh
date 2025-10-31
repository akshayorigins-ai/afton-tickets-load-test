#!/bin/bash

echo "🚀 Starting Complete Load Test Suite for Afton Tickets..."

# Function to run test with specific profile
run_test() {
    local component=$1
    local profile=$2
    local script=$3
    
    echo ""
    echo "🎯 Testing $component with $profile load..."
    echo "=========================================="
    
    # For Play with Docker, we use the k6 container
    docker-compose run --rm k6 run /scripts/$script --out influxdb=http://admin:admin123@influxdb:8086/k6
    
    # Wait between tests
    sleep 10
}

# Ultra Light Tests
echo "🌟 ULTRA LIGHT LOAD TESTS (10-50 VUs)"
echo "======================================"
run_test "Homepage" "ultralight" "homepage.js"
run_test "Events Page" "ultralight" "events.js" 
run_test "Search Flow" "ultralight" "search.js"
run_test "Event Details" "ultralight" "event-details.js"
run_test "Ticket Options" "ultralight" "ticket-options.js"
run_test "Checkout" "ultralight" "checkout.js"

# Light Tests
echo ""
echo "💡 LIGHT LOAD TESTS (50-300 VUs)"
echo "================================"
run_test "Homepage" "light" "homepage.js"
run_test "Events Page" "light" "events.js"
run_test "Search Flow" "light" "search.js"
run_test "Event Details" "light" "event-details.js"
run_test "Ticket Options" "light" "ticket-options.js"
run_test "Checkout" "light" "checkout.js"

# Medium Tests  
echo ""
echo "⚡ MEDIUM LOAD TESTS (100-600 VUs)"
echo "=================================="
run_test "Homepage" "medium" "homepage.js"
run_test "Events Page" "medium" "events.js"
run_test "Search Flow" "medium" "search.js"
run_test "Event Details" "medium" "event-details.js"
run_test "Ticket Options" "medium" "ticket-options.js"
run_test "Checkout" "medium" "checkout.js"

# Heavy Tests
echo ""
echo "🔥 HEAVY LOAD TESTS (200-1000 VUs)"
echo "=================================="
run_test "Homepage" "heavy" "homepage.js"
run_test "Events Page" "heavy" "events.js"
run_test "Search Flow" "heavy" "search.js"
run_test "Event Details" "heavy" "event-details.js"
run_test "Ticket Options" "heavy" "ticket-options.js"
run_test "Checkout" "heavy" "checkout.js"

echo ""
echo "✅ ALL LOAD TESTS COMPLETED!"
echo "📊 Check Grafana dashboard: http://localhost:3000"
echo "   Username: admin, Password: admin123"