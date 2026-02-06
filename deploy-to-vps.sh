#!/bin/bash

# VPS Deployment Script
# This script will help you deploy the latest changes to your VPS

echo "🚀 Deploying to VPS..."
echo ""

# VPS Details
VPS_IP="72.61.254.84"
VPS_USER="root"  # or try "rv1319094" if root doesn't work
PROJECT_PATH="/root/findateme"

echo "📦 Connecting to VPS: $VPS_USER@$VPS_IP"
echo ""

# Connect to VPS and deploy
ssh $VPS_USER@$VPS_IP << 'ENDSSH'
    echo "✅ Connected to VPS"
    
    # Navigate to project directory
    cd /root/findateme || { echo "❌ Project directory not found"; exit 1; }
    echo "📂 In project directory: $(pwd)"
    
    # Pull latest changes
    echo "⬇️  Pulling latest changes from GitHub..."
    git pull origin main
    
    # Check if Composer exists
    if command -v composer &> /dev/null; then
        echo "📦 Installing Stripe PHP library via Composer..."
        composer require stripe/stripe-php
    else
        echo "⚠️  Composer not found. Installing Stripe PHP library manually..."
        
        # Manual Stripe PHP installation
        if [ ! -d "stripe-php" ]; then
            wget https://github.com/stripe/stripe-php/archive/refs/heads/master.zip -O stripe-php.zip
            unzip -q stripe-php.zip
            mv stripe-php-master stripe-php
            rm stripe-php.zip
            echo "✅ Stripe PHP library installed"
        else
            echo "✅ Stripe PHP library already exists"
        fi
    fi
    
    # Set proper permissions
    echo "🔒 Setting permissions..."
    chmod -R 755 .
    find . -type f -name "*.php" -exec chmod 644 {} \;
    
    # Restart PM2
    echo "🔄 Restarting PM2 application..."
    pm2 restart dating-app
    
    # Show PM2 status
    echo ""
    echo "📊 PM2 Status:"
    pm2 status
    
    echo ""
    echo "✅ Deployment complete!"
    
ENDSSH

echo ""
echo "🎉 Deployment finished!"
echo ""
echo "⚠️  Remember to add your Stripe API keys:"
echo "   1. Edit create-payment-intent.php (line 27)"
echo "   2. Edit profile-upgrade.html (line ~1120)"
echo ""
echo "🧪 Test payment at: https://yourdomain.com/profile-upgrade.html"
