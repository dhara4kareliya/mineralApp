<?php
/**
 * Biz1 API Gateway & Encryption Proxy
 *
 * Decrypts encrypted 'data' parameter from frontend, validates payload,
 * proxies API calls to remote target endpoints, and returns JSON responses.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Secret cipher keys (matching frontend encryption)
$SECRET_KEYS = [
    "BIZ1_APP_SECRET_KEY_2026",
    "BIZ1_ORDER_STATUS_APP_SECRET"
];

function decryptPayload($enc, $secretKeys) {
    if (empty($enc)) return null;
    $b64 = str_replace(array('-', '_'), array('+', '/'), trim($enc));
    while (strlen($b64) % 4) {
        $b64 .= '=';
    }
    $raw = base64_decode($b64, true);
    if ($raw === false || strlen($raw) === 0) return null;

    foreach ($secretKeys as $key) {
        $keyLen = strlen($key);
        if ($keyLen === 0) continue;
        
        $jsonBytes = '';
        for ($i = 0; $i < strlen($raw); $i++) {
            $jsonBytes .= chr(ord($raw[$i]) ^ ord($key[$i % $keyLen]));
        }

        $parsed = json_decode($jsonBytes, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($parsed)) {
            return $parsed;
        }

        // Try rawurldecode fallback if encoded
        $utf8Decoded = rawurldecode($jsonBytes);
        if ($utf8Decoded) {
            $parsedUtf8 = json_decode($utf8Decoded, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($parsedUtf8)) {
                return $parsedUtf8;
            }
        }
    }

    // Try plain un-XORed base64 JSON as fallback
    $plainJson = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($plainJson)) {
        return $plainJson;
    }

    return null;
}

// Read input parameter: 'data' or 'payload' or raw POST body
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
        'success' => false,
        'ok' => false,
        'error' => 'Missing encrypted data parameter.',
        'message' => 'Missing encrypted data parameter.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$payload = decryptPayload($encData, $SECRET_KEYS);

if ($payload === null) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'ok' => false,
        'error' => 'Invalid or corrupted encrypted data. Decryption failed.',
        'message' => 'Invalid or corrupted encrypted data. Decryption failed.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Extract request parameters from decrypted payload
$targetUrl = isset($payload['target_url']) ? $payload['target_url'] : (isset($payload['url']) ? $payload['url'] : '');
$method = strtoupper(isset($payload['method']) ? $payload['method'] : 'POST');
$params = isset($payload['params']) ? $payload['params'] : (isset($payload['data']) ? $payload['data'] : []);
$headers = isset($payload['headers']) ? $payload['headers'] : [];

// Handle shortcut actions
$action = isset($payload['action']) ? $payload['action'] : '';
if ($action === 'get_order') {
    $user = isset($params['user']) ? $params['user'] : 'info';
    $apiToken = isset($params['api_token']) ? $params['api_token'] : '';
    $orderId = isset($params['order_id']) ? $params['order_id'] : '';
    $targetUrl = "https://" . $user . ".biz1.co.il/api/get_order?api_token=" . urlencode($apiToken) . "&order_id=" . urlencode($orderId);
    $method = 'GET';
} else if ($action === 'update_order') {
    $user = isset($params['user']) ? $params['user'] : 'info';
    $apiToken = isset($params['api_token']) ? $params['api_token'] : '';
    $orderId = isset($params['order_id']) ? $params['order_id'] : '';
    $statusName = isset($params['order-cf-status']) ? $params['order-cf-status'] : (isset($params['status']) ? $params['status'] : '');
    $targetUrl = "https://" . $user . ".bull36.com/api.php?api_token=" . urlencode($apiToken) . "&api=update_order_2&order_id=" . urlencode($orderId) . "&order-cf-status=" . urlencode($statusName);
    $method = 'POST';
}

if (empty($targetUrl)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'ok' => false,
        'error' => 'Decrypted payload missing target_url or valid action.',
        'message' => 'Decrypted payload missing target_url or valid action.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Perform cURL request to remote API
$ch = curl_init();
if ($method === 'GET' && !empty($params)) {
    $queryString = http_build_query($params);
    $targetUrl .= (strpos($targetUrl, '?') !== false ? '&' : '?') . $queryString;
}

curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$curlHeaders = [];
if (is_array($headers)) {
    foreach ($headers as $k => $v) {
        if (is_numeric($k)) {
            $curlHeaders[] = $v;
        } else {
            $curlHeaders[] = $k . ': ' . $v;
        }
    }
}

if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    if (is_array($params)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    } else {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
    }
}

if (!empty($curlHeaders)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $curlHeaders);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'ok' => false,
        'error' => 'cURL error: ' . $curlErr,
        'message' => 'cURL error: ' . $curlErr
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code($httpCode ? $httpCode : 200);
echo $response;
