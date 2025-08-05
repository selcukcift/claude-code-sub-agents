"use client";

import React from "react";
import { DashboardLayout, DashboardSection } from "./dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  BarChart3,
  Shield,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mock data
const mockQCQueue = [
  { 
    id: "#12345", 
    customer: "Metro Hospital", 
    product: "Surgical Sink Model A", 
    priority: "STANDARD", 
    submittedBy: "John Smith",
    submittedAt: "2024-01-10 14:30",
    testType: "Final Inspection",
    estimatedTime: "45 min"
  },
  { 
    id: "#12346", 
    customer: "City Medical Center", 
    product: "Surgical Sink Model B", 
    priority: "RUSH", 
    submittedBy: "Sarah Johnson",
    submittedAt: "2024-01-10 13:15",
    testType: "Material Verification",
    estimatedTime: "30 min"
  },
  { 
    id: "#12347", 
    customer: "Regional Health", 
    product: "Surgical Sink Model C", 
    priority: "EMERGENCY", 
    submittedBy: "Mike Brown",
    submittedAt: "2024-01-10 12:00",
    testType: "Functionality Test",
    estimatedTime: "60 min"
  },
];

const mockRecentInspections = [
  { id: "#12344", product: "Surgical Sink Model A", result: "PASS", inspector: "Lisa Davis", completedAt: "2024-01-10 11:30", issues: 0 },
  { id: "#12343", product: "Surgical Sink Model B", result: "FAIL", inspector: "Tom Wilson", completedAt: "2024-01-10 10:15", issues: 2 },
  { id: "#12342", product: "Surgical Sink Model A", result: "PASS", inspector: "Lisa Davis", completedAt: "2024-01-10 09:45", issues: 0 },
  { id: "#12341", product: "Surgical Sink Model C", result: "CONDITIONAL", inspector: "Tom Wilson", completedAt: "2024-01-10 08:30", issues: 1 },
];

const mockQualityMetrics = [
  { category: "Material Quality", score: 96, trend: "up", tests: 145 },
  { category: "Assembly Quality", score: 94, trend: "neutral", tests: 132 },
  { category: "Functionality", score: 98, trend: "up", tests: 156 },
  { category: "Safety Standards", score: 100, trend: "neutral", tests: 89 },
];

const mockNonConformances = [
  { id: "NC-001", product: "Surgical Sink Model B", issue: "Surface finish defect", severity: "Minor", status: "Open", reporter: "Tom Wilson" },
  { id: "NC-002", product: "Surgical Sink Model A", issue: "Mounting hole misalignment", severity: "Major", status: "Under Review", reporter: "Lisa Davis" },
  { id: "NC-003", product: "Surgical Sink Model C", issue: "Drain assembly leak", severity: "Critical", status: "Resolved", reporter: "Tom Wilson" },
];

