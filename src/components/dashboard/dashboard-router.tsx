"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { AdminDashboard } from "./admin-dashboard";
import { ProductionDashboard } from "./production-dashboard";
import { QCDashboard } from "./qc-dashboard";
import { type UserRole } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

// Import other dashboard components when they're created
// import { ProcurementDashboard } from "./procurement-dashboard";
// import { AssemblerDashboard } from "./assembler-dashboard";
// import { ServiceDashboard } from "./service-dashboard";

export function DashboardRouter() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please sign in to access your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userRole = session.user.roles?.[0] as UserRole;

  if (!userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Role Not Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your account does not have a role assigned. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  switch (userRole) {
    case "ADMIN":
      return <AdminDashboard />;
    case "PRODUCTION_COORDINATOR":
      return <ProductionDashboard />;
    case "QC_PERSON":
      return <QCDashboard />;
    case "PROCUREMENT":
      // return <ProcurementDashboard />;
      return <GenericDashboard role={userRole} />;
    case "ASSEMBLER":
      // return <AssemblerDashboard />;
      return <GenericDashboard role={userRole} />;
    case "SERVICE_DEPARTMENT":
      // return <ServiceDashboard />;
      return <GenericDashboard role={userRole} />;
    default:
      return <GenericDashboard role={userRole} />;
  }
}

// Temporary generic dashboard for roles not yet implemented
function GenericDashboard({ role }: { role: UserRole }) {
  const roleDisplayNames: Record<UserRole, string> = {
    ADMIN: "Administrator",
    PRODUCTION_COORDINATOR: "Production Coordinator",
    PROCUREMENT: "Procurement Specialist",
    QC_PERSON: "Quality Control",
    ASSEMBLER: "Assembly Technician",
    SERVICE_DEPARTMENT: "Service Representative",
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          {roleDisplayNames[role]} Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome to your personalized dashboard
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Under Development</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your role-specific dashboard is currently being developed. 
            In the meantime, you can access the available features through the navigation menu.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}