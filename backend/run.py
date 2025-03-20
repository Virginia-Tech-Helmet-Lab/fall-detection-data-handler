from app import create_app
from flask_cors import CORS  # Make sure this is installed

# Temporarily disable debug mode completely
app = create_app()
app.debug = False  # Force debug off

# Apply CORS to the app
CORS(app)

if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0', port=5000)
