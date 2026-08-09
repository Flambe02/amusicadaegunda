/**
 * Barre de progression de la leçon guidée — une pastille par étape, remplie jusqu'à
 * l'étape courante. Purement visuelle, aucune logique de navigation.
 */
export default function LessonProgressBar({ steps, currentIndex }) {
  return (
    <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={steps.length}>
      {steps.map((step, index) => (
        <span
          key={step.id}
          aria-label={step.label}
          className={`h-1.5 flex-1 rounded-full transition ${
            index <= currentIndex ? 'bg-[#FDE047]' : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}
