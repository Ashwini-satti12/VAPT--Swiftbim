import re

with open("blueprints/vendor.py", "r") as f:
    code = f.read()

# Replace LEFT JOIN employee e ON e.id = vb.vendor_id
code = code.replace(
    "LEFT JOIN employee e ON e.id = vb.vendor_id",
    "LEFT JOIN vendor_employee e ON e.id = vb.vendor_id"
)

# Replace FROM employee WHERE id IN placeholders for vendor info
code = code.replace(
    "FROM employee WHERE id IN ({placeholders})",
    "FROM vendor_employee WHERE id IN ({placeholders})"
)

with open("blueprints/vendor.py", "w") as f:
    f.write(code)

print("Patched vendor.py")
