"""Add security fields to User model"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.database import db
from sqlalchemy import text

def upgrade():
    """Add security fields to users table"""
    app = create_app()
    
    with app.app_context():
        # Add new columns with proper SQL
        migrations = [
            "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN locked_until DATETIME",
            "ALTER TABLE users ADD COLUMN password_changed_at DATETIME",
            "ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0"
        ]
        
        for migration in migrations:
            try:
                db.session.execute(text(migration))
                db.session.commit()
                print(f"✓ Applied: {migration}")
            except Exception as e:
                if "duplicate column name" in str(e).lower():
                    print(f"⚠ Column already exists, skipping: {migration}")
                else:
                    print(f"✗ Failed: {migration} - {str(e)}")
                db.session.rollback()
        
        # Update existing users to set password_changed_at
        try:
            db.session.execute(text(
                "UPDATE users SET password_changed_at = created_at WHERE password_changed_at IS NULL"
            ))
            db.session.commit()
            print("✓ Updated password_changed_at for existing users")
        except Exception as e:
            print(f"✗ Failed to update password_changed_at: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    upgrade()
    print("\nSecurity fields migration completed!")