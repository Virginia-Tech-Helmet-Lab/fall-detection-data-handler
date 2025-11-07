from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from flask_login import LoginManager
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from .database import db
import os
from .blueprints import api_bp

def create_app(config=None):
    app = Flask(__name__)
    
    # Database configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fall_detection.db'  # Use PostgreSQL/MongoDB later
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # File upload configuration
    app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
    app.config['THUMBNAIL_CACHE'] = os.path.join(app.config['UPLOAD_FOLDER'], 'thumbnails')
    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024 * 1024  # 10GB max upload
    
    # Authentication configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours
    app.config['REMEMBER_COOKIE_DURATION'] = 86400  # 24 hours
    
    # Ensure upload and preview folders exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'preview'), exist_ok=True)
    os.makedirs(app.config['THUMBNAIL_CACHE'], exist_ok=True)
    
    # Initialize extensions
    db.init_app(app)
    
    # Initialize authentication
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = None  # Don't redirect, return 401
    login_manager.login_message = None
    
    # Custom unauthorized handler to return JSON
    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Authentication required'}), 401
    
    jwt = JWTManager(app)
    bcrypt = Bcrypt(app)
    
    # User loader for Flask-Login
    @login_manager.user_loader
    def load_user(user_id):
        from .models import User
        return User.query.get(int(user_id))
    
    # Apply CORS with proper configuration - simplified approach
    CORS(app, supports_credentials=True)
    
    # Import routes BEFORE registering blueprints
    # This loads all the route handlers onto the blueprints
    print(">>> About to import api_routes module...")
    try:
        from . import api_routes  # Import the api_routes.py module
        print(">>> Successfully imported api_routes module")
    except Exception as e:
        print(f">>> ERROR importing api_routes: {e}")
        import traceback
        traceback.print_exc()
    from .auth import auth_bp
    from .routes.projects import projects_bp
    from .routes.review import review_bp
    from .routes.analytics import analytics_bp
    
    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp)  # auth_bp already has /api/auth prefix
    app.register_blueprint(projects_bp)  # projects_bp already has /api/projects prefix
    app.register_blueprint(review_bp)  # review_bp already has /api/review prefix
    app.register_blueprint(analytics_bp)  # analytics_bp already has /api/analytics prefix
    
    # Add a before_request handler to log all requests
    @app.before_request
    def log_request_info():
        app.logger.debug('Headers: %s', request.headers)
        app.logger.debug('Method: %s', request.method)
        app.logger.debug('Path: %s', request.path)
        app.logger.debug('Body: %s', request.get_data())
    
    # Add global OPTIONS handler for all routes
    @app.before_request
    def handle_options():
        if request.method == 'OPTIONS':
            response = make_response()
            origin = request.headers.get('Origin')
            if origin in ['http://localhost:3000', 'http://127.0.0.1:3000']:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            return response
    
    # Add after_request handler to ensure CORS headers
    @app.after_request
    def after_request(response):
        origin = request.headers.get('Origin')
        if origin in ['http://localhost:3000', 'http://127.0.0.1:3000']:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    with app.app_context():
        # Create database tables
        db.create_all()
        
        # Create default admin user if none exists
        try:
            from .models import User, UserRole
            
            # Check if admin user exists by username
            admin_user = User.query.filter_by(username='admin').first()
            
            if not admin_user:
                print(">>> Creating default admin user...")
                admin_user = User(
                    username='admin',
                    email='admin@vthelmetlab.edu',
                    full_name='System Administrator',
                    role=UserRole.ADMIN,
                    is_active=True
                )
                admin_user.set_password('admin123')  # Change this in production!
                
                db.session.add(admin_user)
                db.session.commit()
                print(">>> Created default admin user: admin / admin123")
            else:
                print(f">>> Admin user already exists: {admin_user.username} (role: {admin_user.role})")
            
            # Create test users for development
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
                existing_user = User.query.filter_by(username=user_data['username']).first()
                if not existing_user:
                    print(f">>> Creating test user: {user_data['username']} ({user_data['role'].value})")
                    new_user = User(
                        username=user_data['username'],
                        email=user_data['email'],
                        full_name=user_data['full_name'],
                        role=user_data['role'],
                        is_active=True
                    )
                    new_user.set_password(user_data['password'])
                    db.session.add(new_user)
                else:
                    print(f">>> Test user already exists: {user_data['username']} ({existing_user.role})")
            
            db.session.commit()
            print(">>> Test users created successfully!")
            
            # Create a demo project
            from .models import Project, ProjectMember, ProjectStatus, ProjectMemberRole
            demo_project = Project.query.filter_by(name='Demo Fall Detection Project').first()
            
            if not demo_project:
                print(">>> Creating demo project...")
                demo_project = Project(
                    name='Demo Fall Detection Project',
                    description='A demonstration project for testing the fall detection annotation system',
                    created_by=admin_user.user_id,
                    status=ProjectStatus.ACTIVE,
                    annotation_schema={
                        'temporal_labels': ['fall', 'near-fall', 'normal'],
                        'body_parts': ['head', 'shoulder', 'hip', 'knee', 'ankle']
                    },
                    normalization_settings={
                        'target_resolution': '720p',
                        'target_fps': 30,
                        'brightness': 1.0,
                        'contrast': 1.0
                    }
                )
                db.session.add(demo_project)
                db.session.flush()
                
                # Add all test users to the demo project
                for user_data in test_users:
                    user = User.query.filter_by(username=user_data['username']).first()
                    if user:
                        membership = ProjectMember(
                            project_id=demo_project.project_id,
                            user_id=user.user_id,
                            role=ProjectMemberRole.MEMBER
                        )
                        db.session.add(membership)
                        print(f">>> Added {user.username} to demo project")
                
                db.session.commit()
                print(">>> Demo project created successfully!")
            else:
                print(">>> Demo project already exists")
                
        except Exception as e:
            print(f">>> Error creating admin user: {str(e)}")
            import traceback
            print(traceback.format_exc())
        
        # Debug middleware inside app context
        try:
            print(">>> WSGI APP TYPE:", type(app.wsgi_app))
            if hasattr(app.wsgi_app, 'mw_stack'):
                for mw in app.wsgi_app.mw_stack:
                    print(f">>> MIDDLEWARE: {mw}")
            else:
                print(">>> No middleware stack found, but CORS should be active")
        except Exception as e:
            print(f">>> Middleware debug error: {str(e)}")
        
        # Add a direct route to the app itself (not in a blueprint)
        @app.route('/direct-image')
        def direct_image():
            """Direct image bypassing blueprints"""
            import cv2
            import numpy as np
            from flask import Response
            
            # Create a simple image
            img = np.zeros((120, 160, 3), dtype=np.uint8)
            img[:, :, 2] = 255  # Red image
            cv2.putText(img, "DIRECT", (50, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Convert to bytes
            _, buffer = cv2.imencode('.jpg', img)
            img_data = buffer.tobytes()
            
            # Return direct response
            return Response(
                img_data,
                mimetype='image/jpeg',
                headers={'Access-Control-Allow-Origin': '*'}
            )
        
    return app
        