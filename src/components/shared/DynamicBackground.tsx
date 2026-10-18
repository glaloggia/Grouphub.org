"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeProvider';

export function DynamicBackground() {
  const [backgroundUri, setBackgroundUri] = useState<string>('');
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Generate a randomized pattern of various geometric shapes
    const size = 400; // Increased tile size for more variety
    const count = 100; // More shapes
    
    // Determine color based on theme
    // Light mode: use a dark color (slate)
    // Dark mode: use a light color (white/grey)
    const color = resolvedTheme === 'dark' ? 'white' : 'black';
    
    let svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" fill="${color}">`;
    
    for (let i = 0; i < count; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const rotation = Math.random() * 360;
      
      // Adjust opacity based on theme for better visibility
      // Dark mode needs slightly lower opacity for a subtle effect
      const opacity = resolvedTheme === 'dark' ? (0.02 + Math.random() * 0.03) : (0.04 + Math.random() * 0.04);
      
      const shapeType = Math.floor(Math.random() * 5); // 0: circle, 1: square, 2: triangle, 3: ellipse, 4: random polygon
      
      const baseSize = 2 + Math.random() * 6;

      switch (shapeType) {
        case 0: // Circle
          svgContent += `<circle cx="${x}" cy="${y}" r="${baseSize}" fill-opacity="${opacity}" />`;
          break;
        case 1: // Square (Rect)
          svgContent += `<rect x="${x}" y="${y}" width="${baseSize * 2}" height="${baseSize * 2}" fill-opacity="${opacity}" transform="rotate(${rotation} ${x} ${y})" />`;
          break;
        case 2: // Triangle (Polygon)
          const p1 = `${x},${y - baseSize}`;
          const p2 = `${x - baseSize},${y + baseSize}`;
          const p3 = `${x + baseSize},${y + baseSize}`;
          svgContent += `<polygon points="${p1} ${p2} ${p3}" fill-opacity="${opacity}" transform="rotate(${rotation} ${x} ${y})" />`;
          break;
        case 3: // Ellipse
          svgContent += `<ellipse cx="${x}" cy="${y}" rx="${baseSize * 1.5}" ry="${baseSize}" fill-opacity="${opacity}" transform="rotate(${rotation} ${x} ${y})" />`;
          break;
        case 4: // Random small polygon (Diamond/Star-ish)
          const offset = baseSize;
          const points = `${x},${y - offset} ${x + offset / 2},${y} ${x},${y + offset} ${x - offset / 2},${y}`;
          svgContent += `<polygon points="${points}" fill-opacity="${opacity}" transform="rotate(${rotation} ${x} ${y})" />`;
          break;
      }
    }
    
    svgContent += `</svg>`;
    
    // Create data URI safely to use as a background image
    const dataUri = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}")`;
    setBackgroundUri(dataUri);
  }, [resolvedTheme]); // Re-run when theme changes

  if (!backgroundUri) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none -z-50"
      style={{ 
        backgroundImage: backgroundUri,
        backgroundAttachment: 'fixed',
      }}
      aria-hidden="true"
    />
  );
}
