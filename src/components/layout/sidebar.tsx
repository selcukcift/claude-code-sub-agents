"use client";

import React from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  ShoppingCart,
  Users,
  ClipboardCheck,
  Settings,
  Home,
  FileText,
  Truck,
  BarChart3,
  Shield,
  Wrench,
  Factory,
  Activity,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { type UserRole } from "@/types";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roles: UserRole[];
}

const navigationItems: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    roles: ["ADMIN", "PRODUCTION_COORDINATOR", "PROCUREMENT", "QC_PERSON", "ASSEMBLER", "SERVICE_DEPARTMENT"],
  },
  {
    name: "Orders",
    href: "/orders",
    icon: ShoppingCart,
    roles: ["ADMIN", "PRODUCTION_COORDINATOR", "PROCUREMENT", "SERVICE_DEPARTMENT"],
  },
  {
    name: "Create Order",
    href: "/orders/create",
    icon: FileText,
    roles: ["ADMIN", "PRODUCTION_COORDINATOR", "SERVICE_DEPARTMENT"],
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Package,
    roles: ["ADMIN", "PRODUCTION_COORDINATOR", "PROCUREMENT", "ASSEMBLER"],
  },
  {
    name: "BOM Management",
    href: "/bom",
    icon: Factory,
    roles: ["ADMIN", "PRODUCTION_COORDINATOR"],
  },
  {
    name: "Production",
    href: "/production",
    icon: Activity,
    roles: ["ADMIN", "PRODUCTION_COORDINATOR", "ASSEMBLER"],
  },
  {
    name: "Quality Control",
    href: "/quality-control",
    icon: CheckCircle,
    roles: ["ADMIN", "PRODUCTION_COORDINATOR", "QC_PERSON"],
  },
  {
    name: "Procurement",
    href: "/procurement",
    icon: Truck,
    roles: ["ADMIN", "PROCUREMENT"],
  },
  {
    name: "Service Requests",
    href: "/service",
    icon: Wrench,
    roles: ["ADMIN", "SERVICE_DEPARTMENT"],
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["ADMIN", "PRODUCTION_COORDINATOR"],
  },
  {
    name: "User Management",
    href: "/users",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["ADMIN", "PRODUCTION_COORDINATOR", "PROCUREMENT", "QC_PERSON", "ASSEMBLER", "SERVICE_DEPARTMENT"],
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const userRole = session?.user?.roles?.[0] as UserRole;

  const filteredNavigation = navigationItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center mb-4">
            <Shield className="h-8 w-8 text-primary mr-2" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                TORVAN
              </h2>
              <p className="text-xs text-muted-foreground">
                Medical Workflow System
              </p>
            </div>
          </div>
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.name}
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Role-specific quick actions
const roleQuickActions = {
  ADMIN: [
    { name: "System Health", icon: Activity, href: "/admin/health" },
    { name: "User Activity", icon: Users, href: "/admin/activity" },
  ],
  PRODUCTION_COORDINATOR: [
    { name: "Production Queue", icon: Factory, href: "/production/queue" },
    { name: "Resource Planning", icon: BarChart3, href: "/production/planning" },
  ],
  PROCUREMENT: [
    { name: "Purchase Orders", icon: FileText, href: "/procurement/orders" },
    { name: "Supplier Management", icon: Truck, href: "/procurement/suppliers" },
  ],
  QC_PERSON: [
    { name: "QC Queue", icon: CheckCircle, href: "/qc/queue" },
    { name: "Test Results", icon: Activity, href: "/qc/results" },
  ],
  ASSEMBLER: [
    { name: "Work Orders", icon: ClipboardCheck, href: "/production/work-orders" },
    { name: "Assembly Guide", icon: FileText, href: "/production/guides" },
  ],
  SERVICE_DEPARTMENT: [
    { name: "Service Tickets", icon: AlertTriangle, href: "/service/tickets" },
    { name: "Customer Orders", icon: ShoppingCart, href: "/service/orders" },
  ],
};

interface QuickActionsProps {
  userRole: UserRole;
  className?: string;
}

export function QuickActions({ userRole, className }: QuickActionsProps) {
  const actions = roleQuickActions[userRole] || [];

  if (actions.length === 0) return null;

  return (
    <div className={cn("p-4 border-t", className)}>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Quick Actions
      </h3>
      <div className="space-y-2">
        {actions.map((action) => (
          <Link
            key={action.name}
            href={action.href}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <action.icon className="mr-2 h-4 w-4" />
            {action.name}
          </Link>
        ))}
      </div>
    </div>
  );
}