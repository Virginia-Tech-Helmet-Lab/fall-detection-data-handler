"""
Authentication module for Fall Detection Data Handler
Handles user authentication, session management, and role-based access control.
"""

from functools import wraps
from datetime import datetime
from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from flask_bcrypt import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import logging

from .models import User
from .database import db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
logger = logging.getLogger(__name__)

@auth_bp.route('/test', methods=['GET'])
def test():
    """Simple test endpoint"""
    return jsonify({'message': 'Auth API is working!', 'timestamp': str(datetime.utcnow())}), 200

def role_required(*roles):
    """Decorator to require specific user roles"""
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify({'error': 'Authentication required'}), 401
            
            if current_user.role not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    """User login endpoint"""
    logger.info(f"Login attempt - Method: {request.method}, Headers: {dict(request.headers)}")
    
    try:
        data = request.json
        logger.info(f"Login data received: {data}")
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        logger.info(f"Attempting login for username: {username}")
        
        # Find user by username or email
        user = User.query.filter(
            (User.username == username) | (User.email == username)
        ).first()
        
        if not user:
            logger.warning(f"User not found: {username}")
            return jsonify({'error': 'Invalid credentials'}), 401
            
        logger.info(f"User found: {user.username}, checking password...")
        
        if not user.check_password(password):
            logger.warning(f"Invalid password for user: {username}")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.is_active:
            logger.warning(f"Inactive user attempted login: {username}")
            return jsonify({'error': 'Account is deactivated'}), 401
        
        # Log the user in
        login_user(user, remember=True)
        
        # Create JWT token for API access
        access_token = create_access_token(identity=user.user_id)
        
        # Update last active timestamp
        user.update_last_active()
        
        logger.info(f"User {user.username} logged in successfully")
        
        response = jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token
        })
        
        # Add CORS headers to response
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        
        return response, 200
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """User logout endpoint"""
    try:
        username = current_user.username
        logout_user()
        session.clear()
        
        logger.info(f"User {username} logged out successfully")
        
        return jsonify({'message': 'Logout successful'}), 200
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({'error': 'Logout failed'}), 500

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current user information"""
    try:
        # Check if user is authenticated without triggering redirect
        if not current_user.is_authenticated:
            return jsonify({'error': 'Not authenticated', 'authenticated': False}), 401
            
        return jsonify({
            'user': current_user.to_dict(),
            'authenticated': True
        }), 200
        
    except Exception as e:
        logger.error(f"Get current user error: {str(e)}")
        return jsonify({'error': 'Failed to get user information'}), 500

@auth_bp.route('/register', methods=['POST'])
@role_required('admin')
def register():
    """Admin-only user registration endpoint"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'full_name', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('full_name')
        role = data.get('role')
        
        # Validate role
        valid_roles = ['admin', 'annotator', 'reviewer']
        if role not in valid_roles:
            return jsonify({'error': f'Role must be one of: {valid_roles}'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 409
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 409
        
        # Create new user
        user = User(
            username=username,
            email=email,
            full_name=full_name,
            role=role
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        logger.info(f"New user created: {username} ({role}) by {current_user.username}")
        
        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"User registration error: {str(e)}")
        return jsonify({'error': 'User registration failed'}), 500

@auth_bp.route('/users', methods=['GET'])
@role_required('admin')
def get_users():
    """Get all users (admin only)"""
    try:
        users = User.query.all()
        users_data = [user.to_dict() for user in users]
        
        return jsonify({
            'users': users_data,
            'total': len(users_data)
        }), 200
        
    except Exception as e:
        logger.error(f"Get users error: {str(e)}")
        return jsonify({'error': 'Failed to get users'}), 500

@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@role_required('admin')
def update_user(user_id):
    """Update user information (admin only)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update allowed fields
        allowed_fields = ['full_name', 'email', 'role', 'is_active']
        for field in allowed_fields:
            if field in data:
                setattr(user, field, data[field])
        
        # Handle password update separately
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        
        db.session.commit()
        
        logger.info(f"User {user.username} updated by {current_user.username}")
        
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update user error: {str(e)}")
        return jsonify({'error': 'Failed to update user'}), 500

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@role_required('admin')
def delete_user(user_id):
    """Delete user (admin only)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.user_id == current_user.user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        username = user.username
        db.session.delete(user)
        db.session.commit()
        
        logger.info(f"User {username} deleted by {current_user.username}")
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete user error: {str(e)}")
        return jsonify({'error': 'Failed to delete user'}), 500

@auth_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """Change current user's password"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current and new passwords required'}), 400
        
        if not current_user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        
        current_user.set_password(new_password)
        db.session.commit()
        
        logger.info(f"Password changed for user {current_user.username}")
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Change password error: {str(e)}")
        return jsonify({'error': 'Failed to change password'}), 500

@auth_bp.route('/debug/users', methods=['GET'])
def debug_users():
    """Debug endpoint to check users in database"""
    try:
        from .models import User
        users = User.query.all()
        
        users_info = []
        for user in users:
            users_info.append({
                'user_id': user.user_id,
                'username': user.username,
                'email': user.email,
                'role': str(user.role),
                'is_active': user.is_active,
                'password_hash_length': len(user.password_hash) if user.password_hash else 0
            })
        
        return jsonify({
            'total_users': len(users),
            'users': users_info
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/debug/test-login', methods=['POST'])
def test_login():
    """Debug login without authentication to see what's happening"""
    try:
        data = request.json
        username = data.get('username', 'admin')
        password = data.get('password', 'admin123')
        
        from .models import User
        from flask_bcrypt import check_password_hash
        
        # Find user
        user = User.query.filter(
            (User.username == username) | (User.email == username)
        ).first()
        
        if not user:
            return jsonify({'error': 'User not found', 'debug': 'No user with that username/email'}), 404
        
        # Check password
        password_match = user.check_password(password)
        
        return jsonify({
            'user_found': True,
            'username': user.username,
            'email': user.email,
            'role': str(user.role),
            'is_active': user.is_active,
            'password_hash_exists': bool(user.password_hash),
            'password_hash_length': len(user.password_hash) if user.password_hash else 0,
            'password_match': password_match,
            'test_password': password
        }), 200
        
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500