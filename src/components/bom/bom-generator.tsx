"use client";

import React, { useState } from "react";
import { DashboardLayout, DashboardSection } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Eye,
  Edit,
  Copy,
  CheckCircle,
  AlertTriangle,
  Plus,
  Minus,
  Calculator,
  Factory,
  Package2,
} from "lucide-react";

// Mock data for orders and BOM items
const mockOrders = [
  {
    id: "ORD-001",
    customer: "Metro Hospital",
    product: "Surgical Sink Model A",
    quantity: 2,
    status: "IN_PRODUCTION",
    dueDate: "2024-01-15",
  },
  {
    id: "ORD-002",
    customer: "City Medical Center", 
    product: "Surgical Sink Model B",
    quantity: 1,
    status: "PENDING",
    dueDate: "2024-01-20",
  },
];

const mockBOMItems = [
  {
    id: "bom-1",
    partNumber: "BSN-001",
    name: "Stainless Steel Basin",
    description: "18-gauge stainless steel basin",
    quantity: 2,
    unitCost: 145.50,
    totalCost: 291.00,
    supplier: "MetalCorp Industries",
    leadTime: "7 days",
    inStock: 25,
    required: 2,
    shortfall: 0,
    isCustomPart: false,
  },
  {
    id: "bom-2",
    partNumber: "DRN-001",
    name: "Drain Assembly",
    description: "Standard 3.5\" drain with strainer",
    quantity: 2,
    unitCost: 42.75,
    totalCost: 85.50,
    supplier: "PlumbingPro Supply",
    leadTime: "5 days",
    inStock: 8,
    required: 2,
    shortfall: 0,
    isCustomPart: false,
  },
  {
    id: "bom-3",
    partNumber: "MBR-001",
    name: "Mounting Brackets",
    description: "Heavy-duty wall mounting brackets",
    quantity: 4,
    unitCost: 32.25,
    totalCost: 129.00,
    supplier: "Hardware Solutions",
    leadTime: "3 days",
    inStock: 45,
    required: 4,
    shortfall: 0,
    isCustomPart: false,
  },
  {
    id: "bom-4",
    partNumber: "FST-001",
    name: "Fastener Kit",
    description: "Stainless steel bolts and screws",
    quantity: 2,
    unitCost: 8.95,
    totalCost: 17.90,
    supplier: "Fastener World",
    leadTime: "2 days",
    inStock: 2,
    required: 2,
    shortfall: 0,
    isCustomPart: false,
  },
  {
    id: "bom-5",
    partNumber: "CST-001",
    name: "Custom Pegboard Panel",
    description: "Customer-specific pegboard configuration",
    quantity: 1,
    unitCost: 125.00,
    totalCost: 125.00,
    supplier: "Custom Manufacturing",
    leadTime: "14 days",
    inStock: 0,
    required: 1,
    shortfall: 1,
    isCustomPart: true,
  },
];

