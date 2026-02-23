# Git Strategy: Reset to Your Last Commit and Apply Microservice Changes

## Current Situation

- **Current Branch:** `feature/craft-ui-and-processing-improvements`
- **Your Last Good Commit:** `d28ee0b3dccc5f97bffeae3edfd8727657cd6b32` (not in this repo's history)
- **Coworker's Commits:** Multiple commits attempting monolithic deployment (unsuccessful)
- **Current Changes:** Microservice migration (uncommitted)

## Problem

The commit `d28ee0b3dccc5f97bffeae3edfd8727657cd6b32` doesn't exist in this repository's history. This suggests either:
1. It's from a different repository/branch
2. The repository was reset/rebased since that commit
3. It's from a different clone of the repository

## Solution Options

### Option 1: Create New Branch from Current State (Recommended)

This is the safest approach - create a new branch with your microservice changes:

```bash
cd CRAFT_web_app/excel-ai-processor

# 1. Stash your current changes (microservice migration)
git stash save "Microservice migration - remove Python from webapp"

# 2. Check what commit you want to base on
git log --oneline -20
# Look for YOUR last commit before coworker's changes

# 3. Create new branch from that commit (example: using 9c41123)
git checkout -b feature/microservice-architecture 9c41123

# 4. Apply your stashed changes
git stash pop

# 5. Stage all changes
git add -A

# 6. Commit with descriptive message
git commit -m "refactor: Extract Python microservice to separate deployment

- Remove api/python-service/ directory (now in CRAFT-python-microservice)
- Remove k8s-local/ directory (no longer needed)
- Update Dockerfile to remove Python stages (Node.js only)
- Update docker-compose.yml to remove python-service container
- Update package.json to remove Python-related scripts
- Configure PYTHON_SERVICE_URL to point to Code Engine deployment
- Add MICROSERVICE_MIGRATION.md documentation
- Update README.md to reflect microservices architecture

Python microservice now deployed separately on IBM Code Engine:
https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud

This enables OpenShift cron job deployment and independent scaling."

# 7. Push new branch
git push -u origin feature/microservice-architecture
```

### Option 2: Force Reset Current Branch (Destructive)

⚠️ **WARNING:** This will discard your coworker's commits. Only use if you're sure.

```bash
cd CRAFT_web_app/excel-ai-processor

# 1. Stash your current changes
git stash save "Microservice migration"

# 2. Find the commit to reset to
git log --oneline -20
# Identify YOUR last good commit (e.g., 9c41123)

# 3. Hard reset to that commit
git reset --hard 9c41123

# 4. Apply your stashed changes
git stash pop

# 5. Stage and commit
git add -A
git commit -m "refactor: Extract Python microservice to separate deployment"

# 6. Force push (overwrites remote)
git push --force-with-lease origin feature/craft-ui-and-processing-improvements
```

### Option 3: Interactive Rebase (Advanced)

Keep some of coworker's commits, discard others:

```bash
cd CRAFT_web_app/excel-ai-processor

# 1. Stash your changes
git stash save "Microservice migration"

# 2. Start interactive rebase from base commit
git rebase -i 9c41123

# 3. In the editor, mark commits to keep/drop:
#    pick = keep commit
#    drop = discard commit
#    squash = combine with previous

# 4. Complete rebase
# 5. Apply stashed changes
git stash pop

# 6. Commit and push
git add -A
git commit -m "refactor: Extract Python microservice"
git push --force-with-lease origin feature/craft-ui-and-processing-improvements
```

## Recommended Approach

**I recommend Option 1** because it:
- ✅ Preserves all history (safe)
- ✅ Creates clean separation
- ✅ Allows comparison between branches
- ✅ Easy to review in PR
- ✅ No risk of losing work

## Step-by-Step: Option 1 (Detailed)

### Step 1: Identify Your Last Good Commit

```bash
cd CRAFT_web_app/excel-ai-processor
git log --oneline --all --graph -20
```

Look for the last commit YOU made before your coworker's changes. Based on the log shown:
- `9c41123` - Add Delta Tool with LLM generation mode
- `d1657c6` - DINERO conversion
- `09baf26` - feat: CRAFT UI improvements, Q&A preview, and processing fixes

**Which one is yours?** Let's assume it's `9c41123` for this example.

### Step 2: Save Your Current Work

```bash
# Save all your microservice migration changes
git stash save "Microservice migration - Python extracted to Code Engine"

# Verify stash was created
git stash list
```

### Step 3: Create New Branch

```bash
# Create and checkout new branch from your last good commit
git checkout -b feature/microservice-architecture 9c41123

# Verify you're on the new branch
git branch
```

### Step 4: Apply Your Changes

```bash
# Apply your stashed microservice migration changes
git stash pop

# Check what changed
git status
```

### Step 5: Review Changes

```bash
# Review the changes
git diff

# Make sure everything looks correct:
# - api/python-service/ removed
# - k8s-local/ removed
# - Dockerfile updated
# - package.json updated
# - docker-compose.yml updated
# - New documentation added
```

### Step 6: Commit

```bash
# Stage all changes
git add -A

# Commit with detailed message
git commit -m "refactor: Extract Python microservice to separate Code Engine deployment

BREAKING CHANGE: Python microservice removed from webapp container

Changes:
- Remove api/python-service/ directory (moved to CRAFT-python-microservice repo)
- Remove k8s-local/ directory (no longer needed for local k8s)
- Update Dockerfile: Remove Python stages, Node.js only (3 stages vs 4)
- Update Dockerfile.dev: Remove python-service stage
- Update docker-compose.yml: Remove python-service container
- Update package.json: Remove python-service and dev:all Python references
- Update .env.example: Add production Code Engine URL
- Update k8s/deployment.yaml: Verify PYTHON_SERVICE_URL configuration
- Add MICROSERVICE_MIGRATION.md: Complete migration documentation
- Update README.md: Reflect microservices architecture

Python Microservice:
- Now deployed separately on IBM Code Engine
- URL: https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud
- Handles document processing and Delta Tool functionality
- See CRAFT-python-microservice/README.md for deployment

Benefits:
- Independent scaling of Python service
- Smaller webapp container (~60% reduction)
- Compatible with OpenShift cron job deployment
- Clear separation of concerns
- Independent deployment cycles

Migration: See MICROSERVICE_MIGRATION.md for complete details"
```

### Step 7: Push to GitHub

```bash
# Push new branch to remote
git push -u origin feature/microservice-architecture

# Output will show the URL to create a Pull Request
```

### Step 8: Create Pull Request

1. Go to GitHub repository
2. You'll see a banner: "Compare & pull request" for your new branch
3. Click it
4. Fill in PR details:
   - **Title:** `refactor: Extract Python microservice to Code Engine`
   - **Description:** Link to `MICROSERVICE_MIGRATION.md` and explain the architecture change
5. Request review from your coworker
6. Merge when approved

## What About the Old Branch?

After your new branch is merged, you can:

```bash
# Delete the old feature branch locally
git branch -D feature/craft-ui-and-processing-improvements

# Delete it from remote (if needed)
git push origin --delete feature/craft-ui-and-processing-improvements
```

## Verification Checklist

Before pushing, verify:

- [ ] `api/python-service/` directory is removed
- [ ] `k8s-local/` directory is removed
- [ ] `package.json` has no Python scripts
- [ ] `Dockerfile` has no Python stages
- [ ] `docker-compose.yml` has no python-service
- [ ] `.env.example` has correct PYTHON_SERVICE_URL
- [ ] `MICROSERVICE_MIGRATION.md` exists
- [ ] `README.md` updated
- [ ] All files compile/build successfully

## Testing Before Push

```bash
# Test that everything still works
npm install
npm run dev:all

# Test Docker build
docker build -t excel-ai-processor:test .

# Verify no Python references
grep -r "python-service" . --exclude-dir=node_modules --exclude-dir=.git
```

## If You Need the Specific Commit

If `d28ee0b3dccc5f97bffeae3edfd8727657cd6b32` is from another repository or remote:

```bash
# Check all remotes
git remote -v

# Fetch from specific remote
git fetch <remote-name>

# Search for commit
git log --all --oneline | grep d28ee0b

# If found, create branch from it
git checkout -b feature/microservice-architecture d28ee0b3dccc5f97bffeae3edfd8727657cd6b32
```

## Need Help?

If you're unsure which commit to use, run:

```bash
# Show detailed commit history with dates and authors
git log --oneline --graph --all --decorate --date=relative --pretty=format:'%C(yellow)%h%Creset %C(cyan)%an%Creset %C(green)(%ar)%Creset %s'
```

Look for commits with YOUR name/email before your coworker's changes.

---

**Recommendation:** Use **Option 1** with commit `9c41123` (Add Delta Tool with LLM generation mode) as your base, unless you can locate the specific commit `d28ee0b`.