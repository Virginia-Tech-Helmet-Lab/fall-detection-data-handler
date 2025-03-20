from flask import Blueprint

# Create the blueprint
api_bp = Blueprint('api', __name__)

# This flag prevents duplicate route registrations
api_routes_registered = False
