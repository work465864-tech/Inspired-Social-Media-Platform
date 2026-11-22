import Input, { type InputProps } from '../../../components/ui/Input';

export function PasswordInput(props: InputProps) {
  return (
    <Input
      autoComplete="current-password"
      placeholder="At least 8 characters"
      type="password"
      {...props}
    />
  );
}
