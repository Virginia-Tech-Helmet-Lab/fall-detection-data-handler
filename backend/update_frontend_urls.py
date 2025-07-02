"""Update all hardcoded API URLs in frontend to use config"""
import os
import re

def update_frontend_urls():
    """Replace hardcoded localhost URLs with API_BASE_URL import"""
    
    frontend_src = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src')
    
    # Files to update
    files_to_update = []
    
    # Walk through all JS files
    for root, dirs, files in os.walk(frontend_src):
        # Skip node_modules and config directory
        if 'node_modules' in root or 'config' in root:
            continue
            
        for file in files:
            if file.endswith('.js') or file.endswith('.jsx'):
                file_path = os.path.join(root, file)
                files_to_update.append(file_path)
    
    updated_files = []
    
    for file_path in files_to_update:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Pattern to match axios calls with hardcoded URLs
            patterns = [
                # axios.method('http://localhost:5000/api/...')
                (r'axios\.(get|post|put|delete|patch)\s*\(\s*[\'"]http://localhost:5000([^\'"\s]+)[\'"]',
                 r'axios.\1(`${API_BASE_URL}\2`'),
                
                # axios({ url: 'http://localhost:5000/api/...' })
                (r'url:\s*[\'"]http://localhost:5000([^\'"\s]+)[\'"]',
                 r'url: `${API_BASE_URL}\1`'),
                
                # fetch('http://localhost:5000/api/...')
                (r'fetch\s*\(\s*[\'"]http://localhost:5000([^\'"\s]+)[\'"]',
                 r'fetch(`${API_BASE_URL}\1`'),
                
                # Direct string literals
                (r'[\'"]http://localhost:5000/api/([^\'"\s]+)[\'"]',
                 r'`${API_BASE_URL}/api/\1`'),
            ]
            
            for pattern, replacement in patterns:
                content = re.sub(pattern, replacement, content)
            
            # If content changed, add import at the top
            if content != original_content:
                # Check if import already exists
                if 'import API_BASE_URL' not in content:
                    # Add import after other imports
                    import_line = "import API_BASE_URL from '../config/api';\n"
                    
                    # Adjust import path based on file depth
                    depth = len(file_path.replace(frontend_src, '').split(os.sep)) - 2
                    if depth > 0:
                        import_path = '/'.join(['..'] * depth) + '/config/api'
                        import_line = f"import API_BASE_URL from '{import_path}';\n"
                    
                    # Find last import statement
                    import_match = list(re.finditer(r'^import.*?;?\s*$', content, re.MULTILINE))
                    if import_match:
                        last_import_end = import_match[-1].end()
                        content = content[:last_import_end] + '\n' + import_line + content[last_import_end:]
                    else:
                        # No imports found, add at beginning
                        content = import_line + '\n' + content
                
                # Write updated content
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                relative_path = os.path.relpath(file_path, frontend_src)
                updated_files.append(relative_path)
                print(f"✓ Updated: {relative_path}")
                
        except Exception as e:
            print(f"✗ Error updating {file_path}: {str(e)}")
    
    print(f"\n📝 Updated {len(updated_files)} files")
    
    if updated_files:
        print("\n⚠️  Next steps:")
        print("1. Review the changes")
        print("2. Test the application")
        print("3. Create/update frontend/.env.production with REACT_APP_API_URL")

if __name__ == '__main__':
    print("This will update all hardcoded API URLs in the frontend.")
    print("Make sure you have a backup!")
    response = input("\nContinue? (yes/no): ")
    
    if response.lower() == 'yes':
        update_frontend_urls()
    else:
        print("Cancelled.")