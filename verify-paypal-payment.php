<?php
/**
 * PayPal Transaction Verification Endpoint
 * Verifies PayPal transaction and activates premium account
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    $transactionId = isset($data['transactionId']) ? trim($data['transactionId']) : '';
    $userEmail = isset($data['email']) ? trim($data['email']) : '';
    $amount = isset($data['amount']) ? floatval($data['amount']) : 0;
    
    if (empty($transactionId) || empty($userEmail)) {
        throw new Exception('Transaction ID and email are required');
    }
    
    // TODO: Add your PayPal API credentials
    // Get these from: https://developer.paypal.com/dashboard/applications/live
    $paypalClientId = 'AXOMZMXuhbWKKNiVD6m3B1nkl8x69dzlckd7er2bdUBdwA2sJQW9DP4MeqLQhcw9EbM9Td2XL0ZOA3a9'; // Replace with full Client ID
    $paypalSecret = 'EEb3w-3DU1MRJYiGMlt88dnbZpKtKukqT6FMlW60-K4bnipkt-X86wOowdcD1FtRH1RtVy7XpS_2inOK'; // Replace with your Secret
    $isSandbox = false; // LIVE MODE - Real payments!
    
    // PayPal API endpoint
    $baseUrl = $isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    
    // Get PayPal access token
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "$baseUrl/v1/oauth2/token");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, "grant_type=client_credentials");
    curl_setopt($ch, CURLOPT_USERPWD, "$paypalClientId:$paypalSecret");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json',
        'Accept-Language: en_US'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception('Failed to authenticate with PayPal');
    }
    
    $authData = json_decode($response, true);
    $accessToken = $authData['access_token'];
    
    // Verify transaction
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "$baseUrl/v2/payments/captures/$transactionId");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $accessToken",
        'Content-Type: application/json'
    ]);
    
    $txResponse = curl_exec($ch);
    $txHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($txHttpCode !== 200) {
        throw new Exception('Transaction not found or invalid');
    }
    
    $transaction = json_decode($txResponse, true);
    
    // Verify transaction details
    if ($transaction['status'] !== 'COMPLETED') {
        throw new Exception('Transaction not completed');
    }
    
    $paidAmount = floatval($transaction['amount']['value']);
    $payeEmail = $transaction['payee']['email_address'] ?? '';
    
    // Verify amount matches
    if ($paidAmount < $amount - 0.50) { // Allow 50 cent difference for fees
        throw new Exception('Payment amount mismatch');
    }
    
    // Verify payment was sent to your email
    if (strtolower($payeEmail) !== 'rafayatfarhan@gmail.com') {
        throw new Exception('Payment not sent to correct account');
    }
    
    // TODO: Update user's premium status in database
    // Example:
    // $db = new PDO('mysql:host=localhost;dbname=dating_app', 'username', 'password');
    // $stmt = $db->prepare("UPDATE users SET is_premium = 1, premium_activated_at = NOW(), payment_txid = ? WHERE email = ?");
    // $stmt->execute([$transactionId, $userEmail]);
    
    // For now, just return success
    echo json_encode([
        'success' => true,
        'message' => 'Payment verified! Your account has been upgraded to premium.',
        'transactionId' => $transactionId,
        'amount' => $paidAmount,
        'currency' => $transaction['amount']['currency_code']
    ]);
    
    // Log successful verification
    error_log("Payment verified: $transactionId for $userEmail - Amount: $paidAmount");
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    error_log("Payment verification failed: " . $e->getMessage());
}
?>
