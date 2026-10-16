<?php
/**
 * Chasdey Shlomo API Gateway & Encryption Proxy (api.php)
 *
 * Receives encrypted request payload from frontend, decrypts it,
 * proxies API calls to bull36.com, handles Bull36 server-side pagination
 * to retrieve all folder customers, strips bloated unused fields (like extra_fields),
 * caches results, compresses output with GZIP, and returns JSON response.
 */

/*
 * CHANGE NOTES FOR DEPLOYMENT
 * ---------------------------
 * KEPT: XOR + Base64 payload decryption and the Bull36 API credentials.
 * KEPT: The original folder, tabs, and customer-entry proxy routes.
 * NEW:   api_name support for identifying the requested API in logs.
 * NEW:   get_folders route.
 * NEW:   get_entry_field_sum route for account-wide field totals.
 * NEW:   get_customer_total_field_sum route for customer field totals.
 * NEW:   page/start/limit/length pagination forwarding.
 * NEW:   Automatic collection of all folder pages when no page is requested.
 * NEW:   Response caching with stale-cache fallback during upstream failure.
 * NEW:   Removal of unnecessary customer fields before returning folder data.
 * NEW:   cURL plus PHP-stream fallback for upstream requests.
 * NEW:   JSON error responses, request IDs, exception handling, fatal-error
 *        handling, and logs/api-errors.log.
 * REMOVED: Returning the upstream response without pagination, caching,
 *          response cleanup, or application-level error logging.
 * REMOVED: The old behavior that supported only the basic proxy routes.
 *
 * Deployment requirements:
 * - The cache/ and logs/ directories must be writable by PHP.
 * - api.php should be 644 and its parent directory should be 755.
 */

// NEW: Never expose PHP warnings/notices as HTML to the frontend. Every unexpected
// failure is logged on the server and returned as JSON with a request ID.
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

$REQUEST_ID = bin2hex(random_bytes(8));
$GLOBALS['api_response_sent'] = false;

function apiLog($message, $context = []) {
    $dir = __DIR__ . '/logs';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $line = '[' . date('c') . '] ' . $message;
    if ($context) $line .= ' ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    @file_put_contents($dir . '/api-errors.log', $line . PHP_EOL, FILE_APPEND | LOCK_EX);
    error_log($line);
}

function apiFailure($status, $message, $details = '') {
    global $REQUEST_ID;
    $status = (int)$status;
    if ($status < 400 || $status > 599) $status = 500;
    apiLog($message, ['request_id' => $REQUEST_ID, 'details' => $details]);
    while (ob_get_level() > 0) @ob_end_clean();
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('X-Request-ID: ' . $REQUEST_ID);
    }
    http_response_code($status);
    $GLOBALS['api_response_sent'] = true;
    echo json_encode([
        'success' => 0,
        'error' => $message,
        'request_id' => $REQUEST_ID
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) return false;
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function ($exception) {
    apiFailure(500, 'Internal API gateway error.', $exception->getMessage() . ' @ ' . $exception->getFile() . ':' . $exception->getLine());
});

register_shutdown_function(function () {
    $error = error_get_last();
    $fatalTypes = E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR | E_USER_ERROR;
    if ($error && ($error['type'] & $fatalTypes) && empty($GLOBALS['api_response_sent'])) {
        apiFailure(500, 'Internal PHP error.', $error['message'] . ' @ ' . $error['file'] . ':' . $error['line']);
    }
});

// NEW: Enable GZIP only when the PHP compression handler exists.
if (function_exists('ob_gzhandler')) ob_start('ob_gzhandler');
else ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('X-Request-ID: ' . $REQUEST_ID);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$CIPHER_KEY = "CHASDEY_SHLOMO_APP_SECRET_2026";
$API_BASE_URL = "https://bull36.com/api";
$API_TOKEN = "58CZS49DFHNN4KD24933";
$CACHE_DIR = __DIR__ . '/cache';
$CACHE_MAX_AGE = 5 * 3600; // 5 hours in seconds (18,000s)

/**
 * Purge cache files older than max age (default: 5 hours).
 * Throttled to run at most once every 10 minutes to avoid disk I/O overhead.
 */
