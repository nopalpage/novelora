import { Link } from "react-router-dom";
import { AlertTriangle, Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-lg w-full bg-white dark:bg-[#1a1b21] p-10 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Page Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm hover:shadow-blue-500/25"
        >
          <Home size={18} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
