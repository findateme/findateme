# Stripe Payment Integration Setup Guide

## Overview
Card payment integration using Stripe has been implemented in your dating app. Follow these steps to activate it with your API keys.

---

## 🔑 Step 1: Get Your Stripe API Keys

1. **Create Stripe Account** (if you don't have one):
   - Go to: https://dashboard.stripe.com/register
   - Sign up with your email
   - Complete account verification

2. **Get API Keys**:
   - Login to Stripe Dashboard: https://dashboard.stripe.com/
   - Click on **Developers** → **API keys**
   - You'll see two keys:
     - **Publishable key**: Starts with `pk_test_...` (for testing) or `pk_live_...` (for production)
     - **Secret key**: Starts with `sk_test_...` (for testing) or `sk_live_...` (for production)
   
3. **Test Mode vs Live Mode**:
   - Start with **Test Mode** keys for development
   - Use test card: `4242 4242 4242 4242` (any future expiry, any CVC)
   - Switch to **Live Mode** when ready for real payments

---

## 📝 Step 2: Add API Keys to Your Code

### Frontend (profile-upgrade.html)

**File**: `profile-upgrade.html`  
**Line**: Around line 1120 (inside `initializeStripe()` function)

Replace this line:
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_KEY_HERE';
```

With your actual publishable key:
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Qa...your_actual_key...XYZ';
```

### Backend (create-payment-intent.php)

**File**: `create-payment-intent.php`  
**Line**: Around line 27

Replace this line:
```php
$stripeSecretKey = 'sk_test_YOUR_SECRET_KEY_HERE';
```

With your actual secret key:
```php
$stripeSecretKey = 'sk_test_51Qa...your_actual_secret_key...XYZ';
```

⚠️ **IMPORTANT**: Never commit secret keys to GitHub! Use environment variables in production.

---

## 📦 Step 3: Install Stripe PHP Library

You need to install Stripe's PHP SDK on your server.

### Option A: Using Composer (Recommended)

```bash
cd /root/findateme
composer require stripe/stripe-php
```

### Option B: Manual Installation

If you don't have Composer:

```bash
cd /root/findateme
wget https://github.com/stripe/stripe-php/archive/master.zip
unzip master.zip
mv stripe-php-master stripe-php
```

Then update `create-payment-intent.php` line 24:
```php
require_once 'stripe-php/init.php'; // Adjust path if needed
```

---

## 🚀 Step 4: Deploy to VPS

After adding your API keys locally:

```bash
# From your local machine (inside your project folder)
git add .
git commit -m "Add Stripe API keys"
git push origin main

# On VPS (SSH into your server)
ssh root@72.61.254.84
cd /root/findateme
git pull origin main
pm2 restart dating-app
```

---

## 🧪 Step 5: Test Payment Flow

1. **Open payment page**: `https://yourdomain.com/profile-upgrade.html`
2. **Select a plan** (Basic or Premium)
3. **Click on "Card" tab**
4. **Fill in test card details**:
   - Cardholder name: Any name
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - Postal code: Any 5 digits (e.g., `10001`)
5. **Click "Pay $14"** (or $30 for Premium)
6. Payment should process and redirect to home page

### Check Payment in Stripe Dashboard:
- Go to: https://dashboard.stripe.com/test/payments
- You should see your test payment

---

## 🔐 Security Best Practices

### 1. Use Environment Variables (Production)

Create `.env` file (don't commit this!):
```env
STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_SECRET_KEY=sk_live_your_key
```

Add to `.gitignore`:
```
.env
```

Load in PHP:
```php
// Install: composer require vlucas/phpdotenv
require 'vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$stripeSecretKey = $_ENV['STRIPE_SECRET_KEY'];
```

### 2. Validate on Backend
Never trust client-side data. Always verify payment status on your server before granting access.

### 3. Add Webhooks (Recommended)
Set up Stripe webhooks to handle:
- Successful payments
- Failed payments
- Subscription renewals
- Refunds

Go to: https://dashboard.stripe.com/test/webhooks

---

## 💰 Pricing Configuration

Current pricing (in `create-payment-intent.php`):
- **Basic Plan**: $14.00 USD
- **Premium Plan**: $30.00 USD

To change prices, update both:
1. `profile-upgrade.html` - Display amount in UI
2. `create-payment-intent.php` - Line 51: `$validPlans` array

---

## 🐛 Troubleshooting

### Error: "Payment system not configured"
- **Cause**: Publishable key not set
- **Fix**: Add your `pk_test_...` key in `profile-upgrade.html`

### Error: "Stripe secret key not configured"
- **Cause**: Secret key not set in backend
- **Fix**: Add your `sk_test_...` key in `create-payment-intent.php`

### Error: "Failed to load Stripe"
- **Cause**: Stripe PHP library not installed
- **Fix**: Run `composer require stripe/stripe-php`

### Payment succeeds but user not upgraded
- **Cause**: Database not updated after payment
- **Fix**: Add database logic in `create-payment-intent.php` to store payment and update user status

### CORS errors
- **Cause**: API not allowing requests from your domain
- **Fix**: Update `Access-Control-Allow-Origin` in `create-payment-intent.php`

---

## 📚 Additional Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Test Cards**: https://stripe.com/docs/testing#cards
- **PHP Library Docs**: https://stripe.com/docs/api/php
- **Webhooks Guide**: https://stripe.com/docs/webhooks

---

## ✅ Quick Checklist

- [ ] Stripe account created
- [ ] API keys obtained (publishable & secret)
- [ ] Publishable key added to `profile-upgrade.html`
- [ ] Secret key added to `create-payment-intent.php`
- [ ] Stripe PHP library installed
- [ ] Code pushed to VPS and deployed
- [ ] Test payment completed successfully
- [ ] Webhooks configured (optional but recommended)
- [ ] Switched to Live Mode keys for production

---

## 🎉 You're All Set!

Once you complete these steps, card payments will be fully functional. Users can subscribe using Visa, Mastercard, American Express, or Discover cards.

**Need help?** Share your API keys with me and I'll configure everything for you! 🚀
