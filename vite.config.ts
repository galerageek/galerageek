import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      {
        name: 'vite-hmr-preview-mock',
        transformIndexHtml: {
          order: 'pre',
          handler() {
            return [
              {
                tag: 'script',
                injectTo: 'head-prepend',
                children: `
(function() {
  var OrigWS = window.WebSocket;
  if (OrigWS) {
    window.WebSocket = function(url, protocols) {
      var isHmr = false;
      if (typeof protocols === 'string' && protocols.indexOf('vite-hmr') !== -1) isHmr = true;
      if (Array.isArray(protocols) && protocols.indexOf('vite-hmr') !== -1) isHmr = true;
      if (typeof url === 'string' && (url.indexOf('token=') !== -1 || url.indexOf('vite-hmr') !== -1)) isHmr = true;
      if (isHmr) {
        var target = new EventTarget();
        var mock = {
          readyState: 1,
          OPEN: 1,
          CONNECTING: 0,
          CLOSING: 2,
          CLOSED: 3,
          send: function() {},
          close: function() {},
          addEventListener: target.addEventListener.bind(target),
          removeEventListener: target.removeEventListener.bind(target),
          dispatchEvent: target.dispatchEvent.bind(target),
        };
        setTimeout(function() {
          var ev = new Event('open');
          target.dispatchEvent(ev);
          if (typeof mock.onopen === 'function') mock.onopen(ev);
        }, 0);
        return mock;
      }
      return new OrigWS(url, protocols);
    };
    window.WebSocket.prototype = OrigWS.prototype;
    window.WebSocket.CONNECTING = OrigWS.CONNECTING;
    window.WebSocket.OPEN = OrigWS.OPEN;
    window.WebSocket.CLOSING = OrigWS.CLOSING;
    window.WebSocket.CLOSED = OrigWS.CLOSED;
  }
})();
`,
              },
            ];
          },
        },
      },
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
