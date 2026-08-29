import type { CurrentProfile } from "@/features/auth/types";
import { LogoutButton } from "@/features/auth/components/logout-button";

interface AppHeaderProps {
  profile: CurrentProfile;
  sectionLabel: string;
}

export function AppHeader({ profile, sectionLabel }: AppHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div>
          <p className="font-bold tracking-tight text-teal-800">EnglishClass</p>
          <p className="text-sm text-slate-500">{sectionLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-sm font-medium text-slate-700 sm:block">
            {profile.fullName}
          </p>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
