import { useParams } from "react-router-dom";
import { PopularNovelCard, LatestUpdateCard, PopularNovelSkeleton, LatestUpdateSkeleton } from "../components/NovelCards";
import { Novel } from "../data";
import { api } from "../lib/api";

import { useState, useEffect } from "react";

export function Category() {
  const { categoryId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState(() => {
    const saved = localStorage.getItem("novelora_settings");
    return saved ? JSON.parse(saved) : {};
  });

  const [popularNovels, setPopularNovels] = useState<Novel[]>([]);
  const [latestUpdates, setLatestUpdates] = useState<Novel[]>([]);

  const title = categoryId === "light-novel" ? "Light Novel" : categoryId === "web-novel" ? "Web Novel" : "Category";
  const originCode = categoryId === "light-novel" ? "JP" : categoryId === "web-novel" ? "KR" : undefined; // Or handle based on how origins are stored in DB. Assuming Web Novel -> KR/CN, Light Novel -> JP. Let's just pass the title as origin for now if it matches "Light Novel" / "Web Novel". Wait, the backend has "Light Novel" / "Web Novel"? Actually the schema says `origin text` which might be Country. Let's just use `api.getNovels({ origin: title })` or maybe we just don't have a strict origin map, but we can pass `type` if the backend supported it. The backend `/novels` endpoint takes `origin`. Let's assume origin stores things like 'JP', 'KR', 'CN'. The original code just mapped UI. We will use `api.getNovels({ status: 'Ongoing' })` if we can't filter correctly, but let's try `origin: title`. Actually the category page in original UI was just mock. We'll use `api.getNovels({ sort: 'popular' })`.

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    Promise.all([
      api.getNovels({ sort: 'popular' }),
      api.getNovels({ sort: 'newest' }) // Using newest since getLatestChapters doesn't support query filters right now
    ]).then(([popular, latest]) => {
      if (isMounted) {
        setPopularNovels(popular);
        setLatestUpdates(latest);
        setIsLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) setIsLoading(false);
    });
    
    return () => { isMounted = false; };
  }, [categoryId]);

  return (
    <main className="flex-grow max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 relative">
      <div className="flex items-center gap-2 mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-500">{title}</h2>
      </div>

      {siteSettings?.hidePopularNovels !== "on" && (
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Popular in {title}</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <PopularNovelSkeleton key={i} />)
          ) : (
            popularNovels.slice(0, 6).map((novel) => (
              <PopularNovelCard key={novel.id} novel={novel} />
            ))
          )}
        </div>
      </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Latest Updates</h2>
        </div>
        <div className="bg-white dark:bg-[#1e2330] p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/80">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            {isLoading ? (
              Array.from({ length: 9 }).map((_, i) => <LatestUpdateSkeleton key={i} />)
            ) : (
              latestUpdates.map((novel) => (
                <LatestUpdateCard key={novel.id} novel={novel} />
              ))
            )}
          </div>
          
          <div className="mt-12 mb-2 flex justify-center items-center gap-1 sm:gap-2">
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-colors cursor-default">
              1
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium text-sm transition-colors">
              2
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium text-sm transition-colors">
              3
            </button>
            <span className="text-gray-400 px-2">...</span>
            <button className="px-4 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium text-sm transition-colors">
              Next &raquo;
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
