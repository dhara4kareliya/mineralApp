/**
 * Minerals & Chasdei Shlomo — Payload & Storage Encryption / Decryption Module
 * Supports:
 * - XOR + UTF-8 + Base64 symmetric cipher compatible with backend (api.php)
 * - Safe token & password encryption for localStorage
 * - Works in browser and Node environments
 */
(function (root) {
  'use strict';

  var DEFAULT_CIPHER_KEY = 'CHASDEY_SHLOMO_APP_SECRET_2026';

  // Ensure window.APP_CONFIG exists and has CIPHER_KEY
  if (!root.APP_CONFIG) {
    root.APP_CONFIG = {};
  }
  if (!root.APP_CONFIG.CIPHER_KEY) {
    root.APP_CONFIG.CIPHER_KEY = DEFAULT_CIPHER_KEY;
  }

  function getCipherKey(customKey) {
    if (customKey && typeof customKey === 'string') return customKey;
    if (root.APP_CONFIG && root.APP_CONFIG.CIPHER_KEY) return root.APP_CONFIG.CIPHER_KEY;
    if (root.Biz1Config && root.Biz1Config.CIPHER_KEY) return root.Biz1Config.CIPHER_KEY;
    return DEFAULT_CIPHER_KEY;
  }

  /**
   * Encrypt an object payload to Base64 XOR string
   * @param {Object|any} payloadObj
   * @param {string} [customKey]
   * @returns {string} base64 encrypted payload
   */
  function encryptPayload(payloadObj, customKey) {
    var jsonStr = JSON.stringify(payloadObj || {});
    var utf8Bytes = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(jsonStr)
      : (function (str) {
          var arr = [];
          for (var i = 0; i < str.length; i++) {
            var code = str.charCodeAt(i);
            if (code < 128) {
              arr.push(code);
            } else {
              var utf8Str = encodeURIComponent(str.charAt(i));
              for (var j = 0; j < utf8Str.length; j++) {
                if (utf8Str[j] === '%') {
                  arr.push(parseInt(utf8Str.substr(j + 1, 2), 16));
                  j += 2;
                } else {
                  arr.push(utf8Str.charCodeAt(j));
                }
              }
            }
          }
          return new Uint8Array(arr);
        })(jsonStr);

    var key = getCipherKey(customKey);
    var xorBytes = new Uint8Array(utf8Bytes.length);
    for (var i = 0; i < utf8Bytes.length; i++) {
      xorBytes[i] = utf8Bytes[i] ^ key.charCodeAt(i % key.length);
    }

    var binary = '';
    var len = xorBytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(xorBytes[i]);
    }

    if (typeof btoa !== 'undefined') {
      return btoa(binary);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(binary, 'binary').toString('base64');
    }
    return '';
  }

  /**
   * Decrypt a Base64 XOR string back to parsed object
   * @param {string} cipherText
   * @param {string} [customKey]
   * @returns {any|null} parsed payload or null on failure
   */
  function decryptPayload(cipherText, customKey) {
    if (!cipherText || typeof cipherText !== 'string') return null;
    var key = getCipherKey(customKey);

    try {
      var b64 = cipherText.trim().replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) {
        b64 += '=';
      }

      var binary = '';
      if (typeof atob !== 'undefined') {
        binary = atob(b64);
      } else if (typeof Buffer !== 'undefined') {
        binary = Buffer.from(b64, 'base64').toString('binary');
      } else {
        return null;
      }

      var xorBytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) {
        xorBytes[i] = binary.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      }

      var jsonStr = typeof TextDecoder !== 'undefined'
        ? new TextDecoder().decode(xorBytes)
        : (function (bytes) {
            var s = '';
            for (var j = 0; j < bytes.length; j++) {
              s += '%' + ('00' + bytes[j].toString(16)).slice(-2);
            }
            return decodeURIComponent(s);
          })(xorBytes);

      return JSON.parse(jsonStr);
    } catch (err) {
      // Fallback: try raw unencrypted base64 JSON
      try {
        var plain = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8');
        return JSON.parse(plain);
      } catch (_) {}
      return null;
    }
  }

  /**
   * Helper: Encrypt a plain string (such as an API token or password)
   */
  function encryptString(str, customKey) {
    if (str == null) return '';
    return encryptPayload({ v: String(str) }, customKey);
  }

  /**
   * Helper: Decrypt an encrypted string
   */
  function decryptString(cipherText, customKey) {
    if (!cipherText) return '';
    var dec = decryptPayload(cipherText, customKey);
    if (dec && typeof dec === 'object' && ('v' in dec)) {
      return String(dec.v);
    }
    return typeof dec === 'string' ? dec : '';
  }

  /**
   * Helper: Encrypt an API Token
   */
  function encryptToken(token) {
    return encryptString(token);
  }

  /**
   * Helper: Decrypt an API Token
   */
  function decryptToken(cipherText) {
    return decryptString(cipherText);
  }

  /**
   * Helper: Encrypt a Password
   */
  function encryptPassword(password) {
    return encryptString(password);
  }

  /**
   * Helper: Decrypt a Password
   */
  function decryptPassword(cipherText) {
    return decryptString(cipherText);
  }

  /**
   * Secure Storage: Store encrypted value in localStorage
   * Value can be a string, number, or object
   */
  function setSecureItem(key, value) {
    try {
      if (typeof localStorage === 'undefined') return;
      var cipher = encryptPayload({ data: value, t: Date.now() });
      localStorage.setItem(key, cipher);
    } catch (e) {
      console.warn('[CryptoUtil setSecureItem error]', e);
    }
  }

  /**
   * Secure Storage: Retrieve and decrypt value from localStorage
   * Automatically decrypts, and safely falls back if value was stored in plain text
   */
  function getSecureItem(key, fallbackValue) {
    try {
      if (typeof localStorage === 'undefined') return fallbackValue;
      var raw = localStorage.getItem(key);
      if (raw == null || raw === '') return fallbackValue;

      var decrypted = decryptPayload(raw);
      if (decrypted && typeof decrypted === 'object' && ('data' in decrypted)) {
        return decrypted.data;
      }

      // If it failed to decrypt as our wrapper, check if it was raw unencrypted text
      return raw || fallbackValue;
    } catch (_) {
      return fallbackValue;
    }
  }

  /**
   * Secure Storage: Remove item
   */
  function removeSecureItem(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (_) {}
  }

  // Export as standalone API
  var CryptoUtil = {
    CIPHER_KEY: DEFAULT_CIPHER_KEY,
    encryptPayload: encryptPayload,
    decryptPayload: decryptPayload,
    encryptString: encryptString,
    decryptString: decryptString,
    encryptToken: encryptToken,
    decryptToken: decryptToken,
    encryptPassword: encryptPassword,
    decryptPassword: decryptPassword,
    setSecureItem: setSecureItem,
    getSecureItem: getSecureItem,
    removeSecureItem: removeSecureItem
  };

  root.CryptoUtil = CryptoUtil;
  root.APP_CONFIG.encryptPayload = encryptPayload;
  root.APP_CONFIG.decryptPayload = decryptPayload;
  root.APP_CONFIG.encryptToken = encryptToken;
  root.APP_CONFIG.decryptToken = decryptToken;
  root.APP_CONFIG.encryptPassword = encryptPassword;
  root.APP_CONFIG.decryptPassword = decryptPassword;

  // Also bind to Biz1Config if already loaded or attach when loaded
  if (root.Biz1Config) {
    root.Biz1Config.CIPHER_KEY = DEFAULT_CIPHER_KEY;
    root.Biz1Config.encryptPayload = encryptPayload;
    root.Biz1Config.decryptPayload = decryptPayload;
    root.Biz1Config.encryptToken = encryptToken;
    root.Biz1Config.decryptToken = decryptToken;
    root.Biz1Config.encryptPassword = encryptPassword;
    root.Biz1Config.decryptPassword = decryptPassword;
    root.Biz1Config.setSecureItem = setSecureItem;
    root.Biz1Config.getSecureItem = getSecureItem;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoUtil;
  }
})(typeof window !== 'undefined' ? window : globalThis);
