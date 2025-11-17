#!/bin/bash

# Monitor script for upload system
# Usage: ./monitor.sh

echo "========================================="
echo "PayMeDrive Upload Monitor"
echo "========================================="
echo ""

while true; do
    clear
    echo "=== $(date) ==="
    echo ""
    
    # Node process memory
    echo "📊 Node Process Memory:"
    ps aux | grep "node.*server" | grep -v grep | awk '{printf "  RSS: %6.1f MB  CPU: %5.1f%%  PID: %s\n", $6/1024, $3, $2}' | head -3
    echo ""
    
    # Swap usage
    echo "💾 Swap Usage:"
    sysctl vm.swapusage | awk '{print "  " $0}'
    echo ""
    
    # Chunk storage
    echo "📦 Chunk Storage:"
    if [ -d "server/chunks" ]; then
        total=$(du -sh server/chunks 2>/dev/null | awk '{print $1}')
        count=$(ls server/chunks 2>/dev/null | wc -l | tr -d ' ')
        echo "  Size: $total"
        echo "  Uploads: $count"
        
        # Show active uploads
        if [ "$count" -gt 0 ]; then
            echo ""
            echo "  Active Uploads:"
            for dir in server/chunks/*/; do
                if [ -d "$dir" ]; then
                    upload_id=$(basename "$dir")
                    chunk_count=$(ls "$dir" 2>/dev/null | wc -l | tr -d ' ')
                    size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
                    echo "    - $upload_id: $chunk_count chunks ($size)"
                fi
            done
        fi
    else
        echo "  No chunks directory"
    fi
    echo ""
    
    # Recent logs
    echo "📝 Recent Activity:"
    if [ -f "server/logs/app.log" ]; then
        tail -5 server/logs/app.log | grep -i "chunk\|finali\|error" | tail -3 | sed 's/^/  /'
    else
        echo "  No logs yet"
    fi
    echo ""
    
    echo "========================================="
    echo "Press Ctrl+C to exit"
    echo ""
    
    sleep 2
done
