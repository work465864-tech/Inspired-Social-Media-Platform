function Loader({ label = 'Loading', className = '' }) {
  return (
    <div
      aria-label={label}
      className={`inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-primary ${className}`}
      role="status"
    />
  );
}

export default Loader;
