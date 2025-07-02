import re
from flask import current_app


class PasswordValidator:
    """Validates passwords against configured security requirements."""
    
    @staticmethod
    def validate(password):
        """
        Validate password against security requirements.
        
        Returns:
            tuple: (is_valid: bool, errors: list of error messages)
        """
        errors = []
        
        # Check minimum length
        min_length = current_app.config.get('PASSWORD_MIN_LENGTH', 8)
        if len(password) < min_length:
            errors.append(f"Password must be at least {min_length} characters long")
        
        # Check uppercase requirement
        if current_app.config.get('PASSWORD_REQUIRE_UPPERCASE', True):
            if not re.search(r'[A-Z]', password):
                errors.append("Password must contain at least one uppercase letter")
        
        # Check lowercase requirement
        if current_app.config.get('PASSWORD_REQUIRE_LOWERCASE', True):
            if not re.search(r'[a-z]', password):
                errors.append("Password must contain at least one lowercase letter")
        
        # Check number requirement
        if current_app.config.get('PASSWORD_REQUIRE_NUMBERS', True):
            if not re.search(r'\d', password):
                errors.append("Password must contain at least one number")
        
        # Check special character requirement
        if current_app.config.get('PASSWORD_REQUIRE_SPECIAL', False):
            if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
                errors.append("Password must contain at least one special character")
        
        # Check for common passwords
        common_passwords = [
            'password', '123456', 'password123', 'admin', 'letmein',
            'welcome', 'monkey', '1234567890', 'qwerty', 'abc123'
        ]
        if password.lower() in common_passwords:
            errors.append("Password is too common. Please choose a more secure password")
        
        return len(errors) == 0, errors


class AccountSecurity:
    """Handles account security features like lockout."""
    
    @staticmethod
    def check_account_locked(user):
        """Check if account is locked due to failed login attempts."""
        if not hasattr(user, 'failed_login_attempts') or not hasattr(user, 'locked_until'):
            return False
        
        max_attempts = current_app.config.get('MAX_LOGIN_ATTEMPTS', 5)
        if user.failed_login_attempts >= max_attempts:
            from datetime import datetime
            if user.locked_until and user.locked_until > datetime.utcnow():
                return True
            else:
                # Reset if lockout period has expired
                user.failed_login_attempts = 0
                user.locked_until = None
                from app.database import db
                db.session.commit()
        
        return False
    
    @staticmethod
    def record_failed_login(user):
        """Record a failed login attempt."""
        from datetime import datetime, timedelta
        from app.database import db
        
        if not hasattr(user, 'failed_login_attempts'):
            return
        
        user.failed_login_attempts = getattr(user, 'failed_login_attempts', 0) + 1
        
        max_attempts = current_app.config.get('MAX_LOGIN_ATTEMPTS', 5)
        if user.failed_login_attempts >= max_attempts:
            lockout_duration = current_app.config.get('LOCKOUT_DURATION', 900)  # 15 minutes
            user.locked_until = datetime.utcnow() + timedelta(seconds=lockout_duration)
        
        db.session.commit()
    
    @staticmethod
    def reset_failed_attempts(user):
        """Reset failed login attempts after successful login."""
        from app.database import db
        
        if hasattr(user, 'failed_login_attempts'):
            user.failed_login_attempts = 0
            user.locked_until = None
            db.session.commit()


def sanitize_input(text, max_length=None):
    """Sanitize user input to prevent XSS and injection attacks."""
    if not text:
        return text
    
    # Remove any HTML tags
    text = re.sub(r'<[^>]+>', '', str(text))
    
    # Remove any potential SQL injection characters
    text = text.replace("'", "''")
    
    # Truncate if max_length specified
    if max_length and len(text) > max_length:
        text = text[:max_length]
    
    return text.strip()


def generate_secure_filename(filename):
    """Generate a secure filename to prevent directory traversal attacks."""
    import os
    from werkzeug.utils import secure_filename as werkzeug_secure_filename
    import uuid
    
    # Get secure version of filename
    secure_name = werkzeug_secure_filename(filename)
    
    # If filename is empty after securing, generate a random one
    if not secure_name or secure_name == '':
        ext = os.path.splitext(filename)[1] if '.' in filename else ''
        secure_name = f"{uuid.uuid4().hex}{ext}"
    
    # Add timestamp to prevent collisions
    name, ext = os.path.splitext(secure_name)
    from datetime import datetime
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    
    return f"{name}_{timestamp}{ext}"