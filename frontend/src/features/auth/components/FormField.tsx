import { cloneElement, type ReactElement } from 'react';
import type { InputProps } from '../../../components/ui/Input';
import { ErrorText } from './ErrorText';

type FormFieldProps = {
  children: ReactElement<InputProps>;
  error?: string;
  htmlFor: string;
  label: string;
  hint?: string;
};

export function FormField({
  children,
  error,
  hint,
  htmlFor,
  label,
}: FormFieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy =
    [children.props['aria-describedby'], hintId, errorId]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      {cloneElement(children, {
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        hasError: Boolean(error),
      })}
      {hint && !error && (
        <p className="text-xs text-muted" id={hintId}>
          {hint}
        </p>
      )}
      <ErrorText id={errorId} message={error} />
    </div>
  );
}
