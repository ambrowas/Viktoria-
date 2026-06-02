import json
import os

log_path = "/Users/elebi/.gemini/antigravity-ide/brain/83c52f3f-5320-4c8b-9531-bf5584558f1a/.system_generated/logs/transcript.jsonl"
if os.path.exists(log_path):
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get("step_index")
                if step in [6449, 6497, 6519, 6527, 7008]:
                    tool_calls = data.get("tool_calls", [])
                    for tc in tool_calls:
                        args = tc.get("args", {})
                        out_path = f"/Users/elebi/Documents/Aplicaciones/Viktoria-/scratch/step_{step}.json"
                        with open(out_path, "w", encoding="utf-8") as out_f:
                            json.dump(args, out_f, indent=2)
                        print(f"Wrote scratch/step_{step}.json")
            except Exception as e:
                print(f"Error in step {step}: {e}")
else:
    print("Log path does not exist")
