import { useParams, Link } from "react-router-dom";
import { Novel } from "../data";
import { ChevronLeft, ChevronRight, Settings, AlignLeft, AlignCenter, BookOpen, ChevronUp, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";

import { NovelComments } from "../components/NovelComments";
import { useLanguage } from "../contexts/LanguageContext";
import { api } from "../lib/api";

const chapterTranslations = {
  en: [
    `The heavy iron doors creaked open, revealing a vast, dimly lit cavern. Torches flickered along the stone walls, casting long, dancing shadows that seemed to mock his every step. He tightened his grip on the hilt of his sword, sensing the oppressive aura that hung heavy in the air.`,
    `"Are you sure about this?" Elara whispered from behind him, her voice barely audible over the sound of dripping water echoing through the chamber. "The legends say this place is cursed."`,
    `He didn't turn back. "Legends are often written by the fearful to keep the brave away. We need the artifact, Elara. There's no turning back now."`,
    `As they ventured deeper, the temperature plummeted, and a thick mist began to swirl around their boots. Strange symbols, glowing with a faint, ethereal light, were etched into the floor, pulsing in a hypnotic rhythm.`,
    `Suddenly, a low rumble resonated from the depths of the cavern. It wasn't the sound of falling rocks, but a deep, guttural growl that reverberated in his chest. A massive shadow detached itself from the darkness ahead.`,
    `"Stand ready," he commanded, drawing his sword fully from its scabbard. The blade shimmered, catching the faint light. Whatever guardian protected this place was about to reveal itself.`,
    `The creature stepped into the light. It was a monstrosity of stone and shadow, its eyes burning like coals. It let out a deafening roar that shook the very foundations of the cavern, and charged.`,
    `He lunged forward, meeting the beast head-on. The clash of steel against stone echoed like thunder. The battle had begun, and only one would emerge victorious.`
  ],
  id: [
    `Pintu besi berat itu berderit terbuka, menampakkan gua yang luas dan remang-remang. Obor berkelap-kelip di sepanjang dinding batu, melemparkan bayangan panjang dan menari yang seolah mengejek setiap langkahnya. Dia mengencangkan cengkeramannya pada gagang pedangnya, merasakan aura menindas yang menggantung berat di udara.`,
    `"Apakah kamu yakin tentang ini?" Elara berbisik dari belakangnya, suaranya nyaris tak terdengar di atas suara tetesan air yang bergema melalui ruangan itu. "Legenda mengatakan tempat ini dikutuk."`,
    `Dia tidak menoleh ke belakang. "Legenda sering ditulis oleh orang-orang penakut untuk menjauhkan yang pemberani. Kita membutuhkan artefak itu, Elara. Tidak ada jalan kembali sekarang."`,
    `Saat mereka menjelajah lebih dalam, suhu anjlok, dan kabut tebal mulai berputar di sekitar sepatu bot mereka. Simbol-simbol aneh, bersinar dengan cahaya redup yang halus, tertulis di lantai, berdenyut dalam ritme hipnotis.`,
    `Tiba-tiba, gemuruh rendah bergema dari kedalaman gua. Itu bukan suara batu yang jatuh, melainkan geraman dalam serak yang bergema di dadanya. Bayangan besar melepaskan dirinya dari kegelapan di depan.`,
    `"Bersiaplah," perintahnya, menarik pedangnya sepenuhnya dari sarungnya. Bilahnya berkilauan, menangkap cahaya redup itu. Apa pun penjaga yang melindungi tempat ini akan segera menampakkan dirinya.`,
    `Makhluk itu melangkah ke dalam cahaya. Itu adalah monster buas dari batu dan bayangan, matanya menyala seperti bara api. Ia mengeluarkan raungan memekakkan telinga yang mengguncang fondasi gua, lalu menerjang.`,
    `Dia menerjang ke depan, menyambut binatang itu langsung. Bentrokan baja melawan batu bergema seperti petir. Pertempuran telah dimulai, dan hanya satu yang akan muncul sebagai pemenang.`
  ],
  ms: [
    `Pintu besi yang berat berkeriuk terbuka, menampakkan gua yang luas samar-samar dilimpahi cahaya. Obor bergemerlapan di sepanjang dinding batu, memaparkan bayang-bayang panjang nan menari-nari yang seakan mengejek setiap langkahnya. Dia memperkemaskan genggamannya pada hulu pedang, merasai aura menyesakkan yang menyelubungi ruang.`,
    `"Adakah awak pasti tentang perkara ini?" Elara berbisik dari belakangnya, suaranya hampir tidak kedengaran di sebalik bunyi desiran air yang bergema di sudut pelusuk ruangan itu. "Kisah legenda menceritakan bahawa tempat ini sumpahan."`,
    `Dia tidak berpaling ke belakang. "Legenda sering ditulis oleh mereka yang penakut untuk menjauhkan mereka yang berani. Kita perlukan artifak itu, Elara. Tidak ada jalan pulang sekarang."`,
    `Sambil mereka meneroka lebih jauh ke dalam, suhu kian merosot, dan kabus tebal mulai berpusar di sekeliling but mereka. Terdapat beberapa simbol asing, bersinar dengan cahaya cerah dan kekal, terukir pada lantai, lalu berdenyut mengikut renak irama hipnosis.`,
    `Tiba-tiba, bunyi deruman yang perlahan terhasil dari dasar gua tersebut. Ianya bukanlah bunyi bebatuan yang runtuh, namun rintihan serak dan garau yang membingar di dalam dada pemuda itu. Satu bebayang gergasi memisahkan dirinya daripada kegelapan yang berada di hadapan.`,
    `"Sedia semua," dia memberi arahan, sambil menghunus bersih pedang tersebut dari sarungnya. Bilahnya berkemerlapan, disambut dengan limpahan cahaya sirna. Apa sahaja sang pelindung yang bertugas di sini sudah bersedia menampakkan dirinya.`,
    `Katakalau haiwan tadi menudingkan tapak ke cerah. Ia seperti raksasa campuran daripada batu dan bebayangan, serta matanya yang menyala bagaikan kawah bara. Sememangnya binatang itu terus melepaskan satu ngauman memekakkan telinga lantas menggegarkan asas pembinaan gua sebelum merusuh.`,
    `Beliau memunculkan muka hadapan, menemui haiwan ini dari hadapan. Bertembungnya besi demi batu lalu bergema persis halilintar. Peperangan pun bermula, dan satu pihak sahaja layak dinobatkan dengan kemenangan.`
  ]
};

export function Chapter() {
  const { language, t } = useLanguage();
  const { novelId, chapterId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapterData, setChapterData] = useState<any>(null);
  const [adjacentChapters, setAdjacentChapters] = useState<{prev: string | null, next: string | null}>({prev: null, next: null});
  
  // Reading settings
  const [fontSize, setFontSize] = useState("text-lg");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!novelId || !chapterId) return;
    
    let isMounted = true;
    setIsLoading(true);
    
    Promise.all([
      api.getNovelById(novelId),
      api.getChapterContent(chapterId),
      api.getChapters(novelId)
    ]).then(([fetchedNovel, fetchedChapter, chapters]) => {
      if (isMounted) {
        setNovel(fetchedNovel);
        setChapterData(fetchedChapter);
        
        // Find adjacent chapters
        if (chapters && chapters.length > 0 && fetchedChapter) {
          const sorted = [...chapters].sort((a, b) => a.chapter_num - b.chapter_num);
          const currentIndex = sorted.findIndex(c => c.id === chapterId);
          setAdjacentChapters({
            prev: currentIndex > 0 ? sorted[currentIndex - 1].id : null,
            next: currentIndex < sorted.length - 1 && currentIndex !== -1 ? sorted[currentIndex + 1].id : null
          });
        }
        
        // Save reading history
        if (fetchedNovel && fetchedChapter) {
          try {
            const historyRaw = localStorage.getItem("readingHistory");
            let history = historyRaw ? JSON.parse(historyRaw) : [];
            
            history = history.filter((item: any) => item.novelId !== novelId);
            history.unshift({
              novelId,
              chapterId,
              chapterNum: fetchedChapter?.chapter_num || chapterId,
              novelTitle: fetchedNovel.title,
              novelImage: fetchedNovel.image,
              readAt: new Date().toISOString()
            });
            
            if (history.length > 50) history = history.slice(0, 50);
            localStorage.setItem("readingHistory", JSON.stringify(history));
          } catch (e) {
            console.error("Failed to save reading history", e);
          }
        }
        
        setIsLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) setIsLoading(false);
    });
    
    return () => { isMounted = false; };
  }, [novelId, chapterId]);

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("chapter.notFound")}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{t("chapter.notFoundDesc")}</p>
          <Link to="/" className="text-blue-600 hover:underline inline-flex items-center gap-2">
            <ChevronLeft size={16} /> {t("chapter.backToHome")}
          </Link>
        </div>
      </div>
    );
  }

  const { prev: prevChapter, next: nextChapter } = adjacentChapters;

  // Use content from API or fallback
  const paragraphs = chapterData?.content 
    ? chapterData.content.split('\n').filter((p: string) => p.trim().length > 0)
    : chapterTranslations[language] || chapterTranslations.en;
  
  const displayChapterNum = chapterData?.chapter_num || chapterId;

  return (
    <div className="flex-grow w-full bg-gray-50 dark:bg-[#111216] min-h-screen">
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-6">
        


        {/* Main Content */}
        <div className="flex-grow max-w-6xl min-w-0 mx-auto w-full">
          


        {/* Header / Navigation */}
        <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 mb-6 sticky top-20 z-30 transition-all">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link to={`/novel/${novel.id}`} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full sm:w-auto">
              <ChevronLeft size={20} />
              <span className="font-medium truncate max-w-[200px]">{novel.title}</span>
            </Link>
            
            <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
              {prevChapter ? (
                <Link to={`/novel/${novel.id}/chapter/${prevChapter}`} className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
                </Link>
              ) : (
                <button disabled className="p-2 border border-gray-100 dark:border-gray-800 rounded-lg opacity-50 cursor-not-allowed">
                  <ChevronLeft size={20} className="text-gray-300 dark:text-gray-600" />
                </button>
              )}
              
              <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium rounded-lg text-sm whitespace-nowrap">
                {t("home.chapters")} {displayChapterNum}
              </div>
              
              {nextChapter ? (
                <Link to={`/novel/${novel.id}/chapter/${nextChapter}`} className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
                </Link>
              ) : (
                <button disabled className="p-2 border border-gray-100 dark:border-gray-800 rounded-lg opacity-50 cursor-not-allowed">
                  <ChevronRight size={20} className="text-gray-300 dark:text-gray-600" />
                </button>
              )}
            </div>
            
            <div className="flex justify-end w-full sm:w-auto relative">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label={t("chapter.settings")}
              >
                <Settings size={20} />
              </button>
              
              {showSettings && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t("chapter.fontSize")}</h4>
                  <div className="flex items-center justify-between gap-2">
                    <button onClick={() => setFontSize("text-sm")} className={`px-3 py-1.5 rounded border ${fontSize === 'text-sm' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700'}`}>A</button>
                    <button onClick={() => setFontSize("text-base")} className={`px-3 py-1.5 rounded border ${fontSize === 'text-base' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700'}`}>A</button>
                    <button onClick={() => setFontSize("text-lg")} className={`px-3 py-1.5 rounded border ${fontSize === 'text-lg' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700'}`}>A</button>
                    <button onClick={() => setFontSize("text-xl")} className={`px-3 py-1.5 rounded border ${fontSize === 'text-xl' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 text-lg font-medium'}`}>A</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <article className="bg-[#fcfbf9] dark:bg-gray-900 rounded-xl shadow-sm border border-[#f0eee9] dark:border-gray-800 p-6 md:p-12 lg:p-16 mb-8 min-h-[60vh] transition-colors duration-300">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-10 border-b border-[#f0eee9] dark:border-gray-800 pb-8 text-center leading-relaxed font-serif tracking-tight">
            {chapterData?.title || `${t("home.chapters")} ${displayChapterNum} - ${t("chapter.theAwakening")}`}
          </h1>
          
          <div className={`${fontSize} text-gray-800 dark:text-gray-300 space-y-8 leading-[2] font-serif tracking-[0.01em]`}>
            {paragraphs.map((p, i) => (
              <p key={i} className="text-justify indent-8 md:indent-12">{p}</p>
            ))}
          </div>
        </article>
        


        {/* Bottom Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#1a1b26] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 mb-8">
           {prevChapter ? (
              <Link to={`/novel/${novel.id}/chapter/${prevChapter}`} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl transition-colors font-medium">
                <ChevronLeft size={20} />
                {t("chapter.prev")}
              </Link>
            ) : (
              <button disabled className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 rounded-xl cursor-not-allowed font-medium">
                <ChevronLeft size={20} />
                {t("chapter.prev")}
              </button>
            )}
            
            <Link to={`/novel/${novel.id}`} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-colors font-medium">
              <BookOpen size={20} />
              {t("chapter.index")}
            </Link>
            
            {nextChapter ? (
              <Link to={`/novel/${novel.id}/chapter/${nextChapter}`} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-sm shadow-blue-500/20">
                {t("chapter.next")}
                <ChevronRight size={20} />
              </Link>
            ) : (
              <button disabled className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-400 dark:bg-blue-800 text-white rounded-xl cursor-not-allowed font-medium shadow-sm">
                {t("chapter.next")}
                <ChevronRight size={20} />
              </button>
            )}
        </div>
        
        {/* Comments */}
        <NovelComments />
        </div>
        

      </div>
    </div>
  );
}
