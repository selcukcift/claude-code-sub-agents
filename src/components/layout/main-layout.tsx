"use client";

import React, { useState } from "react";
import { Header } from "./header";
import { Sidebar, QuickActions } from "./sidebar";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { type UserRole } from "@/types";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();
  const userRole = session?.user?.roles?.[0] as UserRole;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex h-screen">
        {/* Desktop sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow border-r bg-background overflow-hidden">
            <Sidebar />
            {userRole && <QuickActions userRole={userRole} />}
          </div>
        </div>

        {/* Mobile sidebar */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform bg-background border-r md:hidden transition-transform duration-200 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            <Sidebar />
            {userRole && <QuickActions userRole={userRole} />}
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className={cn("flex-1 overflow-auto", className)}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}