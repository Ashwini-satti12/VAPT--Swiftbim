import os

directory = r'c:\Users\admin\SwiftbimProjectManagment-\React-frontend\src\pages\Vendor'

updates = 0
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            if 'className="flex items-center gap-2 shrink-0 ml-2"' not in content:
                continue

            rel_path = os.path.relpath(filepath, directory)
            depth = rel_path.count(os.sep) + 2
            prefix = "../" * depth
            view_import = f'import viewIcon from "{prefix}assets/ProjectManager/project/viewIcon.svg";\n'
            delete_import = f'import deleteIcon from "{prefix}assets/ProjectManager/project/deleteIcon.svg";\n'

            new_content = content

            if 'import viewIcon ' not in new_content:
                # Add after `import React` or similar
                if 'import ' in new_content:
                    split_idx = new_content.find('import ')
                    if split_idx != -1:
                        new_content = new_content[:split_idx] + view_import + new_content[split_idx:]
            
            if 'import deleteIcon ' not in new_content:
                if 'import ' in new_content:
                    split_idx = new_content.find('import ')
                    if split_idx != -1:
                        new_content = new_content[:split_idx] + delete_import + new_content[split_idx:]

            # The exact View Button we generated:
            # We can find `<button` and check if it contains the view path, then isolate it.
            # But the easiest way is to split by `<button type="button" onClick=` and replace the content up to `</button>`
            
            parts = new_content.split('<button type="button" onClick={')
            assembled = [parts[0]]
            
            for i in range(1, len(parts)):
                part = parts[i]
                # It starts with the onclick body, e.g. `(e) => { ... }}`
                # We need to find where the `</button>` is.
                end_idx = part.find('</button>')
                if end_idx != -1:
                    button_body = part[:end_idx]
                    rest = part[end_idx + 9:] # 9 is len('</button>')
                    
                    if 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' in button_body:
                        # Extract onclick and aria-label
                        # The start of part represents what is after onClick={
                        # We must find the closing } of the onClick. This is hard to do perfectly because `{}` can be nested.
                        # But we know `} className="p-1 rounded` follows the onClick!
                        
                        onclick_end = button_body.find('} className="p-1')
                        if onclick_end != -1:
                            onclick = button_body[:onclick_end].strip() # Does not include closing `}`
                            
                            # Extract aria-label
                            aria_start = button_body.find('aria-label={')
                            if aria_start != -1:
                                aria_body = button_body[aria_start+12:]
                                aria_end = aria_body.find('}')
                                aria = aria_body[:aria_end].strip()
                                
                                new_btn = f'onClick={{{onclick}}} className="flex items-center gap-1.5 p-1 rounded hover:bg-slate-100 cursor-pointer text-sm font-medium" aria-label={{{aria}}}><img src={{viewIcon}} alt="View" className="w-4 h-4" /><span className="text-[#3271A3]">View</span></button>'
                                assembled.append(new_btn + rest)
                                continue
                                
                    elif 'M6 18L18 6M6 6l12 12' in button_body and 'className="p-1 rounded' in button_body:
                        onclick_end = button_body.find('} className="p-1')
                        if onclick_end != -1:
                            onclick = button_body[:onclick_end].strip()
                            
                            aria_start = button_body.find('aria-label={')
                            if aria_start != -1:
                                aria_body = button_body[aria_start+12:]
                                aria_end = aria_body.find('}')
                                aria = aria_body[:aria_end].strip()
                                
                                new_btn = f'onClick={{{onclick}}} className="flex items-center gap-1.5 p-1 rounded hover:bg-slate-100 cursor-pointer text-sm font-medium" aria-label={{{aria}}}><img src={{deleteIcon}} alt="Delete" className="w-4 h-4" /><span className="text-[#DD4342]">Delete</span></button>'
                                # Also add a separator before the delete button
                                assembled.append(new_btn + rest)
                                continue
                
                # If no match or condition failed, restore the split string
                assembled.append('onClick={' + part)
            
            # Since we appended <button onClick={... in the original, our new_btn replaced `onClick={` with `onClick={`, 
            # wait, the first element of assembled is `parts[0]`. The loop appends `onClick={...` or `new_btn` (which starts with `onClick={`)
            # BUT wait, the separator! I should add `<span className="text-slate-300">|</span>` before the delete button.
            # So `new_btn` for delete should actually be inserted before the `<button type="button" `.
            # Our split removed `<button type="button" onClick={`.
            # So if I reconstruct: `assembled.append('<button type="button" ' + new_btn + rest)`
            
            re_assembled = assembled[0]
            for i in range(1, len(assembled)):
                if assembled[i].startswith('onClick='):
                    if '<img src={deleteIcon}' in assembled[i]:
                        re_assembled += '<span className="text-gray-300">|</span>\n<button type="button" ' + assembled[i]
                    else:
                        re_assembled += '<button type="button" ' + assembled[i]
                else:
                    re_assembled += '<button type="button" onClick={' + assembled[i] # If it didn't match
            
            new_content = re_assembled
            
            new_content = new_content.replace('gap-2 shrink-0 ml-2', 'gap-3 shrink-0 ml-3')
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
                updates += 1

print(f"Total files updated: {updates}")
