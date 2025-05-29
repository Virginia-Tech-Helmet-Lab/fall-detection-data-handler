#!/usr/bin/env python3
"""
Reset database with correct relationships and schema
"""

import os
from app import create_app
from app.database import db
from app.models import *

def reset_database():
    """Reset the database with all correct relationships"""
    
    print("🔄 Resetting database with correct schema...")
    
    # Create app context
    app = create_app()
    
    with app.app_context():
        try:
            # Drop all tables
            print("🗑️ Dropping all existing tables...")
            db.drop_all()
            
            # Create all tables with correct relationships
            print("🏗️ Creating all tables with correct schema...")
            db.create_all()
            
            print("✅ Database reset completed successfully!")
            
            # Verify tables were created
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"\n📊 Created tables: {', '.join(tables)}")
            
            # Show table info for key tables
            for table in ['users', 'projects', 'videos', 'temporal_annotations']:
                if table in tables:
                    columns = inspector.get_columns(table)
                    print(f"\n{table.upper()} columns:")
                    for col in columns:
                        print(f"  - {col['name']} ({col['type']})")
                        
        except Exception as e:
            print(f"❌ Error resetting database: {e}")
            raise

if __name__ == "__main__":
    reset_database()