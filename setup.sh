#!/bin/bash

# ============================================================================
# Excel AI Processor - Setup Script
# ============================================================================
# This script sets up the development environment for the Excel AI Processor
# Run this after cloning the repository: ./setup.sh

set -e  # Exit on error

echo "=========================================="
echo "Excel AI Processor - Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION} found${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm ${NPM_VERSION} found${NC}"

# Check Python
echo ""
echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✓ ${PYTHON_VERSION} found${NC}"

# Check pip
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}❌ pip3 is not installed${NC}"
    exit 1
fi
PIP_VERSION=$(pip3 --version)
echo -e "${GREEN}✓ pip3 found${NC}"

echo ""
echo "=========================================="
echo "Installing Dependencies"
echo "=========================================="

# Install Node.js dependencies
echo ""
echo "Installing Node.js dependencies..."
npm install
echo -e "${GREEN}✓ Node.js dependencies installed${NC}"

# Setup Python virtual environment
echo ""
echo "Setting up Python virtual environment..."
cd api/python-service

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${YELLOW}⚠ Virtual environment already exists${NC}"
fi

# Activate virtual environment and install dependencies
echo "Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
echo -e "${GREEN}✓ Python dependencies installed${NC}"

cd ../..

# Setup environment files
echo ""
echo "=========================================="
echo "Setting up Environment Files"
echo "=========================================="

if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠ Please edit .env and add your API keys${NC}"
else
    echo -e "${YELLOW}⚠ .env file already exists${NC}"
fi

if [ ! -f "api/python-service/.env" ]; then
    echo "Creating Python service .env file from template..."
    cp api/python-service/.env.example api/python-service/.env
    echo -e "${GREEN}✓ Python service .env file created${NC}"
    echo -e "${YELLOW}⚠ Please edit api/python-service/.env and add your API keys${NC}"
else
    echo -e "${YELLOW}⚠ Python service .env file already exists${NC}"
fi

# Create uploads directory
echo ""
echo "Creating uploads directory..."
mkdir -p uploads
echo -e "${GREEN}✓ Uploads directory created${NC}"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env and add your IBM WatsonX.ai credentials"
echo "2. Edit api/python-service/.env with the same credentials"
echo "3. (Optional) Add AstraDB credentials for RAG/Delta features"
echo "4. Run 'npm run dev:all' to start the application"
echo ""
echo "For more information, see README.md"
echo ""