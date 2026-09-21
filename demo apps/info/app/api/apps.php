<?php
/**
 * Protected apps hosting API for server225.
 *
 * Biz1 calls this endpoint server-to-server. It validates the HMAC signature,
 * scans uploaded ZIP files, extracts only safe static assets, and stores app
 * metadata in a small SQLite table owned by the hosting server.
 *
 * Folders:
 *   /home/apps/dev/{account}/{slug}          -> https://apps.bull36.com/{account}/{slug}/
 *   /home/apps/public_html/{account}/{slug}  -> https://apps.biz1.co.il/{account}/{slug}/
 *
 * Uploads always land in Dev. Live is updated only after an admin approves
 * a "request to go to live".
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

// Server folders:
//   /home/apps/dev/{account}/{slug}         -> https://apps.bull36.com/{account}/{slug}/
//   /home/apps/public_html/{account}/{slug} -> https://apps.biz1.co.il/{account}/{slug}/
define('APPS_LIVE_ROOT', '/home/apps/public_html');
define('APPS_DEV_ROOT', '/home/apps/dev');
define('APPS_ROOT', APPS_LIVE_ROOT);
define('APPS_STORAGE', '/home/apps/app_storage');
define('APPS_LIVE_DOMAIN', 'apps.biz1.co.il');
define('APPS_DEV_DOMAIN', 'apps.bull36.com');
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
    foreach (array(APPS_STORAGE, APPS_STORAGE.'/tmp', APPS_STORAGE.'/versions', APPS_STORAGE.'/releases', APPS_STORAGE.'/trash', APPS_DEV_ROOT, APPS_LIVE_ROOT) as $dir) {
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
            live_version INTEGER NOT NULL DEFAULT 0,
            description TEXT NOT NULL DEFAULT "",
            developer_name TEXT NOT NULL DEFAULT "",
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT DEFAULT NULL,
            stage TEXT NOT NULL DEFAULT "dev",
            dev_url TEXT NOT NULL DEFAULT "",
            dev_folder_path TEXT NOT NULL DEFAULT "",
            live_url TEXT NOT NULL DEFAULT "",
            live_folder_path TEXT NOT NULL DEFAULT "",
            live_requested_at TEXT DEFAULT NULL,
            live_requested_by INTEGER DEFAULT NULL,
            UNIQUE(owner_id, username, app_slug)
        )'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS app_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id INTEGER NOT NULL,
            owner_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            app_slug TEXT NOT NULL,
            event_type TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            target TEXT NOT NULL DEFAULT "",
            actor_user_id INTEGER DEFAULT NULL,
            actor_name TEXT NOT NULL DEFAULT "",
            message TEXT NOT NULL DEFAULT "",
            created_at TEXT NOT NULL
        )'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS app_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id INTEGER NOT NULL,
            owner_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            app_slug TEXT NOT NULL,
            version INTEGER NOT NULL,
            folder_path TEXT NOT NULL DEFAULT "",
            created_at TEXT NOT NULL,
            created_by INTEGER DEFAULT NULL,
            UNIQUE(owner_id, username, app_slug, version)
        )'
    );
    migrate_schema($pdo);
    return $pdo;
}

function table_columns($pdo) {
    $cols = array();
    foreach ($pdo->query('PRAGMA table_info(apps)')->fetchAll(PDO::FETCH_ASSOC) as $col) {
        $cols[] = $col['name'];
    }
    return $cols;
}

function migrate_schema($pdo) {
    $cols = table_columns($pdo);
    $add = array(
        'stage' => "TEXT NOT NULL DEFAULT 'live'",
        'dev_url' => 'TEXT NOT NULL DEFAULT ""',
        'dev_folder_path' => 'TEXT NOT NULL DEFAULT ""',
        'live_url' => 'TEXT NOT NULL DEFAULT ""',
        'live_folder_path' => 'TEXT NOT NULL DEFAULT ""',
        'live_requested_at' => 'TEXT DEFAULT NULL',
        'live_requested_by' => 'INTEGER DEFAULT NULL',
        'description' => 'TEXT NOT NULL DEFAULT ""',
        // version = current Dev version; live_version = published Live version
        'live_version' => 'INTEGER NOT NULL DEFAULT 0',
        'developer_name' => 'TEXT NOT NULL DEFAULT ""',
        'pending_version' => 'INTEGER NOT NULL DEFAULT 0',
    );
    $stageAdded = false;
    foreach ($add as $name => $ddl) {
        if (!in_array($name, $cols, true)) {
            $pdo->exec('ALTER TABLE apps ADD COLUMN '.$name.' '.$ddl);
            if (!in_array($name, array('description', 'live_version', 'developer_name', 'pending_version'), true)) {
                $stageAdded = true;
            }
        }
    }

    // Always repair missing live_version values (not only on first column add).
    try {
        $pdo->exec("UPDATE apps SET live_version = version WHERE (live_version IS NULL OR live_version = 0) AND live_url IS NOT NULL AND live_url != '' AND stage = 'live'");
        $pdo->exec("UPDATE apps SET live_version = (
            SELECT h.version FROM app_history h
            WHERE h.app_id = apps.id AND h.event_type = 'approve_live'
            ORDER BY h.id DESC LIMIT 1
        ) WHERE (live_version IS NULL OR live_version = 0) AND live_url IS NOT NULL AND live_url != ''
          AND EXISTS (
            SELECT 1 FROM app_history h2
            WHERE h2.app_id = apps.id AND h2.event_type = 'approve_live'
          )");
    } catch (Throwable $e) {
        // history / column may be unavailable on first boot
    }

    if (!$stageAdded) {
        return;
    }
    $pdo->exec("UPDATE apps SET live_url = public_url WHERE (live_url IS NULL OR live_url = '') AND public_url IS NOT NULL AND public_url != ''");
    $pdo->exec("UPDATE apps SET live_folder_path = folder_path WHERE (live_folder_path IS NULL OR live_folder_path = '') AND folder_path IS NOT NULL AND folder_path != ''");
    $pdo->exec("UPDATE apps SET stage = 'live' WHERE (stage IS NULL OR stage = '') AND status IN ('active', 'disabled', 'removed')");
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

function env_url($domain, $username, $appSlug) {
    return 'https://'.$domain.'/'.$username.'/'.$appSlug.'/';
}

function public_url($username, $appSlug) {
    return env_url(APPS_LIVE_DOMAIN, $username, $appSlug);
}

function app_paths($username, $appSlug) {
    mkdir_safe(APPS_DEV_ROOT.'/'.$username);
    mkdir_safe(APPS_LIVE_ROOT.'/'.$username);
    return array(
        'dev' => safe_path(APPS_DEV_ROOT.'/'.$username, $appSlug),
        'live' => safe_path(APPS_LIVE_ROOT.'/'.$username, $appSlug),
        'dev_url' => env_url(APPS_DEV_DOMAIN, $username, $appSlug),
        'live_url' => env_url(APPS_LIVE_DOMAIN, $username, $appSlug),
    );
}

function apps_handle($action, $payload) {
    $action = clean_slug($action);
    if (!in_array($action, array('list', 'get', 'add', 'update', 'remove', 'request_live', 'approve_live', 'reject_live', 'history'), true)) {
        json_response(404, array('success' => 0, 'error' => 'route_not_found', 'message' => 'Unknown apps action.'));
    }
    require_auth($action, $payload);
    if ($action === 'list') handle_list($payload);
    if ($action === 'get') handle_get($payload);
    if ($action === 'add') upsert_app($payload, true);
    if ($action === 'update') upsert_app($payload, !empty($_FILES['zip']));
    if ($action === 'remove') handle_remove($payload);
    if ($action === 'request_live') handle_request_live($payload);
    if ($action === 'approve_live') handle_approve_live($payload);
    if ($action === 'reject_live') handle_reject_live($payload);
    if ($action === 'history') handle_history($payload);
}

function actor_from_payload($payload) {
    return array(
        'user_id' => (int) (isset($payload['actor_user_id']) ? $payload['actor_user_id'] : (isset($payload['user_id']) ? $payload['user_id'] : 0)),
        'name' => trim((string) (isset($payload['actor_name']) ? $payload['actor_name'] : '')),
    );
}

function record_history($appRow, $eventType, $target, $version, $payload, $message = '') {
    if (!$appRow) return;
    $actor = actor_from_payload($payload);
    $stmt = db()->prepare('INSERT INTO app_history (app_id, owner_id, username, app_slug, event_type, version, target, actor_user_id, actor_name, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute(array(
        (int) $appRow['id'],
        (int) $appRow['owner_id'],
        $appRow['username'],
        $appRow['app_slug'],
        $eventType,
        (int) $version,
        $target,
        $actor['user_id'] ?: null,
        $actor['name'],
        $message,
        gmdate('Y-m-d H:i:s'),
    ));
}

function release_dir($username, $appSlug, $version) {
    $base = APPS_STORAGE.'/releases/'.clean_slug($username).'/'.clean_slug($appSlug);
    mkdir_safe($base);
    return $base.'/v'.max(1, (int) $version);
}

function save_release_copy($srcDir, $username, $appSlug, $version) {
    if (!$srcDir || !is_dir($srcDir)) {
        throw new RuntimeException('Cannot save release: source folder missing.');
    }
    $dest = release_dir($username, $appSlug, $version);
    if (is_dir($dest)) {
        remove_dir($dest);
    }
    copy_dir($srcDir, $dest);
    chmod($dest, 0755);
    return $dest;
}

function register_app_version($appRow, $version, $folderPath, $payload = array()) {
    if (!$appRow) return;
    $actor = actor_from_payload($payload);
    $now = gmdate('Y-m-d H:i:s');
    $stmt = db()->prepare('INSERT INTO app_versions (app_id, owner_id, username, app_slug, version, folder_path, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(owner_id, username, app_slug, version) DO UPDATE SET folder_path = excluded.folder_path, created_at = excluded.created_at, created_by = excluded.created_by');
    $stmt->execute(array(
        (int) $appRow['id'],
        (int) $appRow['owner_id'],
        $appRow['username'],
        $appRow['app_slug'],
        (int) $version,
        $folderPath,
        $now,
        $actor['user_id'] ?: null,
    ));
}

function version_source_dir($row, $version) {
    $version = (int) $version;
    $release = release_dir($row['username'], $row['app_slug'], $version);
    if (is_dir($release) && is_file($release.'/index.html')) {
        return $release;
    }
    $stmt = db()->prepare('SELECT folder_path FROM app_versions WHERE owner_id = ? AND username = ? AND app_slug = ? AND version = ? LIMIT 1');
    $stmt->execute(array((int) $row['owner_id'], $row['username'], $row['app_slug'], $version));
    $path = $stmt->fetchColumn();
    if ($path && is_dir($path) && is_file($path.'/index.html')) {
        return $path;
    }
    if ($version === (int) $row['version']) {
        $dev = !empty($row['dev_folder_path']) ? $row['dev_folder_path'] : '';
        if ($dev && is_dir($dev) && is_file($dev.'/index.html')) {
            return $dev;
        }
    }
    return '';
}

function read_live_marker_version($liveDir) {
    if (!$liveDir || !is_dir($liveDir)) return 0;
    $marker = $liveDir.'/.app_version';
    if (!is_file($marker)) return 0;
    return max(0, (int) trim((string) file_get_contents($marker)));
}

function write_live_marker_version($liveDir, $version) {
    if (!$liveDir || !is_dir($liveDir)) return;
    file_put_contents($liveDir.'/.app_version', (string) max(1, (int) $version));
    @chmod($liveDir.'/.app_version', 0644);
}

function resolved_live_version($row) {
    if (!$row) return 0;
    $liveVersion = isset($row['live_version']) ? (int) $row['live_version'] : 0;
    if ($liveVersion > 0) return $liveVersion;
    if (empty($row['live_url'])) return 0;

    $fromMarker = read_live_marker_version(isset($row['live_folder_path']) ? $row['live_folder_path'] : '');
    if ($fromMarker > 0) {
        db()->prepare('UPDATE apps SET live_version = ? WHERE id = ?')->execute(array($fromMarker, (int) $row['id']));
        return $fromMarker;
    }

    $stmt = db()->prepare('SELECT version FROM app_history WHERE app_id = ? AND event_type = ? ORDER BY id DESC LIMIT 1');
    $stmt->execute(array((int) $row['id'], 'approve_live'));
    $fromHistory = (int) $stmt->fetchColumn();
    if ($fromHistory > 0) {
        db()->prepare('UPDATE apps SET live_version = ? WHERE id = ?')->execute(array($fromHistory, (int) $row['id']));
        return $fromHistory;
    }

    if (row_stage($row) === 'live') {
        $fallback = (int) $row['version'];
        if ($fallback > 0) {
            db()->prepare('UPDATE apps SET live_version = ? WHERE id = ?')->execute(array($fallback, (int) $row['id']));
            write_live_marker_version(isset($row['live_folder_path']) ? $row['live_folder_path'] : '', $fallback);
            return $fallback;
        }
    }
    return 0;
}

function requestable_versions($row) {
    $liveVersion = resolved_live_version($row);
    $devVersion = (int) $row['version'];
    $pending = isset($row['pending_version']) ? (int) $row['pending_version'] : 0;
    $out = array();
    for ($v = $liveVersion + 1; $v <= $devVersion; $v++) {
        if ($pending > 0 && $pending === $v) {
            $out[] = $v;
            continue;
        }
        if (version_source_dir($row, $v) !== '') {
            $out[] = $v;
        }
    }
    return $out;
}

function seed_current_release($row, $payload = array()) {
    if (!$row) return;
    $version = (int) $row['version'];
    if ($version <= 0) return;
    if (version_source_dir($row, $version) !== '') return;
    $dev = !empty($row['dev_folder_path']) ? $row['dev_folder_path'] : '';
    if (!$dev || !is_dir($dev)) return;
    try {
        $path = save_release_copy($dev, $row['username'], $row['app_slug'], $version);
        register_app_version($row, $version, $path, $payload);
    } catch (Throwable $e) {
        // ignore seed failures
    }
}

function row_stage($row) {
    if (!$row) return 'dev';
    $stage = isset($row['stage']) ? trim((string) $row['stage']) : '';
    return in_array($stage, array('dev', 'pending_live', 'live'), true) ? $stage : 'live';
}

function display_status($row) {
    if (!$row) return 'dev';
    if ($row['status'] === 'removed') return 'removed';
    if ($row['status'] === 'disabled') return 'disabled';
    $stage = row_stage($row);
    if ($stage === 'pending_live') return 'pending_live';
    if ($stage === 'dev') return 'dev';
    return $row['status'] ?: 'active';
}

function primary_url($row) {
    $stage = row_stage($row);
    if ($stage === 'live' && !empty($row['live_url'])) return $row['live_url'];
    if (!empty($row['dev_url'])) return $row['dev_url'];
    if (!empty($row['live_url'])) return $row['live_url'];
    return isset($row['public_url']) ? $row['public_url'] : '';
}

function copy_dir($src, $dst) {
    if (!is_dir($src)) {
        throw new RuntimeException('Source folder is missing.');
    }
    mkdir_safe($dst);
    $srcReal = realpath($src);
    if (!$srcReal) {
        throw new RuntimeException('Cannot resolve source folder.');
    }
    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($src, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($items as $item) {
        $from = $item->getPathname();
        $rel = substr($from, strlen($srcReal) + 1);
        if ($rel === false || $rel === '' || strpos($rel, '..') !== false) continue;
        $to = $dst.'/'.$rel;
        if ($item->isDir()) {
            mkdir_safe($to);
            continue;
        }
        mkdir_safe(dirname($to));
        if (!copy($from, $to)) {
            throw new RuntimeException('Cannot copy file: '.$rel);
        }
        chmod($to, 0644);
    }
}

function trash_dir($dir, $username, $appSlug, $label) {
    if (!$dir || !is_dir($dir)) return;
    rename($dir, APPS_STORAGE.'/trash/'.$username.'-'.$appSlug.'-'.$label.'-'.time());
}

function app_row($row) {
    if (!$row) return null;
    seed_current_release($row);
    $stage = row_stage($row);
    $devUrl = isset($row['dev_url']) ? $row['dev_url'] : '';
    $liveUrl = isset($row['live_url']) ? $row['live_url'] : '';
    $devVersion = (int) $row['version'];
    $liveVersion = resolved_live_version($row);
    $pendingVersion = isset($row['pending_version']) ? (int) $row['pending_version'] : 0;
    if ($stage === 'pending_live' && $pendingVersion <= 0) {
        $pendingVersion = $devVersion;
    }
    $requestVersions = requestable_versions(array_merge($row, array('live_version' => $liveVersion, 'pending_version' => $pendingVersion)));
    return array(
        'id' => (int) $row['id'],
        'owner_id' => (int) $row['owner_id'],
        'user_id' => (int) $row['user_id'],
        'developer_name' => isset($row['developer_name']) ? $row['developer_name'] : '',
        'username' => $row['username'],
        'app_name' => $row['app_name'],
        'app_slug' => $row['app_slug'],
        'description' => isset($row['description']) ? $row['description'] : '',
        'status' => $row['status'],
        'stage' => $stage,
        'display_status' => display_status($row),
        'scan_status' => $row['scan_status'],
        'scan_report' => $row['scan_report'],
        'public_url' => primary_url($row),
        'dev_url' => $devUrl,
        'live_url' => $liveUrl,
        'version' => $devVersion,
        'dev_version' => $devVersion,
        'live_version' => $liveVersion,
        'pending_version' => $pendingVersion,
        'pending_live_version' => $stage === 'pending_live' ? ($pendingVersion ?: $devVersion) : null,
        'request_versions' => $requestVersions,
        'live_requested_at' => isset($row['live_requested_at']) ? $row['live_requested_at'] : null,
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
        // Capital F only: Function("...") constructor. Do NOT use /i — that also matches normal function().
        '/\bFunction\s*\(/',
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
    if ($status === 'dev' || $status === 'pending_live') {
        $where .= ' AND stage = ? AND status != ?';
        $params[] = $status;
        $params[] = 'removed';
    } elseif ($status === 'active') {
        $where .= ' AND status = ? AND stage = ?';
        $params[] = 'active';
        $params[] = 'live';
    } elseif ($status !== '') {
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
    $description = substr(trim((string) (isset($payload['description']) ? $payload['description'] : '')), 0, 1000);
    $developerName = substr(trim((string) (isset($payload['developer_name']) ? $payload['developer_name'] : (isset($payload['actor_name']) ? $payload['actor_name'] : ''))), 0, 120);
    $status = isset($payload['status']) && in_array($payload['status'], array('active', 'disabled'), true) ? $payload['status'] : 'active';
    if (!$ownerId || !$userId || !$username || !$appSlug || !$appName) {
        json_response(400, array('success' => 0, 'error' => 'missing_required_parameter', 'message' => 'owner_id, user_id, username, app_name, and app_slug are required.'));
    }
    $paths = app_paths($username, $appSlug);
    $devDir = $paths['dev'];
    $liveDir = $paths['live'];
    $now = gmdate('Y-m-d H:i:s');
    $row = find_app($ownerId, $username, $appSlug);
    $version = $row ? ((int) $row['version'] + ($replaceZip ? 1 : 0)) : 1;
    $liveVersion = $row && isset($row['live_version']) ? (int) $row['live_version'] : 0;
    $stage = $row ? row_stage($row) : 'dev';
    $devUrl = $paths['dev_url'];
    $liveUrl = $row && !empty($row['live_url']) ? $row['live_url'] : '';
    $liveFolder = $row && !empty($row['live_folder_path']) ? $row['live_folder_path'] : '';
    $isNew = !$row;
    $prevStatus = $row ? $row['status'] : '';
    $releasePath = '';
    if ($row && !$replaceZip && !array_key_exists('description', $payload)) {
        $description = isset($row['description']) ? $row['description'] : '';
    }
    if ($row && $developerName === '') {
        $developerName = isset($row['developer_name']) ? $row['developer_name'] : '';
    }

    if ($replaceZip) {
        $zipPath = save_uploaded_zip($payload);
        $tmpDir = APPS_STORAGE.'/tmp/'.$username.'-'.$appSlug.'-'.bin2hex(random_bytes(8));
        list($ok, $message) = extract_zip_safely($zipPath, $tmpDir);
        if (!$ok) {
            remove_dir($tmpDir);
            json_response(400, array('success' => 0, 'error' => 'zip_rejected', 'message' => $message));
        }
        if (is_dir($devDir)) {
            $backup = APPS_STORAGE.'/versions/'.$username.'-'.$appSlug.'-dev-v'.$version.'-'.time();
            rename($devDir, $backup);
        }
        rename($tmpDir, $devDir);
        chmod($devDir, 0755);
        apply_app_status_policy($devDir, 'active');
        $stage = 'dev';
        try {
            $releasePath = save_release_copy($devDir, $username, $appSlug, $version);
        } catch (Throwable $e) {
            json_response(500, array('success' => 0, 'error' => 'release_save_failed', 'message' => $e->getMessage()));
        }
    } elseif ($liveFolder && is_dir($liveFolder)) {
        apply_app_status_policy($liveFolder, $status);
    } elseif (is_dir($liveDir)) {
        apply_app_status_policy($liveDir, $status);
    }

    $zipSize = (int) (isset($payload['zip_size']) ? $payload['zip_size'] : ($row ? $row['zip_size'] : 0));
    $primaryUrl = $stage === 'live' && $liveUrl ? $liveUrl : $devUrl;
    $folderPath = $stage === 'live' && $liveFolder ? $liveFolder : $devDir;
    if (!$replaceZip && $row) {
        $status = isset($payload['status']) && in_array($payload['status'], array('active', 'disabled'), true) ? $payload['status'] : $row['status'];
        $devUrl = !empty($row['dev_url']) ? $row['dev_url'] : $devUrl;
        $devDir = !empty($row['dev_folder_path']) ? $row['dev_folder_path'] : $devDir;
        $primaryUrl = primary_url(array_merge($row, array('status' => $status, 'stage' => $stage, 'dev_url' => $devUrl, 'live_url' => $liveUrl)));
        $folderPath = $row['folder_path'];
    }

    if ($row) {
        $stmt = db()->prepare('UPDATE apps SET user_id = ?, developer_name = ?, app_name = ?, description = ?, public_url = ?, folder_path = ?, zip_size = ?, status = ?, scan_status = ?, scan_report = ?, version = ?, updated_at = ?, deleted_at = NULL, stage = ?, dev_url = ?, dev_folder_path = ?, live_url = ?, live_folder_path = ?, live_requested_at = ? WHERE id = ?');
        $stmt->execute(array(
            $userId,
            $developerName,
            $appName,
            $description,
            $primaryUrl,
            $folderPath,
            $zipSize,
            $status,
            'passed',
            'OK',
            $version,
            $now,
            $stage,
            $devUrl,
            $devDir,
            $liveUrl,
            $liveFolder,
            $replaceZip ? null : (isset($row['live_requested_at']) ? $row['live_requested_at'] : null),
            $row['id'],
        ));
        $id = (int) $row['id'];
    } else {
        $stmt = db()->prepare('INSERT INTO apps (owner_id, user_id, developer_name, username, app_name, app_slug, domain, public_url, folder_path, zip_size, status, scan_status, scan_report, version, live_version, description, created_at, updated_at, stage, dev_url, dev_folder_path, live_url, live_folder_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute(array($ownerId, $userId, $developerName, $username, $appName, $appSlug, APPS_DEV_DOMAIN, $primaryUrl, $folderPath, $zipSize, $status, 'passed', 'OK', $version, 0, $description, $now, $now, 'dev', $devUrl, $devDir, '', ''));
        $id = (int) db()->lastInsertId();
        $stage = 'dev';
        $liveVersion = 0;
    }

    $saved = find_app($ownerId, $username, $appSlug);
    if ($replaceZip && !empty($releasePath) && $saved) {
        register_app_version($saved, $version, $releasePath, $payload);
    }
    if ($replaceZip) {
        if ($isNew) {
            record_history($saved, 'create_app', 'dev', $version, $payload, 'App created');
            record_history($saved, 'upload_dev', 'dev', $version, $payload, 'First upload to Dev v'.$version);
        } else {
            record_history($saved, 'reupload_dev', 'dev', $version, $payload, 'Re-uploaded to Dev v'.$version);
        }
    } elseif ($row && $prevStatus !== $status && in_array($status, array('active', 'disabled'), true)) {
        record_history($saved, $status === 'disabled' ? 'disabled' : 'enabled', $stage === 'live' ? 'live' : 'dev', $version, $payload, $status === 'disabled' ? 'App disabled' : 'App enabled');
    }

    json_response(200, array(
        'success' => 1,
        'app_id' => $id,
        'app_slug' => $appSlug,
        'status' => $status,
        'stage' => $stage,
        'version' => $version,
        'dev_version' => $version,
        'live_version' => $liveVersion,
        'description' => $description,
        'public_url' => $primaryUrl,
        'dev_url' => $devUrl,
        'live_url' => $liveUrl,
        'message' => $replaceZip ? 'App uploaded to Dev successfully.' : 'App saved successfully.',
    ));
}

function handle_remove($payload) {
    $ownerId = (int) $payload['owner_id'];
    $username = clean_slug($payload['username']);
    $appSlug = clean_slug($payload['app_slug']);
    $row = find_app($ownerId, $username, $appSlug);
    if (!$row || $row['status'] === 'removed') {
        json_response(404, array('success' => 0, 'error' => 'not_found', 'message' => 'App was not found.'));
    }
    trash_dir(isset($row['dev_folder_path']) ? $row['dev_folder_path'] : '', $username, $appSlug, 'dev');
    trash_dir(isset($row['live_folder_path']) ? $row['live_folder_path'] : '', $username, $appSlug, 'live');
    if (!empty($row['folder_path']) && is_dir($row['folder_path'])) {
        trash_dir($row['folder_path'], $username, $appSlug, 'app');
    }
    $now = gmdate('Y-m-d H:i:s');
    $stmt = db()->prepare('UPDATE apps SET status = ?, stage = ?, updated_at = ?, deleted_at = ?, live_requested_at = NULL WHERE id = ?');
    $stmt->execute(array('removed', row_stage($row), $now, $now, $row['id']));
    json_response(200, array('success' => 1, 'app_slug' => $appSlug, 'status' => 'removed', 'message' => 'App removed.'));
}

function require_app_row($payload) {
    $row = find_app((int) $payload['owner_id'], clean_slug($payload['username']), clean_slug($payload['app_slug']));
    if (!$row || $row['status'] === 'removed') {
        json_response(404, array('success' => 0, 'error' => 'not_found', 'message' => 'App was not found.'));
    }
    return $row;
}

function handle_request_live($payload) {
    $row = require_app_row($payload);
    $liveVersion = resolved_live_version($row);
    $devVersion = (int) $row['version'];
    $requestVersion = isset($payload['request_version']) && (int) $payload['request_version'] > 0
        ? (int) $payload['request_version']
        : $devVersion;

    if ($requestVersion <= $liveVersion) {
        json_response(400, array('success' => 0, 'error' => 'already_live', 'message' => 'v'.$requestVersion.' is already live or older than live. Choose a newer version.'));
    }
    if ($requestVersion > $devVersion) {
        json_response(400, array('success' => 0, 'error' => 'invalid_version', 'message' => 'Requested version is higher than current Dev version.'));
    }

    $sourceDir = version_source_dir($row, $requestVersion);
    if ($sourceDir === '') {
        json_response(400, array('success' => 0, 'error' => 'missing_version_files', 'message' => 'Files for v'.$requestVersion.' were not found. Re-upload that version first.'));
    }

    $pendingVersion = isset($row['pending_version']) ? (int) $row['pending_version'] : 0;
    if (row_stage($row) === 'pending_live' && $pendingVersion === $requestVersion) {
        json_response(200, array(
            'success' => 1,
            'app_slug' => $row['app_slug'],
            'stage' => 'pending_live',
            'pending_version' => $requestVersion,
            'version' => $devVersion,
            'dev_version' => $devVersion,
            'live_version' => $liveVersion,
            'message' => 'Live request for v'.$requestVersion.' is already waiting for admin approval.',
        ));
    }

    $now = gmdate('Y-m-d H:i:s');
    $requestedBy = (int) (isset($payload['live_requested_by']) ? $payload['live_requested_by'] : $payload['user_id']);
    $stmt = db()->prepare('UPDATE apps SET stage = ?, pending_version = ?, live_requested_at = ?, live_requested_by = ?, updated_at = ? WHERE id = ?');
    $stmt->execute(array('pending_live', $requestVersion, $now, $requestedBy, $now, $row['id']));
    record_history($row, 'request_live', 'live', $requestVersion, $payload, 'Requested to go live v'.$requestVersion);
    json_response(200, array(
        'success' => 1,
        'app_slug' => $row['app_slug'],
        'stage' => 'pending_live',
        'pending_version' => $requestVersion,
        'version' => $devVersion,
        'dev_version' => $devVersion,
        'live_version' => $liveVersion,
        'message' => 'Live request sent for v'.$requestVersion.'. Waiting for admin approval.',
    ));
}

function handle_approve_live($payload) {
    $row = require_app_row($payload);
    if (row_stage($row) !== 'pending_live') {
        json_response(400, array('success' => 0, 'error' => 'not_requested', 'message' => 'This app has not been requested for live.'));
    }
    $username = $row['username'];
    $appSlug = $row['app_slug'];
    $paths = app_paths($username, $appSlug);
    $promoteVersion = isset($row['pending_version']) && (int) $row['pending_version'] > 0
        ? (int) $row['pending_version']
        : (int) $row['version'];
    $sourceDir = version_source_dir($row, $promoteVersion);
    if ($sourceDir === '') {
        json_response(400, array('success' => 0, 'error' => 'missing_version_files', 'message' => 'Files for v'.$promoteVersion.' were not found.'));
    }
    $liveDir = $paths['live'];
    $tmpLive = APPS_STORAGE.'/tmp/'.$username.'-'.$appSlug.'-promote-'.bin2hex(random_bytes(8));
    try {
        copy_dir($sourceDir, $tmpLive);
    } catch (Throwable $e) {
        remove_dir($tmpLive);
        json_response(500, array('success' => 0, 'error' => 'promote_copy_failed', 'message' => $e->getMessage()));
    }
    $backup = null;
    if (is_dir($liveDir)) {
        $prevLive = resolved_live_version($row) ?: $promoteVersion;
        $backup = APPS_STORAGE.'/versions/'.$username.'-'.$appSlug.'-live-v'.$prevLive.'-'.time();
        if (!rename($liveDir, $backup)) {
            remove_dir($tmpLive);
            json_response(500, array('success' => 0, 'error' => 'promote_backup_failed', 'message' => 'Cannot backup the current live folder.'));
        }
    }
    if (!rename($tmpLive, $liveDir)) {
        if ($backup && is_dir($backup)) {
            rename($backup, $liveDir);
        }
        json_response(500, array('success' => 0, 'error' => 'promote_publish_failed', 'message' => 'Cannot publish the live folder.'));
    }
    chmod($liveDir, 0755);
    $status = 'active';
    apply_app_status_policy($liveDir, $status);
    $now = gmdate('Y-m-d H:i:s');
    $liveUrl = $paths['live_url'];
    $devVersion = (int) $row['version'];
    $nextStage = ($devVersion > $promoteVersion) ? 'dev' : 'live';
    $stmt = db()->prepare('UPDATE apps SET status = ?, stage = ?, public_url = ?, folder_path = ?, live_url = ?, live_folder_path = ?, live_version = ?, pending_version = 0, live_requested_at = NULL, updated_at = ?, deleted_at = NULL, domain = ? WHERE id = ?');
    $stmt->execute(array($status, $nextStage, $liveUrl, $liveDir, $liveUrl, $liveDir, $promoteVersion, $now, APPS_LIVE_DOMAIN, $row['id']));
    write_live_marker_version($liveDir, $promoteVersion);
    record_history($row, 'approve_live', 'live', $promoteVersion, $payload, 'Admin approved and published v'.$promoteVersion.' to Live');
    json_response(200, array(
        'success' => 1,
        'app_slug' => $appSlug,
        'status' => $status,
        'stage' => $nextStage,
        'version' => $devVersion,
        'dev_version' => $devVersion,
        'live_version' => $promoteVersion,
        'pending_version' => 0,
        'public_url' => $liveUrl,
        'dev_url' => $paths['dev_url'],
        'live_url' => $liveUrl,
        'message' => 'App v'.$promoteVersion.' approved and published to Live.',
    ));
}

function handle_reject_live($payload) {
    $row = require_app_row($payload);
    if (row_stage($row) !== 'pending_live') {
        json_response(400, array('success' => 0, 'error' => 'not_requested', 'message' => 'This app has not been requested for live.'));
    }
    $liveVersion = resolved_live_version($row);
    $devVersion = (int) $row['version'];
    $pendingVersion = isset($row['pending_version']) ? (int) $row['pending_version'] : $devVersion;
    $stage = ($liveVersion > 0 && !empty($row['live_folder_path']) && is_dir($row['live_folder_path']))
        ? (($devVersion > $liveVersion) ? 'dev' : 'live')
        : 'dev';
    $now = gmdate('Y-m-d H:i:s');
    $stmt = db()->prepare('UPDATE apps SET stage = ?, pending_version = 0, live_requested_at = NULL, updated_at = ? WHERE id = ?');
    $stmt->execute(array($stage, $now, $row['id']));
    record_history($row, 'reject_live', $stage === 'live' ? 'live' : 'dev', $pendingVersion, $payload, 'Admin rejected live request for v'.$pendingVersion);
    json_response(200, array(
        'success' => 1,
        'app_slug' => $row['app_slug'],
        'stage' => $stage,
        'dev_version' => $devVersion,
        'live_version' => $liveVersion,
        'message' => 'Live request for v'.$pendingVersion.' rejected.',
    ));
}

function handle_history($payload) {
    $ownerId = (int) $payload['owner_id'];
    $username = clean_slug($payload['username']);
    $appSlug = clean_slug(isset($payload['app_slug']) ? $payload['app_slug'] : '');
    if (!$ownerId || !$username || !$appSlug) {
        json_response(400, array('success' => 0, 'error' => 'missing_required_parameter', 'message' => 'owner_id, username, and app_slug are required.'));
    }
    $row = find_app($ownerId, $username, $appSlug);
    if (!$row) {
        json_response(404, array('success' => 0, 'error' => 'not_found', 'message' => 'App was not found.'));
    }
    $limit = max(1, min(100, (int) (isset($payload['limit']) ? $payload['limit'] : 50)));
    $stmt = db()->prepare('SELECT * FROM app_history WHERE owner_id = ? AND username = ? AND app_slug = ? ORDER BY id DESC LIMIT ?');
    $stmt->execute(array($ownerId, $username, $appSlug, $limit));
    $events = array();
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $event) {
        $events[] = array(
            'id' => (int) $event['id'],
            'event_type' => $event['event_type'],
            'version' => (int) $event['version'],
            'target' => $event['target'],
            'actor_user_id' => $event['actor_user_id'] !== null ? (int) $event['actor_user_id'] : null,
            'actor_name' => $event['actor_name'],
            'message' => $event['message'],
            'created_at' => $event['created_at'],
        );
    }
    json_response(200, array(
        'success' => 1,
        'app' => app_row($row),
        'count' => count($events),
        'data' => $events,
    ));
}

try {
    if (PHP_SAPI === 'cli') {
        define('APPS_CLI_TEST', true);
        $action = isset($argv[1]) ? clean_slug($argv[1]) : 'list';
        $payload = array('owner_id' => 1, 'user_id' => 1, 'username' => 'eli', 'domain' => APPS_LIVE_DOMAIN, 'limit' => 25, 'start' => 0);
        if (isset($argv[2])) $payload['app_slug'] = clean_slug($argv[2]);
        if ($action === 'list') handle_list($payload);
        if ($action === 'get') handle_get($payload);
        json_response(404, array('success' => 0, 'error' => 'cli_action_not_supported', 'message' => 'CLI test supports list/get only.'));
    }
    $action = clean_slug(isset($_GET['action']) ? $_GET['action'] : '');
    $payload = read_payload($action);
    apps_handle($action, $payload);
} catch (Throwable $e) {
    json_response(500, array('success' => 0, 'error' => 'server_error', 'message' => $e->getMessage()));
}

