"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  User, 
  Package, 
  MapPin, 
  Clock,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { OrderFormData } from "../order-wizard";

interface ReviewStepProps {
  form: UseFormReturn<OrderFormData>;
  onNext: () => void;
  onPrev: () => void;
}


export function ReviewStep({ form, onNext }: ReviewStepProps) {
  const customerInfo = form.watch("customerInfo");
  const selectedItems = form.watch("productSelection.items") || [];
  
  const subtotal = selectedItems.reduce((sum, item) => sum + (item.quantity * item.basePrice), 0);
  const tax = subtotal * 0.08; // 8% tax rate
  const shipping = 295.00; // Flat shipping rate
  const total = subtotal + tax + shipping;

  const handleContinue = () => {
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Order Priority and Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Order Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="priority">Order Priority</Label>
            <Select 
              onValueChange={(value) => form.setValue("orderDetails.priority", value as any)}
              defaultValue="STANDARD"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STANDARD">Standard (3-4 weeks)</SelectItem>
                <SelectItem value="RUSH">Rush (+20% fee, 2-3 weeks)</SelectItem>
                <SelectItem value="EMERGENCY">Emergency (+50% fee, 1-2 weeks)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="instructions">Special Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="Enter any special instructions for this order..."
              onChange={(e) => form.setValue("orderDetails.specialInstructions", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer Information Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="font-medium">{customerInfo.name}</p>
              <p className="text-sm text-muted-foreground">{customerInfo.email}</p>
              <p className="text-sm text-muted-foreground">{customerInfo.phone}</p>
            </div>
            
            <div>
              <p className="font-medium text-sm">Shipping Address:</p>
              <div className="text-sm text-muted-foreground">
                <p>{customerInfo.shippingAddress?.street}</p>
                <p>
                  {customerInfo.shippingAddress?.city}, {customerInfo.shippingAddress?.state} {customerInfo.shippingAddress?.zipCode}
                </p>
                <p>{customerInfo.shippingAddress?.country}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {selectedItems.map((item, index) => (
              <div key={item.sinkId} className="flex justify-between items-start p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{item.sinkModel}</p>
                  <p className="text-sm text-muted-foreground">ID: {item.sinkId}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">Qty: {item.quantity}</Badge>
                    <Badge variant="outline">${item.basePrice.toLocaleString()} each</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${(item.quantity * item.basePrice).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Shipping & Handling</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>${total.toLocaleString()}</span>
            </div>
            
            {form.watch("orderDetails.priority") === "RUSH" && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Rush order fee (+20%) will be applied</span>
              </div>
            )}
            
            {form.watch("orderDetails.priority") === "EMERGENCY" && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Emergency order fee (+50%) will be applied</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Terms & Conditions:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>All orders are subject to credit approval</li>
              <li>Delivery times are estimates and may vary based on current production schedule</li>
              <li>Custom configurations may require additional lead time</li>
              <li>All sales are final unless products are defective</li>
              <li>Installation services available upon request</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleContinue} size="lg">
          Place Order
        </Button>
      </div>
    </div>
  );
}