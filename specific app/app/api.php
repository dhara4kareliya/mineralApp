<?php
/**
 * Chasdey Shlomo API Gateway & Encryption Proxy (api.php)
 *
 * Receives encrypted request payload from frontend, decrypts it,
 * proxies API calls to bull36.com, and returns JSON response.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$CIPHER_KEY = "CHASDEY_SHLOMO_APP_SECRET_2026";
$API_BASE_URL = "https://bull36.com/api";
$API_TOKEN = "58CZS49DFHNN4KD24933";

/**
 * Decrypt XOR+Base64 encrypted payload
 */
function decryptPayload($enc, $key) {
    if (empty($enc)) return null;
    $b64 = str_replace(array('-', '_'), array('+', '/'), trim($enc));
    while (strlen($b64) % 4) {
        $b64 .= '=';
    }
    $raw = base64_decode($b64, true);
    if ($raw === false || strlen($raw) === 0) return null;

    $keyLen = strlen($key);
    $jsonBytes = '';
    for ($i = 0; $i < strlen($raw); $i++) {
        $jsonBytes .= chr(ord($raw[$i]) ^ ord($key[$i % $keyLen]));
    }

    $parsed = json_decode($jsonBytes, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($parsed)) {
        return $parsed;
    }

    $utf8Decoded = rawurldecode($jsonBytes);
    if ($utf8Decoded) {
        $parsedUtf8 = json_decode($utf8Decoded, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($parsedUtf8)) {
            return $parsedUtf8;
        }
    }

    // Fallback: try raw un-XORed base64 JSON
    $plain = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($plain)) {
        return $plain;
    }

    return null;
}

// 1. Read encrypted input parameter
$encData = isset($_POST['data']) ? $_POST['data'] : (isset($_POST['payload']) ? $_POST['payload'] : (isset($_GET['data']) ? $_GET['data'] : ''));

if (empty($encData)) {
    $rawBody = file_get_contents('php://input');
    if (!empty($rawBody)) {
        $jsonInput = json_decode($rawBody, true);
        if (is_array($jsonInput)) {
            $encData = isset($jsonInput['data']) ? $jsonInput['data'] : (isset($jsonInput['payload']) ? $jsonInput['payload'] : '');
        } else {
            $encData = trim($rawBody);
        }
    }
}

if (empty($encData)) {
    http_response_code(400);
    echo json_encode([
        'success' => 0,
        'error' => 'Missing encrypted data payload.',
        'message' => 'Missing encrypted data payload.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 2. Decrypt the payload
$payload = decryptPayload($encData, $CIPHER_KEY);

if ($payload === null) {
    http_response_code(400);
    echo json_encode([
        'success' => 0,
        'error' => 'Decryption failed or corrupted payload.',
        'message' => 'Decryption failed or corrupted payload.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 3. Resolve target action / URL
$action = isset($payload['action']) ? $payload['action'] : '';
$params = isset($payload['params']) ? $payload['params'] : [];
$targetUrl = isset($payload['target_url']) ? $payload['target_url'] : '';

if ($action === 'get_folder_by_id' || $action === 'get_customers') {
    $folderId = isset($params['folder_id']) ? $params['folder_id'] : '3122';
    $targetUrl = $API_BASE_URL . "/get_folder_by_id?token=" . urlencode($API_TOKEN) . "&folder_id=" . urlencode($folderId);
} else if ($action === 'get_entries' || $action === 'get_tabs') {
    $targetUrl = $API_BASE_URL . "/get_entries?token=" . urlencode($API_TOKEN);
} else if ($action === 'get_folders') {
    $targetUrl = $API_BASE_URL . "/get_folders?api_token=" . urlencode($API_TOKEN);
} else if ($action === 'get_entries_by_tab_id' || $action === 'get_customer_entries') {
    $tabId = isset($params['entry_id']) ? $params['entry_id'] : (isset($params['tab_id']) ? $params['tab_id'] : '');
    $customerId = isset($params['customer_id']) ? $params['customer_id'] : '';
    $targetUrl = $API_BASE_URL . "/get_entries_by_tab_id?token=" . urlencode($API_TOKEN) . "&entry_id=" . urlencode($tabId) . "&customer_id=" . urlencode($customerId);
}

if (empty($targetUrl)) {
    http_response_code(400);
    echo json_encode([
        'success' => 0,
        'error' => 'Missing valid action or target URL in decrypted payload.',
        'message' => 'Missing valid action or target URL.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 4. Perform the remote API request. Use cURL when available, with a stream
// fallback for PHP installations that do not have the cURL extension enabled.
$response = false;
$httpCode = 0;
$requestError = '';

if (function_exists('curl_init')) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $requestError = curl_error($ch);
    curl_close($ch);
} else {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 30,
            'ignore_errors' => true,
            'header' => "Accept: application/json\r\n"
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ]);
    $response = @file_get_contents($targetUrl, false, $context);
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $httpCode = (int)$m[1];
    }
    if ($response === false) $requestError = 'PHP HTTP stream request failed.';
}

if ($response === false || $requestError) {
    http_response_code(502);
    echo json_encode([
        'success' => 0,
        'error' => 'Proxy request failed: ' . $requestError,
        'message' => 'Proxy request failed: ' . $requestError
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code($httpCode ? $httpCode : 200);
echo $response;
