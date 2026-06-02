import json
import os

for step in [6519, 6527]:
    path = f"/Users/elebi/Documents/Aplicaciones/Viktoria-/scratch/step_{step}.json"
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"Step {step}:")
        print("  Description:", data.get("Description"))
        print("  TargetContent:")
        print(data.get("TargetContent", "")[:800])
        print("  ReplacementContent:")
        print(data.get("ReplacementContent", "")[:800])
        print("=" * 60)
