#!/usr/bin/env python3
"""
Migration script to add review tables (ReviewQueue and ReviewFeedback) to the existing database.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.database import db
from app.models import ReviewQueue, ReviewFeedback
from sqlalchemy import inspect

def create_review_tables():
    """Create review-related tables if they don't exist."""
    app = create_app()
    
    with app.app_context():
        # Get database inspector
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        print("=== Review Tables Migration ===")
        print(f"Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print(f"Existing tables: {', '.join(existing_tables)}")
        print()
        
        # Check if tables already exist
        review_queue_exists = 'review_queue' in existing_tables
        review_feedback_exists = 'review_feedback' in existing_tables
        
        if review_queue_exists and review_feedback_exists:
            print("✓ Both review tables already exist. No migration needed.")
            return
        
        # Create tables that don't exist
        tables_created = []
        
        try:
            # Create ReviewQueue table if it doesn't exist
            if not review_queue_exists:
                print("Creating ReviewQueue table...")
                ReviewQueue.__table__.create(db.engine)
                tables_created.append('review_queue')
                print("✓ ReviewQueue table created successfully")
            else:
                print("✓ ReviewQueue table already exists")
            
            # Create ReviewFeedback table if it doesn't exist
            if not review_feedback_exists:
                print("Creating ReviewFeedback table...")
                ReviewFeedback.__table__.create(db.engine)
                tables_created.append('review_feedback')
                print("✓ ReviewFeedback table created successfully")
            else:
                print("✓ ReviewFeedback table already exists")
            
            # Verify tables were created
            if tables_created:
                print("\nVerifying created tables...")
                inspector = inspect(db.engine)
                new_tables = inspector.get_table_names()
                
                for table in tables_created:
                    if table in new_tables:
                        # Get column info
                        columns = inspector.get_columns(table)
                        print(f"\n✓ Table '{table}' verified with columns:")
                        for col in columns:
                            print(f"  - {col['name']}: {col['type']}")
                    else:
                        print(f"\n✗ Error: Table '{table}' was not created properly")
                
                print(f"\nMigration completed successfully! Created {len(tables_created)} table(s).")
            else:
                print("\nNo tables needed to be created.")
                
        except Exception as e:
            print(f"\n✗ Error during migration: {str(e)}")
            print("\nPlease check your database configuration and try again.")
            sys.exit(1)

if __name__ == "__main__":
    create_review_tables()