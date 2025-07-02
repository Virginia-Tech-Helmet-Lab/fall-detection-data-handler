from app import create_app
import os
import sys

# Try to import server config
try:
    from server_config import HOST, PORT, DEBUG, SQLALCHEMY_DATABASE_URI, SECRET_KEY, JWT_SECRET_KEY, CORS_ORIGINS
    print("✓ Using server_config.py")
    
    # Set environment variables from config
    os.environ['DATABASE_URL'] = SQLALCHEMY_DATABASE_URI
    os.environ['SECRET_KEY'] = SECRET_KEY
    os.environ['JWT_SECRET_KEY'] = JWT_SECRET_KEY
    os.environ['CORS_ORIGINS'] = ','.join(CORS_ORIGINS)
    os.environ['FLASK_ENV'] = 'production'
    
 except ImportError:
    print("⚠ No server_config.py found, using defaults")
    HOST = '127.0.0.1'
    PORT = 5000
    DEBUG = True
    os.environ['FLASK_ENV'] = 'development'

# Create app with environment-based config
app = create_app()

if __name__ == "__main__":
    print(f"\n🚀 Starting server on {HOST}:{PORT}")
    print(f"   Debug mode: {DEBUG}")
    print(f"   Environment: {os.environ.get('FLASK_ENV', 'development')}")
    
    if os.environ.get('FLASK_ENV') == 'production':
        print("\n⚠️  Running in PRODUCTION mode")
        print("   Make sure you have:")
        print("   - Changed all default passwords")
        print("   - Set secure SECRET_KEY and JWT_SECRET_KEY")
        print("   - Configured CORS_ORIGINS properly")
        print("   - Set up SSL/HTTPS (recommended)")
    
    app.run(debug=DEBUG, host=HOST, port=PORT)
