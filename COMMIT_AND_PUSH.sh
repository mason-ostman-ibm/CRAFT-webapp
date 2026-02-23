#!/bin/bash
# Script to commit and push microservice migration changes
# Run this AFTER RESET_AND_APPLY.sh

set -e  # Exit on error

echo "=========================================="
echo "CRAFT Microservice Migration - Commit"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BRANCH_NAME="feature/microservice-architecture"

echo -e "${YELLOW}Current branch:${NC}"
git branch --show-current

echo ""
echo -e "${YELLOW}Step 1: Staging all changes...${NC}"
git add -A

echo ""
echo -e "${GREEN}✓ Changes staged${NC}"

echo ""
echo -e "${YELLOW}Step 2: Creating commit...${NC}"

# Commit with detailed message
git commit -m "refactor: Extract Python microservice to Code Engine deployment

BREAKING CHANGE: Python microservice removed from webapp container

This commit extracts the Python microservice from the monolithic webapp
and configures it to use the separately deployed Code Engine service.

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
- Add GIT_STRATEGY.md: Git workflow guide
- Update README.md: Reflect microservices architecture

Python Microservice:
- Now deployed separately on IBM Code Engine
- URL: https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud
- Handles document processing and Delta Tool functionality
- See CRAFT-python-microservice/README.md for deployment details

Benefits:
- Independent scaling of Python service based on processing load
- Smaller webapp container (~60% size reduction without Python)
- Compatible with OpenShift cron job deployment
- Clear separation of concerns (UI/API vs AI processing)
- Independent deployment cycles for each service

Architecture:
  OpenShift/DINERO (React + Node.js)
         ↓ HTTPS/REST
  IBM Code Engine (Python Flask)

Migration Details: See MICROSERVICE_MIGRATION.md
Deployment Guide: See DEPLOYMENT_GUIDE.md

Resolves: Monolithic deployment issues with OpenShift cron job
Enables: Microservices architecture for better scalability"

echo ""
echo -e "${GREEN}✓ Commit created${NC}"

echo ""
echo -e "${YELLOW}Step 3: Pushing to GitHub...${NC}"
git push -u origin $BRANCH_NAME

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Push Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Go to GitHub: https://github.com/content-studio-sandbox/excel-ai-processor"
echo "2. You should see a banner to create a Pull Request"
echo "3. Click 'Compare & pull request'"
echo "4. Review the changes and create the PR"
echo "5. Request review from your coworker"
echo "6. Merge when approved"
echo ""
echo "Your coworker can then deploy using the OpenShift cron job!"

# Made with Bob
