<?php
/**
 * Same-origin bridge to Bull36 dashboard project APIs.
 * Browser CORS cannot send the CRM session cookie, so this PHP proxy does.
 */
declare(strict_types=1);
error_reporting(E_ALL & ~E_DEPRECATED);
ini_set('display_errors', '0');
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function json_out(array $payload, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function read_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $json = json_decode($raw, true);
    if (is_array($json)) {
        return $json;
    }
    return $_POST ?: [];
}

function assert_bull36_domain(string $domain): string
{
    $domain = trim($domain);
    if ($domain === '') {
        throw new RuntimeException('Dashboard domain is missing');
    }
    if (!preg_match('#^https://#i', $domain)) {
        $domain = 'https://' . preg_replace('#^https?://#i', '', $domain);
    }
    $domain = rtrim($domain, '/');
    $host = parse_url($domain, PHP_URL_HOST) ?: '';
    if (!preg_match('/^[a-z0-9-]+\.bull36\.com$/i', $host)) {
        throw new RuntimeException('Invalid dashboard host');
    }
    return $domain;
}

function cookie_jar(): string
{
    $id = preg_replace('/[^a-zA-Z0-9,-]/', '', session_id());
    if ($id === '') {
        throw new RuntimeException('Session is not available');
    }
    return sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'biz1dash_' . $id . '.cookie';
}

function curl_dash(string $url, array $fields, bool $multipart = false): array
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('PHP cURL is required');
    }
    $jar = cookie_jar();
    $ch = curl_init($url);
    $headers = ['Accept: application/json, text/javascript, */*; q=0.01', 'X-Requested-With: XMLHttpRequest'];
    if ($multipart) {
        $body = $fields;
    } else {
        $parts = [];
        foreach ($fields as $key => $value) {
            if (is_array($value)) {
                foreach ($value as $item) {
                    $parts[] = rawurlencode((string) $key) . '[]=' . rawurlencode((string) $item);
                }
            } else {
                $parts[] = rawurlencode((string) $key) . '=' . rawurlencode((string) $value);
            }
        }
        $body = implode('&', $parts);
        $headers[] = 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8';
    }
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HEADER => false,
        CURLOPT_COOKIEJAR => $jar,
        CURLOPT_COOKIEFILE => $jar,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $text = curl_exec($ch);
    $err = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($text === false) {
        throw new RuntimeException($err ?: 'Dashboard request failed');
    }
    return ['status' => $status, 'text' => $text];
}

function decode_json(string $text): array
{
    $json = json_decode($text, true);
    if (!is_array($json)) {
        $pos = strpos($text, '{');
        if ($pos !== false) {
            $json = json_decode(substr($text, $pos), true);
        }
    }
    if (!is_array($json)) {
        if (stripos($text, 'dashboard/login') !== false || stripos($text, 'check_login') !== false) {
            json_out(['ok' => false, 'error' => 'dashboard_auth', 'message' => 'Dashboard session expired'], 401);
        }
        throw new RuntimeException('Dashboard did not return JSON');
    }
    return $json;
}

function text_of(?DOMNode $node): string
{
    if (!$node) {
        return '';
    }
    return trim(preg_replace('/\s+/u', ' ', $node->textContent ?? ''));
}

