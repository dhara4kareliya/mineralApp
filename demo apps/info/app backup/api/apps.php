<?php
/**
 * Protected apps hosting API for server225.
 *
 * Biz1 calls this endpoint server-to-server. It validates the HMAC signature,
 * scans uploaded ZIP files, extracts only safe static assets, and stores app
 * metadata in a small SQLite table owned by the hosting server.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

define('APPS_ROOT', '/home/apps/public_html');
define('APPS_STORAGE', '/home/apps/app_storage');
define('APPS_DB', APPS_STORAGE.'/apps.sqlite');
define('APPS_SECRET', 'l70zDCbOG5e0pmfvwl8ileCZh3XNd9uIlMOFnFQvhfC74I7s1+SGmgo+wdWVufZV');
define('MAX_ZIP_BYTES', 25 * 1024 * 1024);
define('MAX_EXTRACTED_BYTES', 100 * 1024 * 1024);
define('MAX_FILES', 500);
define('APP_HTACCESS', "Options -Indexes\nRemoveHandler .php .phtml .php5 .php7 .phar .cgi .pl .py .rb .sh .asp .aspx .jsp\nRemoveType .php .phtml .php5 .php7 .phar .cgi .pl .py .rb .sh .asp .aspx .jsp\n<FilesMatch '\\.(php|phtml|php5|php7|phar|cgi|pl|py|rb|sh|asp|aspx|jsp)$'>\n  Require all denied\n</FilesMatch>\nHeader set X-Content-Type-Options nosniff\nHeader set Referrer-Policy no-referrer\nHeader set Content-Security-Policy \"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.biz1.co.il https://*.bull36.com https://*.mastrocrm.com wss://*.biz1.co.il wss://*.bull36.com wss://*.mastrocrm.com; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self' https://*.biz1.co.il https://*.bull36.com https://*.mastrocrm.com\"\n");

function json_response($status, $payload) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function header_value($name) {
    $key = 'HTTP_'.strtoupper(str_replace('-', '_', $name));
    return isset($_SERVER[$key]) ? (string) $_SERVER[$key] : '';
}

function clean_slug($value) {
    $slug = strtolower(trim((string) $value));
    $slug = preg_replace('/[^a-z0-9_-]+/', '-', $slug);
    $slug = trim($slug, '-');
    return substr($slug, 0, 80);
}

function ensure_dirs() {
    foreach (array(APPS_STORAGE, APPS_STORAGE.'/tmp', APPS_STORAGE.'/versions', APPS_STORAGE.'/trash') as $dir) {
        if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
            json_response(500, array('success' => 0, 'error' => 'storage_error', 'message' => 'Cannot create storage folder.'));
        }
    }
}

function db() {
    static $pdo = null;
    if ($pdo) return $pdo;
    ensure_dirs();
    $pdo = new PDO('sqlite:'.APPS_DB);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS apps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            app_name TEXT NOT NULL,
            app_slug TEXT NOT NULL,
            domain TEXT NOT NULL,
            public_url TEXT NOT NULL,
            folder_path TEXT NOT NULL,
            zip_size INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            scan_status TEXT NOT NULL,
            scan_report TEXT NOT NULL DEFAULT "",
            version INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT DEFAULT NULL,
            UNIQUE(owner_id, username, app_slug)
        )'
    );
    return $pdo;
}

function read_payload($action) {
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    if (stripos($contentType, 'multipart/form-data') !== false) {
        return $_POST;
    }
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    return is_array($json) ? $json : array();
}

function require_auth($action, $payload) {
    if (defined('APPS_CLI_TEST') && APPS_CLI_TEST) return;
    $timestamp = header_value('X-Biz1-Timestamp');
    $signature = header_value('X-Biz1-Signature');
    if (!$timestamp || !$signature || abs(time() - (int) $timestamp) > 300) {
        json_response(401, array('success' => 0, 'error' => 'invalid_signature', 'message' => 'Invalid or expired signature.'));
    }
    $signed = implode("\n", array(
        $timestamp,
        $action,
        isset($payload['owner_id']) ? $payload['owner_id'] : '',
        isset($payload['user_id']) ? $payload['user_id'] : '',
        isset($payload['username']) ? $payload['username'] : '',
        isset($payload['app_slug']) ? $payload['app_slug'] : '',
        isset($payload['file_sha256']) ? $payload['file_sha256'] : '',
    ));
    $expected = hash_hmac('sha256', $signed, APPS_SECRET);
    if (!hash_equals($expected, $signature)) {
        json_response(401, array('success' => 0, 'error' => 'invalid_signature', 'message' => 'Invalid signature.'));
    }
}

function safe_path($base, $name) {
    $path = $base.'/'.$name;
    $baseReal = realpath($base);
    $dirReal = realpath(dirname($path));
    if (!$baseReal || !$dirReal || strpos($dirReal, $baseReal) !== 0) {
        json_response(400, array('success' => 0, 'error' => 'invalid_path', 'message' => 'Invalid path.'));
    }
    return $path;
}

function public_url($username, $appSlug) {
    return 'https://apps.biz1.co.il/'.$username.'/'.$appSlug.'/';
}

function app_row($row) {
    if (!$row) return null;
    return array(
        'id' => (int) $row['id'],
        'owner_id' => (int) $row['owner_id'],
        'user_id' => (int) $row['user_id'],
        'username' => $row['username'],
        'app_name' => $row['app_name'],
        'app_slug' => $row['app_slug'],
        'status' => $row['status'],
        'scan_status' => $row['scan_status'],
        'scan_report' => $row['scan_report'],
        'public_url' => $row['public_url'],
        'version' => (int) $row['version'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    );
}

function find_app($ownerId, $username, $appSlug) {
    $stmt = db()->prepare('SELECT * FROM apps WHERE owner_id = ? AND username = ? AND app_slug = ? LIMIT 1');
    $stmt->execute(array($ownerId, $username, $appSlug));
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

function blocked_extension($name) {
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $allowed = array('html','htm','js','css','json','png','jpg','jpeg','gif','svg','webp','ico','woff','woff2','ttf','txt','pdf','map');
    $blocked = array('php','phtml','phar','cgi','pl','py','rb','sh','bash','zsh','fish','bat','cmd','ps1','exe','dll','so','jar','jsp','asp','aspx','msi','com','htaccess');
    if ($ext === '') return true;
    if (in_array($ext, $blocked, true)) return true;
    return !in_array($ext, $allowed, true);
}

function blocked_js_content($path) {
    $text = file_get_contents($path, false, null, 0, 524288);
    if ($text === false) return 'Cannot read JavaScript file.';
    $patterns = array(
        '/\beval\s*\(/i',
        '/\bnew\s+Function\s*\(/i',
        '/\bFunction\s*\(/i',
        '/\bsetTimeout\s*\(\s*[\"\']/i',
        '/\bsetInterval\s*\(\s*[\"\']/i',
        '/\bimportScripts\s*\(/i',
        '/document\.write\s*\(/i'
    );
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $text)) return 'JavaScript dynamic execution is blocked.';
    }
    return '';
}
function validate_zip_entry($name) {
    $name = str_replace('\\', '/', (string) $name);
    if ($name === '' || $name[0] === '/' || strpos($name, "\0") !== false || preg_match('/(^|\/)\.\.(\/|$)/', $name) || strpos($name, ':') !== false) {
        return 'ZIP contains an unsafe path: '.$name;
    }
    $parts = explode('/', $name);
    foreach ($parts as $part) {
        if ($part !== '' && $part[0] === '.') return 'ZIP contains hidden file/folder: '.$name;
    }
    if (substr($name, -1) !== '/' && blocked_extension($name)) {
        return 'ZIP contains blocked file type: '.$name;
    }
    if (strtolower(basename($name)) === '.htaccess') {
        return 'ZIP may not include .htaccess files.';
    }
    return '';
}

function mkdir_safe($dir) {
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        throw new RuntimeException('Cannot create folder.');
    }
}

function remove_dir($dir) {
    if (!is_dir($dir)) return;
    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($items as $item) {
        $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
    }
    rmdir($dir);
}

function extract_zip_safely($zipPath, $targetDir) {
    $zip = new ZipArchive();
    if ($zip->open($zipPath) !== true) {
        return array(false, 'Cannot open ZIP file.');
    }
    if ($zip->numFiles > MAX_FILES) {
        $zip->close();
        return array(false, 'ZIP contains too many files.');
    }
    $total = 0;
    $hasIndex = false;
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $stat = $zip->statIndex($i);
        $name = str_replace('\\', '/', $stat['name']);
        $error = validate_zip_entry($name);
        if ($error) {
            $zip->close();
            return array(false, $error);
        }
        if (substr($name, -1) === '/') continue;
        $total += isset($stat['size']) ? (int) $stat['size'] : 0;
        if ($total > MAX_EXTRACTED_BYTES) {
            $zip->close();
            return array(false, 'Extracted app is too large.');
        }
        if ($name === 'index.html') $hasIndex = true;
    }
    if (!$hasIndex) {
        $zip->close();
        return array(false, 'ZIP must include index.html in the root folder.');
    }
    mkdir_safe($targetDir);
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $stat = $zip->statIndex($i);
        $name = str_replace('\\', '/', $stat['name']);
        $dest = $targetDir.'/'.$name;
        if (substr($name, -1) === '/') {
            mkdir_safe($dest);
            continue;
        }
        mkdir_safe(dirname($dest));
        $in = $zip->getStream($stat['name']);
        if (!$in) {
            $zip->close();
            return array(false, 'Cannot read ZIP entry: '.$name);
        }
        $out = fopen($dest, 'wb');
        stream_copy_to_stream($in, $out);
        fclose($in);
        fclose($out);
        chmod($dest, 0644);
        if (strtolower(pathinfo($dest, PATHINFO_EXTENSION)) === 'js') {
            $jsError = blocked_js_content($dest);
            if ($jsError) {
                $zip->close();
                return array(false, $jsError.' File: '.$name);
            }
        }
    }
    file_put_contents($targetDir.'/.htaccess', APP_HTACCESS);
    chmod($targetDir.'/.htaccess', 0644);
    $zip->close();
    return array(true, 'OK');
}

function apply_app_status_policy($liveDir, $status) {
    if (!is_dir($liveDir)) return;
    // Disabled apps keep their files for fast reactivation, but Apache blocks public reads.
    $policy = APP_HTACCESS;
    if ($status === 'disabled') {
        $policy .= "\nRequire all denied\n";
    }
    file_put_contents($liveDir.'/.htaccess', $policy);
    chmod($liveDir.'/.htaccess', 0644);
}

function save_uploaded_zip($payload) {
    if (empty($_FILES['zip']) || !is_uploaded_file($_FILES['zip']['tmp_name'])) {
        json_response(400, array('success' => 0, 'error' => 'missing_required_file', 'message' => 'Missing required file: zip'));
    }
    if ($_FILES['zip']['size'] <= 0 || $_FILES['zip']['size'] > MAX_ZIP_BYTES) {
        json_response(400, array('success' => 0, 'error' => 'zip_too_large', 'message' => 'ZIP is empty or too large.'));
    }
    $actual = hash_file('sha256', $_FILES['zip']['tmp_name']);
    if (!empty($payload['file_sha256']) && !hash_equals($payload['file_sha256'], $actual)) {
        json_response(400, array('success' => 0, 'error' => 'zip_hash_mismatch', 'message' => 'Uploaded ZIP hash did not match request metadata.'));
    }
    return $_FILES['zip']['tmp_name'];
}

function handle_list($payload) {
    $ownerId = (int) $payload['owner_id'];
    $username = clean_slug($payload['username']);
    $limit = max(1, min(25, (int) (isset($payload['limit']) ? $payload['limit'] : 25)));
    $start = max(0, (int) (isset($payload['start']) ? $payload['start'] : 0));
    $search = isset($payload['search']) ? trim((string) $payload['search']) : '';
    $status = isset($payload['status']) ? trim((string) $payload['status']) : '';
    // Super-admin requests are still HMAC signed by Biz1, but account users stay scoped to their owner folder.
    if (!empty($payload['admin_all'])) {
        $where = '1 = 1';
        $params = array();
    } else {
        $where = 'owner_id = ? AND username = ?';
        $params = array($ownerId, $username);
    }
    if ($status !== '') {
        $where .= ' AND status = ?';
        $params[] = $status;
    }
    if ($search !== '') {
        $where .= ' AND (app_name LIKE ? OR app_slug LIKE ?)';
        $params[] = '%'.$search.'%';
        $params[] = '%'.$search.'%';
    }
    $countStmt = db()->prepare('SELECT COUNT(*) FROM apps WHERE '.$where);
    $countStmt->execute($params);
    $count = (int) $countStmt->fetchColumn();
    $stmt = db()->prepare('SELECT * FROM apps WHERE '.$where.' ORDER BY id DESC LIMIT ? OFFSET ?');
    $stmt->execute(array_merge($params, array($limit, $start)));
    $rows = array_map('app_row', $stmt->fetchAll(PDO::FETCH_ASSOC));
    json_response(200, array('success' => 1, 'count' => $count, 'recordsTotal' => $count, 'data' => $rows));
}

function handle_get($payload) {
    $row = find_app((int) $payload['owner_id'], clean_slug($payload['username']), clean_slug($payload['app_slug']));
    if (!$row || $row['status'] === 'removed') {
        json_response(404, array('success' => 0, 'error' => 'not_found', 'message' => 'App was not found.'));
    }
    json_response(200, array('success' => 1, 'data' => app_row($row)));
}

function upsert_app($payload, $replaceZip) {
    $ownerId = (int) $payload['owner_id'];
    $userId = (int) $payload['user_id'];
    $username = clean_slug($payload['username']);
    $appSlug = clean_slug($payload['app_slug']);
    $appName = trim((string) (isset($payload['app_name']) ? $payload['app_name'] : $appSlug));
    $status = isset($payload['status']) && in_array($payload['status'], array('active', 'disabled'), true) ? $payload['status'] : 'active';
    if (!$ownerId || !$userId || !$username || !$appSlug || !$appName) {
        json_response(400, array('success' => 0, 'error' => 'missing_required_parameter', 'message' => 'owner_id, user_id, username, app_name, and app_slug are required.'));
    }
    mkdir_safe(APPS_ROOT.'/'.$username);
    $liveDir = safe_path(APPS_ROOT.'/'.$username, $appSlug);
    $now = gmdate('Y-m-d H:i:s');
    $row = find_app($ownerId, $username, $appSlug);
    $version = $row ? ((int) $row['version'] + ($replaceZip ? 1 : 0)) : 1;

    if ($replaceZip) {
        $zipPath = save_uploaded_zip($payload);
        $tmpDir = APPS_STORAGE.'/tmp/'.$username.'-'.$appSlug.'-'.bin2hex(random_bytes(8));
        list($ok, $message) = extract_zip_safely($zipPath, $tmpDir);
        if (!$ok) {
            remove_dir($tmpDir);
            json_response(400, array('success' => 0, 'error' => 'zip_rejected', 'message' => $message));
        }
        if (is_dir($liveDir)) {
            $backup = APPS_STORAGE.'/versions/'.$username.'-'.$appSlug.'-v'.$version.'-'.time();
            rename($liveDir, $backup);
        }
        rename($tmpDir, $liveDir);
        chmod($liveDir, 0755);
    }
    apply_app_status_policy($liveDir, $status);

    $url = public_url($username, $appSlug);
    if ($row) {
        $stmt = db()->prepare('UPDATE apps SET user_id = ?, app_name = ?, public_url = ?, folder_path = ?, zip_size = ?, status = ?, scan_status = ?, scan_report = ?, version = ?, updated_at = ?, deleted_at = NULL WHERE id = ?');
        $stmt->execute(array($userId, $appName, $url, $liveDir, (int) (isset($payload['zip_size']) ? $payload['zip_size'] : $row['zip_size']), $status, 'passed', 'OK', $version, $now, $row['id']));
        $id = (int) $row['id'];
    } else {
        $stmt = db()->prepare('INSERT INTO apps (owner_id, user_id, username, app_name, app_slug, domain, public_url, folder_path, zip_size, status, scan_status, scan_report, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute(array($ownerId, $userId, $username, $appName, $appSlug, 'apps.biz1.co.il', $url, $liveDir, (int) (isset($payload['zip_size']) ? $payload['zip_size'] : 0), $status, 'passed', 'OK', $version, $now, $now));
        $id = (int) db()->lastInsertId();
    }
    json_response(200, array('success' => 1, 'app_id' => $id, 'app_slug' => $appSlug, 'status' => $status, 'version' => $version, 'public_url' => $url, 'message' => 'App saved successfully.'));
}

function handle_remove($payload) {
    $ownerId = (int) $payload['owner_id'];
    $username = clean_slug($payload['username']);
    $appSlug = clean_slug($payload['app_slug']);
    $row = find_app($ownerId, $username, $appSlug);
    if (!$row || $row['status'] === 'removed') {
        json_response(404, array('success' => 0, 'error' => 'not_found', 'message' => 'App was not found.'));
    }
    if (is_dir($row['folder_path'])) {
        $trash = APPS_STORAGE.'/trash/'.$username.'-'.$appSlug.'-'.time();
        rename($row['folder_path'], $trash);
    }
    $now = gmdate('Y-m-d H:i:s');
    $stmt = db()->prepare('UPDATE apps SET status = ?, updated_at = ?, deleted_at = ? WHERE id = ?');
    $stmt->execute(array('removed', $now, $now, $row['id']));
    json_response(200, array('success' => 1, 'app_slug' => $appSlug, 'status' => 'removed', 'message' => 'App removed.'));
}

try {
    if (PHP_SAPI === 'cli') {
        define('APPS_CLI_TEST', true);
        $action = isset($argv[1]) ? clean_slug($argv[1]) : 'list';
        $payload = array('owner_id' => 1, 'user_id' => 1, 'username' => 'eli', 'domain' => 'apps.biz1.co.il', 'limit' => 25, 'start' => 0);
        if (isset($argv[2])) $payload['app_slug'] = clean_slug($argv[2]);
        if ($action === 'list') handle_list($payload);
        if ($action === 'get') handle_get($payload);
        json_response(404, array('success' => 0, 'error' => 'cli_action_not_supported', 'message' => 'CLI test supports list/get only.'));
    }
    $action = clean_slug(isset($_GET['action']) ? $_GET['action'] : '');
    if (!in_array($action, array('list', 'get', 'add', 'update', 'remove'), true)) {
        json_response(404, array('success' => 0, 'error' => 'route_not_found', 'message' => 'Unknown apps action.'));
    }
    $payload = read_payload($action);
    require_auth($action, $payload);
    if ($action === 'list') handle_list($payload);
    if ($action === 'get') handle_get($payload);
    if ($action === 'add') upsert_app($payload, true);
    if ($action === 'update') upsert_app($payload, !empty($_FILES['zip']));
    if ($action === 'remove') handle_remove($payload);
} catch (Throwable $e) {
    json_response(500, array('success' => 0, 'error' => 'server_error', 'message' => $e->getMessage()));
}

