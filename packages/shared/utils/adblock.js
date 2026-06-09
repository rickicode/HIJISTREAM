/**
 * AdBlock — Shared ad blocking untuk VaPlayer embed WebView.
 *
 * 4 lapis pertahanan (proven di mobile):
 *
 * Layer 1: document.createElement override
 *   - <a> tags: paksa target="_self", block _blank
 *   - <script> src: intercept setter, block ad domains
 *
 * Layer 2: Event blocking
 *   - stopImmediatePropagation di mousedown (block ad trigger)
 *   - Block click di a[target="_blank"]
 *
 * Layer 3: API Hijack
 *   - window.open, alert, confirm, prompt, form.submit, location
 *
 * Layer 4: MutationObserver + periodic cleanup (backup)
 */

export const ADBLOCK_INJECTED_JS = `
(function() {
  var AD_DOMAINS = [
    'histats.com', 'popunder', 'popad', 'popup', 'exoclick', 'propellerads',
    'adbucks', 'adsterra', 'trafficfactory', 'clickadu', 'mgid.com',
    'adreactor', 'adf.ly', 'adfly', 'shortlink', 'shrink', 'ouo.io',
    'shorte.st', 'linkbucks', 'adfoc.us', 'bc.vc', 'tinyurl', 'bit.ly',
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'taboola.com', 'outbrain.com', 'criteo.com', 'criteo.net',
    'amazon-adsystem.com', 'casalemedia.com', 'contextweb.com',
    'openx.net', 'pubmatic.com', 'rubiconproject.com', 'sharethrough.com',
    'indexww.com', 'sovrn.com', 'media.net', 'adnxs.com', 'rubicon.com',
    'adroll.com', 'quantserve.com', 'scorecardresearch.com',
    'chartbeat.com', 'comscore.com', 'parsely.com', 'addthis.com',
    'brightpathsignals.com',
  ];
  function isAdDomain(u) { if (!u) return false; u = u.toLowerCase(); for (var i = 0; i < AD_DOMAINS.length; i++) { if (u.indexOf(AD_DOMAINS[i]) !== -1) return true; } return false; }

  // =====================================================
  // LAYER 1: Override document.createElement
  // =====================================================
  var _createElement = document.createElement.bind(document);
  document.createElement = function(tag) {
    if (tag === 'a') {
      var el = _createElement(tag);
      el.setAttribute('target', '_self');
      return el;
    }
    if (tag === 'script') {
      var el = _createElement(tag);
      try {
        var _srcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
        if (_srcDescriptor && _srcDescriptor.set) {
          Object.defineProperty(el, 'src', {
            set: function(v) { if (v && isAdDomain(v)) return; _srcDescriptor.set.call(el, v); },
            get: function() { return _srcDescriptor.get.call(el); }
          });
        }
      } catch(e) {}
      return el;
    }
    return _createElement(tag);
  };

  // =====================================================
  // LAYER 2: Event blocking
  // =====================================================
  // Mousedown — ad scripts use this to trigger popups
  document.addEventListener('mousedown', function(e) {
    e.stopImmediatePropagation();
  }, true);

  // Click — block _blank links
  document.addEventListener('click', function(e) {
    var t = e.target.closest('a[target="_blank"]');
    if (t) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // =====================================================
  // LAYER 3: API Hijack
  // =====================================================
  window.open = function() { return { closed: false, close: function(){}, focus: function(){} }; };
  window.alert = function() {};
  window.confirm = function() { return false; };
  window.prompt = function() { return null; };
  HTMLFormElement.prototype.submit = function() {};
  try {
    var _loc = Object.assign({}, window.location);
    Object.defineProperty(window, 'location', {
      set: function(v) { if (typeof v === 'string' && v.indexOf('vaplayer.ru') === -1 && v.indexOf('about:blank') === -1) return; },
      get: function() { return _loc || {}; },
      configurable: false
    });
  } catch(e) {}
  window.addEventListener('beforeunload', function(e) { e.preventDefault(); e.stopPropagation(); delete e['returnValue']; return undefined; }, true);

  // =====================================================
  // LAYER 4: MutationObserver (backup)
  // =====================================================
  var obs = new MutationObserver(function(muts) {
    muts.forEach(function(m) {
      m.addedNodes.forEach(function(n) {
        if (n.tagName === 'SCRIPT') { if (n.src && isAdDomain(n.src)) { n.remove(); return; } if (n.textContent && (n.textContent.indexOf('window.open') !== -1 || n.textContent.indexOf('popunder') !== -1 || n.textContent.indexOf('_blank') !== -1)) { n.remove(); return; } }
        if (n.tagName === 'IFRAME') { try { if (isAdDomain(n.src || '')) { n.remove(); return; } } catch(e) { n.remove(); return; } }
        if (n.tagName === 'DIV' || n.tagName === 'SECTION') {
          var cls = (n.className || '') + ' ' + (n.id || '');
          if (cls.indexOf('ad-') !== -1 || cls.indexOf('popup') !== -1 || cls.indexOf('overlay') !== -1 || cls.indexOf('banner') !== -1) { if (cls.indexOf('player') === -1 && cls.indexOf('video') === -1) n.style.display = 'none'; }
        }
      });
    });
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // Periodic cleanup — delayed ads
  function clean() {
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      try { var el = all[i], z = parseInt(window.getComputedStyle(el).zIndex); if (z > 100 && el.tagName !== 'IFRAME' && el.tagName !== 'VIDEO' && el.offsetWidth > 100) el.style.display = 'none'; } catch(e) {}
    }
    var anchors = document.querySelectorAll('a[target="_blank"]');
    for (var a = 0; a < anchors.length; a++) { if (isAdDomain(anchors[a].href)) anchors[a].onclick = function(e) { e.preventDefault(); return false; }; }
    var scripts = document.querySelectorAll('script[src*="histats"], noscript');
    scripts.forEach(function(s) { s.remove(); });
  }
  for (var t = 1000; t < 30000; t += 3000) setTimeout(clean, t);
  setInterval(clean, 10000);

  // Init
  var styleEl = document.createElement('style');
  styleEl.textContent = '[id*="google_ads"],[id*="ad-holder"],[class*="ad-container"],[class*="ad-slot"],div[style*="z-index: 999"]:not(iframe):not(video),a[target="_blank"]{display:none!important;pointer-events:none!important}';
  document.head.appendChild(styleEl);
})();
true;
`;

export default ADBLOCK_INJECTED_JS;
