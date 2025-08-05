"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Bell,
  Search,
  Settings,
  User,
  LogOut,
  Menu,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type UserRole } from "@/types";

interface HeaderProps {
  onMenuClick?: () => void;
  className?: string;
}

// Mock notifications data - in real implementation, this would come from an API
const mockNotifications = [
  {
    id: "1",
    title: "Order #12345 Ready for QC",
    message: "Production completed, awaiting quality control inspection",
    type: "info" as const,
    timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    href: "/orders/12345",
  },
  {
    id: "2",
    title: "Low Stock Alert",
    message: "Basin Type A - Only 5 units remaining",
    type: "warning" as const,
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    href: "/inventory/parts/basin-type-a",
  },
  {
    id: "3",
    title: "QC Inspection Passed",
    message: "Order #12344 passed all quality checks",
    type: "success" as const,
    timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    href: "/orders/12344",
  },
];

const roleDisplayNames: Record<UserRole, string> = {
  ADMIN: "Administrator",
  PRODUCTION_COORDINATOR: "Production Coordinator",
  PROCUREMENT: "Procurement Specialist",
  QC_PERSON: "Quality Control",
  ASSEMBLER: "Assembly Technician",
  SERVICE_DEPARTMENT: "Service Representative",
};

function NotificationIcon({ type }: { type: "info" | "warning" | "success" }) {
  switch (type) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "warning":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Clock className="h-4 w-4 text-blue-500" />;
  }
}

function formatTimestamp(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function Header({ onMenuClick, className }: HeaderProps) {
  const { data: session } = useSession();
  const userRole = session?.user?.roles?.[0] as UserRole;
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const unreadCount = mockNotifications.length;

  return (
    <header className={cn("border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Logo and title - visible on mobile */}
        <div className="flex items-center md:hidden">
          <Shield className="h-6 w-6 text-primary mr-2" />
          <span className="font-semibold">TORVAN</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders, parts, customers..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
                <span className="sr-only">
                  {unreadCount > 0 ? `${unreadCount} notifications` : "No notifications"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary">{unreadCount} new</Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {mockNotifications.length > 0 ? (
                mockNotifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} asChild>
                    <Link href={notification.href} className="flex flex-col items-start gap-1 p-3">
                      <div className="flex items-start gap-2 w-full">
                        <NotificationIcon type={notification.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  <span className="text-muted-foreground">No notifications</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/notifications" className="w-full text-center">
                  View all notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userEmail}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {roleDisplayNames[userRole] || userRole}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}