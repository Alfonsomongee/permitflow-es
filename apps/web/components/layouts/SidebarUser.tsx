"use client";

import { UserButton, useUser } from "@clerk/nextjs";

export function SidebarUser() {
  const { user } = useUser();

  if (!user) return null;

  const displayName =
    user.fullName ??
    user.username ??
    user.primaryEmailAddress?.emailAddress ??
    "Usuario";

  const email = user.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-bg/50 transition-colors">
      <div className="flex-shrink-0">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
              userButtonPopoverCard: "shadow-md border border-[#E5E5E5]",
            },
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary leading-tight">
          {displayName}
        </p>
        <p className="truncate text-[11px] text-text-secondary leading-tight mt-0.5">
          {email}
        </p>
      </div>
    </div>
  );
}
