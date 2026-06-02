import os

search_dir = "/Users/elebi/Documents/Aplicaciones/Viktoria-"
query = "ispreviewingsponsors"

for root, dirs, files in os.walk(search_dir):
    # Avoid node_modules and .git
    dirs[:] = [d for d in dirs if d not in ["node_modules", ".git", "dist", "dist-electron"]]
    for file in files:
        path = os.path.join(root, file)
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            if query in content.lower():
                print(f"Found '{query}' in: {path}")
        except Exception as e:
            pass
print("Done searching")