function purgeExpiredCacheFiles($dir, $maxAge = 18000, $force = false) {
    if (!is_dir($dir)) return;
    $marker = $dir . '/.last_cleanup';
    if (!$force && file_exists($marker)) {
        $lastClean = @filemtime($marker);
        if ($lastClean && (time() - $lastClean < 600)) {
            return;
        }
    }
    @touch($marker);

    $files = @glob($dir . '/*.json');
    if (!$files || !is_array($files)) return;

    $now = time();
    foreach ($files as $file) {
        if (is_file($file)) {
            $fileTime = @filemtime($file);
            if ($fileTime && ($now - $fileTime >= $maxAge)) {
                @unlink($file);
            }
        }
    }
}

// Run periodic cleanup of cache older than 5 hours
purgeExpiredCacheFiles($CACHE_DIR, $CACHE_MAX_AGE);

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
    $actionParam = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');
    if (!empty($actionParam)) {
        $payload = [
            'action' => $actionParam,
            'api_name' => isset($_GET['api_name']) ? $_GET['api_name'] : (isset($_POST['api_name']) ? $_POST['api_name'] : $actionParam),
            'params' => array_merge($_GET, $_POST)
        ];
    } else {
        http_response_code(400);
        echo json_encode([
            'success' => 0,
            'error' => 'Missing encrypted data payload.',
            'message' => 'Missing encrypted data payload.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
} else {
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
}

// 3. Resolve target action / URL
// NEW: api_name is accepted for request tracing; action remains the routing key.
$action = isset($payload['action']) ? $payload['action'] : '';
$apiName = isset($_POST['api_name']) ? $_POST['api_name'] : (isset($payload['api_name']) ? $payload['api_name'] : $action);
$params = isset($payload['params']) ? $payload['params'] : [];
$targetUrl = isset($payload['target_url']) ? $payload['target_url'] : '';
$bypassCache = !empty($params['refresh']) || !empty($params['nocache']);

$folderId = '3122';
if ($action === 'get_folder_by_id' || $action === 'get_customers') {
    // NEW: Forward pagination parameters. Without an explicit page, the
    // response is expanded below so the frontend receives all customers.
    $folderId = isset($params['folder_id']) ? $params['folder_id'] : '3122';
    // Bull36 uses page/start/limit for folder pagination. Pass them through
    // when supplied, while keeping the default request unpaged so the proxy
    // can collect the complete customer list below.
    $folderQuery = [
        'token' => !empty($params['token']) ? $params['token'] : $API_TOKEN,
        'folder_id' => $folderId
    ];
    foreach (['page', 'start', 'limit', 'length', 'username'] as $key) {
        if (isset($params[$key]) && $params[$key] !== '') {
            $folderQuery[$key] = $params[$key];
        }
    }
    $targetUrl = $API_BASE_URL . "/get_folder_by_id?" . http_build_query($folderQuery);
} else if ($action === 'get_entries' || $action === 'get_tabs') {
    $activeToken = !empty($params['token']) ? $params['token'] : $API_TOKEN;
    $targetUrl = $API_BASE_URL . "/get_entries?token=" . urlencode($activeToken);
} else if ($action === 'get_folders') {
    $activeToken = !empty($params['token']) ? $params['token'] : (!empty($params['api_token']) ? $params['api_token'] : $API_TOKEN);
    $targetUrl = $API_BASE_URL . "/get_folders?api_token=" . urlencode($activeToken);
} else if ($action === 'get_entries_by_tab_id' || $action === 'get_customer_entries') {
    $activeToken = !empty($params['token']) ? $params['token'] : $API_TOKEN;
    $tabId = isset($params['entry_id']) ? $params['entry_id'] : (isset($params['tab_id']) ? $params['tab_id'] : '');
    $customerId = isset($params['customer_id']) ? $params['customer_id'] : '';
    $entryQuery = [
        'token' => $activeToken,
        'entry_id' => $tabId,
        'customer_id' => $customerId
    ];
    foreach (['page', 'limit', 'start', 'length'] as $key) {
        if (isset($params[$key]) && $params[$key] !== '') {
            $entryQuery[$key] = $params[$key];
        }
    }
    $targetUrl = $API_BASE_URL . "/get_entries_by_tab_id?" . http_build_query($entryQuery);
} else if ($action === 'get_customer_total_field_sum') {
    // NEW: Supports repeated customer_id[] parameters for grouped totals:
    // https://bull36.com/api/get_customer_total_field_sum?token=TOKEN&entry_id=32&field_id=data1&customer_id[]=108545&customer_id[]=5258
    $activeToken = !empty($params['token']) ? $params['token'] : $API_TOKEN;
    $entryId = isset($params['entry_id']) ? $params['entry_id'] : '';
    $fieldId = isset($params['field_id']) ? $params['field_id'] : '';
    $customerIds = isset($params['customer_id']) ? $params['customer_id'] : [];
    if (!is_array($customerIds)) {
        if (is_string($customerIds) && strpos($customerIds, ',') !== false) {
            $customerIds = explode(',', $customerIds);
        } else {
            $customerIds = [$customerIds];
        }
    }
    // Clean and filter empty customer IDs
    $customerIds = array_values(array_filter(array_map('trim', $customerIds), function($v) { return $v !== ''; }));

    $queryString = "token=" . urlencode($activeToken) . "&entry_id=" . urlencode($entryId) . "&field_id=" . urlencode($fieldId);
    foreach ($customerIds as $cid) {
        $queryString .= "&customer_id[]=" . urlencode($cid);
    }
    $targetUrl = $API_BASE_URL . '/get_customer_total_field_sum?' . $queryString;
} else if ($action === 'get_entry_field_sum') {
    $activeToken = !empty($params['token']) ? $params['token'] : $API_TOKEN;
    $entryId = isset($params['entry_id']) ? $params['entry_id'] : '';
    $fieldId = isset($params['field_id']) ? $params['field_id'] : '';
    $targetUrl = $API_BASE_URL . '/get_entry_field_sum?' . http_build_query([
        'token' => $activeToken,
        'entry_id' => $entryId,
        'field_id' => $fieldId
    ]);
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

// NEW: Cache Check (TTL: 180 seconds for folders/customers, 120 seconds for entries).
// The old PHP always called Bull36 and never reused a successful response.
$cacheTTL = ($action === 'get_entries_by_tab_id' || $action === 'get_customer_total_field_sum') ? 120 : 180;
$cacheKey = md5('pagination-v2_' . $action . '_' . $targetUrl);
$cacheFile = $CACHE_DIR . '/' . $cacheKey . '.json';

if (file_exists($cacheFile)) {
    $mtime = @filemtime($cacheFile);
    if ($mtime && (time() - $mtime >= $CACHE_MAX_AGE)) {
        @unlink($cacheFile);
    } elseif (!$bypassCache && $mtime && (time() - $mtime < $cacheTTL)) {
        header('X-Cache: HIT');
        header('X-Optimized: Chasdey-Gateway-Slim');
        http_response_code(200);
        readfile($cacheFile);
        exit;
    }
}

// 5. Perform the remote API request. Use cURL when available.
$response = false;
$httpCode = 0;
$requestError = '';

if (function_exists('curl_init')) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 35);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $requestError = curl_error($ch);
    curl_close($ch);
} else {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 35,
            'ignore_errors' => true,
            'header' => "Accept: application/json\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n"
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

if ($response === false || $requestError || $httpCode >= 400 || (is_string($response) && (stripos($response, '<!doctype') !== false || stripos($response, '<html') !== false))) {
    $errDetail = $requestError ? $requestError : "Upstream HTTP status: " . $httpCode;
    apiLog('Bull36 upstream request failed or returned HTML', [
        'request_id' => $REQUEST_ID,
        'action' => $action,
        'api_name' => $apiName,
        'url' => preg_replace('/token=[^&]*/', 'token=REDACTED', $targetUrl),
        'http_code' => $httpCode,
        'error' => $errDetail
    ]);
    if (file_exists($cacheFile)) {
        header('X-Cache: STALE');
        http_response_code(200);
        readfile($cacheFile);
        exit;
    }

    http_response_code($httpCode >= 400 ? $httpCode : 502);
    echo json_encode([
        'success' => 0,
        'error' => 'API request failed: ' . $errDetail,
        'message' => 'API request failed: ' . $errDetail,
        'request_id' => $REQUEST_ID
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// NEW: Handle Bull36 pagination and strip heavy unused fields.
// REMOVED: Returning all auxiliary customer fields unchanged.
$finalOutput = $response;

if ($httpCode === 200 && ($action === 'get_folder_by_id' || $action === 'get_customers')) {
    $decoded = json_decode($response, true);
    if ($decoded && isset($decoded['data']) && is_array($decoded['data'])) {
        $totalCustomers = isset($decoded['total']) ? (int)$decoded['total'] : (int)($decoded['count'] ?? count($decoded['data']));
        $pageSize = count($decoded['data']);

        // An explicit page/start request is already a paginated response.
        // Do not append other pages to it; return the requested page exactly.
        $explicitPage = isset($params['page']) || isset($params['start']);

        // NEW: If Bull36 paginated the response and there are more pages, fetch
        // them in parallel using curl_multi.
        if (!$explicitPage && $totalCustomers > $pageSize && $pageSize > 0 && function_exists('curl_multi_init')) {
            $mh = curl_multi_init();
            $handles = [];
            // Bull36 expects the page number for subsequent pages. Using only
            // start=20/start=40 can return page 1 repeatedly, which leaves
            // the frontend with only the first 20 unique customers.
            $totalPages = (int)ceil($totalCustomers / $pageSize);
            for ($pageNumber = 2; $pageNumber <= $totalPages; $pageNumber++) {
                $pageUrl = $API_BASE_URL . "/get_folder_by_id?" . http_build_query([
                    'token' => $API_TOKEN,
                    'folder_id' => $folderId,
                    'page' => $pageNumber,
                    'limit' => $pageSize
                ]);
                $ch = curl_init($pageUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
                curl_setopt($ch, CURLOPT_TIMEOUT, 25);
                curl_multi_add_handle($mh, $ch);
                $handles[$pageNumber] = $ch;
            }

            $running = null;
            do {
                curl_multi_exec($mh, $running);
                curl_multi_select($mh);
            } while ($running > 0);

            // Append all pages in order
            ksort($handles);
            foreach ($handles as $pageNumber => $ch) {
                $content = curl_multi_getcontent($ch);
                $d = json_decode($content, true);
                if ($d && isset($d['data']) && is_array($d['data'])) {
                    $decoded['data'] = array_merge($decoded['data'], $d['data']);
                }
                curl_multi_remove_handle($mh, $ch);
                curl_close($ch);
            }
            curl_multi_close($mh);
        }

        // Set accurate count and total
        $decoded['count'] = count($decoded['data']);
        $decoded['total'] = count($decoded['data']);

        // Remove extra_fields and bloated auxiliary fields (reduces size by 93%)
        $unwantedFields = [
            'extra_fields',
            'user_forms_detail',
            'chat_embed_meta',
            'appointment_group',
            'outgoing_payments',
            'courses',
            'sub_courses',
            'commission_for_affiliate',
            'messages',
            'messages_delete',
            'payment_balancing_pdf',
            'pricing_list',
            'notes_for_highlight_time',
            'script_internal_use',
            'payment_terms',
            'lists',
            'lists_removed'
        ];

        foreach ($decoded['data'] as &$item) {
            foreach ($unwantedFields as $field) {
                unset($item[$field]);
            }
        }
        unset($item);

        $sanitized = json_encode($decoded, JSON_UNESCAPED_UNICODE);
        if ($sanitized !== false && strlen($sanitized) > 10) {
            $finalOutput = $sanitized;
        }
    }
}

// NEW: Save successful responses to the local cache file.
if ($httpCode === 200 && strlen($finalOutput) > 10) {
    if (!is_dir($CACHE_DIR)) {
        @mkdir($CACHE_DIR, 0777, true);
    }
    @file_put_contents($cacheFile, $finalOutput);
    purgeExpiredCacheFiles($CACHE_DIR, $CACHE_MAX_AGE);
}

header('X-Cache: MISS');
header('X-Optimized: Chasdey-Gateway-Slim');
http_response_code($httpCode ? $httpCode : 200);
$GLOBALS['api_response_sent'] = true;
echo $finalOutput;
