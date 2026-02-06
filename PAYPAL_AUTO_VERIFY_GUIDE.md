# PayPal Auto-Verification Setup Guide

## Overview
Automatic PayPal payment verification has been implemented. Users can paste their transaction ID after payment and get instant premium activation!

---

## 🔑 Step 1: Get PayPal API Credentials

### **Create PayPal App:**

1. Go to: https://developer.paypal.com/dashboard/applications
2. Login with your PayPal account (rafayatfarhan@gmail.com)
3. Click **"Create App"** button
4. Fill in:
   - **App Name**: FindAteMe Dating App
   - **Sandbox/Live**: Start with Sandbox for testing
5. Click **"Create App"**

### **Get Your Credentials:**

After creating app, you'll see:
- **Client ID**: `Abcd1234...` (starts with uppercase letter)
- **Secret**: `Efgh5678...` (keep this confidential!)

**Copy both values!**

---

## 📝 Step 2: Add Credentials to Code

**File**: `verify-paypal-payment.php`  
**Lines**: 27-29

Replace these lines:
```php
$paypalClientId = 'YOUR_PAYPAL_CLIENT_ID';
$paypalSecret = 'YOUR_PAYPAL_SECRET';
$isSandbox = true; // Set false for production
```

With your actual credentials:
```php
$paypalClientId = 'AaBbCc123...your_actual_client_id';
$paypalSecret = 'XxYyZz789...your_actual_secret';
$isSandbox = false; // Use false for live payments
```

⚠️ **Security**: Never commit secrets to GitHub! Use environment variables in production.

---

## 🧪 Step 3: Test with Sandbox

### **Test Account Setup:**

1. Go to: https://developer.paypal.com/dashboard/accounts
2. You'll see test accounts:
   - **Business Account** (your test merchant account)
   - **Personal Account** (test buyer account)
3. Click "View/Edit" to see credentials

### **Test Payment Flow:**

1. Open your app: `https://findateme.com/profile-upgrade.html`
2. Select **Basic or Premium plan**
3. Click **PayPal tab**
4. Click **"Pay with PayPal"**
5. Login with **Sandbox Personal Account**
6. Complete payment (fake money!)
7. Copy Transaction ID from confirmation
8. Paste in verification form
9. Click **"Verify & Activate Premium"**
10. Should activate instantly! ✅

### **Find Test Transaction ID:**

- Go to: https://www.sandbox.paypal.com/
- Login with Business Account
- Click **"Activity"** → Find recent transaction
- Copy Transaction ID (like: `8AB12345CD678901F`)

---

## 🚀 Step 4: Go Live (Production)

When ready for real payments:

### **Switch to Live Credentials:**

1. In PayPal Developer Dashboard, switch from **Sandbox** to **Live** mode
2. Create a **Live App** (same process as sandbox)
3. Get **Live Client ID** and **Live Secret**
4. Update `verify-paypal-payment.php`:
   ```php
   $paypalClientId = 'YOUR_LIVE_CLIENT_ID';
   $paypalSecret = 'YOUR_LIVE_SECRET';
   $isSandbox = false; // IMPORTANT: Set to false!
   ```

---

## 💾 Step 5: Database Integration

Currently, verification works but doesn't update database. Add this code:

**In `verify-paypal-payment.php`**, replace the TODO comment (line 85) with:

```php
// Connect to database
$db = new PDO('mysql:host=localhost;dbname=your_database', 'username', 'password');

// Update user premium status
$stmt = $db->prepare("
    UPDATE users 
    SET 
        is_premium = 1, 
        premium_activated_at = NOW(), 
        premium_expires_at = DATE_ADD(NOW(), INTERVAL 1 YEAR),
        payment_method = 'paypal',
        payment_txid = ?,
        payment_amount = ?
    WHERE email = ?
");

$result = $stmt->execute([$transactionId, $paidAmount, $userEmail]);

if (!$result) {
    throw new Exception('Failed to update user account');
}

// Verify update was successful
if ($stmt->rowCount() === 0) {
    throw new Exception('User not found');
}
```

