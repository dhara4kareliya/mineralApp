(function() {
    'use strict';

    const RESERVED_NAMES = new Set([
        'archive8', 'archive9', 'archive10',
        'demo apps', 'demo-apps', 'demoapps', 'demo_apps',
        'specific app', 'specific-app', 'specificapp', 'specific_app',
        'minerals', 'downloads', 'customer', 'customerportal',
        'pages', 'js', 'css', 'assets', 'apps', 'files', 'www',
        'localhost', '127.0.0.1'
    ]);



    function isHandle(value) {
        if (!value) return false;
        const s = String(value).trim();
        return /^[a-z0-9][a-z0-9._-]{0,40}$/i.test(s);
    }

    function normalizeTenant(raw) {
        if (!raw) return '';
        let s = String(raw).trim().toLowerCase();
        s = s.replace(/^https?:\/\//, '');
        s = s.replace(/\.bull36\.com.*$/i, '');
        s = s.replace(/\.biz1\.co\.il.*$/i, '');
        s = s.split('/')[0];
        s = s.replace(/[^a-z0-9-]/g, '');
        return s;
    }

    function isLocalHost() {
        const host = String((typeof location !== 'undefined' && location.hostname) || '').toLowerCase();
        return !host || host === 'localhost' || host === '127.0.0.1' || host === '127.biz1.co.il' ||
            (typeof location !== 'undefined' && location.protocol === 'file:');
    }

    function resolveApiRoot() {
        const host = String((typeof location !== 'undefined' && location.hostname) || '').toLowerCase();
        if (host.includes('bull36.com')) {
            return 'bull36.com';
        }
        if (isLocalHost()) return 'bull36.com';
        return 'biz1.co.il';
    }

    function resolveTenant() {
        // 0. Manual config override
        if (window.CP_CONFIG_OVERRIDE && window.CP_CONFIG_OVERRIDE.USER_NAME) {
            return normalizeTenant(window.CP_CONFIG_OVERRIDE.USER_NAME);
        }

        // 1. URL query parameter: ?tenant=xxx or ?user=xxx or ?account=xxx
        try {
            const q = new URLSearchParams(window.location.search || '');
            const param = q.get('tenant') || q.get('user') || q.get('account');
            if (param && isHandle(param) && !RESERVED_NAMES.has(param.toLowerCase())) {
                return normalizeTenant(param);
            }
        } catch (e) { /* ignore */ }

        // 2. Storage override (localStorage or sessionStorage)
        try {
            const stored = localStorage.getItem('cp_tenant') || sessionStorage.getItem('cp_tenant');
            if (stored && isHandle(stored) && !RESERVED_NAMES.has(stored.toLowerCase())) {
                return normalizeTenant(stored);
            }
        } catch (e) { /* ignore */ }

        if (isLocalHost()) return 'demo';

        // 3. Subdomain on hostname: e.g. tenant.biz1.co.il or tenant.bull36.com
        try {
            const host = String((typeof location !== 'undefined' && location.hostname) || '').toLowerCase();
            const parts = host.split('.');
            if (parts.length >= 3 && !RESERVED_NAMES.has(parts[0]) && isHandle(parts[0])) {
                return normalizeTenant(parts[0]);
            }
        } catch (e) { /* ignore */ }

        // 4. Path traversal: e.g. /tenant/customer/ or /tenant/customerportal/
        try {
            const path = window.location.pathname || '';
            const parts = path.split('/').filter(Boolean);
            for (let i = 0; i < parts.length; i++) {
                const p = parts[i].toLowerCase();
                if (p === 'customer' || p === 'customerportal') {
                    if (i > 0) {
                        const candidate = decodeURIComponent(parts[i - 1]).trim().toLowerCase();
                        const candidateClean = candidate.replace(/\s+/g, '');
                        if (
                            isHandle(candidate) &&
                            !candidate.includes(' ') &&
                            !RESERVED_NAMES.has(candidate) &&
                            !RESERVED_NAMES.has(candidateClean)
                        ) {
                            return normalizeTenant(candidate);
                        }
                    }
                }
            }
        } catch (e) { /* ignore */ }

        // 5. Default fallback
        return 'demo';
    }

    const tenant = resolveTenant();
    const apiRoot = resolveApiRoot();
    const apiBase = (window.CP_CONFIG_OVERRIDE && window.CP_CONFIG_OVERRIDE.API_BASE) || `https://${tenant}.${apiRoot}`;

    window.CP_CONFIG = {
        /** API host — tenant subdomain on biz1.co.il or bull36.com */
        API_BASE: apiBase,

        /** Tenant / account user for API requests */
        USER_NAME: tenant,

        DOMAIN_NAME: `${tenant}.${apiRoot}`,

        WS_URL: '',

        FILES_BASE: `https://files.${apiRoot}`,

        ASSET_BASE: `https://files.${apiRoot}`,

        PDF_VIEW_URL: '/client/pdf_signer_customer_view/{id}',

        PAGE_SIZE: 25,

        APP_NAME: 'Customer Portal',

        ASSET_VERSION: '202608201158',

        ...(window.CP_CONFIG_OVERRIDE || {})
    };
})();