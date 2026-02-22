---
description: Standard workflow for creating a new branch and pushing updates
---

For every new update or feature request:

1. **Create a New Branch**:
   ```bash
   git checkout -b <branch-name>
   ```
   (Use a descriptive name like `ui-fix`, `feature-auth`, etc.)

2. **Implement Changes**:
   Make necessary code modifications.

3. **Commit and Push**:
   ```bash
   git add .
   git commit -m "<descriptive message>"
   git push -u origin <branch-name>
   ```

4. **Pull Request**:
   Provide the user with the GitHub Pull Request URL generated in the git output.
