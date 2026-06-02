import re

path = "/Users/elebi/Documents/Aplicaciones/Viktoria-/scratch/step_6449.json"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# ReplacementChunks is a JSON string, let's find the content inside the outer quotes.
# It starts with "ReplacementChunks": "
# Let's extract the ReplacementChunks value string and write it to a separate file,
# then parse it using json or regex.
match = re.search(r'"ReplacementChunks":\s*"(.*)"\s*,\s*"TargetFile"', text, re.DOTALL)
if match:
    raw_val = match.group(1)
    # The quotes inside are escaped as \". Let's unescape them.
    # To do it safely, let's just write raw_val to a file and look at it,
    # or write a script to search for keywords.
    with open("/Users/elebi/Documents/Aplicaciones/Viktoria-/scratch/chunks_6449_raw.txt", "w", encoding="utf-8") as out:
        out.write(raw_val)
    print("Extracted raw_val, length:", len(raw_val))
else:
    print("Could not match ReplacementChunks")
