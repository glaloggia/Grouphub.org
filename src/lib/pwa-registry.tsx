
"use client";

import { useEffect } from 'react';

export function PwaRegistry() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
            console.log('Service Worker registered with scope:', registration.scope);
            // Check for updates on navigation
            registration.update();
        })
        .catch((error) => console.error('Service Worker registration failed:', error));
    }
  }, []);

  return null;
}