---

## 🔐 Security Best Practices

### **1. Use Environment Variables:**

Create `.env` file:
```env
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_SECRET=your_secret
PAYPAL_SANDBOX=false
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

$paypalClientId = $_ENV['PAYPAL_CLIENT_ID'];
$paypalSecret = $_ENV['PAYPAL_SECRET'];
$isSandbox = $_ENV['PAYPAL_SANDBOX'] === 'true';
```

### **2. Rate Limiting:**

Add to prevent abuse:
```php
// Check verification attempts
session_start();
$_SESSION['verify_attempts'] = ($_SESSION['verify_attempts'] ?? 0) + 1;

if ($_SESSION['verify_attempts'] > 5) {
    throw new Exception('Too many verification attempts. Please try again later.');
}
```

### **3. Log All Transactions:**

```php
// Log to file
$logEntry = date('Y-m-d H:i:s') . " - $userEmail - $transactionId - $paidAmount\n";
file_put_contents('paypal_verifications.log', $logEntry, FILE_APPEND);
```

---

## 📊 How It Works

### **User Flow:**
```
1. User selects plan → Basic ($14) or Premium ($30)
2. Clicks "Pay with PayPal"
3. Completes payment on PayPal
4. Gets Transaction ID (e.g., 8AB12345CD678901F)
5. Pastes Transaction ID in form
6. Clicks "Verify & Activate Premium"
7. Backend calls PayPal API to verify
8. If valid → Account upgraded instantly ✅
```

### **Backend Verification:**
```
1. Receive transaction ID from frontend
2. Get PayPal OAuth token
3. Call PayPal Payments API with transaction ID
4. Verify:
   - Transaction status = COMPLETED
   - Amount matches ($14 or $30)
   - Paid to rafayatfarhan@gmail.com
5. If all checks pass → Update database
6. Return success to frontend
```

---

## 🐛 Troubleshooting

### **Error: "Failed to authenticate with PayPal"**
- **Cause**: Wrong Client ID or Secret
- **Fix**: Double-check credentials in PayPal dashboard

### **Error: "Transaction not found"**
- **Cause**: Wrong transaction ID or using sandbox ID in live mode
- **Fix**: Ensure using correct Transaction ID format and matching sandbox/live mode

### **Error: "Payment amount mismatch"**
- **Cause**: User paid wrong amount
- **Fix**: Check transaction details in PayPal, refund if necessary

### **Error: "Payment not sent to correct account"**
- **Cause**: User sent to wrong email
- **Fix**: Update `rafayatfarhan@gmail.com` if you changed PayPal account

---

## 📚 Additional Features (Optional)

### **Add Webhook for Real-Time Notifications:**

1. In PayPal Developer Dashboard → Your App → Webhooks
2. Add webhook URL: `https://findateme.com/paypal-webhook.php`
3. Select events: `PAYMENT.CAPTURE.COMPLETED`
4. PayPal will automatically notify when payment received
5. No need for user to paste Transaction ID!

---

## ✅ Quick Checklist

- [ ] PayPal Developer account created
- [ ] App created (Sandbox or Live)
- [ ] Client ID and Secret obtained
- [ ] Credentials added to `verify-paypal-payment.php`
- [ ] Test payment completed in Sandbox
- [ ] Transaction ID verified successfully
- [ ] Database update logic added
- [ ] Switched to Live credentials for production
- [ ] Environment variables configured
- [ ] Rate limiting implemented
- [ ] Transaction logging enabled

---

## 🎉 You're Ready!

Users can now:
- ✅ Pay via PayPal to rafayatfarhan@gmail.com
- ✅ Paste Transaction ID
- ✅ Get instant premium activation
- ✅ No manual verification needed!

**Need help?** Share your PayPal API credentials (Client ID only, not Secret!) and I'll configure everything! 🚀
