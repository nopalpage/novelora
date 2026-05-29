import { useParams, Link } from "react-router-dom";
import { Novel } from "../data";
import { Star, Clock, BookOpen, User, Bookmark, Flag, X, Info } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { AdsterraBanner, AdsterraNativeBanner } from "../components/AdsterraAd";
import { NovelComments } from "../components/NovelComments";
import { SidebarChat, SidebarLastRead } from "../components/SidebarWidgets";
import { useLanguage } from "../contexts/LanguageContext";
import { api } from "../lib/api";

export function NovelDetail() {
  const { language, t } = useLanguage();
  const { novelId } = useParams();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [apiChapters, setApiChapters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!novelId) return;
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      api.getNovelById(novelId),
      api.getChapters(novelId)
    ]).then(([fetchedNovel, fetchedChapters]) => {
      if (isMounted) {
        setNovel(fetchedNovel);
        setApiChapters(fetchedChapters);
        setIsLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) setIsLoading(false);
    });

    return () => { isMounted = false; };
  }, [novelId]);

  const author = novel?.author || "Unknown Author";
  const status = novel?.status || "Ongoing";
  const type = novel?.type || "Web Novel";
  const rating = novel?.rating || 4.5;
  const genres = novel?.genres || ["Action", "Fantasy", "Adventure"];
  const description = novel?.description || "In a world where magic rules, our protagonist awakens with an unknown power. Follow their journey as they navigate through a treacherous academy, fight mythical beasts, and uncover the true secret behind the world's ancient prophecies. Along the way, they will gather trusted companions, form alliances, and face off against formidable foes who seek to control the very essence of magic itself. Will they be able to master their newly found power in time, or will they fall victim to the dark forces lurking in the shadows? This sweeping epic blends intense action, deep character development, and a richly imagined universe that will keep you captivated from the very first page.";

  const totalChapters = apiChapters.length;
  const [visibleChapters, setVisibleChapters] = useState(15);

  const allChapters = useMemo(() => {
    if (apiChapters.length > 0) {
      return apiChapters.map((ch: any) => ({
        id: ch.id,
        chapterNum: ch.chapter_num,
        title: ch.title,
        translationType: ch.translation_type || "MTL",
        created_at: ch.created_at
      })).sort((a, b) => b.chapterNum - a.chapterNum);
    }
    // Fallback if no chapters
    return [];
  }, [apiChapters]);
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isBookmarked, setIsBookmarked] = useState(() => {
    try {
      const savedBookmarks = localStorage.getItem("bookmarks");
      if (savedBookmarks) {
        const bookmarks = JSON.parse(savedBookmarks);
        return Array.isArray(bookmarks) && novel ? bookmarks.includes(novel.id) : false;
      }
    } catch (e) {
      console.error("Failed to parse bookmarks", e);
    }
    return false;
  });

  useEffect(() => {
    if (!novel) return;
    try {
      const savedBookmarks = localStorage.getItem("bookmarks");
      if (savedBookmarks) {
        const bookmarks = JSON.parse(savedBookmarks);
        setIsBookmarked(Array.isArray(bookmarks) && bookmarks.includes(novel.id));
      } else {
        setIsBookmarked(false);
      }
    } catch (e) {
      console.error("Failed to parse bookmarks", e);
    }
  }, [novel?.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleChapters((prev) => Math.min(prev + 15, totalChapters));
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "100px",
        threshold: 0.1
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      observer.disconnect();
    };
  }, [visibleChapters, totalChapters]);

  const toggleBookmark = () => {
    if (!novel) return;
    setIsBookmarked((prev) => {
      const newValue = !prev;
      try {
        const savedBookmarks = localStorage.getItem("bookmarks");
        let bookmarks: string[] = [];
        if (savedBookmarks) {
          bookmarks = JSON.parse(savedBookmarks);
        }
        if (!Array.isArray(bookmarks)) bookmarks = [];

        if (newValue) {
          if (!bookmarks.includes(novel.id)) {
            bookmarks.push(novel.id);
          }
        } else {
          bookmarks = bookmarks.filter((id: string) => id !== novel.id);
        }
        localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
      } catch (e) {
        console.error("Failed to save bookmark", e);
      }
      return newValue;
    });
  };

  // ----------------------------------------------------
  // EARLY RETURNS (After all hooks)
  // ----------------------------------------------------
  if (isLoading) {
    return (
      <main className="flex-grow w-full border-transparent bg-transparent relative z-10">
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-gray-200 dark:bg-gray-800 shimmer-wrapper"></div>
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-32 sm:-mt-48 relative z-10 pb-12">
          <div className="flex flex-col md:flex-row gap-6 sm:gap-8 mt-12 bg-white dark:bg-[#1a1b26] p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="shrink-0 mx-auto md:mx-0 w-48 sm:w-64">
              <div className="aspect-[2/3] w-full rounded-xl bg-gray-200 dark:bg-gray-700 shimmer-wrapper"></div>
            </div>
            <div className="flex flex-col pt-4 sm:pt-10 flex-grow w-full space-y-4">
              <div className="h-10 w-3/4 rounded bg-gray-200 dark:bg-gray-700 shimmer-wrapper"></div>
              <div className="h-6 w-1/2 rounded bg-gray-200 dark:bg-gray-700 shimmer-wrapper"></div>
              <div className="flex gap-2 mb-4">
                <div className="h-8 w-20 rounded-full bg-gray-200 dark:bg-gray-700 shimmer-wrapper"></div>
                <div className="h-8 w-20 rounded-full bg-gray-200 dark:bg-gray-700 shimmer-wrapper"></div>
                <div className="h-8 w-20 rounded-full bg-gray-200 dark:bg-gray-700 shimmer-wrapper"></div>
              </div>
              <div className="h-24 w-full rounded bg-gray-200 dark:bg-gray-700 shimmer-wrapper mt-4"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!novel) {
    return (
      <div className="flex-grow max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Novel Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400">The novel you are looking for does not exist.</p>
        <Link to="/" className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg font-medium">Return Home</Link>
      </div>
    );
  }

  return (
    <main className="flex-grow w-full border-transparent bg-transparent relative z-10">
      {/* Top Banner / Hero Image blurred */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center blur-md scale-110 opacity-50 dark:opacity-30"
          style={{ backgroundImage: `url(${novel.image})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent dark:from-[#121213] dark:via-[#121213]/80" />
      </div>

      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-32 sm:-mt-48 relative z-10 pb-12">

        <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
          {/* Cover Image */}
          <div className="shrink-0 mx-auto md:mx-0 w-[188px] sm:w-[252px] rounded-xl overflow-hidden shadow-2xl">
            <div className="aspect-[2/3] w-full bg-gray-200 dark:bg-gray-700">
              <img
                src={novel.image || "/novelora-fallback.svg"}
                alt={novel.title}
                onError={(e) => { e.currentTarget.src = "/novelora-fallback.svg"; }}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col justify-end pt-4 sm:pt-10 flex-grow">
            <div className="flex justify-between items-start gap-4">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-2 leading-tight">
                {novel.title}
              </h1>
              <button
                onClick={toggleBookmark}
                className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border rounded-lg transition-all shadow-sm shrink-0 mt-1 ${isBookmarked
                    ? "bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400"
                    : "bg-white border-gray-200 text-gray-800 dark:bg-[#1a1b26] dark:border-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-500"
                  }`}
                title={isBookmarked ? t("detail.unbookmark") : t("detail.bookmark")}
              >
                <Bookmark size={20} className={isBookmarked ? "fill-current" : ""} />
              </button>
            </div>

            {novel.alternativeTitles && novel.alternativeTitles.length > 0 && (
              <h2 className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-400 mb-4 pb-1">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{t("detail.alternative")}</span>{" "}
                <span className="italic">
                  {Array.isArray(novel.alternativeTitles) ? novel.alternativeTitles.join("; ") : novel.alternativeTitles}
                </span>
              </h2>
            )}

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6 text-sm text-gray-600 dark:text-gray-300 mt-2">
              <div className="flex items-center gap-1.5">
                <User size={16} className="text-blue-600" />
                <span className="font-medium">{author}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star size={16} className="text-amber-500 fill-amber-500" />
                <span className="font-medium">{rating}</span>
                <span className="text-gray-400">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-xs font-semibold uppercase tracking-wider">
                {status}
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold uppercase tracking-wider">
                {type}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
              {genres.map(genre => (
                <span key={genre} className="px-3 py-1 bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                  {genre}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full border-t border-gray-200 dark:border-gray-800 pt-5 mt-2">
              <div className="w-full text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                <p className="line-clamp-4 md:line-clamp-none">{description}</p>
              </div>
            </div>
          </div>
        </div>



        {/* Content Section */}
        <div className="mt-8 flex flex-col xl:flex-row gap-6">
          <div className="flex-grow min-w-0 space-y-8">
            {/* Chapters */}
            <section className="bg-white dark:bg-[#1a1b26] p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("detail.chapters")}</h2>
                <span className="text-sm text-gray-500">{novel.latestChapter ? t("detail.latestUpdated") : t("detail.chaptersCount").replace('{count}', totalChapters.toString())}</span>
              </div>

              <div
                ref={scrollContainerRef}
                className="space-y-2 max-h-[500px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                {allChapters.slice(0, visibleChapters).map((chapter, i) => {
                  const { id, chapterNum, translationType } = chapter;
                  const translationDesc = translationType === "HTL" ? t("detail.humanTranslation") : t("detail.machineTranslation");

                  return (
                    <Link key={i} to={`/novel/${novel.id}/chapter/${id}`} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800/40 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800/60 transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-10 h-10 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded flex items-center justify-center text-gray-500 dark:text-gray-400">
                          <BookOpen size={20} strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm sm:text-base font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {novel.title} {i === 0 && novel.latestChapter ? novel.latestChapter : `Chapter ${chapterNum}`} {t("detail.langId")}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            18/05/2026
                          </span>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1.5 shrink-0 ml-2"
                        title={translationDesc}
                      >
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${translationType === 'HTL' ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800/60' : 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-800/40 dark:text-orange-400 dark:border-orange-700/60'}`}>
                          {translationType}
                        </span>
                      </div>
                    </Link>
                  );
                })}

                {visibleChapters < totalChapters && (
                  <div ref={observerTarget} className="pt-4 pb-2 grid grid-cols-1 gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={`skel-${i}`} className="flex items-start gap-4 p-3 bg-gray-100 dark:bg-gray-800/40 rounded-lg">
                        <div className="shrink-0 w-10 h-10 rounded shimmer-wrapper"></div>
                        <div className="flex flex-col gap-2 w-full pt-1">
                          <div className="h-4 w-3/4 rounded shimmer-wrapper"></div>
                          <div className="h-3 w-1/4 rounded shimmer-wrapper"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {visibleChapters >= totalChapters && (
                  <div className="pt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t("detail.noMoreChapters")}
                  </div>
                )}
              </div>
            </section>

            {/* Comments Section */}
            <NovelComments />
          </div>

          <aside className="w-full xl:w-[450px] shrink-0 space-y-6 mt-14 xl:mt-0">
            {/* Related Works Section */}
            {novel.relatedWorks && novel.relatedWorks.length > 0 && (
              <section className="bg-white dark:bg-[#1a1b26] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">{t("detail.relatedWorks")}</h3>
                <div className="space-y-4">
                  {novel.relatedWorks.map((work) => (
                    <Link key={work.id} to={`/novel/${work.id}`} className="flex gap-3 group">
                      <div className="w-[48px] h-[64px] shrink-0 rounded overflow-hidden shadow-sm">
                        <img src={work.image} alt={work.title} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/novelora-fallback.svg"; }} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="min-w-0 flex flex-col justify-center">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                          {work.title}
                        </h4>
                        <span className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1.5 inline-block bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800/50 mr-auto">
                          {work.relation}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Chat Widget */}
            <SidebarChat />

            {/* Sidebar Last Read */}
            <SidebarLastRead />
          </aside>
        </div>
      </div>

    </main>
  );
}
