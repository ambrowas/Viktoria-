import json
import os

for step in [6449, 6497, 6519, 6527, 7008]:
    path = f"/Users/elebi/Documents/Aplicaciones/Viktoria-/scratch/step_{step}.json"
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"Step {step}:")
        print(f"  Keys: {list(data.keys())}")
        if "ReplacementChunks" in data:
            chunks = data["ReplacementChunks"]
            print(f"  Type of ReplacementChunks: {type(chunks)}")
            if isinstance(chunks, list):
                print(f"  Length: {len(chunks)}")
                if len(chunks) > 0:
                    print(f"  Type of first chunk: {type(chunks[0])}")
                    if isinstance(chunks[0], dict):
                        print(f"  First chunk keys: {list(chunks[0].keys())}")
                    else:
                        print(f"  First chunk value (first 100 chars): {str(chunks[0])[:100]}")
            else:
                print(f"  Value (first 100 chars): {str(chunks)[:100]}")
        else:
            print("  No ReplacementChunks")
