type ErrorTextProps = {
  id?: string;
  message?: string;
};

export function ErrorText({ id, message }: ErrorTextProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className="text-xs font-medium text-red-600 dark:text-red-300"
      id={id}
      role="alert"
    >
      {message}
    </p>
  );
}
