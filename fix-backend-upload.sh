#!/bin/bash
# Fix the backend upload endpoint issue

echo "Fixing backend upload endpoint..."
echo ""

# 1. First check what's in the current routes.py
echo "=== Current routes.py upload endpoint ==="
grep -A10 "@api_bp.route('/upload'" backend/app/routes.py | head -20

echo ""
echo "=== Checking if JWT is required ==="
grep -B2 -A2 "def upload_video" backend/app/routes.py

# 2. Stop the backend
echo ""
echo "=== Stopping backend container ==="
docker-compose -f docker-compose.local.yml stop backend

# 3. Remove the container
echo ""
echo "=== Removing old container ==="
docker-compose -f docker-compose.local.yml rm -f backend

# 4. Make sure the Dockerfile copies the latest code
echo ""
echo "=== Checking Dockerfile.backend ==="
grep -E "COPY|backend" Dockerfile.backend

# 5. Rebuild with no cache
echo ""
echo "=== Rebuilding backend image (this may take a minute) ==="
docker-compose -f docker-compose.local.yml build --no-cache backend

# 6. Start the backend
echo ""
echo "=== Starting new backend container ==="
docker-compose -f docker-compose.local.yml up -d backend

# 7. Wait for startup
echo ""
echo "=== Waiting for backend to start ==="
sleep 10

# 8. Test the endpoint
echo ""
echo "=== Testing upload endpoint ==="
curl -X POST http://localhost:5000/api/upload \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc1MzMyMzI4MCwianRpIjoiZWUxNGIxYjMtNDljMC00ZmEyLWI3NDUtMTljZWEyYTE4MmQ1IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjEiLCJuYmYiOjE3NTMzMjMyODAsImNzcmYiOiIxMzFkZDNlZS05NGQxLTRhNTctYTc0ZC00MzU1ZTA4M2U0NGUiLCJleHAiOjE3NTM0MDk2ODB9.3fQ-jhZkNQmqgbSyigKA3Op4UQqCxykQ2xqlpaAluYY" \
  -F "files=@/dev/null" \
  -w "\nHTTP Status: %{http_code}\n" 2>/dev/null

# 9. Check container logs
echo ""
echo "=== Recent backend logs ==="
docker logs falldetection-backend-local --tail 30 2>&1 | grep -E "(upload|Upload|404|Starting|Error)" || echo "No relevant logs found"

echo ""
echo "=== Done! ==="
echo "If you still see 404, there might be an issue with the route registration."
echo "Try accessing http://localhost:3000 and uploading videos again."