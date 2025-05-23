#!/usr/bin/env python3
"""Clean up database by removing corrupted users and recreating them with proper enum values"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, UserRole
from sqlalchemy import text

def cleanup_database():
    """Clean up and fix the database"""
    app = create_app()
    
    with app.app_context():
        try:
            print("Cleaning up database...")
            
            # Drop all users except the admin to clean up any corrupted data
            print("Removing all non-admin users...")
            result = db.session.execute(text("DELETE FROM users WHERE username != 'admin'"))
            db.session.commit()
            print(f"Removed {result.rowcount} users")
            
            # Now recreate test users with proper enum values
            print("\nRecreating test users with proper enum values...")
            
            test_users = [
                {
                    'username': 'annotator1',
                    'email': 'annotator1@test.com',
                    'full_name': 'Alice Annotator',
                    'role': UserRole.ANNOTATOR,
                    'password': 'test123'
                },
                {
                    'username': 'annotator2',
                    'email': 'annotator2@test.com',
                    'full_name': 'Bob Annotator',
                    'role': UserRole.ANNOTATOR,
                    'password': 'test123'
                },
                {
                    'username': 'reviewer1',
                    'email': 'reviewer1@test.com',
                    'full_name': 'Carol Reviewer',
                    'role': UserRole.REVIEWER,
                    'password': 'test123'
                }
            ]
            
            for user_data in test_users:
                print(f"Creating user: {user_data['username']} ({user_data['role'].value})")
                new_user = User(
                    username=user_data['username'],
                    email=user_data['email'],
                    full_name=user_data['full_name'],
                    role=user_data['role'],
                    is_active=True
                )
                new_user.set_password(user_data['password'])
                db.session.add(new_user)
            
            db.session.commit()
            print("\nTest users recreated successfully!")
            
            # Verify all users can be loaded
            print("\nVerifying all users can be loaded...")
            users = User.query.all()
            print(f"Successfully loaded {len(users)} users:")
            for user in users:
                print(f"  - {user.username}: {user.role} (type: {type(user.role)})")
            
            print("\nDatabase cleanup completed successfully!")
            
        except Exception as e:
            print(f"Error: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    cleanup_database()