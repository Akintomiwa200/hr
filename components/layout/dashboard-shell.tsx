"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { ChatDock } from "@/components/chat/chat-dock";
import { ChatCallProvider } from "@/components/chat/chat-call-provider";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { useAutoHideScrollbar } from "@/hooks/use-auto-hide-scrollbar";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import { CompanyWorkspaceSwitcher } from "@/components/admin/company-workspace-switcher";

function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

export function DashboardShell({
  role,
  userId,
  userName,
  userEmail,
  firstName,
  lastName,
  employeeId,
  avatarUrl,
  companyName,
  companyLogo,
  bonusesEnabled = false,
  chatEnabled = false,
  platformContext = false,
  children,
}: {
  role: Role;
  userId: string;
  userName: string;
  userEmail: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
  avatarUrl?: string | null;
  companyName?: string;
  companyLogo?: string | null;
  bonusesEnabled?: boolean;
  chatEnabled?: boolean;
  platformContext?: boolean;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { ref: mainScrollRef, className: mainScrollClassName } = useAutoHideScrollbar();

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const [prevIsMobile, setPrevIsMobile] = useState(isMobile);
  if (prevIsMobile !== isMobile) {
    setPrevIsMobile(isMobile);
    if (!isMobile) setMobileOpen(false);
  }

  useEffect(() => {
    const html = document.documentElement;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((open) => !open);
      return;
    }
    setSidebarCollapsed((collapsed) => !collapsed);
  };

  const sidebarWidth = isMobile
    ? 0
    : sidebarCollapsed
      ? SIDEBAR_COLLAPSED_WIDTH
      : SIDEBAR_WIDTH;

  return (
    <RealtimeProvider>
      <ChatCallProvider enabled={chatEnabled}>
        <div className="h-screen overflow-hidden bg-surface">
          {isMobile && mobileOpen && (
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={closeMobile}
            />
          )}

          <Sidebar
            role={role}
            userName={userName}
            userEmail={userEmail}
            avatarUrl={avatarUrl}
            collapsed={!isMobile && sidebarCollapsed}
            mobileOpen={mobileOpen}
            onCloseMobile={closeMobile}
            employeeId={employeeId}
            companyName={companyName}
            companyLogo={companyLogo}
            bonusesEnabled={bonusesEnabled}
          />

          <div
            className="flex h-screen flex-col overflow-hidden transition-[margin] duration-200 ease-in-out"
            style={{ marginLeft: sidebarWidth }}
          >
            <TopBar
              firstName={firstName}
              lastName={lastName}
              userEmail={userEmail}
              role={role}
              employeeId={employeeId}
              avatarUrl={avatarUrl}
              sidebarCollapsed={isMobile ? !mobileOpen : sidebarCollapsed}
              onToggleSidebar={toggleSidebar}
              isMobile={isMobile}
            />
            <main
              ref={mainScrollRef}
              className={cn(
                "flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 lg:px-6 pt-5 sm:pt-6 pb-8",
                mainScrollClassName
              )}
            >
              {platformContext && (
                <div className="mx-auto mb-4 flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold text-violet-950">Platform support workspace</p>
                    <p className="mt-0.5 text-[11px] text-violet-800">
                      {companyName ? `Viewing ${companyName} as a company administrator.` : "Viewing this tenant as a company administrator."} Return to platform controls at any time.
                    </p>
                  </div>
                  <CompanyWorkspaceSwitcher exit />
                </div>
              )}
              <div className="mx-auto w-full max-w-6xl">{children}</div>
            </main>
          </div>

          <ChatDock
            currentUserId={userId}
            currentUserName={userName}
            currentUserAvatar={avatarUrl}
            enabled={chatEnabled}
          />
        </div>
      </ChatCallProvider>
    </RealtimeProvider>
  );
}
