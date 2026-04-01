#!/usr/bin/env bash
# CCInsight Setup Script (Linux/macOS)
# Automatically sets up the CCInsight development environment

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "============================================"
echo "  CCInsight Setup"
echo "============================================"
echo ""

# Check Node.js version
echo "[1/5] Checking Node.js..."
NODE_VERSION=$(node --version)
if [ -z "$NODE_VERSION" ]; then
    echo "ERROR: Node.js is not installed."
    echo "Please install Node.js >= 20.0.0 from https://nodejs.org"
    exit 1
fi
echo "  Node.js: $NODE_VERSION"

NPM_VERSION=$(npm --version)
echo "  npm: $NPM_VERSION"

# Install dependencies
echo ""
echo "[2/5] Installing dependencies..."
npm install

# Build shared package first
echo ""
echo "[3/5] Building shared package..."
npm run build --workspace=ccinsight-shared

# Build backend
echo ""
echo "[4/5] Building backend..."
npm run build --workspace=ccinsight-core

# Build frontend
echo ""
echo "[5/5] Building frontend..."
npm run build --workspace=ccinsight-web

echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "To start the development servers:"
echo ""
echo "  Terminal 1 - Backend:"
echo "    npm run dev:backend"
echo ""
echo "  Terminal 2 - Frontend:"
echo "    npm run dev"
echo ""
echo "Then open http://localhost:5173 in your browser."
echo ""
