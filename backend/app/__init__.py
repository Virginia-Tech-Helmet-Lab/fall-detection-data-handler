from flask import Flask
from flask_cors import CORS
from .database import db
import os
from .blueprints import api_bp

def create_app(config=None):
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fall_detection.db'  # Use PostgreSQL/MongoDB later
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
    app.config['THUMBNAIL_CACHE'] = os.path.join(app.config['UPLOAD_FOLDER'], 'thumbnails')
    app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max upload
    
    # Ensure upload and preview folders exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'preview'), exist_ok=True)
    os.makedirs(app.config['THUMBNAIL_CACHE'], exist_ok=True)
    
    # Initialize database
    db.init_app(app)
    
    # Apply CORS
    CORS(app)
    
    # Import routes BEFORE registering blueprint
    # This loads all the route handlers onto the blueprint
    from . import routes
    
    # NOW register the blueprint after routes are defined
    app.register_blueprint(api_bp, url_prefix='/api')
    
    with app.app_context():
        # Create database tables
        db.create_all()
        
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
        