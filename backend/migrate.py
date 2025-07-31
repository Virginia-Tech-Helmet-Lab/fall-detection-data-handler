#!/usr/bin/env python
"""Database migration management script."""

from flask_migrate import Migrate, init, migrate, upgrade, downgrade
from app import create_app
from app.database import db
import os
import sys

# Create app with production config if specified
env = os.environ.get('FLASK_ENV', 'development')
app = create_app(env)
migrate_instance = Migrate(app, db)

def init_db():
    """Initialize migration repository."""
    with app.app_context():
        init()
        print("Initialized migration repository")

def create_migration(message="Auto migration"):
    """Create a new migration."""
    with app.app_context():
        migrate(message=message)
        print(f"Created migration: {message}")

def upgrade_db():
    """Apply pending migrations."""
    with app.app_context():
        upgrade()
        print("Database upgraded to latest version")

def downgrade_db():
    """Revert last migration."""
    with app.app_context():
        downgrade()
        print("Database downgraded by one version")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python migrate.py [init|create|upgrade|downgrade]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'init':
        init_db()
    elif command == 'create':
        message = sys.argv[2] if len(sys.argv) > 2 else "Auto migration"
        create_migration(message)
    elif command == 'upgrade':
        upgrade_db()
    elif command == 'downgrade':
        downgrade_db()
    else:
        print(f"Unknown command: {command}")
        print("Available commands: init, create, upgrade, downgrade")
        sys.exit(1)