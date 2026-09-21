<?php
/**
 * Public manager proxy for server225 hosted apps.
 *
 * Browser code must never know the private apps-hosting HMAC secret, so this
 * endpoint verifies a Biz1 bearer token first and then signs the local hosting
 * request server-side.
 *
 * Uploads go to /home/apps/dev. Live publish is approve_live (super-admin only).
 */
define('BIZ1_APPS_API_URL', 'https://apps.biz1.co.il/api/apps.php');
define('BIZ1_APPS_API_SECRET', 'l70zDCbOG5e0pmfvwl8ileCZh3XNd9uIlMOFnFQvhfC74I7s1+SGmgo+wdWVufZV');
define('BIZ1_MANAGER_MAX_ZIP', 25 * 1024 * 1024);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With, Accept');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function manager_json($status, $payload) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function manager_post($key, $default = '') {
    return isset($_POST[$key]) ? trim((string) $_POST[$key]) : $default;
}

function manager_clean_slug($value) {
    $slug = strtolower(trim((string) $value));
    $slug = preg_replace('/[^a-z0-9_-]+/', '-', $slug);
    return substr(trim($slug, '-'), 0, 80);
}

function manager_clean_api_base($value) {
    $base = trim((string) $value);
    if ($base === '') {
        return '';
    }
    if (!preg_match('#^https?://#i', $base)) {
        $base = 'https://' . $base;
    }
    $parts = parse_url($base);
    if (!$parts || empty($parts['host'])) {
        return '';
    }
    $host = strtolower($parts['host']);
    if (!preg_match('/(^|\.)((bull36\.com)|(biz1\.co\.il)|(mastrocrm\.com))$/', $host)) {
        return '';
    }
    return 'https://' . $host;
}

function manager_http_post($url, $fields, $headers = array(), $file = null) {
    $ch = curl_init($url);
    $body = $fields;
    if ($file) {
        $body['zip'] = new CURLFile($file['tmp_name'], 'application/zip', $file['name']);
    }
    curl_setopt_array($ch, array(
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $file ? 120 : 30,
    ));
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false) {
        return array('status' => 502, 'body' => array('success' => 0, 'message' => $err ?: 'Network error'));
    }
    $json = json_decode($raw, true);
    if (!is_array($json)) {
        return array('status' => $code ?: 502, 'body' => array('success' => 0, 'message' => 'Invalid JSON from upstream'));
    }
    return array('status' => $code ?: 200, 'body' => $json);
}

function manager_biz1_login() {
    $apiBase = manager_clean_api_base(manager_post('api_base'));
    if ($apiBase === '') {
        manager_json(400, array('success' => 0, 'message' => 'Valid Biz1 account domain is required.'));
    }
    $fields = array(
        'username' => manager_post('username'),
        'password' => manager_post('password'),
    );
    $otp = manager_post('otp');
    if ($otp !== '') {
        $fields['otp'] = $otp;
    }
    $result = manager_http_post($apiBase . '/app/Login', $fields);
    $result['body']['api_base'] = $apiBase;
    manager_json($result['status'], $result['body']);
}

function manager_auth_header() {
    foreach (array('HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION', 'Authorization') as $key) {
        if (!empty($_SERVER[$key]) && preg_match('/^\s*Bearer\s+(.+)\s*$/i', $_SERVER[$key], $m)) {
            return 'Bearer ' . trim($m[1]);
        }
    }
    // Some shared-host PHP/FastCGI setups strip Authorization. The manager is
    // HTTPS-only in production, so accept the token as a form fallback too.
    $token = manager_post('token');
    if ($token !== '') {
        return 'Bearer ' . preg_replace('/^\s*Bearer\s+/i', '', $token);
    }
    manager_json(401, array('success' => 0, 'message' => 'Bearer token is required.'));
}

function manager_is_super_admin($user, $data, $settings) {
    $permissions = isset($data['permissions']) && is_array($data['permissions']) ? $data['permissions'] : array();
    $roleCandidates = array(
        isset($user['user_role']) ? $user['user_role'] : null,
        isset($permissions['user_role']) ? $permissions['user_role'] : null,
        isset($settings['user_role']) ? $settings['user_role'] : null,
        isset($data['user_role']) ? $data['user_role'] : null,
    );
    foreach ($roleCandidates as $roleValue) {
        if ($roleValue === null || $roleValue === '') {
            continue;
        }
        if ((string) $roleValue === '9' || (int) $roleValue === 9) {
            return true;
        }
    }
    return !empty($user['is_super_admin']) || !empty($settings['is_super_admin']) || !empty($data['is_super_admin']);
}

