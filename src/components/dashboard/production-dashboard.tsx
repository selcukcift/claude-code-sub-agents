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
  Factory,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  TrendingUp,
  Users,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mock data
const mockProductionOrders = [
  { id: "#12345", customer: "Metro Hospital", product: "Surgical Sink Model A", status: "IN_PRODUCTION", priority: "STANDARD", completion: 75, dueDate: "2024-01-15" },
  { id: "#12346", customer: "City Medical Center", product: "Surgical Sink Model B", status: "PRE_QC", priority: "RUSH", completion: 100, dueDate: "2024-01-12" },
  { id: "#12347", customer: "Regional Health", product: "Surgical Sink Model C", status: "PENDING", priority: "EMERGENCY", completion: 0, dueDate: "2024-01-10" },
  { id: "#12348", customer: "Valley Hospital", product: "Surgical Sink Model A", status: "IN_PRODUCTION", priority: "STANDARD", completion: 45, dueDate: "2024-01-18" },
];

const mockWorkstations = [
  { name: "Assembly Station 1", operator: "John Smith", currentOrder: "#12345", status: "active", efficiency: 92 },
  { name: "Assembly Station 2", operator: "Sarah Johnson", currentOrder: "#12346", status: "active", efficiency: 88 },
  { name: "Assembly Station 3", operator: "Mike Brown", currentOrder: null, status: "idle", efficiency: 95 },
  { name: "QC Station 1", operator: "Lisa Davis", currentOrder: "#12344", status: "active", efficiency: 96 },
];

const mockResourceAlerts = [
  { resource: "Basin Type A", level: "Low", current: 5, minimum: 10, severity: "warning" },
  { resource: "Mounting Bracket Set", level: "Critical", current: 2, minimum: 15, severity: "error" },
  { resource: "Stainless Steel Body", level: "Good", current: 25, minimum: 8, severity: "success" },
];

export function ProductionDashboard() {
  const metrics = [
    {
      title: "Active Orders",
      value: 28,
      description: "Currently in production",
      trend: { value: 5, direction: "up" as const },
    },
    {
      title: "On-Time Delivery",
      value: "94%",
      description: "Last 30 days",
      variant: "success" as const,
    },
    {
      title: "Workstation Efficiency",
      value: "92%",
      description: "Average across all stations",
      trend: { value: 3, direction: "up" as const },
    },
    {
      title: "Resource Alerts",
      value: 3,
      description: "Requiring attention",
      variant: "warning" as const,
    },
  ];

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Production Coordinator" },
  ];

  const actions = (
    <>
      <Button variant="outline" size="sm">
        <Calendar className="mr-2 h-4 w-4" />
        Production Schedule
      </Button>
      <Button size="sm">
        <Factory className="mr-2 h-4 w-4" />
        Create Work Order
      </Button>
    </>
  );

  return (
    <DashboardLayout
      title="Production Coordinator Dashboard"
      description="Monitor production workflow and resource management"
      breadcrumbs={breadcrumbs}
      metrics={metrics}
      actions={actions}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Production Orders */}
        <DashboardSection
          title="Active Production Orders"
          description="Orders currently in production pipeline"
          actions={
            <Button variant="outline" size="sm">
              View All Orders
            </Button>
          }
        >
          <div className="space-y-3">
            {mockProductionOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{order.id}</p>
                    <Badge
                      variant={
                        order.priority === "EMERGENCY"
                          ? "destructive"
                          : order.priority === "RUSH"
                          ? "pending"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {order.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {order.customer} - {order.product}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <div className="w-full bg-secondary rounded-full h-2 min-w-[60px]">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${order.completion}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {order.completion}%
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Due: {order.dueDate}
                    </span>
                  </div>
                </div>
                <Badge
                  variant={
                    order.status === "IN_PRODUCTION"
                      ? "in-production"
                      : order.status === "PRE_QC"
                      ? "qc-pending"
                      : "pending"
                  }
                >
                  {order.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </DashboardSection>

        {/* Workstation Status */}
        <DashboardSection
          title="Workstation Status"
          description="Real-time workstation monitoring"
          actions={
            <Button variant="outline" size="sm">
              <Users className="mr-2 h-4 w-4" />
              Manage Assignments
            </Button>
          }
        >
          <div className="space-y-3">
            {mockWorkstations.map((station, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      station.status === "active" ? "bg-green-400" : "bg-gray-400"
                    }`}
                  />
                  <div>
                    <p className="font-medium">{station.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {station.operator}
                    </p>
                    {station.currentOrder && (
                      <p className="text-xs text-muted-foreground">
                        Working on: {station.currentOrder}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={station.status === "active" ? "complete" : "secondary"}>
                    {station.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {station.efficiency}% efficiency
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DashboardSection>
      </div>

      {/* Resource Alerts */}
      <DashboardSection
        title="Resource Alerts"
        description="Inventory levels requiring attention"
        actions={
          <Button variant="outline" size="sm">
            <Package className="mr-2 h-4 w-4" />
            View Inventory
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          {mockResourceAlerts.map((alert, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
              <AlertCircle
                className={`h-4 w-4 ${
                  alert.severity === "error"
                    ? "text-red-500"
                    : alert.severity === "warning"
                    ? "text-yellow-500"
                    : "text-green-500"
                }`}
              />
              <div className="flex-1">
                <p className="font-medium text-sm">{alert.resource}</p>
                <p className="text-xs text-muted-foreground">
                  Current: {alert.current} | Min: {alert.minimum}
                </p>
              </div>
              <Badge
                variant={
                  alert.severity === "error"
                    ? "destructive"
                    : alert.severity === "warning"
                    ? "pending"
                    : "complete"
                }
              >
                {alert.level}
              </Badge>
            </div>
          ))}
        </div>
      </DashboardSection>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Production Schedule</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              View and manage production timeline
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resource Planning</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Analyze resource utilization
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Reports</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Monitor quality metrics
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Management</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Manage team assignments
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}