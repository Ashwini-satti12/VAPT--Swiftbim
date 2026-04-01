import os
import re

directories_to_search = [
    r'c:\Users\admin\SwiftbimProjectManagment-\React-frontend\src\pages\Vendor'
]

# We want to replace the single button with a wrapper containing two buttons.
# Since white space might vary slightly, regex is better.
# The button is: <button type="button" onClick={() => removeAttachment(index)} ... </button>
# We will match from <button up to </button> that contains removeAttachment(index).

pattern = re.compile(r'<button\s+type="button"\s+onClick=\{\(\) => removeAttachment\(index\)\}.*?</button>', re.DOTALL)

replacement = '''<div className="flex items-center gap-2 shrink-0 ml-2">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                const url = URL.createObjectURL(file);
                                                                window.open(url, "_blank");
                                                            }}
                                                            className="p-1 rounded text-black hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                                                            aria-label={View }
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeAttachment(index)}
                                                            className="p-1 rounded text-black hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                                                            aria-label={Remove }
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>'''

updates = 0
for directory in directories_to_search:
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                new_content = pattern.sub(replacement, content)

                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {filepath}")
                    updates += 1

print(f"Total files updated: {updates}")
