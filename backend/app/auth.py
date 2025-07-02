"""
Authentication module for Fall Detection Data Handler
Handles user authentication, session management, and role-based access control.
"""

from functools import wraps
from datetime import datetime
from flask import Blueprint, request, jsonify, session, current_app
from flask_login import login_user, logout_user, login_required, current_user
from flask_bcrypt import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import logging

from .models import User
from .database import db
from .utils.security import PasswordValidator, AccountSecurity, sanitize_input

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
logger = logging.getLogger(__name__)

# Get limiter instance from current app
def get_limiter():
    from flask import current_app
    return current_app.extensions.get('limiter')

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
            
        logger.info(f"User found: {user.username}, checking account status...")
        
        # Check if account is locked
        if AccountSecurity.check_account_locked(user):
            logger.warning(f"Locked account attempted login: {username}")
            return jsonify({'error': 'Account is temporarily locked due to too many failed login attempts'}), 401
        
        # Check password
        if not user.check_password(password):
            logger.warning(f"Invalid password for user: {username}")
            AccountSecurity.record_failed_login(user)
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.is_active:
            logger.warning(f"Inactive user attempted login: {username}")
            return jsonify({'error': 'Account is deactivated'}), 401
        
        # Reset failed attempts on successful login
        AccountSecurity.reset_failed_attempts(user)
        
        # Log the user in
        login_user(user, remember=True)
        
        # Create JWT token for API access
        access_token = create_access_token(identity=str(user.user_id))
        
        # Update last active timestamp
        user.update_last_active()
        
        logger.info(f"User {user.username} logged in successfully")
        
        response_data = {
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token
        }
        
        # Check if password needs to be changed
        if user.must_change_password:
            response_data['must_change_password'] = True
            response_data['message'] = 'Login successful. Please change your password.'
        
        return jsonify(response_data), 200
        
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
        
        username = sanitize_input(data.get('username'), max_length=50)
        email = sanitize_input(data.get('email'), max_length=100)
        password = data.get('password')  # Don't sanitize passwords
        full_name = sanitize_input(data.get('full_name'), max_length=100)
        role = data.get('role')
        
        # Validate password
        is_valid, password_errors = PasswordValidator.validate(password)
        if not is_valid:
            return jsonify({'error': 'Password does not meet requirements', 'details': password_errors}), 400
        
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
        
        # Set password change requirement for non-admin created users
        if role != 'admin':
            user.must_change_password = True
        
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
        # Use raw SQL to completely avoid enum conversion issues
        from sqlalchemy import text
        result = db.session.execute(text("""
            SELECT user_id, username, email, role, full_name, is_active, created_at, last_active
            FROM users
            ORDER BY created_at DESC
        """))
        
        users_data = []
        for row in result:
            # Convert role to lowercase format expected by frontend
            role_value = row.role
            if isinstance(role_value, str):
                # Handle both uppercase enum values and lowercase strings
                if role_value in ['ADMIN', 'admin']:
                    role_value = 'admin'
                elif role_value in ['ANNOTATOR', 'annotator']:
                    role_value = 'annotator'
                elif role_value in ['REVIEWER', 'reviewer']:
                    role_value = 'reviewer'
            
            # Handle datetime conversion
            created_at_str = None
            if row.created_at:
                if hasattr(row.created_at, 'isoformat'):
                    created_at_str = row.created_at.isoformat()
                else:
                    created_at_str = str(row.created_at)
            
            last_active_str = None
            if row.last_active:
                if hasattr(row.last_active, 'isoformat'):
                    last_active_str = row.last_active.isoformat()
                else:
                    last_active_str = str(row.last_active)
            
            users_data.append({
                'user_id': row.user_id,
                'username': row.username,
                'email': row.email,
                'role': role_value,
                'full_name': row.full_name,
                'is_active': row.is_active,
                'created_at': created_at_str,
                'last_active': last_active_str
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
        
        # Handle related data before deletion
        from .models import TemporalAnnotation, BoundingBoxAnnotation
        from sqlalchemy import text
        
        # Use raw SQL to avoid column errors
        try:
            # Check if videos table has assigned_to column
            result = db.session.execute(text("PRAGMA table_info(videos)"))
            columns = [row[1] for row in result]
            
            if 'assigned_to' in columns:
                # Unassign videos from this user using raw SQL
                db.session.execute(
                    text("UPDATE videos SET assigned_to = NULL WHERE assigned_to = :user_id"),
                    {"user_id": user_id}
                )
        except Exception as e:
            logger.warning(f"Could not unassign videos: {str(e)}")
        
        # Handle annotations - check if columns exist first
        try:
            # Check if temporal_annotations has created_by column
            result = db.session.execute(text("PRAGMA table_info(temporal_annotations)"))
            columns = [row[1] for row in result]
            
            if 'created_by' in columns:
                db.session.execute(
                    text("UPDATE temporal_annotations SET created_by = NULL WHERE created_by = :user_id"),
                    {"user_id": user_id}
                )
        except Exception as e:
            logger.warning(f"Could not update temporal annotations: {str(e)}")
            
        try:
            # Check if bbox_annotations has created_by column
            result = db.session.execute(text("PRAGMA table_info(bbox_annotations)"))
            columns = [row[1] for row in result]
            
            if 'created_by' in columns:
                db.session.execute(
                    text("UPDATE bbox_annotations SET created_by = NULL WHERE created_by = :user_id"),
                    {"user_id": user_id}
                )
        except Exception as e:
            logger.warning(f"Could not update bbox annotations: {str(e)}")
        
        # Now safe to delete user
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

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        # Verify current password
        if not user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Validate new password
        is_valid, password_errors = PasswordValidator.validate(new_password)
        if not is_valid:
            return jsonify({'error': 'New password does not meet requirements', 'details': password_errors}), 400
        
        # Check if new password is same as current
        if user.check_password(new_password):
            return jsonify({'error': 'New password must be different from current password'}), 400
        
        # Update password
        user.set_password(new_password)
        user.password_changed_at = datetime.utcnow()
        user.must_change_password = False
        
        db.session.commit()
        
        logger.info(f"User {user.username} changed their password")
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Password change error: {str(e)}")
        return jsonify({'error': 'Failed to change password'}), 500

@auth_bp.route('/reset-password/<int:user_id>', methods=['POST'])
@jwt_role_required('admin')
def reset_password(user_id):
    """Admin reset user password"""
    try:
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.json
        new_password = data.get('new_password')
        
        if not new_password:
            return jsonify({'error': 'New password is required'}), 400
        
        # Validate new password
        is_valid, password_errors = PasswordValidator.validate(new_password)
        if not is_valid:
            return jsonify({'error': 'Password does not meet requirements', 'details': password_errors}), 400
        
        # Update password
        target_user.set_password(new_password)
        target_user.password_changed_at = datetime.utcnow()
        target_user.must_change_password = True
        target_user.failed_login_attempts = 0
        target_user.locked_until = None
        
        db.session.commit()
        
        admin_user = request.current_user
        logger.info(f"Admin {admin_user.username} reset password for user {target_user.username}")
        
        return jsonify({
            'message': 'Password reset successfully',
            'must_change_password': True
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Password reset error: {str(e)}")
        return jsonify({'error': 'Failed to reset password'}), 500