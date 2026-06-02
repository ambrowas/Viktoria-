import json
import os
import re

path = "/Users/elebi/Documents/Aplicaciones/Viktoria-/scratch/step_6497.json"
if os.path.exists(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print("Description:", data.get("Description"))
    chunks_raw = data.get("ReplacementChunks", "")
    
    # Let's clean up control characters in chunks_raw
    # Control characters are ASCII 0-31 except maybe newline/tab, but since it is a JSON string,
    # let's replace any raw control characters that might break json.loads.
    # Specifically, replace raw control characters with their escaped versions.
    cleaned = re.sub(r'[\x00-\x1F\x7F-\x9F]', lambda m: f"\\u{ord(m.group(0)):04x}", chunks_raw)
    
    try:
        chunks = json.loads(cleaned)
        print(f"Parsed {len(chunks)} chunks successfully!")
        for idx, c in enumerate(chunks):
            repl = c.get("ReplacementContent", "")
            target = c.get("TargetContent", "")
            # Look for renderBasicsStep or sponsors or assets in target or replacement
            if "basics" in repl.lower() or "sponsor" in repl.lower() or "asset" in repl.lower():
                print(f"Chunk {idx}: StartLine={c.get('StartLine')}, EndLine={c.get('EndLine')}")
                print(f"  TargetContent length: {len(target)}")
                print(f"  ReplacementContent snippet:")
                print(repl[:800])
                print("=" * 60)
    except Exception as e:
        print("Parsing failed:", e)
else:
    print("File not found")
