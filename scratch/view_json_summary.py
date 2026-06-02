import json
import os

for step in [6449, 6497, 6519, 6527, 7008]:
    path = f"/Users/elebi/Documents/Aplicaciones/Viktoria-/scratch/step_{step}.json"
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"Step {step}:")
        print(f"  TargetFile: {data.get('TargetFile')}")
        print(f"  Description: {data.get('Description')}")
        
        chunks_raw = data.get("ReplacementChunks")
        if chunks_raw:
            if isinstance(chunks_raw, str):
                chunks = json.loads(chunks_raw)
            else:
                chunks = chunks_raw
            print(f"  ReplacementChunks (list of {len(chunks)} items):")
            for idx, c in enumerate(chunks):
                print(f"    Chunk {idx}: StartLine={c.get('StartLine')}, EndLine={c.get('EndLine')}")
                target = c.get('TargetContent', '')
                repl = c.get('ReplacementContent', '')
                print(f"      Target lines: {len(target.splitlines())}, Repl lines: {len(repl.splitlines())}")
        else:
            print("  Single chunk replace:")
            target = data.get('TargetContent', '')
            repl = data.get('ReplacementContent', '')
            print(f"    Target lines: {len(target.splitlines())}, Repl lines: {len(repl.splitlines())}")
    else:
        print(f"Step {step} file not found")
