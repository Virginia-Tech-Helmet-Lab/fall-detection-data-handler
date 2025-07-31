#!/bin/bash
# Debug why routes aren't being registered

echo "=== Debugging Route Registration ==="
echo ""

# 1. Check what's actually in the container
echo "1. Checking routes.py in container:"
docker exec falldetection-backend-local head -50 /app/app/routes.py | grep -A5 -B5 "upload" || echo "Could not check container file"

echo ""
echo "2. Checking if the container can list its routes:"
docker exec falldetection-backend-local python -c "
import sys
sys.path.insert(0, '/app')
try:
    from app import create_app
    app = create_app()
    print('\\n=== Registered URL Rules ===')
    for rule in app.url_map.iter_rules():
        print(f'{rule.methods} -> {rule.rule}')
    print('\\n=== Looking for upload endpoint ===')
    upload_found = False
    for rule in app.url_map.iter_rules():
        if 'upload' in rule.rule:
            print(f'FOUND: {rule.methods} -> {rule.rule}')
            upload_found = True
    if not upload_found:
        print('NO UPLOAD ENDPOINT FOUND!')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
" 2>&1

echo ""
echo "3. Checking blueprint registration:"
docker exec falldetection-backend-local python -c "
import sys
sys.path.insert(0, '/app')
try:
    from app.blueprints import api_bp, api_routes_registered
    print(f'api_routes_registered = {api_routes_registered}')
    print(f'api_bp.name = {api_bp.name}')
    print(f'Number of routes in api_bp: {len(list(api_bp.deferred_functions))}')
except Exception as e:
    print(f'Error: {e}')
" 2>&1

echo ""
echo "4. Testing if we can access ANY API endpoint:"
echo "Testing /api/projects:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:5000/api/projects

echo "Testing /api/videos:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:5000/api/videos

echo "Testing root:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:5000/