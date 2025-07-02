"""Production readiness checklist"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.database import db
from app.models import User, UserRole
import subprocess

def check_production_ready():
    """Check if the application is ready for production deployment"""
    
    print("\n" + "="*60)
    print("🔍 PRODUCTION READINESS CHECKLIST")
    print("="*60 + "\n")
    
    checks_passed = []
    checks_failed = []
    
    # Check 1: Server config exists
    print("1. Checking server configuration...")
    try:
        import server_config
        if hasattr(server_config, 'SECRET_KEY') and server_config.SECRET_KEY != 'your-secret-key-here-use-python-secrets-module':
            checks_passed.append("✓ Server config exists with custom SECRET_KEY")
        else:
            checks_failed.append("✗ Server config has default SECRET_KEY - SECURITY RISK!")
    except ImportError:
        checks_failed.append("✗ No server_config.py found - copy from server_config.py.template")
    
    # Check 2: Environment
    print("2. Checking environment...")
    env = os.environ.get('FLASK_ENV', 'development')
    if env == 'production':
        checks_passed.append("✓ Running in production environment")
    else:
        checks_failed.append(f"✗ Running in {env} environment - set FLASK_ENV=production")
    
    # Check 3: Database and users
    print("3. Checking database...")
    app = create_app()
    with app.app_context():
        try:
            # Check admin users
            admin_count = User.query.filter_by(role=UserRole.ADMIN).count()
            if admin_count > 0:
                checks_passed.append(f"✓ Found {admin_count} admin user(s)")
                
                # Check for default admin
                default_admin = User.query.filter_by(username='admin', email='admin@example.com').first()
                if default_admin:
                    checks_failed.append("✗ Default admin user still exists - REMOVE IT!")
            else:
                checks_failed.append("✗ No admin users found - run create_admin.py")
            
            # Check total users
            total_users = User.query.count()
            checks_passed.append(f"✓ Total users in database: {total_users}")
            
        except Exception as e:
            checks_failed.append(f"✗ Database error: {str(e)}")
    
    # Check 4: Dependencies
    print("4. Checking dependencies...")
    try:
        import flask_limiter
        checks_passed.append("✓ Flask-Limiter installed (rate limiting)")
    except ImportError:
        checks_failed.append("✗ Flask-Limiter not installed - run: pip install flask-limiter")
    
    # Check 5: File permissions
    print("5. Checking file permissions...")
    upload_dir = os.path.join(os.path.dirname(__file__), 'uploads')
    if os.path.exists(upload_dir) and os.access(upload_dir, os.W_OK):
        checks_passed.append("✓ Upload directory is writable")
    else:
        checks_failed.append("✗ Upload directory not writable or doesn't exist")
    
    # Check 6: Frontend build
    print("6. Checking frontend...")
    frontend_build = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'build')
    if os.path.exists(frontend_build):
        checks_passed.append("✓ Frontend production build exists")
    else:
        checks_failed.append("✗ No frontend production build - run: npm run build")
    
    # Check 7: Security headers
    print("7. Checking security configuration...")
    if os.path.exists('server_config.py'):
        try:
            import server_config
            if hasattr(server_config, 'SESSION_COOKIE_SECURE'):
                if server_config.SESSION_COOKIE_SECURE and not hasattr(server_config, 'HTTPS_ENABLED'):
                    checks_failed.append("⚠ SESSION_COOKIE_SECURE=True but no HTTPS configured")
                else:
                    checks_passed.append("✓ Session cookie security configured")
        except:
            pass
    
    # Summary
    print("\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)
    
    print(f"\n✓ Passed: {len(checks_passed)}")
    for check in checks_passed:
        print(f"  {check}")
    
    print(f"\n✗ Failed: {len(checks_failed)}")
    for check in checks_failed:
        print(f"  {check}")
    
    print("\n" + "="*60)
    
    if len(checks_failed) == 0:
        print("🎉 ALL CHECKS PASSED! Ready for production deployment.")
    else:
        print("⚠️  ISSUES FOUND! Fix the failed checks before deployment.")
        print("\nRecommended actions:")
        print("1. Copy server_config.py.template to server_config.py")
        print("2. Update all configuration values in server_config.py")
        print("3. Run: python create_admin.py")
        print("4. Run: python remove_default_users.py")
        print("5. Run: cd ../frontend && npm run build")
        print("6. Set FLASK_ENV=production")
    
    print("="*60 + "\n")
    
    return len(checks_failed) == 0

if __name__ == '__main__':
    check_production_ready()