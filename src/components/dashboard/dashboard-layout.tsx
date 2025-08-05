"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

interface DashboardMetric {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  variant?: "default" | "success" | "warning" | "destructive";
}

interface DashboardLayoutProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  metrics?: DashboardMetric[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function DashboardLayout({
  title,
  description,
  breadcrumbs,
  metrics,
  actions,
  children,
  className,
}: DashboardLayoutProps) {
  return (
    <div className={cn("space-y-6 p-6", className)}>
      {/* Header Section */}
      <div className="space-y-4">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbItem>
                    {crumb.href ? (
                      <BreadcrumbLink href={crumb.href}>
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {/* Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      {/* Metrics Grid */}
      {metrics && metrics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                {metric.variant && metric.variant !== "default" && (
                  <Badge
                    variant={
                      metric.variant === "success"
                        ? "complete"
                        : metric.variant === "warning"
                        ? "pending"
                        : "destructive"
                    }
                    className="text-xs"
                  >
                    {metric.variant}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                {metric.description && (
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                )}
                {metric.trend && (
                  <div className="flex items-center text-xs mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center",
                        metric.trend.direction === "up" && "text-green-600",
                        metric.trend.direction === "down" && "text-red-600",
                        metric.trend.direction === "neutral" && "text-muted-foreground"
                      )}
                    >
                      {metric.trend.direction === "up" && "↗"}
                      {metric.trend.direction === "down" && "↘"}
                      {metric.trend.direction === "neutral" && "→"}
                      <span className="ml-1">
                        {Math.abs(metric.trend.value)}%
                      </span>
                    </span>
                    <span className="text-muted-foreground ml-1">
                      from last period
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Content */}
      {children && <div className="space-y-6">{children}</div>}
    </div>
  );
}

interface DashboardSectionProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DashboardSection({
  title,
  description,
  actions,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && (
            <CardDescription className="mt-1">{description}</CardDescription>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}