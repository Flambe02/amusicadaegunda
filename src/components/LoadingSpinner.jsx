/**
 * Composant de chargement simple et léger
 * Utilisé comme fallback pour React.lazy() et Suspense
 */
export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 dark:text-gray-400 animate-pulse">
          Chargement...
        </p>
      </div>
    </div>
  );
}

