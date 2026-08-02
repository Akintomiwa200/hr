"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { useAutoHideScrollbar } from "@/hooks/use-auto-hide-scrollbar";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

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
  userName,
  userEmail,
  firstName,
  lastName,
  teamCount,
  notificationCount,
  children,
}: {
  role: Role;
  userName: string;
  userEmail: string;
  firstName: string;
  lastName: string;
  teamCount: number;
  notificationCount: number;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainScroll = useAutoHideScrollbar();

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

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
        notificationCount={notificationCount}
        collapsed={!isMobile && sidebarCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />

      <div
        className="flex h-screen flex-col overflow-hidden transition-[margin] duration-200 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <TopBar
          firstName={firstName}
          lastName={lastName}
          role={role}
          teamCount={teamCount}
          sidebarCollapsed={isMobile ? !mobileOpen : sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          isMobile={isMobile}
        />
        <main
          ref={mainScroll.ref}
          className={cn(
            "flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 lg:px-6 pb-6",
            mainScroll.className
          )}
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
