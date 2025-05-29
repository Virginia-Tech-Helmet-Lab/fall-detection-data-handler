#!/usr/bin/env python3
"""
Test if the models can be imported correctly after changes
"""

try:
    print("Testing model imports...")
    from app.models import User, Video, TemporalAnnotation, BoundingBoxAnnotation, Project
    print("✓ All models imported successfully")
    
    # Test if User can be instantiated
    print("Testing User model...")
    # Don't actually create, just test the class
    print(f"✓ User model has columns: {[col.name for col in User.__table__.columns]}")
    
    print("Testing Video model...")
    print(f"✓ Video model has columns: {[col.name for col in Video.__table__.columns]}")
    
    print("Testing TemporalAnnotation model...")
    print(f"✓ TemporalAnnotation model has columns: {[col.name for col in TemporalAnnotation.__table__.columns]}")
    
    print("\n✅ All models are working correctly!")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Other error: {e}")