#!/bin/bash

# --- WifiGuard AI: Auto-Launcher for macOS ---

echo "------------------------------------------------"
echo "Initializing WifiGuard AI Security Audit System"
echo "------------------------------------------------"

# 1. Cleaning up old processes
echo "Cleaning up old bridge instances..."
killall python3 2>/dev/null || true

# 2. Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Please install it from https://nodejs.org/"
    exit 1
fi

# 2. Check for Python3
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python3 not found. Please install it."
    exit 1
fi

# 3. Installing Web Dependencies
echo "[1/4] Checking Web Dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages (this may take a minute)..."
    npm install
else
    echo "Web dependencies already installed."
fi

# 4. Installing Python Dependencies
echo "[2/4] Checking Python Dependencies..."
pip3 install websockets access-points --quiet
echo "Python dependencies ready."

# 5. Launching Hardware Bridge in background
echo "[3/4] Launching Hardware Bridge..."
python3 bridge.py > bridge.log 2>&1 &
BRIDGE_PID=$!
sleep 2

# Check if bridge is still running
if ps -p $BRIDGE_PID > /dev/null
then
   echo "Hardware Bridge is RUNNING (PID: $BRIDGE_PID)."
else
   echo "ERROR: Hardware Bridge failed to start! Check 'bridge.log' for details."
   cat bridge.log
   exit 1
fi

# Function to kill bridge on exit
cleanup() {
    echo ""
    echo "Shutting down system..."
    kill $BRIDGE_PID
    exit
}
trap cleanup SIGINT SIGTERM

# 6. Launching Web UI
echo "[4/4] Launching Web Interface..."
echo "------------------------------------------------"
echo "ATTENTION: If you don't see Wi-Fi networks, ensure"
echo "Terminal has 'Location Services' enabled in"
echo "System Settings > Privacy & Security."
echo "------------------------------------------------"

npm run dev
