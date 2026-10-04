import re

file_path = r"d:\CNPM\fnb-saas-platform\apps\staff-dashboard\src\pages\POS.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the remaining closing brace of MENU and delete TABLES block
content = re.sub(
    r'\s*\)\}\s*\{\/\* VIEW MODE 2: 📍 SƠ ĐỒ BÀN \(TABLE MAP\) \*\/\}[\s\S]*?\{\/\* Column 3: Cart \(Right\) \*\/\}',
    r'\n\n      {/* Column 3: Cart (Right) */}',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
