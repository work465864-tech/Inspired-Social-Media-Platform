import { LoaderCircle } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import Button from '../../../components/ui/Button';

type SocialProvider = 'Google' | 'GitHub';

type SocialButtonProps = {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  provider: SocialProvider;
};

export function SocialButton({
  disabled,
  loading,
  onClick,
  provider,
}: SocialButtonProps) {
  return (
    <Button
      aria-busy={loading}
      aria-label={
        loading ? `Connecting to ${provider}` : `Continue with ${provider}`
      }
      className="w-full"
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant="secondary"
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : provider === 'Google' ? (
        <FcGoogle aria-hidden="true" className="h-4 w-4" />
      ) : (
        <FaGithub aria-hidden="true" className="h-4 w-4" />
      )}
      {loading ? `Connecting to ${provider}...` : `Continue with ${provider}`}
    </Button>
  );
}
