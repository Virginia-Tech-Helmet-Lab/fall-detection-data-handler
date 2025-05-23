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

def jwt_role_required(*roles):
    """Decorator to require specific user roles using JWT"""
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(int(user_id))
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # Handle enum roles
            user_role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
            if user_role_str not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            # Make user available to the route
            request.current_user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    """User login endpoint"""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
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
        access_token = create_access_token(identity=str(user.user_id))
        
        # Update last active timestamp
        user.update_last_active()
        
        logger.info(f"User {user.username} logged in successfully")
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required(optional=True)
def logout():
    """User logout endpoint"""
    try:
        # JWT tokens are stateless, so we just return success
        # The client should remove the token from storage
        return jsonify({'message': 'Logout successful'}), 200
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({'error': 'Logout failed'}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required(optional=True)
def get_current_user():
    """Get current user information"""
    try:
        # Get user from JWT
        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({'error': 'Not authenticated', 'authenticated': False}), 401
        
        user = User.query.get(int(user_id))
        if not user:
            return jsonify({'error': 'User not found', 'authenticated': False}), 404
            
        return jsonify({
            'user': user.to_dict(),
            'authenticated': True
        }), 200
        
    except Exception as e:
        logger.error(f"Get current user error: {str(e)}")
        return jsonify({'error': 'Failed to get user information'}), 500

@auth_bp.route('/register', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def register():
    """Admin-only user registration endpoint"""
    logger.info(f"Register endpoint called - Method: {request.method}")
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    # For POST requests, check JWT authentication
    user_id = get_jwt_identity()
    if not user_id:
        logger.error("No JWT identity found")
        return jsonify({'error': 'Authentication required'}), 401
        
    current_admin = User.query.get(int(user_id))
    if not current_admin:
        logger.error(f"User {user_id} not found")
        return jsonify({'error': 'User not found'}), 404
        
    # Check if user is admin (handle both string and enum)
    from .models import UserRole
    is_admin = (current_admin.role == UserRole.ADMIN or 
                (hasattr(current_admin.role, 'value') and current_admin.role.value == 'admin') or
                str(current_admin.role) == 'admin')
    
    if not is_admin:
        logger.error(f"User {user_id} has role {current_admin.role}, not admin")
        return jsonify({'error': 'Admin access required'}), 403
        
    logger.info(f"Register endpoint called by user {current_admin.username}")
    
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
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            logger.warning(f"Username {username} already exists")
            return jsonify({'error': f'Username "{username}" already exists'}), 409
        
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            logger.warning(f"Email {email} already exists")
            return jsonify({'error': f'Email "{email}" already exists'}), 409
        
        # Create new user with proper enum
        from .models import UserRole
        
        # Convert string role to enum
        role_enum = None
        if role == 'admin':
            role_enum = UserRole.ADMIN
        elif role == 'annotator':
            role_enum = UserRole.ANNOTATOR
        elif role == 'reviewer':
            role_enum = UserRole.REVIEWER
        else:
            return jsonify({'error': f'Invalid role: {role}'}), 400
            
        user = User(
            username=username,
            email=email,
            full_name=full_name,
            role=role_enum
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        logger.info(f"New user created: {username} ({role}) by {current_admin.username}")
        
        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"User registration error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        # Check for specific database errors
        error_message = str(e)
        if 'UNIQUE constraint failed' in error_message or 'Duplicate entry' in error_message:
            if 'username' in error_message:
                return jsonify({'error': 'Username already exists'}), 409
            elif 'email' in error_message:
                return jsonify({'error': 'Email already exists'}), 409
        
        return jsonify({'error': error_message}), 422

@auth_bp.route('/users', methods=['GET'])
@jwt_role_required('admin')
def get_users():
    """Get all users (admin only)"""
    try:
        # Use SQLAlchemy ORM but handle role conversion in Python
        users = User.query.order_by(User.created_at.desc()).all()
        
        users_data = []
        for user in users:
            # Use the safe to_dict method that handles enum conversion
            try:
                user_dict = user.to_dict()
                users_data.append(user_dict)
            except Exception as user_error:
                # If to_dict fails, create dict manually with safe conversions
                role_value = user.role
                if hasattr(user.role, 'value'):
                    role_value = user.role.value
                elif isinstance(user.role, str) and user.role in ['ADMIN', 'ANNOTATOR', 'REVIEWER']:
                    role_value = user.role.lower()
                
                users_data.append({
                    'user_id': user.user_id,
                    'username': user.username,
                    'email': user.email,
                    'role': role_value,
                    'full_name': user.full_name,
                    'is_active': user.is_active,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'last_active': user.last_active.isoformat() if user.last_active else None
                })
        
        return jsonify({
            'users': users_data,
            'total': len(users_data)
        }), 200
        
    except Exception as e:
        logger.error(f"Get users error: {str(e)}")
        return jsonify({'error': 'Failed to get users'}), 500

@auth_bp.route('/users/<int:user_id>', methods=['PUT', 'OPTIONS'])
@jwt_required(optional=True)
def update_user(user_id):
    """Update user information (admin only)"""
    # Handle OPTIONS
    if request.method == 'OPTIONS':
        return '', 204
        
    # Get authenticated user
    admin_id = get_jwt_identity()
    if not admin_id:
        return jsonify({'error': 'Authentication required'}), 401
        
    current_admin = User.query.get(int(admin_id))
    if not current_admin:
        return jsonify({'error': 'User not found'}), 404
        
    # Check admin role
    from .models import UserRole
    is_admin = (current_admin.role == UserRole.ADMIN or 
                (hasattr(current_admin.role, 'value') and current_admin.role.value == 'admin'))
    if not is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    
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
        
        logger.info(f"User {user.username} updated by {current_admin.username}")
        
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update user error: {str(e)}")
        return jsonify({'error': 'Failed to update user'}), 500

@auth_bp.route('/users/<int:user_id>', methods=['DELETE', 'OPTIONS'])
@jwt_required(optional=True)
def delete_user(user_id):
    """Delete user (admin only)"""
    # Handle OPTIONS
    if request.method == 'OPTIONS':
        return '', 204
        
    # Get authenticated user
    admin_id = get_jwt_identity()
    if not admin_id:
        return jsonify({'error': 'Authentication required'}), 401
        
    current_admin = User.query.get(int(admin_id))
    if not current_admin:
        return jsonify({'error': 'User not found'}), 404
        
    # Check admin role
    from .models import UserRole
    is_admin = (current_admin.role == UserRole.ADMIN or 
                (hasattr(current_admin.role, 'value') and current_admin.role.value == 'admin'))
    if not is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.user_id == current_admin.user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        username = user.username
        db.session.delete(user)
        db.session.commit()
        
        logger.info(f"User {username} deleted by {current_admin.username}")
        
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