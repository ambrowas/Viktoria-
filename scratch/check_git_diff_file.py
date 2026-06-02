import os

diff_path = "/Users/elebi/Documents/Aplicaciones/Viktoria-/git_diff.txt"
if os.path.exists(diff_path):
    print("git_diff.txt exists!")
    # Read the file and look for occurrences of ShowManager.tsx
    with open(diff_path, "r", encoding="utf-8") as f:
        content = f.read()
    print(f"File size: {len(content)} characters")
    idx = 0
    while True:
        idx = content.find("ShowManager.tsx", idx)
        if idx == -1:
            break
        print(f"Found ShowManager.tsx at index {idx}, snippet: {content[idx:idx+150]}")
        idx += 15
else:
    print("git_diff.txt does not exist")
