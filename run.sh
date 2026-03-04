#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

LOG_DATE=$(date +"%Y%m%d_%H%M%S")
mkdir -p logs

BACKEND_LOG="logs/backend_log_${LOG_DATE}.log"
FRONTEND_LOG="logs/frontend_log_${LOG_DATE}.log"

echo "Starting deployment script for Termux..."

echo "=========================================="
echo "0. Cleaning up used ports (3000, 3001)..."
echo "=========================================="
npx --yes kill-port 3000 3001 2>/dev/null || true
echo "Ports cleaned."

echo "=========================================="
echo "1. Installing backend dependencies..."
echo "=========================================="
cd backend
npm install --no-save
cd ..

echo "=========================================="
echo "2. Installing frontend dependencies..."
echo "=========================================="
cd frontend
npm install --no-save
cd ..

echo "=========================================="
echo "3. Starting backend server..."
echo "=========================================="
cd backend
echo "-> Logs will be saved to ${BACKEND_LOG}"
node server.js > "../${BACKEND_LOG}" 2>&1 &
BACKEND_PID=$!
cd ..

echo "=========================================="
echo "4. Starting frontend server..."
echo "=========================================="
cd frontend
echo "-> Logs will be saved to ${FRONTEND_LOG}"
npm run dev -- -p 3000 > "../${FRONTEND_LOG}" 2>&1 &
FRONTEND_PID=$!
cd ..

echo "Waiting for servers to start..."
sleep 5

echo "=========================================="
echo "5. Tailing logs and Starting tunnel (localtunnel)..."
echo "=========================================="
echo "You can access your frontend anywhere via the URL provided below."
echo "Keep this terminal open to keep the servers running."
echo "(Press Ctrl+C to stop all servers)"

# Tailing logs so we can see what's happening in the background
tail -f "${BACKEND_LOG}" "${FRONTEND_LOG}" &
TAIL_PID=$!

# Cleanup trap to kill background processes if the script is interrupted
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID $TAIL_PID; exit" INT TERM EXIT

# Run localtunnel and generate QR Code
echo "Waiting for tunnel URL..."
npx --yes localtunnel --port 3000 | while read line; do
  echo "$line"
  URL=$(echo "$line" | grep -o 'https://[^ ]*')
  if [ ! -z "$URL" ]; then
    TUNNEL_PASSWORD=$(curl -s https://loca.lt/mytunnelpassword)
    echo "=========================================="
    echo "Localtunnel requires an IP password on the first visit!"
    echo "Your password is: $TUNNEL_PASSWORD"
    echo "=========================================="
  fi
done
