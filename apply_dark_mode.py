import os
import re

directories_to_check = ['src/pages', 'src/components']

replacements = {
    # Backgrounds
    r'\bbg-white\b(?! dark:bg-)': 'bg-white dark:bg-slate-800',
    r'\bbg-slate-50\b(?!/| dark:bg-)': 'bg-slate-50 dark:bg-slate-900',
    r'\bbg-slate-50/50\b(?! dark:bg-)': 'bg-slate-50/50 dark:bg-slate-900/50',
    r'\bbg-slate-100\b(?!/| dark:bg-)': 'bg-slate-100 dark:bg-slate-700',
    r'\bbg-slate-100/50\b(?! dark:bg-)': 'bg-slate-100/50 dark:bg-slate-700/50',
    r'\bbg-slate-200\b(?! dark:bg-)': 'bg-slate-200 dark:bg-slate-600',
    r'\bbg-background\b(?! dark:bg-)': 'bg-background dark:bg-slate-900',
    
    # Texts
    r'\btext-slate-900\b(?! dark:text-)': 'text-slate-900 dark:text-white',
    r'\btext-slate-800\b(?! dark:text-)': 'text-slate-800 dark:text-slate-100',
    r'\btext-slate-700\b(?! dark:text-)': 'text-slate-700 dark:text-slate-200',
    r'\btext-slate-600\b(?! dark:text-)': 'text-slate-600 dark:text-slate-300',
    r'\btext-slate-500\b(?! dark:text-)': 'text-slate-500 dark:text-slate-400',
    r'\btext-textMain\b(?! dark:text-)': 'text-textMain dark:text-white',

    # Borders
    r'\bborder-slate-100\b(?!/| dark:border-)': 'border-slate-100 dark:border-slate-700',
    r'\bborder-slate-100/50\b(?! dark:border-)': 'border-slate-100/50 dark:border-slate-700/50',
    r'\bborder-slate-200\b(?! dark:border-)': 'border-slate-200 dark:border-slate-600',
    r'\bborder-slate-300\b(?! dark:border-)': 'border-slate-300 dark:border-slate-500',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    for pattern, replacement in replacements.items():
        # Only replace if not already substituted to avoid duplicates
        content = re.sub(pattern, replacement, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

for directory in directories_to_check:
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                process_file(os.path.join(root, file))

print("Done.")
