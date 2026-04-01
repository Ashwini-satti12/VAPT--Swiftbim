import os

directory = r'c:\Users\admin\SwiftbimProjectManagment-\React-frontend\src\pages\Vendor'

updates = 0
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = content
            
            # Cases to replace
            new_content = new_content.replace('["Show",', '["Show Entries",')
            new_content = new_content.replace('["Show", ', '["Show Entries", ')
            new_content = new_content.replace('useState<string | null>("Show")', 'useState<string | null>("Show Entries")')
            new_content = new_content.replace('useState<string>("Show")', 'useState<string>("Show Entries")')
            new_content = new_content.replace('useState("Show")', 'useState("Show Entries")')
            new_content = new_content.replace('selectedShow === "Show"', 'selectedShow === "Show Entries"')
            new_content = new_content.replace('selectedShow !== "Show"', 'selectedShow !== "Show Entries"')
            new_content = new_content.replace('label="Show"', 'label="Show Entries"')
            new_content = new_content.replace('placeholder="Show"', 'placeholder="Show Entries"')
            new_content = new_content.replace('\n  "Show",\n', '\n  "Show Entries",\n')
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
                updates += 1

print(f"Total files updated: {updates}")
