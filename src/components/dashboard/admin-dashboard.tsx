"use client";

import React from "react";
import { DashboardLayout, DashboardSection } from "./dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Users,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Settings,
  Shield,
  Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mock data - in real implementation, this would come from APIs
const mockSystemHealth = [
  { component: "Database", status: "healthy", uptime: "99.9%", responseTime: "12ms" },
  { component: "API Gateway", status: "healthy", uptime: "99.8%", responseTime: "45ms" },
  { component: "Authentication", status: "warning", uptime: "98.5%", responseTime: "89ms" },
  { component: "File Storage", status: "healthy", uptime: "100%", responseTime: "23ms" },
];

const mockRecentActivity = [
  { user: "John Smith", action: "Created order #12345", timestamp: "5 minutes ago", type: "order" },
  { user: "Sarah Johnson", action: "Completed QC inspection", timestamp: "12 minutes ago", type: "qc" },
  { user: "Mike Brown", action: "Updated inventory levels", timestamp: "18 minutes ago", type: "inventory" },
  { user: "Lisa Davis", action: "Approved BOM v2.1", timestamp: "25 minutes ago", type: "bom" },
  { user: "Tom Wilson", action: "Added new user account", timestamp: "32 minutes ago", type: "user" },
];

const mockAlerts = [
  { id: "1", message: "Database backup completed successfully", type: "success", time: "2 hours ago" },
  { id: "2", message: "Low disk space on server-02", type: "warning", time: "4 hours ago" },
  { id: "3", message: "Failed login attempts detected", type: "error", time: "6 hours ago" },
];

export function AdminDashboard() {
  const metrics = [
    {
      title: "Total Users",
      value: 142,
      description: "Active system users",
      trend: { value: 8, direction: "up" as const },
    },
    {
      title: "Active Orders",
      value: 73,
      description: "Orders in progress",
      trend: { value: 12, direction: "up" as const },
    },
    {
      title: "System Uptime",
      value: "99.8%",
      description: "Last 30 days",
      variant: "success" as const,
    },
    {
      title: "Open Alerts",
      value: 3,
      description: "Requiring attention",
      variant: "warning" as const,
    },
  ];

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Administrator" },
  ];

  const actions = (
    <>
      <Button variant="outline" size="sm">
        <Settings className="mr-2 h-4 w-4" />
        System Settings
      </Button>
      <Button size="sm">
        <Shield className="mr-2 h-4 w-4" />
        Security Center
      </Button>
    </>
  );

  return (
    <DashboardLayout
      title="Administrator Dashboard"
      description="System overview and management controls"
      breadcrumbs={breadcrumbs}
      metrics={metrics}
      actions={actions}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* System Health */}
        <DashboardSection
          title="System Health"
          description="Monitor system components and performance"
          actions={
            <Button variant="outline" size="sm">
              <Activity className="mr-2 h-4 w-4" />
              View Details
            </Button>
          }
        >
          <div className="space-y-3">
            {mockSystemHealth.map((component, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      component.status === "healthy"
                        ? "bg-green-400"
                        : component.status === "warning"
                        ? "bg-yellow-400"
                        : "bg-red-400"
                    }`}
                  />
                  <div>
                    <p className="font-medium">{component.component}</p>
                    <p className="text-sm text-muted-foreground">
                      Uptime: {component.uptime} | Response: {component.responseTime}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    component.status === "healthy"
                      ? "complete"
                      : component.status === "warning"
                      ? "pending"
                      : "destructive"
                  }
                >
                  {component.status}
                </Badge>
              </div>
            ))}
          </div>
        </DashboardSection>

        {/* Recent Activity */}
        <DashboardSection
          title="Recent Activity"
          description="Latest user and system activities"
          actions={
            <Button variant="outline" size="sm">
              View All
            </Button>
          }
        >
          <div className="space-y-3">
            {mockRecentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  {activity.type === "order" && <ShoppingCart className="h-4 w-4 text-primary" />}
                  {activity.type === "qc" && <Shield className="h-4 w-4 text-primary" />}
                  {activity.type === "inventory" && <Database className="h-4 w-4 text-primary" />}
                  {activity.type === "bom" && <Activity className="h-4 w-4 text-primary" />}
                  {activity.type === "user" && <Users className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.user}</p>
                  <p className="text-sm text-muted-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardSection>
      </div>

      {/* Alerts and Notifications */}
      <DashboardSection
        title="System Alerts"
        description="Important system notifications and warnings"
        actions={
          <Button variant="outline" size="sm">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Manage Alerts
          </Button>
        }
      >
        <div className="space-y-3">
          {mockAlerts.map((alert) => (
            <div key={alert.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <div
                className={`w-2 h-2 rounded-full ${
                  alert.type === "success"
                    ? "bg-green-400"
                    : alert.type === "warning"
                    ? "bg-yellow-400"
                    : "bg-red-400"
                }`}
              />
              <div className="flex-1">
                <p className="text-sm">{alert.message}</p>
                <p className="text-xs text-muted-foreground">{alert.time}</p>
              </div>
              <Badge
                variant={
                  alert.type === "success"
                    ? "complete"
                    : alert.type === "warning"
                    ? "pending"
                    : "destructive"
                }
              >
                {alert.type}
              </Badge>
            </div>
          ))}
        </div>
      </DashboardSection>

      {/* Quick Actions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Management</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Manage user accounts and permissions
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Metrics</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              View detailed performance analytics
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Center</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Security settings and audit logs
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Settings</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Configure system preferences
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}