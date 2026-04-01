import os
import re

directory = r'c:\Users\admin\SwiftbimProjectManagment-\React-frontend\src\pages\Vendor'

updates = 0
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = content
            
            # The buggy string is `key={`${name}` followed by newlines.
            # Using regex to fix it
            # We want to replace `key={`${name}` (without closing } ) followed by whitespaces and `className=`
            # Actually, `name` could be any variable name if we used `{name_var}`.
            
            pattern = re.compile(r'key=\{`\$\{([^}]+)\}\s*\n(\s*className=)', re.DOTALL)
            # wait, it might be key={`${name} (no backtick at the end)
            # Let's see what I output in the buggy script:
            # key_attr = f'key={{{key_match.group(1)}}}' if key_match else 'key={`${name}-${idx}`}'
            # The buggy key_match group 1 was ``` `${name} ```
            # So the injected code was: `key={`${name}`
            
            new_content = new_content.replace('key={`${name}\n', 'key={`${name}-${idx}`}\n')
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Fixed {filepath}")
                updates += 1

print(f"Fixed {updates} files.")
