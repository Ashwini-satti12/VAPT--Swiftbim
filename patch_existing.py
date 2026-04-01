import os
import re

directory = r'c:\Users\admin\SwiftbimProjectManagment-\React-frontend\src\pages\Vendor'

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = content

            # Fix the buggy aria-labels created by my previous script
            new_content = new_content.replace('aria-label={View }', 'aria-label={`View ${file.name}`}')
            new_content = new_content.replace('aria-label={Remove }', 'aria-label={`Remove ${file.name}`}')

            # Now find existing attachments map and replace the <li>...</li> block
            # Pattern context: {existingAttachmentNames.map((name, idx) => (\n <li ... > {name} </li> \n ))}
            
            # Using regex to match the <li> for existing attachments
            # The structure is:
            # <li key={`${name}-${idx}`} className="rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-[#101827] truncate" title={name}> {name} </li>
            # OR similar
            
            # Since existingAttachmentNames could vary, let's find the map specifically.
            pattern = re.compile(
                r'\{existingAttachmentNames\.map\(\s*\([^)]*\)\s*=>\s*\(\s*(<li[^>]*>.*?</li>)\s*\)\s*\)\}',
                re.DOTALL
            )
            
            def replacer(match):
                original_li = match.group(1)
                
                # Check if it already has the gap-2 and SVG buttons (meaning we already patched it)
                if 'M15 12a3 3 0' in original_li:
                    return match.group(0)

                # Find the key and title attributes
                key_match = re.search(r'key=\{([^}]+)\}', original_li)
                title_match = re.search(r'title=\{([^}]+)\}', original_li)
                
                key_attr = f'key={{{key_match.group(1)}}}' if key_match else 'key={`${name}-${idx}`}'
                name_var = title_match.group(1) if title_match else 'name'
                idx_var = 'idx' # Usually idx
                
                # Replace the simple li with the complex li
                new_li = f'''<li
                                                        {key_attr}
                                                        className="flex items-center justify-between rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-[#101827]"
                                                    >
                                                        <span className="truncate min-w-0" title={{{name_var}}}>
                                                            {{{name_var}}}
                                                        </span>
                                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                                            <button
                                                                type="button"
                                                                onClick={{(e) => {{
                                                                    e.preventDefault();
                                                                    // Placeholder for view functionality
                                                                }}}}
                                                                className="p-1 rounded text-black hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                                                                aria-label={{`View ${{{name_var}}}`}}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={{2}} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={{2}} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={{() => {{
                                                                    setExistingAttachmentNames(prev => prev.filter((_, i) => i !== {idx_var}));
                                                                }}}}
                                                                className="p-1 rounded text-black hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                                                                aria-label={{`Remove ${{{name_var}}}`}}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={{2}} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </li>'''
                return f"{{existingAttachmentNames.map(({name_var}, {idx_var}) => (\n{new_li}\n))}}"
                
            new_content = pattern.sub(replacer, new_content)

            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

print("Done patching existing attachments")
