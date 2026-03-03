#!/bin/bash

# BurnRatePro Inspection - Deployment Script
# Target: https://burnratepro.co.nz/inspection

set -e

echo "🚀 BurnRatePro Inspection Deployment"
echo "===================================="

# Configuration
DEPLOY_USER="${DEPLOY_USER:-your_username}"
DEPLOY_HOST="${DEPLOY_HOST:-burnratepro.co.nz}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/html/inspection}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "📋 Pre-deployment checks..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please create .env with:"
    echo "  VITE_SUPABASE_URL=your_url"
    echo "  VITE_SUPABASE_ANON_KEY=your_key"
    exit 1
fi

echo -e "${GREEN}✓${NC} .env file found"

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}⚠ dist folder not found, building...${NC}"
    npm run build
else
    echo -e "${YELLOW}⚠ dist folder exists${NC}"
    read -p "Rebuild? (y/N): " rebuild
    if [[ $rebuild =~ ^[Yy]$ ]]; then
        echo "Building..."
        npm run build
    fi
fi

echo -e "${GREEN}✓${NC} Build ready"

# Create deployment package
echo ""
echo "📦 Creating deployment package..."
tar -czf burnratepro-inspection-production.tar.gz -C dist .
echo -e "${GREEN}✓${NC} Package created: burnratepro-inspection-production.tar.gz"

# Show package info
PACKAGE_SIZE=$(du -h burnratepro-inspection-production.tar.gz | cut -f1)
echo "   Size: $PACKAGE_SIZE"

echo ""
echo "🌐 Deployment target:"
echo "   User: $DEPLOY_USER"
echo "   Host: $DEPLOY_HOST"
echo "   Path: $DEPLOY_PATH"
echo "   URL:  https://$DEPLOY_HOST/inspection"

echo ""
read -p "Continue with deployment? (y/N): " confirm

if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "📤 Uploading to server..."

# Upload package
scp burnratepro-inspection-production.tar.gz $DEPLOY_USER@$DEPLOY_HOST:/tmp/

echo ""
echo "🔧 Deploying on server..."

# Deploy on server
ssh $DEPLOY_USER@$DEPLOY_HOST << 'ENDSSH'
    set -e

    # Backup existing deployment
    if [ -d "$DEPLOY_PATH" ]; then
        echo "Creating backup..."
        BACKUP_NAME="inspection_backup_$(date +%Y%m%d_%H%M%S)"
        cp -r $DEPLOY_PATH /tmp/$BACKUP_NAME
        echo "Backup created: /tmp/$BACKUP_NAME"
    fi

    # Create deployment directory if it doesn't exist
    mkdir -p $DEPLOY_PATH

    # Extract new version
    echo "Extracting files..."
    tar -xzf /tmp/burnratepro-inspection-production.tar.gz -C $DEPLOY_PATH

    # Set permissions
    echo "Setting permissions..."
    chmod -R 755 $DEPLOY_PATH

    # Cleanup
    rm /tmp/burnratepro-inspection-production.tar.gz

    echo "✓ Deployment complete"
ENDSSH

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo "🔍 Verification steps:"
echo "   1. Visit: https://$DEPLOY_HOST/inspection"
echo "   2. Check login page loads"
echo "   3. Test authentication"
echo "   4. Test project creation"
echo "   5. Test loading schedule upload"
echo ""
echo "📊 Monitor logs:"
echo "   ssh $DEPLOY_USER@$DEPLOY_HOST 'tail -f /var/log/apache2/access.log'"
echo ""
echo "🔄 Rollback if needed:"
echo "   ssh $DEPLOY_USER@$DEPLOY_HOST"
echo "   cd /tmp && ls -lt | grep inspection_backup | head -1"
echo "   cp -r inspection_backup_YYYYMMDD_HHMMSS $DEPLOY_PATH"
echo ""

# Cleanup local package
read -p "Delete local deployment package? (y/N): " cleanup
if [[ $cleanup =~ ^[Yy]$ ]]; then
    rm burnratepro-inspection-production.tar.gz
    echo "Package deleted"
fi

echo ""
echo "🎉 All done!"
