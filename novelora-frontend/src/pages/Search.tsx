import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { LatestUpdateCard, LatestUpdateSkeleton } from "../components/NovelCards";
import { Novel } from "../data";
import { api } from "../lib/api";

import { ChevronDown, ChevronRight, Filter } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [siteSettings, setSiteSettings] = useState(() => {
    const saved = localStorage.getItem("novelora_settings");
    return saved ? JSON.parse(saved) : {};
  });
  
  const [selectedType, setSelectedType] = useState<string>(searchParams.get("type") || "All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  
  const [titleQuery, setTitleQuery] = useState("");
  const [allGenres, setAllGenres] = useState<{name: string}[]>([]);
  const [searchResults, setSearchResults] = useState<Novel[]>([]);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    let isMounted = true;
    api.getGenresAndTags().then(res => {
      if (isMounted) setAllGenres(res.genres);
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const typeFromUrl = searchParams.get("type");
    const autoSearch = searchParams.get("autoSearch");

    if (typeFromUrl) {
      setSelectedType(typeFromUrl);
      
      if (autoSearch === "true") {
        triggerSearch();
        searchParams.delete("autoSearch");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, []);

  const triggerSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    setIsSearching(true);
    setHasSearched(true);
    
    searchTimeoutRef.current = setTimeout(() => {
      if (titleQuery.trim().length >= 2) {
        api.searchNovels(titleQuery).then(res => {
          setSearchResults(res);
          setIsSearching(false);
        }).catch(() => setIsSearching(false));
      } else {
        api.getNovels({ status: selectedStatus !== 'All' ? selectedStatus : undefined }).then(res => {
          setSearchResults(res);
          setIsSearching(false);
        }).catch(() => setIsSearching(false));
      }
    }, 600);
  };

  useEffect(() => {
    // When any filter changes, we want to auto-search
    if (hasSearched) {
      triggerSearch();
    }
  }, [selectedGenres, selectedType, selectedStatus]);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    if (type === "All") {
      searchParams.delete("type");
    } else {
      searchParams.set("type", type);
    }
    setSearchParams(searchParams);
  };

  const clearAllFilters = () => {
    setSelectedGenres([]);
    setSelectedType("All");
    setSelectedStatus("All");
    searchParams.delete("type");
    setSearchParams(searchParams);
  };

  return (
    <main className="flex-grow max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full z-10 relative">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-500">{t("search.advanced")}</h2>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white transition-colors duration-300">{t("search.search")}</h2>
      </div>

      <div className="bg-gray-100 dark:bg-[#1e2330] border border-gray-200 dark:border-gray-800/80 p-4 sm:p-6 rounded-2xl mb-6 text-sm text-gray-700 dark:text-gray-300 transition-colors">
        <div className="space-y-6">
          {/* Basic Filters */}
          <div className="space-y-4">
            <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] items-center gap-4">
              <label className="font-medium text-gray-900 dark:text-white">{t("search.title")}</label>
              <input type="text" value={titleQuery} onChange={e => setTitleQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && triggerSearch()} className="w-full bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            
            <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] items-center gap-4">
              <label className="font-medium text-gray-900 dark:text-white">{t("search.author")}</label>
              <input type="text" className="w-full bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            
            <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] items-center gap-4">
              <label className="font-medium text-gray-900 dark:text-white">{t("search.year")}</label>
              <select className="w-full sm:w-48 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-1 focus:ring-blue-500 outline-none transition-colors appearance-none">
                <option></option>
                <option>2026</option>
                <option>2025</option>
                <option>2024</option>
                <option>2023</option>
              </select>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-700/50" />

          {/* Status & Type Section */}
          <div className="space-y-4">
              <div className="space-y-4 pl-0">
                <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] items-baseline gap-2 sm:gap-4">
                  <label className="font-medium text-gray-500 dark:text-gray-400">{t("search.status")}</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors">
                      <input type="radio" name="status" checked={selectedStatus === "All"} onChange={() => setSelectedStatus("All")} className="text-blue-600 focus:ring-blue-500" /> {t("search.all")}
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors">
                      <input type="radio" name="status" checked={selectedStatus === "Ongoing"} onChange={() => setSelectedStatus("Ongoing")} className="text-blue-600 focus:ring-blue-500" /> {t("search.ongoing")}
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors">
                      <input type="radio" name="status" checked={selectedStatus === "Completed"} onChange={() => setSelectedStatus("Completed")} className="text-blue-600 focus:ring-blue-500" /> {t("search.completed")}
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] items-baseline gap-2 sm:gap-4">
                  <label className="font-medium text-gray-500 dark:text-gray-400">{t("search.type")}</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors">
                      <input type="radio" name="type" checked={selectedType === "All"} onChange={() => handleTypeChange("All")} className="text-blue-600 focus:ring-blue-500" /> {t("search.all")}
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors">
                      <input type="radio" name="type" checked={selectedType === "Web Novel"} onChange={() => handleTypeChange("Web Novel")} className="text-blue-600 focus:ring-blue-500" /> Web Novel
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors">
                      <input type="radio" name="type" checked={selectedType === "Light Novel"} onChange={() => handleTypeChange("Light Novel")} className="text-blue-600 focus:ring-blue-500" /> Light Novel
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] items-baseline gap-2 sm:gap-4">
                  <label className="font-medium text-gray-500 dark:text-gray-400">{t("search.country")}</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors"><input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" /> China</label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors"><input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" /> Japan</label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors"><input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" /> Korea</label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors"><input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" /> Unknown</label>
                  </div>
                </div>
              </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-700/50" />

          {/* Sorting & Order Section */}
          <div className="space-y-4">
              <div className="space-y-4 pl-0">
                <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] items-baseline gap-2 sm:gap-4">
                  <label className="font-medium text-gray-500 dark:text-gray-400">{t("search.orderBy")}</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors"><input type="radio" name="order" defaultChecked className="text-blue-600 focus:ring-blue-500" /> A-Z</label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors"><input type="radio" name="order" className="text-blue-600 focus:ring-blue-500" /> Z-A</label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors"><input type="radio" name="order" className="text-blue-600 focus:ring-blue-500" /> {t("search.latestUpdate")}</label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors"><input type="radio" name="order" className="text-blue-600 focus:ring-blue-500" /> {t("search.latestAdded")}</label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors"><input type="radio" name="order" className="text-blue-600 focus:ring-blue-500" /> {t("search.popular")}</label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors"><input type="radio" name="order" className="text-blue-600 focus:ring-blue-500" /> {t("search.rating")}</label>
                  </div>
                </div>
              </div>
          </div>

          {siteSettings?.disableGenreTags !== "on" && (
            <>
              <hr className="border-gray-200 dark:border-gray-700/50" />

              {/* Genres Section */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white w-full text-left">
                  {t("search.genres")}
                </h3>
                
                  <div className="pl-0">
                    {selectedGenres.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedGenres.map(genre => (
                          <span key={genre} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {genre}
                            <button 
                              onClick={() => setSelectedGenres(selectedGenres.filter(g => g !== genre))}
                              className="hover:text-blue-900 dark:hover:text-blue-100 ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label={`Remove ${genre}`}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                        {selectedGenres.length > 0 && (
                          <button 
                             onClick={() => setSelectedGenres([])}
                             className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium px-1"
                          >
                             {t("search.clearAll")}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-3 gap-x-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {allGenres
                        .map(g => (
                        <label key={g.name} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1.5 rounded transition-colors group">
                          <input 
                            type="checkbox" 
                            className="rounded text-blue-600 focus:ring-blue-500" 
                            checked={selectedGenres.includes(g.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGenres([...selectedGenres, g.name]);
                              } else {
                                setSelectedGenres(selectedGenres.filter(genre => genre !== g.name));
                              }
                            }}
                          /> 
                          <span className="truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{g.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
              </div>
            </>
          )}

          <hr className="border-gray-200 dark:border-gray-700/50" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-4">
          <button
            onClick={triggerSearch}
            className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2 transition-colors disabled:opacity-50"
            disabled={isSearching}
          >
            {isSearching ? t("search.searching") : t("search.search")}
          </button>
          
          {(selectedGenres.length > 0 || selectedType !== "All" || selectedStatus !== "All") && (
             <button
               onClick={clearAllFilters}
               className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-4 py-2"
             >
               {t("search.clearAllFilters")}
             </button>
          )}
        </div>
        <div className="w-full sm:w-auto">
          {/* Note: Searching status moved to button for cleaner look, but we can keep it here if desired, right now we removed the separate block to prevent duplication */}
        </div>
      </div>

      {hasSearched && (
        <div className="mt-12">
          {isSearching ? (
             <div className="bg-white dark:bg-[#1e2330] p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/80 transition-colors duration-300">
               <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">{t("search.searching")}</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                 {Array.from({ length: 6 }).map((_, i) => (
                   <LatestUpdateSkeleton key={i} />
                 ))}
               </div>
             </div>
          ) : (
            <div className="bg-white dark:bg-[#1e2330] p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/80 transition-colors duration-300">
              <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">{t("search.searchResults")}</h3>
              {searchResults.length === 0 ? (
                <div className="text-gray-500 dark:text-gray-400 py-8 text-center">{t("search.noResults") || "No results found."}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  {searchResults.map((novel) => (
                    <LatestUpdateCard key={novel.id} novel={novel} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
