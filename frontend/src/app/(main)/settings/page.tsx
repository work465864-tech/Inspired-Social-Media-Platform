import Link from 'next/link';
import PagePlaceholder from '../../../components/PagePlaceholder';
import { SignOutButton } from '../../../features/auth/components/SignOutButton';
import { paths } from '../../../constants/paths.js';

export default function SettingsPage() {
  return (
    <div className="grid justify-items-start gap-6">
      <PagePlaceholder title="Settings" />
      <Link
        className="inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        href={paths.profileSettings}
      >
        Account and profile settings
      </Link>
      <SignOutButton />
    </div>
  );
}
