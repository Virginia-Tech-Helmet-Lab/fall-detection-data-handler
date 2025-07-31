#!/usr/bin/env python3
"""List all registered routes in the Flask app."""

from app import create_app

app = create_app('development')

print("=== ALL REGISTERED ROUTES ===")
for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
    methods = ','.join(sorted(rule.methods - {'HEAD', 'OPTIONS'}))
    if methods:
        print(f"{rule.rule:50} {methods:15} {rule.endpoint}")
print("=== END OF ROUTES ===")