<?php
/**
 * Stripe Payment Intent Creation Endpoint
 * Creates a payment intent for processing card payments via Stripe
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Load Stripe PHP library
    require_once 'stripe-php/init.php'; // You'll need to install Stripe PHP SDK
    
    // TODO: Replace with your actual Stripe secret key
    // Get this from: https://dashboard.stripe.com/apikeys
    $stripeSecretKey = 'sk_test_YOUR_SECRET_KEY_HERE';
    
    if (!$stripeSecretKey || $stripeSecretKey === 'sk_test_YOUR_SECRET_KEY_HERE') {
        throw new Exception('Stripe secret key not configured');
    }
    
    \Stripe\Stripe::setApiKey($stripeSecretKey);
    
    // Get request data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Invalid request data');
    }
    
    $amount = isset($data['amount']) ? intval($data['amount']) : 0;
    $plan = isset($data['plan']) ? $data['plan'] : 'basic';
    $email = isset($data['email']) ? $data['email'] : '';
    
    // Validate amount
    if ($amount <= 0) {
        throw new Exception('Invalid amount');
    }
    
    // Validate plan
    $validPlans = ['basic' => 1400, 'premium' => 3000]; // Amounts in cents
    if (!isset($validPlans[$plan]) || $validPlans[$plan] !== $amount) {
        throw new Exception('Invalid plan or amount mismatch');
    }
    
    // Create payment intent
    $paymentIntent = \Stripe\PaymentIntent::create([
        'amount' => $amount,
        'currency' => 'usd',
        'description' => ucfirst($plan) . ' Plan Subscription',
        'receipt_email' => $email,
        'metadata' => [
            'plan' => $plan,
            'email' => $email,
            'timestamp' => time()
        ],
        'automatic_payment_methods' => [
            'enabled' => true,
        ],
    ]);
    
    // Log payment intent creation (optional)
    error_log("Payment Intent Created: " . $paymentIntent->id . " for " . $email);
    
    // Return client secret to frontend
    echo json_encode([
        'clientSecret' => $paymentIntent->client_secret,
        'paymentIntentId' => $paymentIntent->id
    ]);
    
} catch (\Stripe\Exception\ApiErrorException $e) {
    http_response_code(400);
    echo json_encode(['error' => 'Stripe API error: ' . $e->getMessage()]);
    error_log("Stripe API Error: " . $e->getMessage());
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    error_log("Payment Intent Error: " . $e->getMessage());
}
?>
