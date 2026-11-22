import PagePlaceholder from '../../../components/PagePlaceholder';
import { SignOutButton } from '../../../features/auth/components/SignOutButton';

export default function SettingsPage() {
  return (
    <div className="grid justify-items-start gap-6">
      <PagePlaceholder title="Settings" />
      <SignOutButton />
    </div>
  );
}
