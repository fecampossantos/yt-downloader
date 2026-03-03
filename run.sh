#!/bin/bash

echo "Starting deployment script for Termux..."

echo "=========================================="
echo "1. Installing backend dependencies..."
echo "=========================================="
cd backend
npm install
cd ..

echo "=========================================="
echo "2. Installing frontend dependencies..."
echo "=========================================="
cd frontend
yarn install
cd ..

echo "=========================================="
echo "3. Starting backend server..."
echo "=========================================="
cd backend
node server.js &
BACKEND_PID=$!
cd ..

echo "=========================================="
echo "4. Starting frontend server..."
echo "=========================================="
cd frontend
yarn dev --port 3000 &
FRONTEND_PID=$!
cd ..

echo "Waiting for servers to start..."
sleep 5

echo "=========================================="
echo "5. Starting tunnel (localtunnel)..."
echo "=========================================="
echo "You can access your frontend anywhere via the URL provided below."
echo "Keep this terminal open to keep the servers running."
echo "(Press Ctrl+C to stop all servers)"

# Cleanup trap to kill background processes if the script is interrupted
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM EXIT

# Run localtunnel
npx --yes localtunnel --port 3000
