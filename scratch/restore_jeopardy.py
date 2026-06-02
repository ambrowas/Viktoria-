import json

log_path = "/Users/elebi/.gemini/antigravity-ide/brain/83c52f3f-5320-4c8b-9531-bf5584558f1a/.system_generated/logs/transcript.jsonl"

candidates = []

with open(log_path, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        try:
            data = json.loads(line)
            content = data.get("content", "")
            # Check if this is a tool response for view_file
            if data.get("type") == "VIEW_FILE" and "JeopardyGameScreen" in content:
                candidates.append((len(content), idx, content))
            
            # Check if this is a subagent response or system message that might have the full file
            if "JeopardyGameScreen" in content and len(content) > 10000:
                candidates.append((len(content), idx, content))
        except Exception as e:
            pass

candidates.sort(reverse=True, key=lambda x: x[0])

if candidates:
    print(f"Found {len(candidates)} candidates.")
    for length, idx, content in candidates[:5]:
        print(f"Candidate index {idx}: len={length}")
        # Write the largest candidate to a file
        with open(f"candidate_{idx}.tsx", "w", encoding="utf-8") as out:
            out.write(content)
else:
    print("No candidates containing JeopardyGameScreen with large content found.")
