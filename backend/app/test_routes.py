"""Test if routes are being registered."""

from flask import jsonify
from .blueprints import api_bp

@api_bp.route('/test-blueprint', methods=['GET'])
def test_blueprint():
    """Test if blueprint routes work."""
    return jsonify({
        'message': 'Blueprint is working',
        'blueprint_name': api_bp.name
    })

print(">>> Test route registered on api_bp")