import os
import re

files_to_patch = [
    "src/pages/BimCoordinator/AddTaskBC.tsx",
    "src/pages/BimLead/MytaskBL.tsx",
    "src/pages/BimLead/TeamtaskBL.tsx",
    "src/pages/BimModeler/MytaskBM.tsx",
    "src/pages/ProjectManager/AddTaskPM.tsx",
    "src/pages/ProjectManager/TeamtaskPM.tsx",
    "src/pages/TechnicalDirector/AddTaskTD.tsx",
    "src/pages/TechnicalDirector/TeamtaskTD.tsx",
    "src/pages/Vendor/Employee/MytaskEV.tsx",
    "src/pages/Vendor/Employee/TeamtaskEV.tsx",
    "src/pages/Vendor/MytaskV.tsx",
    "src/pages/Vendor/ProjectManager/MytaskPMV.tsx",
    "src/pages/Vendor/ProjectManager/TeamtaskPMV.tsx",
    "src/pages/Vendor/TeamtaskV.tsx"
]

for fpath in files_to_patch:
    if not os.path.exists(fpath):
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    # Determine import depth
    # e.g., src/pages/Vendor/MytaskV.tsx has depth 3 -> ../../utils
    # e.g., src/pages/Vendor/Employee/MytaskEV.tsx has depth 4 -> ../../../utils
    depth = fpath.count("/") - 1
    dots = "../" * (depth - 1)
    imp = f"import {{ isEmployeeActiveForProjectAssignment }} from \"{dots}utils/employeeActive\";\n"

    # 1. Add import if not present
    if "isEmployeeActiveForProjectAssignment" not in content:
        # insert after first import
        idx = content.find("import ")
        if idx != -1:
            eol = content.find("\n", idx)
            content = content[:eol+1] + imp + content[eol+1:]
        else:
            content = imp + content
            
    # 2. Add 'active?: string;' to 'interface Employee' definition if exists
    if "interface Employee {" in content and "active?:" not in content:
        content = re.sub(r'(interface Employee \{[^}]+)', r'\1  active?: string;\n', content)

    # 3. Patch logic
    # Find `...employees.map(` inside getAssignToOptions
    # Also find `...validEmployees.map(`
    # We can just universally replace `employees.map(` with `employees.filter(isEmployeeActiveForProjectAssignment).map(`
    # but ONLY when assigning!
    
    # Let's search for "employees.map(" and "validEmployees.map("
    content = content.replace(
        "...employees.map((e) =>",
        "...employees.filter(isEmployeeActiveForProjectAssignment).map((e) =>"
    )
    content = content.replace(
        "...employees.map(e =>",
        "...employees.filter(isEmployeeActiveForProjectAssignment).map(e =>"
    )
    
    content = content.replace(
        "...validEmployees.map((e) =>",
        "...validEmployees.filter(isEmployeeActiveForProjectAssignment).map((e) =>"
    )
    content = content.replace(
        "...validEmployees.map(e =>",
        "...validEmployees.filter(isEmployeeActiveForProjectAssignment).map(e =>"
    )
    
    content = content.replace(
        "...vendorEmployees.map((e) =>",
        "...vendorEmployees.filter(isEmployeeActiveForProjectAssignment).map((e) =>"
    )
    content = content.replace(
        "...vendorEmployees.map(e =>",
        "...vendorEmployees.filter(isEmployeeActiveForProjectAssignment).map(e =>"
    )

    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)

