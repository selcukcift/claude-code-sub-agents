"use client";

import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Minus, Package, ShoppingCart } from "lucide-react";
import { OrderFormData } from "../order-wizard";

interface ProductSelectionStepProps {
  form: UseFormReturn<OrderFormData>;
  onNext: () => void;
  onPrev: () => void;
}

// Mock sink models data
const mockSinkModels = [
  {
    id: "SINK-001",
    name: "Surgical Sink Model A",
    description: "Standard single-basin surgical sink with stainless steel construction",
    basePrice: 2499.99,
    category: "Single Basin",
    features: ["Stainless Steel", "Standard Drain", "Wall Mount"],
    image: "/images/sink-model-a.jpg",
  },
  {
    id: "SINK-002", 
    name: "Surgical Sink Model B",
    description: "Double-basin surgical sink with enhanced drainage system",
    basePrice: 3299.99,
    category: "Double Basin",
    features: ["Stainless Steel", "Enhanced Drain", "Wall/Floor Mount"],
    image: "/images/sink-model-b.jpg",
  },
  {
    id: "SINK-003",
    name: "Surgical Sink Model C",
    description: "Premium single-basin with integrated pegboard and accessories",
    basePrice: 3799.99,
    category: "Premium Single",
    features: ["Stainless Steel", "Integrated Pegboard", "Premium Finish"],
    image: "/images/sink-model-c.jpg",
  },
  {
    id: "SINK-004",
    name: "Surgical Sink Model D",
    description: "Compact single-basin ideal for smaller surgical suites",
    basePrice: 1999.99,
    category: "Compact Single",
    features: ["Stainless Steel", "Compact Design", "Wall Mount Only"],
    image: "/images/sink-model-d.jpg",
  },
  {
    id: "SINK-005",
    name: "Surgical Sink Model E",
    description: "Large double-basin with enhanced workflow features",
    basePrice: 4199.99,
    category: "Large Double",
    features: ["Stainless Steel", "Dual Drains", "Workflow Optimized"],
    image: "/images/sink-model-e.jpg",
  },
];

const categories = ["All", "Single Basin", "Double Basin", "Premium Single", "Compact Single", "Large Double"];

export function ProductSelectionStep({ form, onNext }: ProductSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedItems, setSelectedItems] = useState<Array<{
    sinkId: string;
    sinkModel: string;
    quantity: number;
    basePrice: number;
  }>>([]);

  const filteredSinks = mockSinkModels.filter(sink => {
    const matchesSearch = sink.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sink.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || sink.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = (sink: typeof mockSinkModels[0]) => {
    const existingItem = selectedItems.find(item => item.sinkId === sink.id);
    
    if (existingItem) {
      setSelectedItems(items =>
        items.map(item =>
          item.sinkId === sink.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setSelectedItems(items => [
        ...items,
        {
          sinkId: sink.id,
          sinkModel: sink.name,
          quantity: 1,
          basePrice: sink.basePrice,
        }
      ]);
    }
  };

  const handleUpdateQuantity = (sinkId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setSelectedItems(items => items.filter(item => item.sinkId !== sinkId));
    } else {
      setSelectedItems(items =>
        items.map(item =>
          item.sinkId === sinkId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const handleRemoveItem = (sinkId: string) => {
    setSelectedItems(items => items.filter(item => item.sinkId !== sinkId));
  };

  const handleContinue = () => {
    // Update form with selected items
    form.setValue("productSelection.items", selectedItems);
    onNext();
  };

  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = selectedItems.reduce((sum, item) => sum + (item.quantity * item.basePrice), 0);

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sink models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSinks.map((sink) => {
          const selectedItem = selectedItems.find(item => item.sinkId === sink.id);
          
          return (
            <Card key={sink.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{sink.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {sink.category}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">${sink.basePrice.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Base Price</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{sink.description}</p>
                
                <div className="flex flex-wrap gap-1">
                  {sink.features.map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  {selectedItem ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateQuantity(sink.id, selectedItem.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="font-medium w-8 text-center">{selectedItem.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateQuantity(sink.id, selectedItem.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleAddItem(sink)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add to Order
                    </Button>
                  )}

                  {selectedItem && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveItem(sink.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredSinks.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or category filter.
          </p>
        </div>
      )}

      {/* Selected Items Summary */}
      {selectedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Selected Items ({totalItems} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.map((item) => (
                    <TableRow key={item.sinkId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.sinkModel}</p>
                          <p className="text-sm text-muted-foreground">ID: {item.sinkId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateQuantity(item.sinkId, item.quantity - 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateQuantity(item.sinkId, item.quantity + 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.basePrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(item.quantity * item.basePrice).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveItem(item.sinkId)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          ×
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Items: {totalItems}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    Subtotal: ${totalValue.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Before configuration and options
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={selectedItems.length === 0}
          size="lg"
        >
          Continue to Configuration
        </Button>
      </div>
    </div>
  );
}