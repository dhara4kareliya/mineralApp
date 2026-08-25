<?php
/**
 * Guest share token registry (exact match — tampered URLs fail).
 *
 * Long token:
 *   POST { token: "<exact>", payload: {...} } → { ok:1 }
 *   GET  ?token=<exact> → { ok:1, payload:{...} } only if byte-exact match
 *
 * Legacy short code (6 chars):
 *   POST { payload:{...}, code?: "Ab3xY9" } → { ok:1, code:"Ab3xY9" }
 *   GET  ?guest=Ab3xY9 → { ok:1, payload:{...} }
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  http_response_code(204);
  exit;
}

$dir = __DIR__ . DIRECTORY_SEPARATOR . 'guest_tokens';
if (!is_dir($dir)) {
  @mkdir($dir, 0755, true);
}

function guest_code_ok($code) {
  return is_string($code) && (bool) preg_match('/^[A-Za-z0-9]{6}$/', $code);
}

function guest_long_token_ok($token) {
  return is_string($token) && strlen($token) > 8 && (bool) preg_match('/^[A-Za-z0-9\-_]+$/', $token);
}

function guest_random_code() {
  $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  $out = '';
  for ($i = 0; $i < 6; $i++) {
    $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
  }
  return $out;
}

function guest_token_path($dir, $code) {
  return $dir . DIRECTORY_SEPARATOR . $code . '.php';
}

function guest_long_path($dir, $token) {
  return $dir . DIRECTORY_SEPARATOR . 't_' . hash('sha256', $token) . '.php';
}

function guest_write_token($path, $data) {
  $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($json === false) return false;
  $php = "<?php\n// guest token store — do not edit\nreturn " . var_export(json_decode($json, true), true) . ";\n";
  return file_put_contents($path, $php, LOCK_EX) !== false;
}

function guest_read_token($path) {
  if (!is_file($path)) return null;
  $data = include $path;
  return is_array($data) ? $data : null;
}

function guest_payload_expired($payload) {
  return !empty($payload['exp']) && (int) (microtime(true) * 1000) > (int) $payload['exp'];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $long = isset($_GET['token']) ? (string) $_GET['token'] : '';
  if ($long !== '') {
    if (!guest_long_token_ok($long)) {
      http_response_code(400);
      echo json_encode(array('ok' => 0, 'message' => 'Invalid token'));
      exit;
    }
    $row = guest_read_token(guest_long_path($dir, $long));
    if (!$row || empty($row['token']) || !hash_equals((string) $row['token'], $long)) {
      http_response_code(404);
      echo json_encode(array('ok' => 0, 'message' => 'Token mismatch or not found'));
      exit;
    }
    $payload = isset($row['payload']) && is_array($row['payload']) ? $row['payload'] : $row;
    if (isset($payload['token'])) unset($payload['token']);
    if (guest_payload_expired($payload)) {
      http_response_code(410);
      echo json_encode(array('ok' => 0, 'message' => 'Guest link expired'));
      exit;
    }
    echo json_encode(array('ok' => 1, 'payload' => $payload));
    exit;
  }

  $code = isset($_GET['guest']) ? (string) $_GET['guest'] : '';
  if (!guest_code_ok($code)) {
    http_response_code(400);
    echo json_encode(array('ok' => 0, 'message' => 'Invalid guest code'));
    exit;
  }
  $payload = guest_read_token(guest_token_path($dir, $code));
  if (!$payload) {
    http_response_code(404);
    echo json_encode(array('ok' => 0, 'message' => 'Guest link not found'));
    exit;
  }
  if (guest_payload_expired($payload)) {
    http_response_code(410);
    echo json_encode(array('ok' => 0, 'message' => 'Guest link expired'));
    exit;
  }
  echo json_encode(array('ok' => 1, 'payload' => $payload));
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $raw = file_get_contents('php://input');
  $body = json_decode($raw, true);
  if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(array('ok' => 0, 'message' => 'Invalid JSON'));
    exit;
  }

  // Exact long token registration
  if (!empty($body['token']) && is_string($body['token'])) {
    $token = (string) $body['token'];
    if (!guest_long_token_ok($token)) {
      http_response_code(400);
      echo json_encode(array('ok' => 0, 'message' => 'Invalid token'));
      exit;
    }
    $payload = (isset($body['payload']) && is_array($body['payload'])) ? $body['payload'] : array();
    $path = guest_long_path($dir, $token);
    if (!guest_write_token($path, array('token' => $token, 'payload' => $payload))) {
      http_response_code(500);
      echo json_encode(array('ok' => 0, 'message' => 'Write failed'));
      exit;
    }
    echo json_encode(array('ok' => 1));
    exit;
  }

  // Legacy short code
  if (empty($body['payload']) || !is_array($body['payload'])) {
    http_response_code(400);
    echo json_encode(array('ok' => 0, 'message' => 'payload required'));
    exit;
  }
  $payload = $body['payload'];
  $code = isset($body['code']) ? (string) $body['code'] : '';
  if ($code !== '' && !guest_code_ok($code)) {
    http_response_code(400);
    echo json_encode(array('ok' => 0, 'message' => 'Invalid guest code'));
    exit;
  }
  if ($code === '') {
    for ($i = 0; $i < 12; $i++) {
      $try = guest_random_code();
      if (!is_file(guest_token_path($dir, $try))) {
        $code = $try;
        break;
      }
    }
  }
  if (!guest_code_ok($code)) {
    http_response_code(500);
    echo json_encode(array('ok' => 0, 'message' => 'Could not allocate code'));
    exit;
  }
  if (!guest_write_token(guest_token_path($dir, $code), $payload)) {
    http_response_code(500);
    echo json_encode(array('ok' => 0, 'message' => 'Write failed'));
    exit;
  }
  echo json_encode(array('ok' => 1, 'code' => $code));
  exit;
}

http_response_code(405);
echo json_encode(array('ok' => 0, 'message' => 'Method not allowed'));
