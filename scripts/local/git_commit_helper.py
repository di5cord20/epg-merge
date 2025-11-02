#!/usr/bin/env python3
import os
import re
import subprocess
import inquirer
from pathlib import Path

def run(cmd, capture_output=True):
    result = subprocess.run(cmd, shell=True, text=True,
                            capture_output=capture_output)
    if result.returncode != 0:
        print(result.stderr)
    return result.stdout.strip()

def get_version():
    version_file = Path("backend/version.py")
    if not version_file.exists():
        return None
    with open(version_file) as f:
        for line in f:
            m = re.search(r'VERSION\s*=\s*[\'"]([^\'"]+)[\'"]', line)
            if m:
                return m.group(1)
    return None

def get_changed_files():
    output = run("git status --porcelain")
    files = []
    for line in output.splitlines():
        status, filename = line[:2].strip(), line[3:].strip()
        if filename:
            # Mark untracked files (??) explicitly
            label = f"{filename} (untracked)" if status == "??" else filename
            files.append((label, filename))
    return files

def main():
    print("🚀 Git Commit Helper\n")

    # 1️⃣ Version number
    default_version = get_version() or "v0.0.0"
    version = input(f"Version to use [{default_version}]: ") or default_version

    # 2️⃣ Detect changed/untracked files
    changed = get_changed_files()
    if not changed:
        print("No changes detected.")
        return

    print("\nChanged / Untracked files:")
    questions = [
        inquirer.Checkbox(
            'files',
            message="Select files to include in commit",
            choices=[label for label, _ in changed],
            default=[label for label, _ in changed]
        )
    ]
    selected_labels = inquirer.prompt(questions)['files']
    selected_files = [f for label, f in changed if label in selected_labels]

    if not selected_files:
        print("No files selected. Exiting.")
        return

    # 3️⃣ Stage selected files
    run("git add " + " ".join(f'"{f}"' for f in selected_files))

    # 4️⃣ Tag & commit message
    tag = input(f"Tag name [{version}]: ") or version
    print("\nEnter commit message (finish with Ctrl+D on Linux/macOS or Ctrl+Z + Enter on Windows):")
    print("------------------------------------------------")
    lines = []
    try:
        while True:
            line = input()
            lines.append(line)
    except EOFError:
        pass
    message = "\n".join(lines).strip() or f"Version {version}"

    # 5️⃣ Branch selection
    branch = run("git rev-parse --abbrev-ref HEAD")
    new_branch = input(f"Branch to commit to [{branch}]: ") or branch

    # 6️⃣ Commit + Tag + Push
    print(f"\nCommitting to branch '{new_branch}'...")
    run(f'git commit -m "{message}"')
    run(f'git tag -a {tag} -m "{message}"')

    print("\nPushing changes...")
    run(f"git push origin {new_branch}")
    run("git push origin --tags")

    print(f"\n✅ Commit and tag '{tag}' successfully pushed!")

if __name__ == "__main__":
    main()
