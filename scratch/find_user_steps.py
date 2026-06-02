import json
import os

log_path = "/Users/elebi/.gemini/antigravity-ide/brain/83c52f3f-5320-4c8b-9531-bf5584558f1a/.system_generated/logs/transcript.jsonl"
if os.path.exists(log_path):
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get("step_index")
                if 6400 <= step <= 7010:
                    if data.get("type") == "USER_INPUT":
                        print(f"[{step}] User: {data.get('content')}")
            except Exception as e:
                pass
else:
    print("Log path does not exist")
