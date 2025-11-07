from flask import Blueprint

# Create the blueprint
api_bp = Blueprint('api', __name__)

# This flag prevents duplicate route registrations
# Initialize as False - will be set to True when routes are registered
api_routes_registered = False
