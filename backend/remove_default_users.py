"""Remove default test users from production"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.database import db
from app.models import User

def remove_default_users():
    """Remove hardcoded test users"""
    app = create_app()
    
    with app.app_context():
        # List of default test usernames to remove
        test_users = ['admin', 'annotator1', 'annotator2', 'reviewer1', 'reviewer2']
        
        for username in test_users:
            user = User.query.filter_by(username=username).first()
            if user:
                # Check if this is a default test user by checking the creation pattern
                # Default users typically have predictable emails
                if user.email in ['admin@example.com', f'{username}@example.com']:
                    print(f"Removing default test user: {username}")
                    db.session.delete(user)
                else:
                    print(f"Keeping user {username} - appears to be a real user")
        
        db.session.commit()
        print("\nDefault test users removed!")
        
        # Show remaining users
        remaining_users = User.query.all()
        print(f"\nRemaining users: {len(remaining_users)}")
        for user in remaining_users:
            print(f"  - {user.username} ({user.email})")

if __name__ == '__main__':
    print("This will remove default test users from the database.")
    print("Make sure you have created real admin users first!")
    response = input("\nContinue? (yes/no): ")
    
    if response.lower() == 'yes':
        remove_default_users()
    else:
        print("Cancelled.")