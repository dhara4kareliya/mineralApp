<?php
/**
 * Maps /{username}/entries/... to this folder so local PHP can serve
 * the same URLs as https://apps.bull36.com/{username}/entries/
 *
 *   php -S localhost:8000 router.php
 */
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = $uri === null ? '/' : urldecode($uri);

function entries_mime($file) {
    static $types = [
        'html' => 'text/html; charset=UTF-8',
        'js' => 'application/javascript; charset=UTF-8',
        'css' => 'text/css; charset=UTF-8',
        'svg' => 'image/svg+xml',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'map' => 'application/json',
    ];
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    return isset($types[$ext]) ? $types[$ext] : 'application/octet-stream';
}

function entries_serve($file) {
    if (!is_file($file)) {
        return false;
    }
    header('Content-Type: ' . entries_mime($file));
    readfile($file);
    return true;
}

if (preg_match('#^/([^/]+)/entries(?:/(.*))?$#', $uri, $m)) {
    $rest = isset($m[2]) ? $m[2] : '';
    if (strpos($rest, '..') !== false) {
        http_response_code(400);
        header('Content-Type: text/plain; charset=UTF-8');
        echo 'Bad Request';
        return true;
    }
    if ($rest === '' || substr($rest, -1) === '/') {
        return entries_serve(__DIR__ . '/index.html');
    }
    $target = __DIR__ . '/' . $rest;
    if (entries_serve($target)) {
        return true;
    }
    http_response_code(404);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Not Found';
    return true;
}

$local = __DIR__ . $uri;
if ($uri !== '/' && is_file($local)) {
    return false;
}

if ($uri === '/' || $uri === '/index.html' || $uri === '/login.html') {
    return false;
}

http_response_code(404);
header('Content-Type: text/plain; charset=UTF-8');
echo 'Not Found';
return true;
