import json
import os

path = "/Users/elebi/Documents/Aplicaciones/Viktoria-/scratch/step_6449.json"
if os.path.exists(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print("Description:", data.get("Description"))
    chunks_raw = data.get("ReplacementChunks", "")
    try:
        chunks = json.loads(chunks_raw, strict=False)
        print(f"Loaded {len(chunks)} chunks from step 6449")
        for idx, c in enumerate(chunks):
            repl = c.get("ReplacementContent", "")
            if "sponsor" in repl.lower() or "asset" in repl.lower() or "basics" in repl.lower():
                print(f"Chunk {idx} (Lines {c.get('StartLine')} - {c.get('EndLine')}):")
                print("  ReplacementContent snippet:")
                print(repl[:800])
                print("=" * 60)
    except Exception as e:
        print(f"Error parsing with strict=False: {e}")
        # Let's try parsing manually or regexing
else:
    print("File not found")
