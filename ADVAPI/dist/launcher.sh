#!/bin/bash
# Simple launcher script for testing on Linux/Mac

echo "Starting ADVAPI executable..."
# Make sure it's executable
chmod +x ./advapi.exe

# Start the executable in background
./advapi.exe &
PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 3

# Check if a web browser is available
if command -v xdg-open >/dev/null 2>&1; then
    echo "Opening browser with xdg-open..."
    xdg-open "http://localhost:3002/db-login.html" &
elif command -v open >/dev/null 2>&1; then
    echo "Opening browser with open command..."
    open "http://localhost:3002/db-login.html" &
else
    echo "No browser launcher found. Please open http://localhost:3002/db-login.html manually."
fi

echo "ADVAPI is running (PID: $PID)"
echo "Press Ctrl+C to stop"

# Wait for interrupt
wait $PID