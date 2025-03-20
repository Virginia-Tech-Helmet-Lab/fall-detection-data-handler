from flask import Flask, Response, send_file
import cv2
import numpy as np
import io
import os

app = Flask(__name__)

@app.route('/test-raw', methods=['GET'])
def test_raw():
    """Most direct possible image response"""
    # Create a simple image
    img = np.zeros((120, 160, 3), dtype=np.uint8)
    img[:, :, 2] = 255  # Red image
    cv2.putText(img, "TEST", (60, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
    
    # Convert to bytes
    _, buffer = cv2.imencode('.jpg', img)
    img_data = buffer.tobytes()
    
    # Return direct response
    return Response(
        img_data, 
        mimetype='image/jpeg',
        headers={
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        }
    )

if __name__ == '__main__':
    app.run(port=5001, debug=False)  # Note: debug=False to avoid debugger middleware
