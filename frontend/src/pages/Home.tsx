import { PopularNovelCard, LatestUpdateCard, PopularNovelSkeleton, LatestUpdateSkeleton } from "../components/NovelCards";
import { useState, useEffect } from "react";
import { AdsterraBanner } from "../components/AdsterraAd";
import { SidebarChat, SidebarLastRead } from "../components/SidebarWidgets";
import { motion } from "motion/react";
import { useLanguage } from "../contexts/LanguageContext";
import { api } from "../lib/api";
import { Novel } from "../data";

export function Home() {
  const { t } = useLanguage();
  const tabs = [t("home.tab1"), t("home.tab2"), t("home.tab3"), t("home.tab4")];
  const [isLoading, setIsLoading] = useState(true);
  const [popularTab, setPopularTab] = useState(tabs[0]);
  const [siteSettings, setSiteSettings] = useState(() => {
    const saved = localStorage.getItem("novelora_settings");
    return saved ? JSON.parse(saved) : {};
  });

  // Update popular tab if language changes
  useEffect(() => {
    setPopularTab(t("home.tab1"));
  }, [t]);

  const [popularNovels, setPopularNovels] = useState<Novel[]>([]);
  const [latestUpdates, setLatestUpdates] = useState<Novel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12; // Or 10 depending on design

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      api.getNovels({ sort: 'popular', limit: 12 }), // You might want to use popularTab to determine origin or genre
      api.getLatestChapters(currentPage, itemsPerPage)
    ]).then(([novels, latestData]) => {
      if (isMounted) {
        setPopularNovels(novels);
        setLatestUpdates(latestData.novels);
        setTotalPages(Math.ceil(latestData.total / itemsPerPage));
        setIsLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) setIsLoading(false);
    });

    return () => { isMounted = false; };
  }, [popularTab, currentPage]); 

  // In a real app, popularTab would trigger a data refetch.
  const displayNovels = popularNovels;

  return (
    <>
      <main className="flex-grow max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full z-10 relative">
        <AdsterraBanner />
        
        {/* Popular Novels Section */}
        {siteSettings?.hidePopularNovels !== "on" && (
        <section className="mb-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-500">{t("home.popularHeading")}</h2>
            </div>
            
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 text-sm">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setPopularTab(tab);
                    setIsLoading(true);
                  }}
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                    popularTab === tab 
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                      : "bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <PopularNovelSkeleton key={i} />
              ))}
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              initial="hidden"
              animate="show"
            >
              {displayNovels.slice(0, 12).map((novel) => (
                <motion.div
                  key={novel.id}
                  variants={{
                    hidden: { opacity: 0, scale: 0.95, y: 15 },
                    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                  }}
                >
                  <PopularNovelCard novel={novel} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
        )}

        {/* Mid-page Ad Banner */}
        <div className="my-6">
          <AdsterraBanner width={728} height={90} />
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-grow min-w-0">
            {/* Latest Updates Section */}
            <section>
          <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-500">{t("home.latest")}</h2>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white transition-colors duration-300">{t("home.update")}</h2>
          </div>

          <div className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <LatestUpdateSkeleton key={i} />
                ))}
              </div>
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
                }}
                initial="hidden"
                animate="show"
              >
                {latestUpdates.map((novel) => (
                  <motion.div 
                    key={novel.id} 
                    variants={{
                      hidden: { opacity: 0, scale: 0.95, y: 15 },
                      show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                    }}
                  >
                    <LatestUpdateCard novel={novel} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Pagination Controls */}
            {latestUpdates.length > 0 && totalPages > 1 && (
              <div className="mt-12 mb-2 flex justify-center items-center gap-1 sm:gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#1e2330] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm transition-colors shadow-sm disabled:opacity-50 group"
                >
                  <span className="group-hover:-translate-x-1 transition-transform">&laquo;</span> 
                  <span className="group-hover:-translate-x-1 transition-transform ml-1 hidden sm:inline">Prev</span> 
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  // Simplified pagination logic showing surrounding pages
                  let pageToShow = currentPage - 2 + i;
                  if (currentPage <= 3) pageToShow = i + 1;
                  else if (currentPage >= totalPages - 2) pageToShow = totalPages - 4 + i;
                  
                  if (pageToShow > 0 && pageToShow <= totalPages) {
                    return (
                      <button 
                        key={pageToShow}
                        onClick={() => setCurrentPage(pageToShow)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl font-medium text-sm transition-colors shadow-sm ${
                          currentPage === pageToShow 
                            ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20" 
                            : "bg-white dark:bg-[#1e2330] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        {pageToShow}
                      </button>
                    );
                  }
                  return null;
                })}

                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="text-gray-400 px-2 font-medium">...</span>
                    <button 
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#1e2330] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm transition-colors shadow-sm"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#1e2330] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm transition-colors shadow-sm disabled:opacity-50 group"
                >
                  <span className="group-hover:translate-x-1 transition-transform mr-1 hidden sm:inline">Next</span> 
                  <span className="group-hover:translate-x-1 transition-transform">&raquo;</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
      
      <aside className="w-full xl:w-[450px] shrink-0 space-y-6 mt-14 xl:mt-0">
        <SidebarChat />
        <SidebarLastRead />
      </aside>
    </div>

    {/* Bottom Ad Banner */}
    <div className="mt-8 mb-2">
      <AdsterraBanner width={728} height={90} />
    </div>
  </main>

</>
  );
}
