import { useEffect, useRef } from 'react';

// This is a placeholder component for Adsterra integration.
// In a real application, you would pass your Adsterra Zone ID here to render actual ads.
export function AdsterraBanner({ 
  zoneId, 
  width = 728, 
  height = 90, 
  format = "Banner" 
}: { 
  zoneId?: string, 
  width?: number | string, 
  height?: number | string, 
  format?: string 
}) {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (zoneId && adRef.current && !adRef.current.firstChild) {
      // Setup the options object needed by Adsterra
      const scriptOptions = document.createElement('script');
      scriptOptions.type = 'text/javascript';
      scriptOptions.innerHTML = `
        atOptions = {
          'key': '${zoneId}',
          'format': 'iframe',
          'height': ${typeof height === 'number' ? height : 90},
          'width': ${typeof width === 'number' ? width : 728},
          'params': {}
        };
      `;
      adRef.current.appendChild(scriptOptions);

      // Load the actual adsterra script
      const scriptInvoke = document.createElement('script');
      scriptInvoke.type = 'text/javascript';
      scriptInvoke.src = `//www.highperformanceformat.com/${zoneId}/invoke.js`;
      adRef.current.appendChild(scriptInvoke);
    }
  }, [zoneId]);

  return (
    <div className={`w-full flex ${width === 160 || width === 300 ? 'justify-start' : 'justify-center'}`}>
      <div 
        ref={adRef}
        style={{ width: width === '100%' ? '100%' : `${width}px`, height: typeof height === 'number' ? `${height}px` : height, maxWidth: '100%' }}
        className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center overflow-hidden relative group"
      >
        {!zoneId && (
          <>
            <div className="absolute top-0 right-0 bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-400 px-2 py-0.5 rounded-bl opacity-70 z-20">
              Ad
            </div>
            <div className="flex flex-col items-center gap-1 z-10 p-2 text-center">
              <span className="text-gray-400 dark:text-gray-500 font-semibold tracking-wider text-[10px] sm:text-xs uppercase break-words w-full">Advertisement</span>
              <span className="text-blue-500/70 text-xs sm:text-sm font-medium break-words w-full">Your Ad Here ({width}x{height})</span>
            </div>
            {/* Subtle interactive background element to make it look active */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-50/30 dark:via-blue-900/10 to-transparent group-hover:scale-105 transition-transform duration-700"></div>
            <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent skew-x-[-20deg] group-hover:animate-[shimmer_2s_infinite]"></div>
          </>
        )}
      </div>
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
