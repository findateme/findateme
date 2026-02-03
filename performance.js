// Performance Optimization Script
// Fast loading and smooth page transitions

(function() {
  'use strict';
  
  // 1. Instant page navigation using prefetch
  document.addEventListener('DOMContentLoaded', () => {
    // Prefetch important pages on hover
    const links = document.querySelectorAll('a[href$=".html"]');
    links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        const href = link.getAttribute('href');
        if (href && !document.querySelector(`link[rel="prefetch"][href="${href}"]`)) {
          const prefetch = document.createElement('link');
          prefetch.rel = 'prefetch';
          prefetch.href = href;
          document.head.appendChild(prefetch);
        }
      }, { once: true, passive: true });
    });
  });
  
  // 2. Lazy load images that are not in viewport
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px'
    });
    
    // Observe all images with data-src
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    });
  }
  
  // 3. Debounce scroll events for better performance
  let scrollTimeout;
  let lastScrollHandler;
  
  window.addOptimizedScrollListener = function(handler) {
    lastScrollHandler = handler;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
      }
      scrollTimeout = window.requestAnimationFrame(() => {
        handler();
      });
    }, { passive: true });
  };
  
  // 4. Reduce animation when user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--a', '0ms');
  }
  
  // 5. Cleanup memory on page unload
  window.addEventListener('beforeunload', () => {
    // Clear any intervals or timeouts
    const highestTimeoutId = setTimeout(() => {});
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
  });
  
  console.log('⚡ Performance optimizations loaded');
})();
