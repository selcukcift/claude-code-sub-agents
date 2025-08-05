"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
import {
  ChevronLeft,
  ChevronRight,
  User,
  Package,
  Settings,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import step components
import { CustomerInfoStep } from "./steps/customer-info-step";
import { ProductSelectionStep } from "./steps/product-selection-step";
import { ConfigurationStep } from "./steps/configuration-step";
import { ReviewStep } from "./steps/review-step";
import { ConfirmationStep } from "./steps/confirmation-step";

export interface OrderFormData {
  // Customer Information
  customerInfo: {
    customerId?: string;
    name: string;
    email: string;
    phone: string;
    shippingAddress: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  
  // Product Selection
  productSelection: {
    items: Array<{
      sinkId: string;
      sinkModel: string;
      quantity: number;
    }>;
  };
  
  // Configuration
  configuration: {
    items: Array<{
      sinkId: string;
      bodyMaterial: string;
      bodySize: string;
      mountingOptions: string[];
      basinType: string;
      basinQuantity: number;
      pegboardOptions?: {
        size: string;
        holePattern: string;
        material: string;
      };
      legConfiguration: {
        height: string;
        material: string;
        adjustable: boolean;
      };
      additionalComponents: string[];
    }>;
  };
  
  // Order Details
  orderDetails: {
    priority: "STANDARD" | "RUSH" | "EMERGENCY";
    specialInstructions?: string;
    requestedDeliveryDate?: string;
  };
}

const steps = [
  {
    id: 1,
    name: "Customer Information",
    description: "Enter customer details and shipping information",
    icon: User,
    component: CustomerInfoStep,
  },
  {
    id: 2,
    name: "Product Selection", 
    description: "Select sink models and quantities",
    icon: Package,
    component: ProductSelectionStep,
  },
  {
    id: 3,
    name: "Configuration",
    description: "Configure product specifications and options",
    icon: Settings,
    component: ConfigurationStep,
  },
  {
    id: 4,
    name: "Review & Pricing",
    description: "Review order details and pricing",
    icon: FileText,
    component: ReviewStep,
  },
  {
    id: 5,
    name: "Confirmation",
    description: "Order confirmation and next steps",
    icon: CheckCircle,
    component: ConfirmationStep,
  },
];

interface OrderWizardProps {
  onComplete?: (orderData: OrderFormData) => void;
  onCancel?: () => void;
}

export function OrderWizard({ onComplete, onCancel }: OrderWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  const form = useForm<OrderFormData>({
    defaultValues: {
      customerInfo: {
        name: "",
        email: "",
        phone: "",
        shippingAddress: {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "United States",
        },
      },
      productSelection: {
        items: [],
      },
      configuration: {
        items: [],
      },
      orderDetails: {
        priority: "STANDARD",
        specialInstructions: "",
      },
    },
  });

  const currentStepData = steps.find(step => step.id === currentStep);
  const CurrentStepComponent = currentStepData?.component;

  const handleNext = async () => {
    // Validate current step
    const isValid = await validateCurrentStep();
    
    if (isValid) {
      // Mark current step as completed
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep]);
      }
      
      // Move to next step
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    // Allow navigation to completed steps or the next step
    if (completedSteps.includes(stepId) || stepId === currentStep || stepId === currentStep + 1) {
      setCurrentStep(stepId);
    }
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    // This would implement step-specific validation
    // For now, return true as placeholder
    return true;
  };

  const handleSubmit = () => {
    const formData = form.getValues();
    onComplete?.(formData);
  };

  const breadcrumbs = [
    { label: "Orders", href: "/orders" },
    { label: "Create Order" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
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
          
          <div className="flex items-center justify-between mt-4">
            <div>
              <h1 className="text-2xl font-semibold">Create New Order</h1>
              <p className="text-muted-foreground">
                Follow the steps below to create a new medical device order
              </p>
            </div>
            
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Step Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Order Progress</CardTitle>
                <CardDescription>
                  Step {currentStep} of {steps.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {steps.map((step) => {
                  const isCompleted = completedSteps.includes(step.id);
                  const isCurrent = step.id === currentStep;
                  const isAccessible = isCompleted || isCurrent || completedSteps.includes(step.id - 1);
                  
                  return (
                    <button
                      key={step.id}
                      onClick={() => handleStepClick(step.id)}
                      disabled={!isAccessible}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 text-left rounded-lg transition-colors",
                        isCurrent && "bg-primary text-primary-foreground",
                        isCompleted && !isCurrent && "bg-muted hover:bg-muted/80",
                        !isCompleted && !isCurrent && isAccessible && "hover:bg-muted/50",
                        !isAccessible && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center rounded-full w-6 h-6 text-xs font-medium flex-shrink-0 mt-0.5",
                        isCurrent && "bg-primary-foreground text-primary",
                        isCompleted && !isCurrent && "bg-green-100 text-green-800",
                        !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                      )}>
                        {isCompleted ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          isCurrent && "text-primary-foreground",
                          !isCurrent && "text-foreground"
                        )}>
                          {step.name}
                        </p>
                        <p className={cn(
                          "text-xs truncate",
                          isCurrent && "text-primary-foreground/80",
                          !isCurrent && "text-muted-foreground"
                        )}>
                          {step.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-full w-10 h-10 bg-primary text-primary-foreground">
                    {currentStepData && <currentStepData.icon className="w-5 h-5" />}
                  </div>
                  <div>
                    <CardTitle>{currentStepData?.name}</CardTitle>
                    <CardDescription>{currentStepData?.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {CurrentStepComponent && (
                  <CurrentStepComponent
                    form={form}
                    onNext={handleNext}
                    onPrev={handlePrevious}
                  />
                )}
              </CardContent>
            </Card>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      step.id === currentStep && "bg-primary",
                      completedSteps.includes(step.id) && step.id !== currentStep && "bg-green-500",
                      !completedSteps.includes(step.id) && step.id !== currentStep && "bg-muted"
                    )}
                  />
                ))}
              </div>
              
              {currentStep === steps.length ? (
                <Button onClick={handleSubmit}>
                  Create Order
                  <CheckCircle className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}