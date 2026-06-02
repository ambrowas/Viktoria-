import os

for fname in ["git_diff.txt", "diff_smartazz.txt"]:
    path = os.path.join("/Users/elebi/Documents/Aplicaciones/Viktoria-", fname)
    if os.path.exists(path):
        print(f"Checking {fname}...")
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        idx = 0
        while True:
            idx = content.lower().find("showmanager", idx)
            if idx == -1:
                break
            print(f"  Found in {fname} at {idx}: {content[idx:idx+120]}")
            idx += len("showmanager")
