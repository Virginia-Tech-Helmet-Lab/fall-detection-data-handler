#!/bin/bash
# Automated backup script for Fall Detection Data Handler
# Add to crontab: 0 2 * * * /path/to/backup-cron.sh

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
LOG_FILE="$BACKUP_DIR/backup.log"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Start backup
log "Starting automated backup..."

# Change to backend directory
cd "$PROJECT_ROOT/backend"

# Run backup script
if python backup_database.py >> "$LOG_FILE" 2>&1; then
    log "Backup completed successfully"
else
    log "ERROR: Backup failed!"
    exit 1
fi

# Clean up old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type f -name "*.db" -mtime +$RETENTION_DAYS -delete 2>/dev/null
find "$BACKUP_DIR" -type f -name "*.sql" -mtime +$RETENTION_DAYS -delete 2>/dev/null
find "$BACKUP_DIR" -type f -name "*.json" -mtime +$RETENTION_DAYS -delete 2>/dev/null
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_manifest_*.json" | wc -l)
log "Cleanup complete. $BACKUP_COUNT backups remaining."

# Check disk space
DISK_USAGE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    log "WARNING: Disk usage is at $DISK_USAGE%!"
fi

log "Automated backup process finished"
echo "" >> "$LOG_FILE"  # Add blank line for readability