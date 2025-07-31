#!/usr/bin/env python3
"""Test normalize endpoint."""

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
    
    # Test normalize endpoint
    normalize_data = {
        'resolution': '720p',
        'framerate': 30,
        'brightness': 1.0,
        'contrast': 1.0
    }
    
    # Test the endpoint
    response = requests.post(
        "http://localhost:5000/api/normalize/1",
        json=normalize_data,
        headers=headers
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    # Also test if the route exists
    response2 = requests.options(
        "http://localhost:5000/api/normalize/1",
        headers={'Origin': 'http://localhost:3000'}
    )
    print(f"\nOPTIONS Status: {response2.status_code}")
    print(f"OPTIONS Headers: {dict(response2.headers)}")
else:
    print(f"Login failed: {login_response.text}")