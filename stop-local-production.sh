#!/bin/bash
# Stop local production servers

if [ -f "local-production.pid" ]; then
    echo "Stopping local production servers..."
    PIDS=$(cat local-production.pid)
    for PID in $PIDS; do
        if ps -p $PID > /dev/null; then
            echo "Stopping process $PID..."
            kill $PID
        fi
    done
    rm local-production.pid
    echo "Servers stopped."
else
    echo "No running servers found (local-production.pid not found)"
fi