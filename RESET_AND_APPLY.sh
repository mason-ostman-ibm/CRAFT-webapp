#!/bin/bash
# Script to reset to your last good commit and apply microservice changes
# Run this from CRAFT_web_app/excel-ai-processor directory

set -e  # Exit on error

echo "=========================================="
echo "CRAFT Microservice Migration - Git Reset"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Target commit (your last good merge)
TARGET_COMMIT="d28ee0b3dccc5f97bffeae3edfd8727657cd6b32"

echo -e "${YELLOW}Step 1: Checking current status...${NC}"
git status

echo ""
echo -e "${YELLOW}Step 2: Stashing current changes (microservice migration)...${NC}"
git stash save "Microservice migration - Python extracted to Code Engine"

echo ""
echo -e "${GREEN}✓ Changes stashed${NC}"
git stash list | head -1

echo ""
echo -e "${YELLOW}Step 3: Creating new branch from your last good commit...${NC}"
echo "Target commit: $TARGET_COMMIT"
echo "Commit message: $(git log --oneline -1 $TARGET_COMMIT)"

# Create new branch
BRANCH_NAME="feature/microservice-architecture"
git checkout -b $BRANCH_NAME $TARGET_COMMIT

echo ""
echo -e "${GREEN}✓ Created and checked out branch: $BRANCH_NAME${NC}"

echo ""
echo -e "${YELLOW}Step 4: Applying your microservice migration changes...${NC}"
git stash pop

echo ""
echo -e "${GREEN}✓ Changes applied${NC}"

echo ""
echo -e "${YELLOW}Step 5: Reviewing changes...${NC}"
git status

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Reset Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review the changes: git diff"
echo "2. Stage all changes: git add -A"
echo "3. Commit with message:"
echo "   git commit -m 'refactor: Extract Python microservice to Code Engine deployment'"
echo "4. Push to GitHub: git push -u origin $BRANCH_NAME"
echo ""
echo "Or run the companion script: ./COMMIT_AND_PUSH.sh"

# Made with Bob
