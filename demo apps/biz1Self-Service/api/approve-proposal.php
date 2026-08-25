<?php
/**
 * Same-origin helper: approve Order Proposal on Biz1 CRM (dashboard).
 * Browser cannot set/read cross-site ci_session cookies; this proxy can.
 *
 * POST JSON or form:
 *   username, password, document_id (or order_proposals_id)
 *   domain (optional) e.g. https://dharakareliya1.bull36.com
 */
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['success' => 0, 'message' => 'POST required']);
  exit;
}

$raw = file_get_contents('php://input');
$json = json_decode($raw, true);
if (!is_array($json)) $json = [];
$in = array_merge($_POST, $json);

$username = trim((string)($in['username'] ?? $in['email'] ?? ''));
$password = (string)($in['password'] ?? '');
$docId = trim((string)($in['document_id'] ?? $in['order_proposals_id'] ?? $in['id'] ?? ''));
$domain = trim((string)($in['domain'] ?? ''));

if ($domain === '') {
  $domain = 'https://dharakareliya1.bull36.com';
}
$domain = rtrim($domain, '/');
if (!preg_match('#^https://[a-z0-9-]+\.bull36\.com$#i', $domain)) {
  http_response_code(400);
  echo json_encode(['success' => 0, 'message' => 'Invalid domain']);
  exit;
}

if ($username === '' || $password === '' || $docId === '' || !ctype_digit($docId)) {
  http_response_code(400);
  echo json_encode(['success' => 0, 'message' => 'username, password, document_id required']);
  exit;
}

function biz1_http($url, $postFields, $cookie = '') {
  $ch = curl_init($url);
  $headers = [
    'X-Requested-With: XMLHttpRequest',
    'Content-Type: application/x-www-form-urlencoded',
  ];
  if ($cookie !== '') $headers[] = 'Cookie: ' . $cookie;
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $postFields,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_TIMEOUT => 45,
    CURLOPT_HTTPHEADER => $headers,
  ]);
  $resp = curl_exec($ch);
  if ($resp === false) {
    $err = curl_error($ch);
    return ['error' => $err, 'status' => 0, 'headers' => '', 'body' => ''];
  }
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
  return [
    'status' => $status,
    'headers' => substr($resp, 0, $headerSize),
    'body' => substr($resp, $headerSize),
  ];
}

function biz1_extract_cookie($headerBlock) {
  $parts = [];
  foreach (preg_split("/\r\n|\n|\r/", $headerBlock) as $line) {
    if (stripos($line, 'Set-Cookie:') === 0) {
      $val = trim(substr($line, strlen('Set-Cookie:')));
      $parts[] = explode(';', $val)[0];
    }
  }
  return implode('; ', $parts);
}

$login = biz1_http($domain . '/dashboard/login/check_login', http_build_query([
  'email' => $username,
  'password' => $password,
  'email_otp_with' => '1',
]));

if (!empty($login['error'])) {
  http_response_code(502);
  echo json_encode(['success' => 0, 'message' => 'Login request failed: ' . $login['error']]);
  exit;
}

$cookie = biz1_extract_cookie($login['headers']);
$loginJson = json_decode($login['body'], true);
if ($cookie === '' || !is_array($loginJson) || (string)($loginJson['success'] ?? '') !== '1') {
  http_response_code(401);
  echo json_encode([
    'success' => 0,
    'message' => is_array($loginJson) ? ($loginJson['message'] ?? 'Dashboard login failed') : 'Dashboard login failed',
  ]);
  exit;
}

$chWarm = curl_init($domain . '/dashboard/admin/');
curl_setopt_array($chWarm, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ['Cookie: ' . $cookie],
  CURLOPT_TIMEOUT => 30,
]);
curl_exec($chWarm);

$approveBody = 'order_proposals_id%5B%5D=' . rawurlencode($docId);
$approve = biz1_http($domain . '/dashboard/home/approve_order_proposals', $approveBody, $cookie);

$approveJson = json_decode($approve['body'], true);
if (!is_array($approveJson) || empty($approveJson['success'])) {
  http_response_code(502);
  echo json_encode([
    'success' => 0,
    'message' => is_array($approveJson) ? ($approveJson['message'] ?? 'Approve failed') : 'Approve failed',
    'raw' => substr($approve['body'], 0, 300),
  ]);
  exit;
}

echo json_encode([
  'success' => 1,
  'message' => $approveJson['message'] ?? 'Approved',
  'document_id' => $docId,
]);