export function BOMGenerator() {
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [bomItems, setBomItems] = useState(mockBOMItems);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedOrderData = mockOrders.find(order => order.id === selectedOrder);
  const totalCost = bomItems.reduce((sum, item) => sum + item.totalCost, 0);
  const totalItems = bomItems.reduce((sum, item) => sum + item.quantity, 0);
  const shortfallItems = bomItems.filter(item => item.shortfall > 0);
  const customParts = bomItems.filter(item => item.isCustomPart);

  const handleGenerateBOM = () => {
    setIsGenerating(true);
    // Simulate BOM generation
    setTimeout(() => {
      setIsGenerating(false);
      // In real implementation, this would call the API
    }, 2000);
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    setBomItems(items =>
      items.map(item =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              totalCost: newQuantity * item.unitCost,
            }
          : item
      )
    );
  };

  const metrics = [
    {
      title: "Active BOMs",
      value: 15,
      description: "Currently in production",
      trend: { value: 3, direction: "up" as const },
    },
    {
      title: "Pending Approval",
      value: 4,
      description: "Awaiting production approval",
      variant: "warning" as const,
    },
    {
      title: "Material Shortfalls",
      value: shortfallItems.length,
      description: "Items requiring procurement",
      variant: shortfallItems.length > 0 ? ("destructive" as const) : ("default" as const),
    },
    {
      title: "Custom Parts",
      value: customParts.length,
      description: "Requiring custom manufacturing",
      variant: "default" as const,
    },
  ];

  const breadcrumbs = [
    { label: "Production", href: "/production" },
    { label: "BOM Generator" },
  ];

  const actions = (
    <>
      <Button variant="outline" size="sm">
        <Download className="mr-2 h-4 w-4" />
        Export Template
      </Button>
      <Button size="sm" onClick={() => setShowPreview(true)} disabled={!selectedOrder}>
        <Eye className="mr-2 h-4 w-4" />
        Preview BOM
      </Button>
    </>
  );

  return (
    <DashboardLayout
      title="BOM Generator"
      description="Generate and manage Bill of Materials for production orders"
      breadcrumbs={breadcrumbs}
      metrics={metrics}
      actions={actions}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Selection & Configuration */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="order">Select Order</Label>
                <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an order" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.id} - {order.customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrderData && (
                <div className="p-3 border rounded-lg bg-muted/50">
                  <h4 className="font-medium">{selectedOrderData.product}</h4>
                  <p className="text-sm text-muted-foreground">{selectedOrderData.customer}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span>Qty: {selectedOrderData.quantity}</span>
                    <span>Due: {selectedOrderData.dueDate}</span>
                    <Badge
                      variant={
                        selectedOrderData.status === "IN_PRODUCTION"
                          ? "in-production"
                          : "pending"
                      }
                      className="text-xs"
                    >
                      {selectedOrderData.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              )}

              <Button
                onClick={handleGenerateBOM}
                disabled={!selectedOrder || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Factory className="mr-2 h-4 w-4 animate-spin" />
                    Generating BOM...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Generate BOM
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* BOM Summary */}
          {selectedOrder && (
            <Card>
              <CardHeader>
                <CardTitle>BOM Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Total Items:</span>
                  <span className="font-medium">{totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Unique Parts:</span>
                  <span className="font-medium">{bomItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Custom Parts:</span>
                  <span className="font-medium">{customParts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Material Shortfalls:</span>
                  <span className={shortfallItems.length > 0 ? "font-medium text-red-600" : "font-medium"}>
                    {shortfallItems.length}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Cost:</span>
                    <span className="font-bold text-lg">${totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Material Alerts */}
          {shortfallItems.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  Material Shortfalls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {shortfallItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start p-2 bg-red-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.partNumber}</p>
                      </div>
                      <Badge variant="destructive">
                        Need {item.shortfall}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* BOM Items Table */}
        <div className="lg:col-span-2">
          <DashboardSection
            title="Bill of Materials"
            description="Detailed breakdown of materials and components"
            actions={
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export BOM
                </Button>
              </div>
            }
          >
            {selectedOrder ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.partNumber}</p>
                            {item.isCustomPart && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Custom
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Supplier: {item.supplier} • Lead: {item.leadTime}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(item.id, Math.max(0, item.quantity - 1))}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.totalCost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div>
                            <span className={item.inStock < item.required ? "text-red-600 font-medium" : ""}>
                              {item.inStock}
                            </span>
                            <span className="text-muted-foreground">/{item.required}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.shortfall > 0 ? (
                            <Badge variant="destructive">Short {item.shortfall}</Badge>
                          ) : (
                            <Badge variant="complete">Available</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {bomItems.length} items • {totalItems} total quantity
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      Total Material Cost: ${totalCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Order Selected</h3>
                <p className="text-muted-foreground">
                  Select an order from the sidebar to generate and view its Bill of Materials.
                </p>
              </div>
            )}
          </DashboardSection>
        </div>
      </div>

      {/* BOM Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>BOM Preview - {selectedOrderData?.id}</DialogTitle>
            <DialogDescription>
              Preview the complete Bill of Materials before approval
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Order: {selectedOrderData?.id}</p>
                <p className="text-sm text-muted-foreground">{selectedOrderData?.customer}</p>
                <p className="text-sm text-muted-foreground">{selectedOrderData?.product}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Quantity: {selectedOrderData?.quantity}</p>
                <p className="text-sm text-muted-foreground">Due: {selectedOrderData?.dueDate}</p>
                <p className="text-lg font-bold">Total: ${totalCost.toFixed(2)}</p>
              </div>
            </div>

            {/* Items Summary */}
            <div className="text-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.partNumber}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${item.totalCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve BOM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}