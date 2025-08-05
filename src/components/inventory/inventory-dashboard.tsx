"use client";

import React, { useState } from "react";
import { DashboardLayout, DashboardSection } from "@/components/dashboard/dashboard-layout";
import { InventoryTree } from "./inventory-tree";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  Upload,
  RefreshCw,
  Edit,
  Trash2,
  ShoppingCart,
} from "lucide-react";

// Mock data for selected item details
interface InventoryItem {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  cost: number;
  inStock: number;
  minimumStock: number;
  status: "critical" | "low" | "good";
}

const mockRecentTransactions = [
  { id: "1", type: "IN", quantity: 50, partNumber: "BSN-001", date: "2024-01-10", user: "John Smith" },
  { id: "2", type: "OUT", quantity: 12, partNumber: "DRN-001", date: "2024-01-10", user: "Production" },
  { id: "3", type: "IN", quantity: 25, partNumber: "MBR-001", date: "2024-01-09", user: "Sarah Johnson" },
  { id: "4", type: "OUT", quantity: 8, partNumber: "FCT-001", date: "2024-01-09", user: "Production" },
];

export function InventoryDashboard() {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const metrics = [
    {
      title: "Total Items",
      value: 1247,
      description: "Across all categories",
      trend: { value: 3, direction: "up" as const },
    },
    {
      title: "Low Stock Items",
      value: 23,
      description: "Below minimum threshold",
      variant: "warning" as const,
    },
    {
      title: "Critical Items",
      value: 5,
      description: "Urgent restocking needed",
      variant: "destructive" as const,
    },
    {
      title: "Total Value",
      value: "$284,592",
      description: "Current inventory value",
      trend: { value: 8, direction: "up" as const },
    },
  ];

  const breadcrumbs = [
    { label: "Inventory", href: "/inventory" },
    { label: "Management" },
  ];

  const actions = (
    <>
      <Button variant="outline" size="sm">
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
      <Button variant="outline" size="sm">
        <Upload className="mr-2 h-4 w-4" />
        Import
      </Button>
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
            <DialogDescription>
              Create a new inventory item with part details and stock information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="partNumber">Part Number</Label>
              <Input id="partNumber" placeholder="Enter part number" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Enter part name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Enter description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cost">Cost</Label>
                <Input id="cost" type="number" placeholder="0.00" step="0.01" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minStock">Minimum Stock</Label>
                <Input id="minStock" type="number" placeholder="0" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sink-bodies">Sink Bodies</SelectItem>
                  <SelectItem value="plumbing">Plumbing Components</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return (
    <DashboardLayout
      title="Inventory Management"
      description="Manage inventory items with hierarchical structure"
      breadcrumbs={breadcrumbs}
      metrics={metrics}
      actions={actions}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Inventory Tree */}
        <div className="lg:col-span-2">
          <DashboardSection
            title="Inventory Hierarchy"
            description="Browse inventory items organized by category, assembly, and sub-assembly"
            actions={
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            }
          >
            <InventoryTree
              onItemSelect={(item) => setSelectedItem(item)}
              selectedItemId={selectedItem?.id}
            />
          </DashboardSection>
        </div>

        {/* Item Details Panel */}
        <div className="space-y-6">
          {selectedItem ? (
            <>
              {/* Selected Item Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Item Details</CardTitle>
                    <div className="flex gap-1">
                      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Edit Item</DialogTitle>
                            <DialogDescription>
                              Update item details and stock information.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="editName">Name</Label>
                              <Input id="editName" defaultValue={selectedItem.name} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="editDescription">Description</Label>
                              <Textarea id="editDescription" defaultValue={selectedItem.description} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="editCost">Cost</Label>
                                <Input id="editCost" type="number" defaultValue={selectedItem.cost} step="0.01" />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="editMinStock">Minimum Stock</Label>
                                <Input id="editMinStock" type="number" defaultValue={selectedItem.minimumStock} />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit">Save Changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium">{selectedItem.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Part #: {selectedItem.partNumber}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedItem.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Current Stock</p>
                      <p className="text-2xl font-bold">{selectedItem.inStock}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Unit Cost</p>
                      <p className="text-2xl font-bold">${selectedItem.cost}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Minimum Stock</p>
                      <p className="text-sm text-muted-foreground">{selectedItem.minimumStock} units</p>
                    </div>
                    <Badge
                      variant={
                        selectedItem.status === "critical"
                          ? "destructive"
                          : selectedItem.status === "low"
                          ? "pending"
                          : "complete"
                      }
                    >
                      {selectedItem.status === "critical"
                        ? "Critical"
                        : selectedItem.status === "low"
                        ? "Low Stock"
                        : "Good"}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Order More
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Package className="mr-2 h-4 w-4" />
                      Adjust Stock
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Level Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stock Level Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Stock level chart would be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No Item Selected</h3>
                  <p className="text-sm">
                    Select an item from the inventory tree to view details and manage stock levels.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockRecentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      {transaction.type === "IN" ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {transaction.type === "IN" ? "Stock In" : "Stock Out"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.partNumber} • {transaction.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{transaction.quantity}</p>
                      <p className="text-xs text-muted-foreground">{transaction.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}