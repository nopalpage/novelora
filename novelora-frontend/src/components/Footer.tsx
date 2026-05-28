import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdsterraBanner } from "./AdsterraAd";

export function Footer() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Pre-footer Ad Banner */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <AdsterraBanner width={728} height={90} />
      </div>

      <footer className="bg-[#1a1b26] text-gray-400 mt-4 relative pt-8 pb-8 border-t border-gray-800">
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center text-xs text-gray-500">
          <p>
            © Copyright 2026 - novelora. All rights reserved. All novels and content on this site are shared for entertainment and educational purposes only. All rights belong to their original authors and publishers. We do not claim any ownership of the works posted here. If you are the copyright owner and believe your work has been used without permission, please leave a comment on the relevant post, and we will review and remove the content as soon as possible. Thank you for your understanding and support.
          </p>
        </div>
      </div>

      <button 
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 lg:right-12 w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 z-50 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        aria-label="Back to top"
      >
        <i className="fa-solid fa-arrow-up"></i>
      </button>
    </footer>
    </>
  );
}