function parse_projects_html(string $html): array
{
    $rows = [];
    if (trim($html) === '') {
        return $rows;
    }
    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $wrapped = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><table>' . $html . '</table></body></html>';
    $dom->loadHTML($wrapped, LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();
    $xpath = new DOMXPath($dom);
    foreach ($xpath->query('//tr[contains(@class,"main_project_")]') as $tr) {
        $class = $tr->getAttribute('class');
        $id = '';
        if (preg_match('/main_project_(\d+)/', $class, $m)) {
            $id = $m[1];
        }
        if ($id === '') {
            $id = $tr->getAttribute('data_id') ?: $tr->getAttribute('data-id');
        }
        if ($id === '') {
            continue;
        }
        $nameNode = $xpath->query('.//*[contains(@class,"projjjk_name")]', $tr)->item(0);
        $clientNode = $xpath->query('.//*[contains(@class,"projjjk_cust_name")]', $tr)->item(0);
        $badgeNode = $xpath->query('.//*[contains(@class,"badge_style")]', $tr)->item(0);
        $date = '';
        $tds = $xpath->query('./td', $tr);
        if ($tds->length >= 4) {
            $date = text_of($tds->item(3));
        }
        if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/', $date, $dm)) {
            $date = sprintf('%04d-%02d-%02d', (int) $dm[3], (int) $dm[2], (int) $dm[1]);
        }
        $testing = 0;
        $queries = 0;
        $todo = 0;
        foreach ($xpath->query('.//*[contains(@class,"project_count_data")]', $tr) as $countEl) {
            $cls = $countEl->getAttribute('class');
            $n = (int) trim($countEl->textContent);
            if (strpos($cls, 'testing') !== false) {
                $testing = $n;
            } elseif (strpos($cls, 'queries') !== false) {
                $queries = $n;
            } elseif (strpos($cls, 'to_do') !== false) {
                $todo = $n;
            }
        }
        $team = [];
        $seen = [];
        $teamCell = $xpath->query('.//td[contains(@class,"project_user_icn_tbl")]', $tr)->item(0);
        if ($teamCell) {
            $nodes = $xpath->query('.//*[contains(@class,"filter_column_text") or contains(@class,"no_user_image") or contains(@class,"tipTop")]', $teamCell);
            if (!$nodes->length) {
                $nodes = $xpath->query('.//*[@title or @original-title]', $teamCell);
            }
            foreach ($nodes as $el) {
                $mid = $el->getAttribute('data_id') ?: $el->getAttribute('data-id') ?: $el->getAttribute('organization_id');
                $mname = trim(html_entity_decode(
                    $el->getAttribute('title') ?: $el->getAttribute('original-title') ?: '',
                    ENT_QUOTES | ENT_HTML5,
                    'UTF-8'
                ));
                if ($mname === '') {
                    $mname = text_of($el);
                }
                if ($mname === '' && $mid === '') {
                    continue;
                }
                if (preg_match('/^\d+$/', $mname) || strlen($mname) > 80) {
                    continue;
                }
                $key = $mid !== '' ? ('id:' . $mid) : ('name:' . strtolower($mname));
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
                $team[] = ['id' => (string) $mid, 'name' => $mname ?: ('#' . $mid)];
            }
        }
        $statusLabel = text_of($badgeNode);
        $open = $testing + $queries + $todo;
        $rows[] = [
            'id' => (string) $id,
            'project_id' => (string) $id,
            'name' => text_of($nameNode) ?: ('#' . $id),
            'project_name' => text_of($nameNode) ?: ('#' . $id),
            'client_name' => text_of($clientNode),
            'customer_name' => text_of($clientNode),
            'created_at' => $date,
            'c_date' => $date,
            'start_date' => $date,
            'status' => $statusLabel,
            'status_label' => $statusLabel,
            'status_name' => $statusLabel,
            'testing' => $testing,
            'queries' => $queries,
            'to_do' => $todo,
            'open_items' => $open,
            'open' => $open,
            'team' => $team,
            'team_members' => $team,
        ];
    }
    return $rows;
}