export function QCDashboard() {
  const metrics = [
    {
      title: "Pending Inspections",
      value: 12,
      description: "Awaiting QC review",
      trend: { value: 2, direction: "up" as const },
    },
    {
      title: "Pass Rate",
      value: "94.2%",
      description: "Last 30 days",
      variant: "success" as const,
    },
    {
      title: "Avg Inspection Time",
      value: "42 min",
      description: "Per inspection",
      trend: { value: 5, direction: "down" as const },
    },
    {
      title: "Open Non-conformances",
      value: 2,
      description: "Requiring attention",
      variant: "warning" as const,
    },
  ];

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Quality Control" },
  ];

  const actions = (
    <>
      <Button variant="outline" size="sm">
        <BarChart3 className="mr-2 h-4 w-4" />
        Quality Reports
      </Button>
      <Button size="sm">
        <FileText className="mr-2 h-4 w-4" />
        New Inspection
      </Button>
    </>
  );

  return (
    <DashboardLayout
      title="Quality Control Dashboard"
      description="Monitor inspection queue and quality metrics"
      breadcrumbs={breadcrumbs}
      metrics={metrics}
      actions={actions}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* QC Queue */}
        <DashboardSection
          title="Inspection Queue"
          description="Items awaiting quality control inspection"
          actions={
            <Button variant="outline" size="sm">
              <Clock className="mr-2 h-4 w-4" />
              Schedule View
            </Button>
          }
        >
          <div className="space-y-3">
            {mockQCQueue.map((item) => (
              <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{item.id}</p>
                    <Badge
                      variant={
                        item.priority === "EMERGENCY"
                          ? "destructive"
                          : item.priority === "RUSH"
                          ? "pending"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.customer} - {item.product}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Test: {item.testType}</span>
                    <span>Est. Time: {item.estimatedTime}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted by {item.submittedBy} at {item.submittedAt}
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Start Inspection
                </Button>
              </div>
            ))}
          </div>
        </DashboardSection>

        {/* Recent Inspections */}
        <DashboardSection
          title="Recent Inspections"
          description="Latest completed quality control inspections"
          actions={
            <Button variant="outline" size="sm">
              View All Results
            </Button>
          }
        >
          <div className="space-y-3">
            {mockRecentInspections.map((inspection) => (
              <div key={inspection.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {inspection.result === "PASS" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : inspection.result === "FAIL" ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{inspection.id}</p>
                    <p className="text-sm text-muted-foreground">{inspection.product}</p>
                    <p className="text-xs text-muted-foreground">
                      By {inspection.inspector} at {inspection.completedAt}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      inspection.result === "PASS"
                        ? "complete"
                        : inspection.result === "FAIL"
                        ? "destructive"
                        : "pending"
                    }
                  >
                    {inspection.result}
                  </Badge>
                  {inspection.issues > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {inspection.issues} issue{inspection.issues > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DashboardSection>
      </div>

      {/* Quality Metrics */}
      <DashboardSection
        title="Quality Metrics"
        description="Performance indicators across quality categories"
        actions={
          <Button variant="outline" size="sm">
            <BarChart3 className="mr-2 h-4 w-4" />
            Detailed Analytics
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {mockQualityMetrics.map((metric, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">{metric.category}</h3>
                <span
                  className={`text-xs ${
                    metric.trend === "up"
                      ? "text-green-600"
                      : metric.trend === "down"
                      ? "text-red-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {metric.trend === "up" && "↗"}
                  {metric.trend === "down" && "↘"}
                  {metric.trend === "neutral" && "→"}
                </span>
              </div>
              <div className="text-2xl font-bold mb-1">{metric.score}%</div>
              <p className="text-xs text-muted-foreground">
                {metric.tests} tests completed
              </p>
            </div>
          ))}
        </div>
      </DashboardSection>

      {/* Non-Conformances */}
      <DashboardSection
        title="Non-Conformances"
        description="Quality issues requiring attention or tracking"
        actions={
          <Button variant="outline" size="sm">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Create NCR
          </Button>
        }
      >
        <div className="space-y-3">
          {mockNonConformances.map((nc) => (
            <div key={nc.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle
                  className={`h-4 w-4 ${
                    nc.severity === "Critical"
                      ? "text-red-500"
                      : nc.severity === "Major"
                      ? "text-orange-500"
                      : "text-yellow-500"
                  }`}
                />
                <div>
                  <p className="font-medium text-sm">{nc.id}</p>
                  <p className="text-sm text-muted-foreground">{nc.issue}</p>
                  <p className="text-xs text-muted-foreground">
                    {nc.product} - Reported by {nc.reporter}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge
                  variant={
                    nc.severity === "Critical"
                      ? "destructive"
                      : nc.severity === "Major"
                      ? "pending"
                      : "secondary"
                  }
                  className="mb-1"
                >
                  {nc.severity}
                </Badge>
                <p className="text-xs text-muted-foreground">{nc.status}</p>
              </div>
            </div>
          ))}
        </div>
      </DashboardSection>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Procedures</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Access QC test procedures and checklists
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calibration Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Monitor equipment calibration schedules
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Standards</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Review quality standards and specifications
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Records</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Manage QC personnel certifications
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}