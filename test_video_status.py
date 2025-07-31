#!/usr/bin/env python3
"""Check video statuses in the database."""

import requests
import json

# Login first
login_data = {
    "username": "admin",
    "password": "admin123"
}

login_response = requests.post(
    "http://localhost:5000/api/auth/login",
    json=login_data
)

if login_response.status_code == 200:
    token = login_response.json()['access_token']
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Check video status
    response = requests.get(
        "http://localhost:5000/api/videos/status-check",
        headers=headers
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"\nTotal videos: {data['total_videos']}")
        print(f"\nStatus breakdown:")
        for status, count in data['status_breakdown'].items():
            print(f"  {status}: {count}")
        print(f"\nSample videos:")
        for status, samples in data['samples'].items():
            print(f"  Status '{status}':")
            for video in samples:
                print(f"    - {video['filename']} (normalized: {video['has_normalization_settings']})")
    else:
        print(f"Error: {response.text}")
else:
    print(f"Login failed: {login_response.text}")