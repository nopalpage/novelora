import { Novel } from "../data";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";

export function PopularNovelSkeleton() {
  return (
    <div className="relative rounded-xl overflow-hidden bg-white dark:bg-[#1a1c22] shadow-sm border border-transparent dark:border-gray-800/50">
      <div className="aspect-[2/3] w-full shimmer-wrapper rounded-t-xl"></div>
      <div className="p-3 bg-white dark:bg-[#1e2330]">
        <div className="h-4 w-3/4 shimmer-wrapper rounded mb-2"></div>
        <div className="flex justify-between mt-2">
          <div className="h-3 w-1/3 shimmer-wrapper rounded"></div>
          <div className="h-3 w-1/4 shimmer-wrapper rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function LatestUpdateSkeleton() {
  return (
    <div className="flex gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800/60 bg-white/50 dark:bg-gray-800/20">
      <div className="w-16 sm:w-20 shrink-0">
        <div className="aspect-[3/4] rounded-lg shadow-sm shimmer-wrapper"></div>
      </div>
      <div className="flex flex-col flex-1 min-w-0 py-1 gap-1.5 w-full relative">
        <div className="h-5 rounded shimmer-wrapper w-3/4 mb-1"></div>
        <div className="h-4 rounded shimmer-wrapper w-full mt-1"></div>
        <div className="h-4 rounded shimmer-wrapper w-5/6"></div>
        <div className="h-3 rounded shimmer-wrapper w-1/4 mt-auto"></div>
      </div>
    </div>
  );
}

export function PopularNovelCard({ novel }: { novel: Novel }) {
  return (
    <Link to={`/novel/${novel.id}`} className="relative group block rounded-xl overflow-hidden bg-white dark:bg-[#1e2330] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ring-1 ring-black/5 dark:ring-white/5 flex flex-col h-full">
      <div className="aspect-[2/3] overflow-hidden relative rounded-t-xl">
        <img 
          src={novel.image} 
          alt={novel.title} 
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/novelora-fallback.svg"; }}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-30"></div>
        
        {novel.rank && (
          <div className="absolute top-2 left-0 bg-blue-600 text-white shadow-md px-2 py-0.5 font-bold rounded-r-md text-xs border border-white/10 z-10">
            #{novel.rank}
          </div>
        )}
      </div>
      
      {/* Title & Info Section Below Image */}
      <div className="p-3 flex flex-col flex-grow dark:border-t dark:border-white/5">
        <h3 className="text-gray-900 dark:text-gray-100 text-xs sm:text-sm font-semibold line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
          {novel.title}
        </h3>
        <div className="mt-auto flex justify-between items-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate max-w-[60%]">{novel.latestChapter || "Chapter 01"}</span>
          <span className="shrink-0">{novel.timeAgo || "17 jam"}</span>
        </div>
      </div>
    </Link>
  );
}

export function LatestUpdateCard({ novel }: { novel: Novel }) {
  const { t } = useLanguage();
  // Extract chapter number or main text for a cleaner look if possible, otherwise use as is
  const chapterText = novel.latestChapter?.replace(` ${t("detail.langId")}`, "") || "Chapter XX";
  
  return (
    <Link to={`/novel/${novel.id}`} className="group relative flex gap-4 p-4 rounded-xl bg-white dark:bg-[#1a1b26] hover:bg-blue-50/50 dark:hover:bg-gray-800/60 transition-all duration-300 border border-gray-100 dark:border-gray-800/80 hover:border-blue-200 dark:hover:border-gray-700 hover:shadow-md overflow-hidden">
      {/* Subtle decorative gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

      <div className="w-16 sm:w-20 lg:w-24 shrink-0 relative z-10">
        <div className="aspect-[3/4] rounded-lg shadow-sm overflow-hidden bg-gray-200 dark:bg-gray-700 relative">
          <img 
            src={novel.image} 
            alt={novel.title} 
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/novelora-fallback.svg"; }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
          {/* Subtle overlay on image to make it pop */}
          <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-lg"></div>
        </div>
      </div>
      
      <div className="flex flex-col flex-1 min-w-0 py-0.5 relative z-10">
        <div className="flex justify-between items-start gap-2 mb-1.5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
            {novel.title}
          </h3>
        </div>
        
        <div className="flex items-center gap-1.5 mb-2 mt-1">
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-1 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
            {chapterText}
          </span>
        </div>
        
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{novel.timeAgo}</span>
          </div>
          
          <span className="text-blue-600 dark:text-blue-400 text-xs font-medium opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 flex items-center gap-1">
            Mulai Baca
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
