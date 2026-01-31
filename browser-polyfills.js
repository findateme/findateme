/**
 * Browser Compatibility & Polyfills
 * Ensures smooth operation across all browsers and devices
 */

(function() {
  'use strict';

  // ===== POLYFILLS =====

  // Array.from polyfill for IE11
  if (!Array.from) {
    Array.from = function(arrayLike) {
      return Array.prototype.slice.call(arrayLike);
    };
  }

  // Object.assign polyfill
  if (typeof Object.assign !== 'function') {
    Object.defineProperty(Object, 'assign', {
      value: function assign(target) {
        if (target == null) {
          throw new TypeError('Cannot convert undefined or null to object');
        }
        var to = Object(target);
        for (var index = 1; index < arguments.length; index++) {
          var nextSource = arguments[index];
          if (nextSource != null) {
            for (var nextKey in nextSource) {
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }
        return to;
      },
      writable: true,
      configurable: true
    });
  }

  // Promise polyfill check
  if (typeof Promise === 'undefined') {
    console.warn('Promise not supported. Some features may not work.');
  }

  // fetch polyfill check
  if (typeof fetch === 'undefined') {
    console.warn('fetch API not supported. Consider using XMLHttpRequest fallback.');
  }

  // ===== MOBILE OPTIMIZATIONS =====

  // Prevent double-tap zoom on mobile
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Fix iOS 100vh issue
  function setVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);

  // ===== SMOOTH SCROLL POLYFILL =====
  if (!('scrollBehavior' in document.documentElement.style)) {
    // Smooth scroll polyfill for browsers that don't support it
    window.addEventListener('click', function(e) {
      if (e.target.tagName === 'A' && e.target.hash) {
        const target = document.querySelector(e.target.hash);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }

  // ===== PASSIVE EVENT LISTENERS =====
  let supportsPassive = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get: function() {
        supportsPassive = true;
        return true;
      }
    });
    window.addEventListener('testPassive', null, opts);
    window.addEventListener('testPassive', null, opts);
  } catch (e) {}

  // Use passive listeners for better scroll performance
  const passiveIfSupported = supportsPassive ? { passive: true } : false;
  
  ['scroll', 'touchstart', 'touchmove', 'wheel'].forEach(function(eventType) {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type === eventType && typeof options !== 'object') {
        options = passiveIfSupported;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });

  // ===== VIEWPORT META FIX =====
  // Prevent zoom on input focus (iOS Safari)
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    const viewportmeta = document.querySelector('meta[name="viewport"]');
    if (viewportmeta) {
      viewportmeta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0';
    }
  }

  // ===== CSS CUSTOM PROPERTIES FALLBACK =====
  // Check if CSS custom properties are supported
  if (!window.CSS || !window.CSS.supports || !window.CSS.supports('(--a: 0)')) {
    console.warn('CSS Custom Properties not supported. Using fallback colors.');
    document.documentElement.classList.add('no-css-vars');
  }

  // ===== INTERSECTION OBSERVER POLYFILL CHECK =====
  if (!('IntersectionObserver' in window)) {
    console.warn('IntersectionObserver not supported. Lazy loading may not work optimally.');
    // Fallback: load all images immediately
    document.querySelectorAll('img[loading="lazy"]').forEach(function(img) {
      img.loading = 'eager';
    });
  }

  // ===== LOCAL STORAGE CHECK =====
  function isLocalStorageAvailable() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  if (!isLocalStorageAvailable()) {
    console.error('localStorage not available. App functionality will be limited.');
    // Create in-memory storage fallback
    window.localStorage = {
      _data: {},
      setItem: function(id, val) { this._data[id] = String(val); },
      getItem: function(id) { return this._data.hasOwnProperty(id) ? this._data[id] : null; },
      removeItem: function(id) { delete this._data[id]; },
      clear: function() { this._data = {}; }
    };
  }

  // ===== PERFORMANCE OPTIMIZATIONS =====

  // Debounce function for resize events
  function debounce(func, wait) {
    let timeout;
    return function executedFunction() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, wait);
    };
  }

  // Throttle function for scroll events
  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(function() { inThrottle = false; }, limit);
      }
    };
  }

  // Make debounce and throttle globally available
  window.debounce = debounce;
  window.throttle = throttle;

  // ===== BROWSER DETECTION =====
  const browser = {
    isChrome: /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
    isSafari: /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor),
    isFirefox: /Firefox/.test(navigator.userAgent),
    isEdge: /Edg/.test(navigator.userAgent),
    isIE: /MSIE|Trident/.test(navigator.userAgent),
    isIOS: /iPhone|iPad|iPod/.test(navigator.userAgent),
    isAndroid: /Android/.test(navigator.userAgent),
    isMobile: /Mobile|Android|iPhone|iPad|iPod/.test(navigator.userAgent)
  };

  // Add browser classes to body
  Object.keys(browser).forEach(function(key) {
    if (browser[key]) {
      document.documentElement.classList.add(key.toLowerCase());
    }
  });

  // ===== TOUCH DEVICE DETECTION =====
  const isTouchDevice = (('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0));
  
  if (isTouchDevice) {
    document.documentElement.classList.add('touch-device');
  } else {
    document.documentElement.classList.add('no-touch');
  }

  // ===== NETWORK STATUS =====
  function updateOnlineStatus() {
    // Check if document.body exists before accessing classList
    if (!document.body) return;
    
    if (navigator.onLine) {
      document.body.classList.remove('offline');
    } else {
      document.body.classList.add('offline');
      console.warn('No internet connection detected.');
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  // Only call if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateOnlineStatus);
  } else {
    updateOnlineStatus();
  }

  // ===== REDUCE MOTION PREFERENCE =====
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (prefersReducedMotion.matches) {
    document.documentElement.classList.add('reduce-motion');
  }

  // ===== IMAGE LOADING ERROR HANDLER =====
  document.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
      // Silently handle image errors - just hide the image
      e.target.style.display = 'none';
    }
  }, true);

  // ===== REQUEST ANIMATION FRAME POLYFILL =====
  (function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
        window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = function(callback) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() {
          callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };
    }

    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
      };
    }
  })();

  // ===== CONSOLE WARNING SUPPRESSION FOR OLDER BROWSERS =====
  if (!window.console) {
    window.console = {
      log: function() {},
      warn: function() {},
      error: function() {},
      info: function() {}
    };
  }

  // ===== SAFE QUERY SELECTOR =====
  window.safeQuerySelector = function(selector) {
    try {
      return document.querySelector(selector);
    } catch (e) {
      console.warn('Invalid selector:', selector);
      return null;
    }
  };

  // ===== INITIALIZATION COMPLETE =====
  console.log('Browser compatibility layer initialized.');
  document.documentElement.classList.add('js-loaded');

})();
