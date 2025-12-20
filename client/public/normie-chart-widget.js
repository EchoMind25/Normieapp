/**
 * Normie Observer Chart Widget SDK
 * Version: 1.0.1
 * 
 * Embed real-time $NORMIE price charts on any website.
 * 
 * Usage:
 * <div id="normie-chart"></div>
 * <script src="https://normie.observer/normie-chart-widget.js"></script>
 * <script>
 *   NormieChart.init({
 *     container: '#normie-chart',
 *     theme: 'dark',
 *     height: '400px'
 *   });
 * </script>
 */

(function(global) {
  'use strict';

  var VERSION = '1.0.1';
  
  // Derive base URL: use current origin if SDK is hosted on normie.observer,
  // otherwise default to production. Can be overridden via config.baseUrl
  function getDefaultBaseUrl() {
    if (typeof window !== 'undefined' && window.location) {
      var currentHost = window.location.hostname;
      // If running locally or on normie.observer, use current origin
      if (currentHost === 'localhost' || 
          currentHost === '127.0.0.1' ||
          currentHost.includes('normie.observer') ||
          currentHost.includes('replit')) {
        return window.location.origin;
      }
    }
    return 'https://normie.observer';
  }
  
  var EMBED_BASE_URL = getDefaultBaseUrl();

  var defaultConfig = {
    container: '#normie-chart',
    theme: 'dark',
    height: '400px',
    range: '24h',
    controls: true,
    branding: true,
    color: '142 72% 45%',
    token: null,
    baseUrl: null,  // Override base URL if needed
    onLoad: null,
    onError: null
  };

  function NormieChart() {}

  /**
   * Initialize the chart widget
   * @param {Object} options - Configuration options
   * @param {string} options.container - CSS selector or DOM element for the container
   * @param {string} options.theme - 'dark' or 'light' (default: 'dark')
   * @param {string} options.height - Chart height (default: '400px')
   * @param {string} options.range - Default time range: 'live', '5m', '1h', '6h', '24h', '7d' (default: '24h')
   * @param {boolean} options.controls - Show time range controls (default: true)
   * @param {boolean} options.branding - Show normie.observer branding (default: true)
   * @param {string} options.color - Accent color in HSL format (default: '142 72% 45%')
   * @param {string} options.token - Optional authentication token (passed via postMessage, not URL)
   * @param {string} options.baseUrl - Override embed base URL (default: auto-detect or https://normie.observer)
   * @param {Function} options.onLoad - Callback when chart loads successfully
   * @param {Function} options.onError - Callback when chart fails to load
   * @returns {Object} Widget instance with destroy method
   */
  NormieChart.init = function(options) {
    var config = Object.assign({}, defaultConfig, options || {});
    var baseUrl = config.baseUrl || EMBED_BASE_URL;
    
    var container;
    if (typeof config.container === 'string') {
      container = document.querySelector(config.container);
    } else if (config.container instanceof HTMLElement) {
      container = config.container;
    }
    
    if (!container) {
      console.error('[NormieChart] Container not found:', config.container);
      if (config.onError) config.onError(new Error('Container not found'));
      return null;
    }

    var params = new URLSearchParams({
      theme: config.theme,
      height: config.height,
      range: config.range,
      controls: config.controls.toString(),
      branding: config.branding.toString(),
      color: config.color
    });
    
    // Note: Token is NOT passed via URL for security - use header-based auth instead
    // Token authentication requires server-to-server setup

    var iframe = document.createElement('iframe');
    iframe.src = baseUrl + '/embed/chart?' + params.toString();
    iframe.style.width = '100%';
    iframe.style.height = config.height;
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.style.overflow = 'hidden';
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', 'NORMIE Price Chart');
    iframe.setAttribute('allow', 'clipboard-write');
    
    iframe.onload = function() {
      if (config.onLoad) config.onLoad();
    };
    
    iframe.onerror = function(e) {
      if (config.onError) config.onError(e);
    };

    container.innerHTML = '';
    container.appendChild(iframe);

    return {
      iframe: iframe,
      config: config,
      
      /**
       * Update the chart configuration
       * @param {Object} newOptions - New configuration options
       */
      update: function(newOptions) {
        var newConfig = Object.assign({}, config, newOptions);
        var newParams = new URLSearchParams({
          theme: newConfig.theme,
          height: newConfig.height,
          range: newConfig.range,
          controls: newConfig.controls.toString(),
          branding: newConfig.branding.toString(),
          color: newConfig.color
        });
        iframe.src = baseUrl + '/embed/chart?' + newParams.toString();
        config = newConfig;
      },
      
      /**
       * Remove the widget from the DOM
       */
      destroy: function() {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      },

      /**
       * Set the time range
       * @param {string} range - 'live', '5m', '1h', '6h', '24h', or '7d'
       */
      setRange: function(range) {
        this.update({ range: range });
      },

      /**
       * Set the theme
       * @param {string} theme - 'dark' or 'light'
       */
      setTheme: function(theme) {
        this.update({ theme: theme });
      }
    };
  };

  /**
   * Create multiple chart instances
   * @param {string} selector - CSS selector for all containers
   * @param {Object} options - Shared configuration options
   * @returns {Array} Array of widget instances
   */
  NormieChart.initAll = function(selector, options) {
    var containers = document.querySelectorAll(selector);
    var instances = [];
    
    for (var i = 0; i < containers.length; i++) {
      var containerOptions = Object.assign({}, options, { container: containers[i] });
      var instance = NormieChart.init(containerOptions);
      if (instance) instances.push(instance);
    }
    
    return instances;
  };

  /**
   * Get the current SDK version
   * @returns {string}
   */
  NormieChart.version = VERSION;

  /**
   * Check if normie.observer embed service is available
   * @param {Function} callback - Callback with (isAvailable, latency)
   */
  NormieChart.ping = function(callback, baseUrl) {
    var start = Date.now();
    var url = (baseUrl || EMBED_BASE_URL) + '/api/ping?_t=' + Date.now();
    
    fetch(url, { method: 'GET', mode: 'cors' })
      .then(function(response) {
        if (response.ok) {
          callback(true, Date.now() - start);
        } else {
          callback(false, null);
        }
      })
      .catch(function() {
        callback(false, null);
      });
  };
  
  /**
   * Set the default base URL for all widget instances
   * @param {string} url - The base URL to use
   */
  NormieChart.setBaseUrl = function(url) {
    EMBED_BASE_URL = url;
  };
  
  /**
   * Get the current base URL
   * @returns {string}
   */
  NormieChart.getBaseUrl = function() {
    return EMBED_BASE_URL;
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NormieChart;
  } else if (typeof define === 'function' && define.amd) {
    define(function() { return NormieChart; });
  } else {
    global.NormieChart = NormieChart;
  }

})(typeof window !== 'undefined' ? window : this);