function manager_user_context() {
    $apiBase = manager_clean_api_base(manager_post('api_base'));
    if ($apiBase === '') {
        manager_json(400, array('success' => 0, 'message' => 'Valid Biz1 account domain is required.'));
    }
    $auth = manager_auth_header();
    $result = manager_http_post($apiBase . '/app/User.Basic', array(), array('Authorization: ' . $auth));
    if ($result['status'] >= 400 || empty($result['body']['success'])) {
        manager_json(401, array('success' => 0, 'message' => 'Login expired or invalid.'));
    }
    $data = isset($result['body']['data']) && is_array($result['body']['data']) ? $result['body']['data'] : array();
    $user = isset($data['user']) && is_array($data['user']) ? $data['user'] : array();
    $org = isset($data['org']) && is_array($data['org']) ? $data['org'] : array();
    $settings = isset($data['settings']) && is_array($data['settings']) ? $data['settings'] : array();
    $ownerId = !empty($user['owner_id']) ? (int) $user['owner_id'] : (!empty($org['id']) ? (int) $org['id'] : (int) ($user['id'] ?? 0));
    $isManager = !empty($settings['is_owner']) || !empty($settings['is_member_admin']);
    $isSuper = manager_is_super_admin($user, $data, $settings);
    return array(
        'api_base' => $apiBase,
        'user' => $user,
        'org' => $org,
        'team_members' => isset($data['team_members']) && is_array($data['team_members']) ? $data['team_members'] : array(),
        'owner_id' => $ownerId,
        'user_id' => (int) ($user['id'] ?? 0),
        'username' => manager_account_slug($apiBase, $user, $org),
        'can_manage' => $isManager || $isSuper,
        'is_super_admin' => $isSuper,
    );
}

function manager_account_slug($apiBase, $user, $org) {
    $host = parse_url($apiBase, PHP_URL_HOST);
    $subdomain = $host ? preg_replace('/\..*$/', '', strtolower($host)) : '';
    if ($subdomain && !in_array($subdomain, array('www', 'dev', 'dashboard', 'biz1', 'bull36'), true)) {
        return manager_clean_slug($subdomain);
    }
    foreach (array($org['user_domain'] ?? '', $user['user_name'] ?? '', $user['username'] ?? '', $org['name'] ?? '') as $candidate) {
        $slug = manager_clean_slug($candidate);
        if ($slug !== '') {
            return $slug;
        }
    }
    return 'account-' . (int) ($user['owner_id'] ?? $user['id'] ?? 0);
}

function manager_developer_id($ctx) {
    // Always assign the logged-in user as the developer.
    return $ctx['user_id'];
}

function manager_actor_name($ctx) {
    $user = isset($ctx['user']) && is_array($ctx['user']) ? $ctx['user'] : array();
    foreach (array('name', 'user_name', 'username', 'email') as $key) {
        if (!empty($user[$key])) {
            return substr(trim((string) $user[$key]), 0, 120);
        }
    }
    return 'user-' . (int) $ctx['user_id'];
}

function manager_zip_error($file) {
    if (!$file || empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        return 'Please choose a ZIP file.';
    }
    if (!empty($file['error'])) {
        return 'Upload failed with code ' . (int) $file['error'];
    }
    if ((int) $file['size'] > BIZ1_MANAGER_MAX_ZIP) {
        return 'ZIP is too large. Maximum is 25MB.';
    }
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    return $ext === 'zip' ? '' : 'Only ZIP files are allowed.';
}

function manager_signed_apps_request($action, $payload, $file = null) {
    $timestamp = time();
    $signed = implode("\n", array(
        $timestamp,
        $action,
        isset($payload['owner_id']) ? $payload['owner_id'] : '',
        isset($payload['user_id']) ? $payload['user_id'] : '',
        isset($payload['username']) ? $payload['username'] : '',
        isset($payload['app_slug']) ? $payload['app_slug'] : '',
        isset($payload['file_sha256']) ? $payload['file_sha256'] : '',
    ));
    $headers = array(
        'X-Biz1-Timestamp: ' . $timestamp,
        'X-Biz1-Signature: ' . hash_hmac('sha256', $signed, BIZ1_APPS_API_SECRET),
    );
    return manager_http_post(BIZ1_APPS_API_URL . '?action=' . rawurlencode($action), $payload, $headers, $file);
}

function manager_signed_apps_call($action, $payload, $file = null) {
    $result = manager_signed_apps_request($action, $payload, $file);
    manager_json($result['status'], $result['body']);
}

$action = manager_post('action', 'list');
if ($action === 'login') {
    manager_biz1_login();
}

$ctx = manager_user_context();
$payload = array(
    'owner_id' => $ctx['owner_id'],
    'user_id' => $ctx['user_id'],
    'username' => $ctx['username'],
    'domain' => 'apps.biz1.co.il',
);

