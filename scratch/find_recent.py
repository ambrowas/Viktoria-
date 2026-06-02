import json
import os

log_path = "/Users/elebi/.gemini/antigravity-ide/brain/83c52f3f-5320-4c8b-9531-bf5584558f1a/.system_generated/logs/transcript.jsonl"
if os.path.exists(log_path):
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line)
                if data.get("type") == "USER_INPUT":
                    content = data.get("content", "")
                    # print first 150 chars of content
                    print(f"[{data.get('step_index')}] User: {content[:200]}")
            except Exception as e:
                pass
else:
    print("Log path does not exist")
