#!/usr/bin/env python3
"""
Add missing columns for analytics functionality
"""

import sqlite3
import os
from datetime import datetime

def add_missing_columns():
    """Add missing columns to support analytics"""
    
    # Path to the database
    db_path = os.path.join('instance', 'fall_detection.db')
    if not os.path.exists(db_path):
        db_path = 'fall_detection.db'  # Fallback to current directory
    
    if not os.path.exists(db_path):
        print("Database not found! Please run the backend first to create the database.")
        return
    
    print(f"Adding missing columns to database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add is_completed column to videos table
        try:
            cursor.execute("ALTER TABLE videos ADD COLUMN is_completed BOOLEAN DEFAULT 0")
            print("✓ Added is_completed column to videos table")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("✓ is_completed column already exists in videos table")
            else:
                print(f"⚠ Error adding is_completed column: {e}")
        
        # Add project_id column to videos table
        try:
            cursor.execute("ALTER TABLE videos ADD COLUMN project_id INTEGER")
            print("✓ Added project_id column to videos table")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("✓ project_id column already exists in videos table")
            else:
                print(f"⚠ Error adding project_id column: {e}")
        
        # Add assigned_to column to videos table
        try:
            cursor.execute("ALTER TABLE videos ADD COLUMN assigned_to INTEGER")
            print("✓ Added assigned_to column to videos table")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("✓ assigned_to column already exists in videos table")
            else:
                print(f"⚠ Error adding assigned_to column: {e}")
        
        # Add created_by column to temporal_annotations table
        try:
            cursor.execute("ALTER TABLE temporal_annotations ADD COLUMN created_by INTEGER")
            print("✓ Added created_by column to temporal_annotations table")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("✓ created_by column already exists in temporal_annotations table")
            else:
                print(f"⚠ Error adding created_by column: {e}")
        
        # Add created_at column to temporal_annotations table
        try:
            cursor.execute("ALTER TABLE temporal_annotations ADD COLUMN created_at TIMESTAMP")
            print("✓ Added created_at column to temporal_annotations table")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("✓ created_at column already exists in temporal_annotations table")
            else:
                print(f"⚠ Error adding created_at column: {e}")
        
        # Add created_by column to bbox_annotations table
        try:
            cursor.execute("ALTER TABLE bbox_annotations ADD COLUMN created_by INTEGER")
            print("✓ Added created_by column to bbox_annotations table")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("✓ created_by column already exists in bbox_annotations table")
            else:
                print(f"⚠ Error adding created_by column: {e}")
        
        # Add created_at column to bbox_annotations table
        try:
            cursor.execute("ALTER TABLE bbox_annotations ADD COLUMN created_at TIMESTAMP")
            print("✓ Added created_at column to bbox_annotations table")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("✓ created_at column already exists in bbox_annotations table")
            else:
                print(f"⚠ Error adding created_at column: {e}")
        
        # Update existing temporal annotations with current timestamp if created_at is NULL
        current_time = datetime.utcnow().isoformat()
        cursor.execute("UPDATE temporal_annotations SET created_at = ? WHERE created_at IS NULL", (current_time,))
        affected_temporal = cursor.rowcount
        if affected_temporal > 0:
            print(f"✓ Updated {affected_temporal} temporal annotations with current timestamp")
        
        # Update existing bbox annotations with current timestamp if created_at is NULL
        cursor.execute("UPDATE bbox_annotations SET created_at = ? WHERE created_at IS NULL", (current_time,))
        affected_bbox = cursor.rowcount
        if affected_bbox > 0:
            print(f"✓ Updated {affected_bbox} bbox annotations with current timestamp")
        
        conn.commit()
        print("\n✅ All columns added successfully!")
        
        # Show table info
        print("\n📊 Current table structures:")
        for table in ['videos', 'temporal_annotations', 'bbox_annotations']:
            print(f"\n{table.upper()}:")
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            for col in columns:
                print(f"  - {col[1]} ({col[2]})")
    
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
    
    finally:
        conn.close()

if __name__ == "__main__":
    add_missing_columns()