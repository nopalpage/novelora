import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { AdsterraBanner } from "../components/AdsterraAd";

export function Genre() {
  const [isLoading, setIsLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState(() => {
    const saved = localStorage.getItem("novelora_settings");
    return saved ? JSON.parse(saved) : {};
  });

  const [allGenres, setAllGenres] = useState<{name: string, count: number}[]>([]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    api.getGenresAndTags().then(res => {
      if (isMounted) {
        setAllGenres(res.genres);
        setIsLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) setIsLoading(false);
    });
    
    return () => { isMounted = false; };
  }, []);

  if (siteSettings?.disableGenreTags === "on") {
    return (
      <main className="flex-grow flex items-center justify-center max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center bg-gray-50 dark:bg-gray-800/50 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-lg">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Feature Unavailable</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {siteSettings.disableMessage || "This feature has been disabled by the administrator."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-500">Genre</h2>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white transition-colors duration-300">List</h2>
      </div>

      {/* Top Ad Banner - Hide if no genres */}
      {(isLoading || allGenres.length > 0) && (
        <div className="mb-6">
          <AdsterraBanner width={728} height={90} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 24 }).map((_, i) => (
              <div key={`skel-${i}`} className="flex justify-between items-center bg-gray-100 dark:bg-gray-800/80 px-4 py-2 rounded-lg border border-gray-200/50 dark:border-gray-700">
                <div className="h-4 w-1/2 rounded shimmer-wrapper"></div>
                <div className="h-4 w-8 rounded shimmer-wrapper"></div>
              </div>
            ))
          : allGenres.map((genre) => (
              <div key={genre.name} className="flex justify-between items-center bg-gray-100 dark:bg-gray-800/80 px-4 py-2 rounded-lg border border-gray-200/50 dark:border-gray-700 hover:border-blue-500/50 hover:shadow-sm dark:hover:shadow-blue-500/10 transition-all cursor-pointer group">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{genre.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{genre.count}</span>
              </div>
            ))}
      </div>

      {/* Bottom Ad Banner */}
      <div className="mt-8">
        <AdsterraBanner width={728} height={90} />
      </div>
    </main>
  );
}
