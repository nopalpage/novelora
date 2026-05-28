import { useEffect, useRef } from 'react';

// This is a placeholder component for Adsterra integration.
// In a real application, you would pass your Adsterra Zone ID here to render actual ads.
export function AdsterraBanner({ 
  zoneId: propZoneId, 
  width = 728, 
  height = 90, 
  format = "iframe" 
}: { 
  zoneId?: string, 
  width?: number | string, 
  height?: number | string, 
  format?: string 
}) {
  // Map dimensions to the provided Adsterra keys
  let resolvedZoneId = propZoneId;
  if (!resolvedZoneId) {
    if (width === 468 && height === 60) resolvedZoneId = '01ba1081394b8d580867630ea7c9c7d6';
    else if (width === 160 && height === 300) resolvedZoneId = '7ad326bcc34eeb9f61ae6619c94e0b70';
    else if (width === 160 && height === 600) resolvedZoneId = 'fa263774e288c70a557cdea6ad11bd2f';
    else if (width === 320 && height === 50) resolvedZoneId = 'b0306fb2cf31dd4ff65a64b07868b136';
    else if (width === 728 && height === 90) resolvedZoneId = '27b7ad95ea1b240491054ea8048eb2c0';
    else if (width === 300 && height === 250) resolvedZoneId = '2a9fe5ef9cc2e976f1faa49c2295e6af';
    // Fallback for 300x600
    else if (width === 300 && height === 600) resolvedZoneId = 'fa263774e288c70a557cdea6ad11bd2f';
    // Default fallback
    else resolvedZoneId = '27b7ad95ea1b240491054ea8048eb2c0';
  }

  // Use an iframe to safely load document.write scripts which are used by Adsterra
  const iframeHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; }
        </style>
      </head>
      <body>
        <script type="text/javascript">
          atOptions = {
            'key': '${resolvedZoneId}',
            'format': '${format}',
            'height': ${typeof height === 'number' ? height : 90},
            'width': ${typeof width === 'number' ? width : 728},
            'params': {}
          };
        </script>
        <script type="text/javascript" src="https://commendtwisted.com/${resolvedZoneId}/invoke.js"></script>
      </body>
    </html>
  `;

  return (
    <div className={`w-full flex ${width === 160 || width === 300 ? 'justify-start' : 'justify-center'}`}>
      <div 
        style={{ width: width === '100%' ? '100%' : `${width}px`, height: typeof height === 'number' ? `${height}px` : height, maxWidth: '100%' }}
        className="bg-gray-50 dark:bg-[#1a1b26] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center overflow-hidden relative group"
      >
        {/* Fallback Placeholder (Always behind the iframe) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-0">
          <div className="absolute top-0 right-0 bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-400 px-2 py-0.5 rounded-bl opacity-70 z-20">
            Ad
          </div>
          <div className="flex flex-col items-center gap-1 z-10 p-2 text-center">
            <span className="text-gray-400 dark:text-gray-500 font-semibold tracking-wider text-[10px] sm:text-xs uppercase break-words w-full">Advertisement</span>
            <span className="text-blue-500/70 text-xs sm:text-sm font-medium break-words w-full">Your Ad Here ({width}x{height})</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-50/30 dark:via-blue-900/10 to-transparent group-hover:scale-105 transition-transform duration-700"></div>
          <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent skew-x-[-20deg] group-hover:animate-[shimmer_2s_infinite]"></div>
        </div>

        {/* Real Ad Iframe */}
        <iframe
          title="Advertisement"
          width={width === '100%' ? '100%' : width}
          height={height}
          frameBorder="0"
          scrolling="no"
          sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
          srcDoc={iframeHtml}
          className="relative z-10 w-full h-full"
          style={{ width: width === '100%' ? '100%' : `${width}px`, height: typeof height === 'number' ? `${height}px` : height }}
        />
      </div>
    </div>
  );
}

export function AdsterraNativeBanner() {
  const containerId = "container-ef595039ae0661c16ec3e9262ee1b20c";
  
  useEffect(() => {
    // Only load if it's not already loaded
    if (!document.querySelector(`script[src="https://commendtwisted.com/ef595039ae0661c16ec3e9262ee1b20c/invoke.js"]`)) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = 'https://commendtwisted.com/ef595039ae0661c16ec3e9262ee1b20c/invoke.js';
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="w-full flex justify-center my-4">
      <div id={containerId} className="w-full min-h-[100px]"></div>
    </div>
  );
}

export function AdsterraBackground({ zoneId }: { zoneId?: string }) {
  // Simulating a background Skin Ad
  // In a real app, Adsterra might offer popunders, native banners, or smart links that act differently.
  // For visual purpose, we render a placeholder frame if it's a "branding" ad format wrapper.

  if (zoneId) {
    // If the adsterra code modifies the body directly, you might inject it here or in index.html
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden hidden lg:block">
      <div className="absolute inset-x-0 top-0 h-[300px] bg-gradient-to-b from-blue-50/50 dark:from-blue-900/10 to-transparent"></div>
      <div className="absolute inset-y-0 left-0 w-[50%] bg-gradient-to-r from-gray-50 dark:from-[#121213] to-transparent"></div>
      <div className="absolute inset-y-0 right-0 w-[50%] bg-gradient-to-l from-gray-50 dark:from-[#121213] to-transparent"></div>
    </div>
  );
}
