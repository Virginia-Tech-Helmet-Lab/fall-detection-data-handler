#!/usr/bin/env python3
"""Fix user roles in database by converting string values to proper enum values"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, UserRole
from sqlalchemy import text

def fix_user_roles():
    """Convert string role values to proper enum values in the database"""
    app = create_app()
    
    with app.app_context():
        try:
            # First, let's check what we have in the database
            print("Checking current user roles in database...")
            
            # Use raw SQL to see what's actually in the database
            result = db.session.execute(text("SELECT user_id, username, role FROM users"))
            users = result.fetchall()
            
            print(f"Found {len(users)} users:")
            for user in users:
                print(f"  User {user.username} (ID: {user.user_id}): role = '{user.role}'")
            
            # Update roles using raw SQL to convert strings to enum values
            print("\nFixing user roles...")
            
            # Map string values to enum values
            role_updates = [
                ("UPDATE users SET role = 'ADMIN' WHERE role = 'admin'", 'admin', 'ADMIN'),
                ("UPDATE users SET role = 'ANNOTATOR' WHERE role = 'annotator'", 'annotator', 'ANNOTATOR'),
                ("UPDATE users SET role = 'REVIEWER' WHERE role = 'reviewer'", 'reviewer', 'REVIEWER')
            ]
            
            for query, old_value, new_value in role_updates:
                result = db.session.execute(text(query))
                count = result.rowcount
                if count > 0:
                    print(f"  Updated {count} users from '{old_value}' to '{new_value}'")
            
            db.session.commit()
            print("\nRole conversion completed successfully!")
            
            # Verify the fix
            print("\nVerifying fixed roles:")
            result = db.session.execute(text("SELECT user_id, username, role FROM users"))
            users = result.fetchall()
            
            for user in users:
                print(f"  User {user.username} (ID: {user.user_id}): role = '{user.role}'")
            
            # Test loading users through SQLAlchemy
            print("\nTesting SQLAlchemy User model loading...")
            try:
                all_users = User.query.all()
                print(f"Successfully loaded {len(all_users)} users through SQLAlchemy")
                for user in all_users:
                    print(f"  {user.username}: {user.role} (type: {type(user.role)})")
            except Exception as e:
                print(f"Error loading users: {str(e)}")
                
        except Exception as e:
            print(f"Error: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    fix_user_roles()