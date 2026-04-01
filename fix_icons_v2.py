import os
import re

directory = r'c:\Users\admin\SwiftbimProjectManagment-\React-frontend\src\pages\Vendor'

updates = 0
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            if 'd="M15 12a3 3 0 11-6 0 3 3 0 016 0z"' not in content:
                continue

            rel_path = os.path.relpath(filepath, directory)
            depth = rel_path.count(os.sep) + 2
            prefix = "../" * depth
            view_import = f'import viewIcon from "{prefix}assets/ProjectManager/project/viewIcon.svg";\n'
            delete_import = f'import deleteIcon from "{prefix}assets/ProjectManager/project/deleteIcon.svg";\n'

            new_content = content

            if 'import viewIcon ' not in new_content:
                new_content = re.sub(r'(import .*?;?\n)', r'\1' + view_import, new_content, count=1)
            
            if 'import deleteIcon ' not in new_content:
                new_content = re.sub(r'(import .*?;?\n)', r'\1' + delete_import, new_content, count=1)

            # We know exactly how I constructed the div earlier:
            # 1. <div className="flex items-center gap-2 shrink-0 ml-2">
            # 2. <button ... aria-label={`View ...`}> <svg ...> <path d="M15..."> <path d="M2.458..."> </svg> </button>
            # 3. <button ... aria-label={`Remove ...`}> <svg ...> <path d="M6 18L18..."> </svg> </button>
            # 4. </div>

            # We can use regex to match ANY button containing the view path:
            pattern_view = re.compile(
                r'<button\s+type="button"\s+onClick=\{([^}]+)\}\s+className="p-1 rounded text-black hover:bg-slate-200 hover:text-slate-700 cursor-pointer"\s+aria-label=\{([^}]+)\}\s*>\s*<svg.*?</svg>\s*</button>',
                re.DOTALL
            )
            
            pattern_delete = re.compile(
                r'<button\s+type="button"\s+onClick=\{([^}]+)\}\s+className="p-1 rounded text-black hover:bg-slate-200 hover:text-slate-700 cursor-pointer"\s+aria-label=\{([^}]+)\}\s*>\s*<svg[^>]*>\s*<path[^>]+d="M6 18[^>]+>\s*</svg>\s*</button>',
                re.DOTALL
            )
            
            def repl_view(m):
                onclick = m.group(1)
                aria = m.group(2)
                return f'<button type="button" onClick={{{onclick}}} className="flex items-center gap-1.5 p-1 rounded hover:bg-slate-100 cursor-pointer" aria-label={{{aria}}}><img src={{viewIcon}} alt="View" className="w-4 h-4" /><span className="text-[#3271A3] text-sm font-medium">View</span></button>'

            def repl_delete(m):
                onclick = m.group(1)
                aria = m.group(2)
                return f'<span className="text-slate-300">|</span><button type="button" onClick={{{onclick}}} className="flex items-center gap-1.5 p-1 rounded hover:bg-red-50 cursor-pointer" aria-label={{{aria}}}><img src={{deleteIcon}} alt="Delete" className="w-4 h-4" /><span className="text-[#DD4342] text-sm font-medium">Delete</span></button>'

            new_content = pattern_view.sub(repl_view, new_content)
            new_content = pattern_delete.sub(repl_delete, new_content)
            
            new_content = new_content.replace('<div className="flex items-center gap-2 shrink-0 ml-2">', '<div className="flex items-center gap-3 shrink-0 ml-2">')

            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
                updates += 1

print(f"Total files updated: {updates}")
