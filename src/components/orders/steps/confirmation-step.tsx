"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Download, 
  Mail, 
  Calendar,
  Truck,
  FileText,
  Phone
} from "lucide-react";
import { OrderFormData } from "../order-wizard";

interface ConfirmationStepProps {
  form: UseFormReturn<OrderFormData>;
  onNext: () => void;
  onPrev: () => void;
}

export function ConfirmationStep({ form }: ConfirmationStepProps) {
  // Mock order number - in real implementation, this would come from the API
  const orderNumber = "ORD-" + Date.now().toString().slice(-6);
  const customerInfo = form.getValues("customerInfo");
  const selectedItems = form.getValues("productSelection.items") || [];
  const priority = form.getValues("orderDetails.priority");
  
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 
    (priority === "EMERGENCY" ? 10 : priority === "RUSH" ? 17 : 24)
  );

  const subtotal = selectedItems.reduce((sum, item) => sum + (item.quantity * item.basePrice), 0);
  const total = subtotal * 1.08 + 295; // Including tax and shipping

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="rounded-full bg-green-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-green-900 mb-2">
              Order Placed Successfully!
            </h2>
            <p className="text-green-700 mb-4">
              Your order has been received and is being processed.
            </p>
            <div className="inline-flex items-center gap-2 bg-green-100 px-4 py-2 rounded-lg">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-900">
                Order Number: {orderNumber}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Customer Information</h4>
              <div className="space-y-1 text-sm">
                <p>{customerInfo.name}</p>
                <p className="text-muted-foreground">{customerInfo.email}</p>
                <p className="text-muted-foreground">{customerInfo.phone}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Order Details</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    priority === "EMERGENCY" ? "destructive" :
                    priority === "RUSH" ? "pending" : "secondary"
                  }>
                    {priority}
                  </Badge>
                  <span className="text-muted-foreground">Priority</span>
                </div>
                <p className="text-muted-foreground">
                  {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""}
                </p>
                <p className="font-medium">${total.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>What Happens Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Order Confirmation Email</h4>
                <p className="text-sm text-muted-foreground">
                  You'll receive a detailed order confirmation email within the next few minutes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-yellow-100 w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium">BOM Generation</h4>
                <p className="text-sm text-muted-foreground">
                  Our production team will generate a detailed Bill of Materials and begin procurement.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-purple-100 w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium">Production Scheduling</h4>
                <p className="text-sm text-muted-foreground">
                  Your order will be scheduled for production based on current queue and priority level.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-100 w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Truck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Delivery</h4>
                <p className="text-sm text-muted-foreground">
                  Estimated delivery: <strong>{estimatedDelivery.toLocaleDateString()}</strong>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm">
                  <strong>Customer Service:</strong> +1 (555) 123-4567
                </p>
                <p className="text-xs text-muted-foreground">
                  Monday - Friday, 8:00 AM - 6:00 PM EST
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm">
                  <strong>Email Support:</strong> support@torvan.com
                </p>
                <p className="text-xs text-muted-foreground">
                  Response within 24 hours
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download Order Confirmation
        </Button>
        
        <Button variant="outline" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Order Details
        </Button>
        
        <Button className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          View Order Status
        </Button>
      </div>

      {/* Additional Actions */}
      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground mb-4">
          Want to create another order?
        </p>
        <Button variant="outline">
          Create New Order
        </Button>
      </div>
    </div>
  );
}