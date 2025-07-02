"""Create an admin user for production"""
import sys
import os
import getpass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.database import db
from app.models import User, UserRole
from app.utils.security import PasswordValidator

def create_admin():
    """Interactive script to create an admin user"""
    app = create_app('production')
    
    with app.app_context():
        print("\n=== Create Admin User ===\n")
        
        # Get username
        while True:
            username = input("Username: ").strip()
            if not username:
                print("Username cannot be empty!")
                continue
            
            existing = User.query.filter_by(username=username).first()
            if existing:
                print(f"Username '{username}' already exists!")
                continue
            
            break
        
        # Get email
        while True:
            email = input("Email: ").strip()
            if not email or '@' not in email:
                print("Please enter a valid email address!")
                continue
            
            existing = User.query.filter_by(email=email).first()
            if existing:
                print(f"Email '{email}' already exists!")
                continue
            
            break
        
        # Get full name
        full_name = input("Full Name: ").strip()
        if not full_name:
            full_name = username
        
        # Get password
        while True:
            password = getpass.getpass("Password: ")
            password_confirm = getpass.getpass("Confirm Password: ")
            
            if password != password_confirm:
                print("Passwords don't match!")
                continue
            
            # Validate password
            is_valid, errors = PasswordValidator.validate(password)
            if not is_valid:
                print("\nPassword does not meet requirements:")
                for error in errors:
                    print(f"  - {error}")
                print()
                continue
            
            break
        
        # Create the admin user
        try:
            admin_user = User(
                username=username,
                email=email,
                full_name=full_name,
                role=UserRole.ADMIN,
                is_active=True
            )
            admin_user.set_password(password)
            
            db.session.add(admin_user)
            db.session.commit()
            
            print(f"\n✓ Admin user '{username}' created successfully!")
            print("\nYou can now log in with these credentials.")
            
        except Exception as e:
            print(f"\n✗ Error creating user: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    create_admin()