"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Wrench } from "lucide-react";
import { OrderFormData } from "../order-wizard";

interface ConfigurationStepProps {
  form: UseFormReturn<OrderFormData>;
  onNext: () => void;
  onPrev: () => void;
}

export function ConfigurationStep({ form, onNext }: ConfigurationStepProps) {
  const selectedItems = form.getValues("productSelection.items") || [];

  const handleContinue = () => {
    // In a real implementation, this would handle configuration data
    // For now, we'll just move to the next step
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <Settings className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Product Configuration</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Configure each selected product with specific materials, dimensions, and options.
        </p>
      </div>

      {/* Configuration Items */}
      {selectedItems.map((item, index) => (
        <Card key={item.sinkId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                {item.sinkModel}
              </CardTitle>
              <Badge variant="secondary">
                Quantity: {item.quantity}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Configuration interface for {item.sinkModel} will be implemented here.</p>
              <p className="text-sm mt-2">
                This will include material selection, sizing options, mounting configurations, and accessory choices.
              </p>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleContinue} size="lg">
          Continue to Review
        </Button>
      </div>
    </div>
  );
}