"use client";

import React, { useState } from "react";
import { DashboardLayout, DashboardSection } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Camera,
  Upload,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";

// Mock QC workflow data
const mockQCItems = [
  {
    id: "qc-1",
    orderNumber: "ORD-001",
    productName: "Surgical Sink Model A",
    customer: "Metro Hospital",
    stage: "Pre-Production QC",
    status: "IN_PROGRESS",
    inspector: "Lisa Davis",
    startedAt: "2024-01-10 09:00",
    estimatedTime: "45 min",
    progress: 60,
    checklistItems: [
      { id: "check-1", name: "Material inspection", completed: true, required: true },
      { id: "check-2", name: "Dimension verification", completed: true, required: true },
      { id: "check-3", name: "Surface finish check", completed: false, required: true },
      { id: "check-4", name: "Assembly clearance", completed: false, required: true },
      { id: "check-5", name: "Documentation review", completed: false, required: false },
    ],
  },
  {
    id: "qc-2", 
    orderNumber: "ORD-002",
    productName: "Surgical Sink Model B",
    customer: "City Medical Center",
    stage: "Final QC",
    status: "PENDING",
    inspector: null,
    startedAt: null,
    estimatedTime: "60 min",
    progress: 0,
    checklistItems: [
      { id: "check-6", name: "Functionality test", completed: false, required: true },
      { id: "check-7", name: "Safety compliance", completed: false, required: true },
      { id: "check-8", name: "Final inspection", completed: false, required: true },
      { id: "check-9", name: "Packaging verification", completed: false, required: true },
      { id: "check-10", name: "Shipping documentation", completed: false, required: false },
    ],
  },
];

export function QCWorkflow() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [inspectionNotes, setInspectionNotes] = useState("");

  const selectedQCItem = mockQCItems.find(item => item.id === selectedItem);
  const pendingItems = mockQCItems.filter(item => item.status === "PENDING");
  const inProgressItems = mockQCItems.filter(item => item.status === "IN_PROGRESS");
  const completedToday = 12; // Mock data

  const metrics = [
    {
      title: "Pending Inspections",
      value: pendingItems.length,
      description: "Awaiting QC review",
      variant: pendingItems.length > 0 ? ("warning" as const) : ("default" as const),
    },
    {
      title: "In Progress",
      value: inProgressItems.length,
      description: "Currently being inspected",
      variant: "default" as const,
    },
    {
      title: "Completed Today",
      value: completedToday,
      description: "Inspections finished",
      trend: { value: 15, direction: "up" as const },
    },
    {
      title: "Pass Rate",
      value: "94.2%",
      description: "Last 30 days",
      variant: "success" as const,
    },
  ];

  const breadcrumbs = [
    { label: "Quality Control", href: "/quality-control" },
    { label: "Workflow" },
  ];

  const actions = (
    <>
      <Button variant="outline" size="sm">
        <FileText className="mr-2 h-4 w-4" />
        QC Reports
      </Button>
      <Button size="sm">
        <Upload className="mr-2 h-4 w-4" />
        Upload Results
      </Button>
    </>
  );

  const handleStartInspection = (itemId: string) => {
    setSelectedItem(itemId);
    // In real implementation, this would start the inspection process
  };

  const handleCompleteInspection = () => {
    if (selectedQCItem) {
      // In real implementation, this would complete the inspection
      alert(`QC inspection completed for ${selectedQCItem.orderNumber}`);
      setSelectedItem(null);
    }
  };

  return (
    <DashboardLayout
      title="Quality Control Workflow"
      description="Manage QC inspections and workflow processes"
      breadcrumbs={breadcrumbs}
      metrics={metrics}
      actions={actions}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* QC Queue */}
        <div className="lg:col-span-1">
          <DashboardSection
            title="QC Queue"
            description="Items awaiting quality control inspection"
          >
            <div className="space-y-3">
              {mockQCItems.map((item) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-colors hover:shadow-md ${
                    selectedItem === item.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedItem(item.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{item.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">{item.customer}</p>
                      </div>
                      <Badge
                        variant={
                          item.status === "IN_PROGRESS"
                            ? "in-production"
                            : item.status === "PENDING"
                            ? "pending"
                            : "complete"
                        }
                      >
                        {item.status === "IN_PROGRESS" ? "In Progress" : item.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm font-medium mb-1">{item.productName}</p>
                    <p className="text-xs text-muted-foreground mb-3">{item.stage}</p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span>Est. Time: {item.estimatedTime}</span>
                      {item.inspector && (
                        <span>Inspector: {item.inspector}</span>
                      )}
                    </div>
                    
                    {item.status === "IN_PROGRESS" && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{item.progress}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </DashboardSection>
        </div>

        {/* Inspection Details */}
        <div className="lg:col-span-2">
          {selectedQCItem ? (
            <DashboardSection
              title={`QC Inspection - ${selectedQCItem.orderNumber}`}
              description={`${selectedQCItem.stage} for ${selectedQCItem.productName}`}
              actions={
                <div className="flex gap-2">
                  {selectedQCItem.status === "PENDING" ? (
                    <Button onClick={() => handleStartInspection(selectedQCItem.id)}>
                      <Play className="mr-2 h-4 w-4" />
                      Start Inspection
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm">
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </Button>
                      <Button onClick={handleCompleteInspection}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Complete
                      </Button>
                    </>
                  )}
                </div>
              }
            >
              <div className="space-y-6">
                {/* Product Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Product Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Order Number</p>
                      <p className="text-sm text-muted-foreground">{selectedQCItem.orderNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Customer</p>
                      <p className="text-sm text-muted-foreground">{selectedQCItem.customer}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Product</p>
                      <p className="text-sm text-muted-foreground">{selectedQCItem.productName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Stage</p>
                      <p className="text-sm text-muted-foreground">{selectedQCItem.stage}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* QC Checklist */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quality Control Checklist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedQCItem.checklistItems.map((checkItem) => (
                        <div key={checkItem.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={checkItem.id}
                            checked={checkItem.completed}
                            disabled={selectedQCItem.status === "PENDING"}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={checkItem.id}
                              className={`text-sm ${
                                checkItem.completed
                                  ? "line-through text-muted-foreground"
                                  : "font-medium"
                              }`}
                            >
                              {checkItem.name}
                              {checkItem.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </label>
                          </div>
                          {checkItem.completed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : checkItem.required ? (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Inspection Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Inspection Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Enter inspection notes, observations, or issues found..."
                      value={inspectionNotes}
                      onChange={(e) => setInspectionNotes(e.target.value)}
                      className="min-h-[100px]"
                      disabled={selectedQCItem.status === "PENDING"}
                    />
                  </CardContent>
                </Card>

                {/* Photo Documentation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Photo Documentation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                      <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm font-medium mb-2">Upload Inspection Photos</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Drag and drop photos or click to browse
                      </p>
                      <Button variant="outline" size="sm" disabled={selectedQCItem.status === "PENDING"}>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Files
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DashboardSection>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Inspection Selected</h3>
                  <p className="text-muted-foreground">
                    Select an item from the QC queue to begin or continue an inspection.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}