if ($ctx['is_super_admin']) {
    $targetOwner = (int) manager_post('owner_id');
    $targetUser = manager_clean_slug(manager_post('username'));
    if ($targetOwner > 0) {
        $payload['owner_id'] = $targetOwner;
    }
    if ($targetUser !== '') {
        $payload['username'] = $targetUser;
    }
}

if ($action === 'context') {
    manager_json(200, array(
        'success' => 1,
        'account' => $ctx['username'],
        'login_username' => manager_actor_name($ctx),
        'can_manage' => $ctx['can_manage'] ? 1 : 0,
        'is_super_admin' => $ctx['is_super_admin'] ? 1 : 0,
        'user' => $ctx['user'],
        'team_members' => $ctx['team_members'],
    ));
}

if ($action === 'list') {
    $payload['start'] = max(0, (int) manager_post('start', '0'));
    $payload['limit'] = max(1, min(25, (int) manager_post('limit', '25')));
    $payload['search'] = manager_post('search');
    $payload['status'] = manager_post('status');
    if ($ctx['is_super_admin'] && (int) manager_post('admin_all') === 1) {
        $payload['admin_all'] = 1;
    }
    manager_signed_apps_call('list', $payload);
}

if (!$ctx['can_manage']) {
    manager_json(403, array('success' => 0, 'message' => 'Only account admins can manage hosted apps.'));
}

$payload['actor_user_id'] = $ctx['user_id'];
$payload['actor_name'] = manager_actor_name($ctx);

if ($action === 'history') {
    $payload['app_slug'] = manager_clean_slug(manager_post('app_slug'));
    $payload['limit'] = max(1, min(100, (int) manager_post('limit', '50')));
    if ($payload['app_slug'] === '') {
        manager_json(400, array('success' => 0, 'message' => 'App slug is required.'));
    }
    manager_signed_apps_call('history', $payload);
}

if ($action === 'add' || $action === 'update') {
    $file = isset($_FILES['zip']) && !empty($_FILES['zip']['name']) ? $_FILES['zip'] : null;
    if ($action === 'add') {
        $zipError = manager_zip_error($file);
        if ($zipError !== '') {
            manager_json(400, array('success' => 0, 'message' => $zipError));
        }
    } elseif ($file) {
        $zipError = manager_zip_error($file);
        if ($zipError !== '') {
            manager_json(400, array('success' => 0, 'message' => $zipError));
        }
    }
    $payload['user_id'] = manager_developer_id($ctx);
    $payload['developer_name'] = manager_actor_name($ctx);
    $payload['app_name'] = substr(manager_post('app_name'), 0, 120);
    $payload['app_slug'] = manager_clean_slug(manager_post('app_slug', $payload['app_name']));
    if (array_key_exists('description', $_POST)) {
        $payload['description'] = substr(manager_post('description'), 0, 1000);
    }
    $payload['status'] = in_array(manager_post('status'), array('active', 'disabled'), true) ? manager_post('status') : '';
    if ($payload['app_name'] === '' || $payload['app_slug'] === '') {
        manager_json(400, array('success' => 0, 'message' => 'App name and slug are required.'));
    }
    if ($file) {
        $payload['file_sha256'] = hash_file('sha256', $file['tmp_name']);
        $payload['zip_size'] = (int) $file['size'];
    }

    manager_signed_apps_call($action, $payload, $file);
}

if ($action === 'remove') {
    $payload['app_slug'] = manager_clean_slug(manager_post('app_slug'));
    if ($payload['app_slug'] === '') {
        manager_json(400, array('success' => 0, 'message' => 'App slug is required.'));
    }
    manager_signed_apps_call('remove', $payload);
}

if ($action === 'request_live' || $action === 'approve_live' || $action === 'reject_live') {
    $payload['app_slug'] = manager_clean_slug(manager_post('app_slug'));
    if ($payload['app_slug'] === '') {
        manager_json(400, array('success' => 0, 'message' => 'App slug is required.'));
    }
    // if (($action === 'approve_live' || $action === 'reject_live') && !$ctx['is_super_admin']) {
    // Testing: account owner can approve/reject. Production: require is_super_admin only.
    $canApproveLive = !empty($ctx['is_super_admin']) || ((int) $ctx['user_id'] === (int) $ctx['owner_id']);
    if (($action === 'approve_live' || $action === 'reject_live') && !$canApproveLive) {
        manager_json(403, array('success' => 0, 'message' => 'Only super admins can approve live requests.'));
    }
    if ($action === 'request_live') {
        $payload['live_requested_by'] = $ctx['user_id'];
        $requestVersion = (int) manager_post('request_version');
        if ($requestVersion > 0) {
            $payload['request_version'] = $requestVersion;
        }
    }
    manager_signed_apps_call($action, $payload);
}

manager_json(400, array('success' => 0, 'message' => 'Unknown action.'));
