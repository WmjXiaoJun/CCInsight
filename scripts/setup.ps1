#!/usr/bin/env pwsh
# CCInsight Setup Script (Windows PowerShell)
# Automatically sets up the CCInsight development environment

$ErrorActionPreference = "Stop"

$PROJECT_ROOT = $PSScriptRoot | Split-Path
Set-Location $PROJECT_ROOT

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CCInsight Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js is not installed." -ForegroundColor Red
    Write-Host "Please install Node.js >= 20.0.0 from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green

# Check npm version
$npmVersion = npm --version 2>$null
Write-Host "  npm: $npmVersion" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "[2/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed." -ForegroundColor Red
    exit 1
}
Write-Host "  Dependencies installed." -ForegroundColor Green

# Build shared package first
Write-Host ""
Write-Host "[3/5] Building shared package..." -ForegroundColor Yellow
npm run build --workspace=ccinsight-shared
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to build ccinsight-shared." -ForegroundColor Red
    exit 1
}
Write-Host "  Shared package built." -ForegroundColor Green

# Build backend
Write-Host ""
Write-Host "[4/5] Building backend..." -ForegroundColor Yellow
npm run build --workspace=ccinsight-core
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to build backend." -ForegroundColor Red
    exit 1
}
Write-Host "  Backend built." -ForegroundColor Green

# Build frontend
Write-Host ""
Write-Host "[5/5] Building frontend..." -ForegroundColor Yellow
npm run build --workspace=ccinsight-web
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to build frontend." -ForegroundColor Red
    exit 1
}
Write-Host "  Frontend built." -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the development servers:" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 1 - Backend:" -ForegroundColor Yellow
Write-Host "    npm run dev:backend" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 2 - Frontend:" -ForegroundColor Yellow
Write-Host "    npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then open http://localhost:5173 in your browser." -ForegroundColor White
Write-Host ""
