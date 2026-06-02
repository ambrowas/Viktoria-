import os

path = "/Users/elebi/Documents/Aplicaciones/Viktoria-/scratch/step_6497.json"
if os.path.exists(path):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    print("Total size of file:", len(text))
    print("Slice around 1786:")
    print(text[1600:2000])
else:
    print("File not found")
