/**
 * LoadingSpinner — Consistent loading indicator with optional text.
 */

export default function LoadingSpinner({ size = 'md', text = null, className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`${sizes[size]} border-primary-200 border-t-primary-600 rounded-full`}
        style={{ animation: 'spin 0.8s linear infinite' }}
      />
      {text && <p className="text-sm text-neutral-500 font-medium">{text}</p>}
    </div>
  );
}
