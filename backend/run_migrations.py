"""Run all database migrations"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.database import db

def run_migrations():
    """Run all pending migrations"""
    app = create_app()
    
    with app.app_context():
        print("Running database migrations...\n")
        
        # Run migration scripts
        migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
        
        if os.path.exists(migrations_dir):
            migration_files = [f for f in os.listdir(migrations_dir) if f.endswith('.py') and f != '__init__.py']
            
            for migration_file in sorted(migration_files):
                print(f"Running {migration_file}...")
                
                try:
                    # Import and run the migration
                    module_name = migration_file[:-3]  # Remove .py
                    migration_module = __import__(f'migrations.{module_name}', fromlist=['upgrade'])
                    
                    if hasattr(migration_module, 'upgrade'):
                        migration_module.upgrade()
                        print(f"✓ {migration_file} completed\n")
                    else:
                        print(f"⚠ {migration_file} has no upgrade() function\n")
                        
                except Exception as e:
                    print(f"✗ Error in {migration_file}: {str(e)}\n")
        else:
            print("No migrations directory found.")
            
        print("\nMigrations completed!")

if __name__ == '__main__':
    run_migrations()