/*
 * Dear Korea bot check page (spec 2026-11-05 bot guard, section 3.1.1).
 * Loaded by the app in a hidden WebView. Renders one Invisible Turnstile widget and posts one envelope per result:
 *   { v: 1, nonce, type: "token" | "error" | "expired" | "interactive", token?, code? }
 * The nonce comes from ?n= and is echoed on every message. Nothing is logged; no other scripts.
 * ?k= may only pick one of Cloudflare's published test keys (they work on any host and never pass a real secret).
 */
(function () {
  'use strict';

  // Public site key of the "Dear Korea app" Turnstile widget (Invisible). Empty until the owner creates it.
  var SITE_KEY = '';
  var TEST_KEYS = {
    '1x00000000000000000000BB': true, // invisible, always passes
    '2x00000000000000000000BB': true, // invisible, always fails
    '3x00000000000000000000FF': true  // forces an interactive challenge
  };

  var params = new URLSearchParams(window.location.search);
  var nonce = params.get('n') || '';
  var testKey = params.get('k');
  var siteKey = testKey && TEST_KEYS[testKey] === true ? testKey : SITE_KEY;
  var nonceOk = /^[A-Za-z0-9_-]{16,64}$/.test(nonce);
  var done = false;

  function post(type, extra) {
    if (done) return;
    if (type !== 'interactive') done = true;
    // State without the token, so a plain browser check can see the result in the tab title.
    document.title = 'Dear Korea check: ' + type;
    if (!nonceOk || !window.ReactNativeWebView) return;
    var msg = { v: 1, nonce: nonce, type: type };
    if (extra) {
      for (var key in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, key)) msg[key] = extra[key];
      }
    }
    window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }

  window.dkTurnstileReady = function () {
    if (!siteKey) {
      post('error', { code: 'no_site_key' });
      return;
    }
    try {
      window.turnstile.render('#w', {
        sitekey: siteKey,
        retry: 'never',
        'refresh-expired': 'never',
        'refresh-timeout': 'never',
        callback: function (token) { post('token', { token: token }); },
        'error-callback': function (code) {
          post('error', { code: String(code || 'error').slice(0, 40) });
          return true;
        },
        'expired-callback': function () { post('expired'); },
        'timeout-callback': function () { post('expired'); },
        'before-interactive-callback': function () { post('interactive'); },
        'unsupported-callback': function () { post('error', { code: 'unsupported' }); }
      });
    } catch (e) {
      post('error', { code: 'render' });
    }
  };
})();
