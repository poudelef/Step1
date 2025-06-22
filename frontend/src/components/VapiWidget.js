'use client';

import { useEffect } from 'react';

export default function VapiWidget({ assistantId }) {
  useEffect(() => {
    // Initialize VAPI widget
    const script = document.createElement('script');
    script.innerHTML = `
      var vapiInstance = null;
      const assistant = "${assistantId}"; // Your assistant ID
      const apiKey = "${process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY}"; // Your public key
      const buttonConfig = {
        // Customize the widget appearance
        position: 'bottom-right',
        backgroundColor: '#6366f1', // Indigo color matching our theme
        iconColor: '#ffffff'
      };

      (function (d, t) {
        var g = document.createElement(t),
          s = d.getElementsByTagName(t)[0];
        g.src =
          "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
        g.defer = true;
        g.async = true;
        s.parentNode.insertBefore(g, s);
        g.onload = function () {
          vapiInstance = window.vapiSDK.run({
            apiKey: apiKey,
            assistant: assistant,
            config: buttonConfig,
          });
        };
      })(document, "script");
    `;
    
    document.body.appendChild(script);

    // Cleanup
    return () => {
      document.body.removeChild(script);
      if (window.vapiInstance) {
        window.vapiInstance.destroy();
      }
    };
  }, [assistantId]);

  return null; // Widget is injected via script
} 