function parse_board_html(string $html): array
{
    $board = [
        'name' => '',
        'client_name' => '',
        'client_id' => '',
        'team' => [],
        'columns' => [],
    ];
    if (trim($html) === '') {
        return $board;
    }
    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="utf-8"><div id="boardroot">' . $html . '</div>', LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();
    $xpath = new DOMXPath($dom);

    $nameNode = $xpath->query('//*[contains(@class,"project_name_abc")]')->item(0);
    $board['name'] = text_of($nameNode);
    $clientNode = $xpath->query('//*[contains(@class,"client_name_abc")]')->item(0);
    $board['client_name'] = text_of($clientNode);

    $addBtn = $xpath->query('//*[contains(@class,"add_newww_mission_for_project")]')->item(0);
    if ($addBtn) {
        $board['client_id'] = $addBtn->getAttribute('client_id') ?: $addBtn->getAttribute('client-id');
        if ($board['client_name'] === '') {
            $board['client_name'] = $addBtn->getAttribute('client_name');
        }
    }

    foreach ($xpath->query('//*[contains(@class,"chat_user_icon_m")]') as $li) {
        $title = '';
        $mid = '';
        foreach ($xpath->query('.//*[@title or @organization_id]', $li) as $el) {
            if ($el->hasAttribute('title') && $title === '') {
                $title = $el->getAttribute('title');
            }
            if ($el->hasAttribute('organization_id') && $mid === '') {
                $mid = $el->getAttribute('organization_id');
            }
        }
        if ($mid === '') {
            continue;
        }
        $board['team'][] = ['id' => (string) $mid, 'name' => $title !== '' ? $title : ('#' . $mid)];
    }

    foreach ($xpath->query('//*[contains(concat(" ", normalize-space(@class), " "), " task_div_grid ")]') as $col) {
        $key = $col->getAttribute('data_id');
        if ($key === '') {
            continue;
        }
        $h6 = $xpath->query('.//h6', $col)->item(0);
        $top = $xpath->query('.//*[contains(@class,"widget_top")]', $col)->item(0);
        $color = '';
        if ($top && preg_match('/border-color:\s*([^;!]+)/i', $top->getAttribute('style'), $cm)) {
            $color = trim($cm[1]);
        }
        $canAdd = $xpath->query('.//*[contains(@class,"add_newww_mission_for_project")]', $col)->length > 0;
        $missions = [];
        foreach ($xpath->query('.//*[contains(@class,"project_list_body")]', $col) as $card) {
            $mid = $card->getAttribute('data_id');
            if ($mid === '' || !preg_match('/^\d+$/', $mid)) {
                continue;
            }
            $p = $xpath->query('./p', $card)->item(0);
            $dateNode = $xpath->query('.//*[contains(@class,"date_this_mission_to_do")]', $card)->item(0);
            $assignees = [];
            foreach ($xpath->query('.//*[@title]', $card) as $el) {
                $t = trim($el->getAttribute('title'));
                if ($t !== '' && !in_array($t, $assignees, true)) {
                    $assignees[] = $t;
                }
            }
            $missions[] = [
                'id' => (string) $mid,
                'title' => text_of($p) ?: text_of($card),
                'date' => text_of($dateNode),
                'assignees' => $assignees,
            ];
        }
        $board['columns'][] = [
            'key' => $key,
            'label' => text_of($h6) ?: $key,
            'color' => $color,
            'can_add' => $canAdd,
            'missions' => $missions,
        ];
    }
    return $board;
}

function dash_ok(array $json): bool
{
    foreach (['success', 'sucess', 'ok', 'status'] as $key) {
        if (!array_key_exists($key, $json)) {
            continue;
        }
        $v = $json[$key];
        if ($v === true || $v === 1 || $v === '1' || (is_numeric($v) && (int) $v >= 1)) {
            return true;
        }
    }
    return false;
}

function last_page_from_pagination(string $html): int
{
    $max = 1;
    if (preg_match_all('/data-ci-pagination-page="(\d+)"/', $html, $m)) {
        foreach ($m[1] as $n) {
            $max = max($max, (int) $n);
        }
    }
    return $max;
}

