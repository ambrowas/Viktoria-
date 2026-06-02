import os

files_to_check = [
    "candidate_1176.tsx",
    "candidate_1348.tsx",
    "candidate_148.tsx",
    "candidate_178.tsx",
    "candidate_877.tsx",
    "recovered_repl_1203.tsx",
    "recovered_repl_1316.tsx",
    "recovered_repl_1320.tsx",
    "restored_jeopardy.tsx"
]

for fname in files_to_check:
    path = os.path.join("/Users/elebi/Documents/Aplicaciones/Viktoria-", fname)
    if os.path.exists(path):
        size = os.path.getsize(path)
        print(f"File: {fname} (Size: {size} bytes)")
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        
        # Search for keyword "basics" or "sponsor" or "asset"
        keywords = ["basics", "sponsor", "asset"]
        found = []
        for kw in keywords:
            if kw in content.lower():
                found.append(kw)
        if found:
            print(f"  Keywords found: {found}")
            # Print first 200 chars of the file to see what it is
            print(f"  First 200 chars: {content[:200].strip()}")
            print("-" * 40)
    else:
        print(f"File {fname} not found")
