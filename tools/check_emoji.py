import pathlib
import re
import sys

PATTERN = re.compile(r"[\U0001F000-\U0001FAFF\u2600-\u27BF]")
SUFFIXES = {".py", ".ts", ".tsx", ".css", ".html", ".md", ".json"}
SKIP = {"node_modules", ".venv", "dist", ".git", ".next", ".turbo", ".kilo"}

bad = 0
for path in pathlib.Path(".").rglob("*"):
    if path.is_file() and path.suffix in SUFFIXES and not (SKIP & set(path.parts)):
        try:
            lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
            for n, line in enumerate(lines, 1):
                if PATTERN.search(line):
                    print(f"{path}:{n}: emoji found")
                    bad += 1
        except Exception as e:
            print(f"Error reading {path}: {e}")

sys.exit(1 if bad else 0)