try {
    $in = read_input();
    $action = (string) ($in['action'] ?? $_GET['action'] ?? '');
    $domain = isset($_SESSION['dash_domain']) ? (string) $_SESSION['dash_domain'] : '';
    if (!empty($in['domain'])) {
        $domain = assert_bull36_domain((string) $in['domain']);
        $_SESSION['dash_domain'] = $domain;
    } elseif ($domain !== '') {
        $domain = assert_bull36_domain($domain);
    }

    if ($action === 'status') {
        json_out(['ok' => !empty($_SESSION['dash_ok']), 'domain' => $domain]);
    }

    if ($action === 'logout') {
        $_SESSION['dash_ok'] = false;
        unset($_SESSION['dash_domain']);
        $jar = cookie_jar();
        if (is_file($jar)) {
            @unlink($jar);
        }
        json_out(['ok' => true]);
    }

    if ($action === 'login') {
        $domain = assert_bull36_domain($domain !== '' ? $domain : (string) ($in['domain'] ?? ''));
        $_SESSION['dash_domain'] = $domain;
        $email = trim((string) ($in['email'] ?? $in['username'] ?? ''));
        $password = (string) ($in['password'] ?? '');
        if ($email === '' || $password === '') {
            json_out(['ok' => false, 'message' => 'Email and password are required'], 400);
        }
        $res = curl_dash($domain . '/dashboard/login/check_login', [
            'email' => $email,
            'password' => $password,
        ]);
        $json = decode_json($res['text']);
        $ok = isset($json['success']) && (string) $json['success'] !== '0' && $json['success'] !== false;
        $_SESSION['dash_ok'] = $ok;
        if (!$ok) {
            json_out(['ok' => false, 'message' => (string) ($json['message'] ?? 'Dashboard login failed'), 'raw' => $json], 401);
        }
        json_out(['ok' => true, 'message' => (string) ($json['message'] ?? 'ok')]);
    }

    if ($domain === '') {
        json_out(['ok' => false, 'error' => 'dashboard_auth', 'message' => 'Dashboard is not connected'], 401);
    }

    if ($action === 'list') {
        $search = trim((string) ($in['search'] ?? $in['search_project_name'] ?? ''));
        $team = trim((string) ($in['team_member_id'] ?? $in['search_team_member'] ?? ''));
        $page = max(1, (int) ($in['page_id'] ?? 1));
        $wantAll = empty($in['page_id']);
        $all = [];
        $maxPage = $wantAll ? 40 : $page;
        $current = $wantAll ? 1 : $page;
        while ($current <= $maxPage) {
            $fields = ['page_id' => $current];
            if ($search !== '') {
                $fields['search_project_name'] = $search;
                $fields['search'] = $search;
            }
            if ($team !== '') {
                $fields['search_team_member'] = $team;
            }
            $res = curl_dash($domain . '/dashboard/project/load_project_html_new', $fields);
            if ($res['status'] === 302) {
                json_out(['ok' => false, 'error' => 'dashboard_auth', 'message' => 'Dashboard session expired'], 401);
            }
            $json = decode_json($res['text']);
            if (empty($json['status']) && empty($json['html'])) {
                json_out(['ok' => false, 'message' => (string) ($json['message'] ?? 'Could not load projects'), 'raw' => $json], 400);
            }
            $chunk = parse_projects_html((string) ($json['html'] ?? ''));
            $all = array_merge($all, $chunk);
            if (!$wantAll) {
                break;
            }
            $last = last_page_from_pagination((string) ($json['paggination_html'] ?? ''));
            if ($current >= $last || count($chunk) === 0) {
                break;
            }
            $current++;
        }
        json_out(['ok' => true, 'success' => 1, 'rows' => $all, 'data' => $all, 'count' => count($all), 'total' => count($all)]);
    }

    if ($action === 'get') {
        $id = trim((string) ($in['id'] ?? $in['project_id'] ?? ''));
        $res = curl_dash($domain . '/dashboard/project/get_project', ['id' => $id]);
        $json = decode_json($res['text']);
        json_out(array_merge(['ok' => !empty($json['success'])], $json));
    }

    if ($action === 'save') {
        $fields = [
            'project_name' => (string) ($in['project_name'] ?? $in['name'] ?? ''),
            'project_id' => (string) ($in['project_id'] ?? $in['id'] ?? '0'),
            'client_id' => (string) ($in['client_id'] ?? $in['customer_id'] ?? '0'),
            'credentials' => (string) ($in['credentials'] ?? ''),
            'note' => (string) ($in['note'] ?? ''),
            'tags' => is_array($in['tags'] ?? null) ? implode(',', $in['tags']) : (string) ($in['tags'] ?? ''),
        ];
        if ($fields['project_name'] === '') {
            json_out(['ok' => false, 'message' => 'Project name is required'], 400);
        }
        $members = $in['organizations_user'] ?? $in['team_member_ids'] ?? [];
        if (is_string($members)) {
            $members = array_filter(array_map('trim', explode(',', $members)));
        }
        if (is_array($members)) {
            $fields['organizations_user'] = array_values(array_map('strval', $members));
        }
        $res = curl_dash($domain . '/dashboard/project/save_project', $fields);
        $json = decode_json($res['text']);
        $ok = !empty($json['success']);
        json_out(array_merge(['ok' => $ok, 'id' => $json['success'] ?? null], $json), $ok ? 200 : 400);
    }

    if ($action === 'delete') {
        $id = trim((string) ($in['id'] ?? $in['project_id'] ?? $in['data_id'] ?? ''));
        $userId = trim((string) ($in['user_id'] ?? $in['self_id'] ?? ''));
        if ($id === '' || $userId === '') {
            json_out(['ok' => false, 'message' => 'Project id and user id are required to delete'], 400);
        }
        $res = curl_dash($domain . '/dashboard/project/delete_project', [
            'data_id' => $id,
            'user_id' => $userId,
        ]);
        $json = decode_json($res['text']);
        $ok = isset($json['success']) && (int) $json['success'] >= 1;
        json_out(array_merge(['ok' => $ok], $json), $ok ? 200 : 400);
    }

    if ($action === 'board') {
        $id = trim((string) ($in['id'] ?? $in['project_id'] ?? ''));
        if ($id === '') {
            json_out(['ok' => false, 'message' => 'Project id is required'], 400);
        }
        $res = curl_dash($domain . '/dashboard/project/get_singale_project', ['id' => $id]);
        $json = decode_json($res['text']);
        if (!empty($json['redirect'])) {
            json_out(['ok' => false, 'error' => 'dashboard_auth', 'message' => 'Dashboard session expired'], 401);
        }
        $parsed = parse_board_html((string) ($json['output'] ?? ''));
        json_out([
            'ok' => true,
            'id' => (string) ($json['id'] ?? $id),
            'name' => $parsed['name'] !== '' ? $parsed['name'] : (string) ($json['title'] ?? ''),
            'title' => (string) ($json['title'] ?? $parsed['name']),
            'client_name' => $parsed['client_name'],
            'client_id' => $parsed['client_id'],
            'team' => $parsed['team'],
            'columns' => $parsed['columns'],
            'chart' => is_array($json['chart_output'] ?? null) ? $json['chart_output'] : [],
            'counts' => [
                'to_do' => $json['c_todo'] ?? null,
                'queries' => $json['c_queries'] ?? null,
                'testing' => $json['c_testing'] ?? null,
                'done' => $json['c_done'] ?? null,
            ],
        ]);
    }

    if ($action === 'create_mission') {
        $projectId = trim((string) ($in['project_id'] ?? $in['id'] ?? ''));
        $message = trim((string) ($in['message'] ?? $in['title'] ?? $in['msg'] ?? ''));
        $column = trim((string) ($in['project_column'] ?? $in['data_mission_type'] ?? $in['col_id'] ?? 'to_do'));
        if ($projectId === '' || $message === '') {
            json_out(['ok' => false, 'message' => 'Project and mission text are required'], 400);
        }
        $members = $in['organizations_user'] ?? $in['team_member_ids'] ?? [];
        if (is_string($members)) {
            $members = array_filter(array_map('trim', explode(',', $members)));
        }
        $fields = [
            'mission_id' => '0',
            'project_id' => $projectId,
            'old_project_id' => '0',
            'message' => $message,
            'note' => (string) ($in['note'] ?? ''),
            'data_mission_type' => $column,
            'project_column' => $column,
            'customer_id' => (string) ($in['customer_id'] ?? $in['client_id'] ?? '0'),
        ];
        if (is_array($members) && $members) {
            $fields['organizations_user'] = array_values(array_map('strval', $members));
        }
        $res = curl_dash($domain . '/dashboard/mission/create_mission', $fields);
        $json = decode_json($res['text']);
        $ok = dash_ok($json);
        json_out(array_merge(['ok' => $ok, 'id' => $json['insert_id'] ?? $json['id'] ?? null], $json), $ok ? 200 : 400);
    }

    if ($action === 'move_mission') {
        $missionId = trim((string) ($in['mission_id'] ?? $in['id'] ?? ''));
        $projectId = trim((string) ($in['project_id'] ?? ''));
        $colId = trim((string) ($in['col_id'] ?? $in['project_column'] ?? ''));
        if ($missionId === '' || $projectId === '' || $colId === '') {
            json_out(['ok' => false, 'message' => 'Mission, project and column are required'], 400);
        }
        $order = $in['order'] ?? [];
        if (is_string($order)) {
            $order = array_filter(array_map('trim', explode(',', $order)));
        }
        $fields = [
            'col_id' => $colId,
            'mission_id' => $missionId,
            'project_id' => $projectId,
        ];
        if (is_array($order) && $order) {
            $fields['order'] = array_values(array_map('strval', $order));
        }
        $res = curl_dash($domain . '/dashboard/project/save_mission_project', $fields);
        $json = decode_json($res['text']);
        $ok = dash_ok($json);
        json_out(array_merge(['ok' => $ok], $json), $ok ? 200 : 400);
    }

    json_out(['ok' => false, 'message' => 'Unknown action'], 400);
} catch (Throwable $e) {
    json_out(['ok' => false, 'message' => $e->getMessage()], 500);
}
