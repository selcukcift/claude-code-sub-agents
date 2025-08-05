"use client";

import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, User, Building } from "lucide-react";
import { OrderFormData } from "../order-wizard";

interface CustomerInfoStepProps {
  form: UseFormReturn<OrderFormData>;
  onNext: () => void;
  onPrev: () => void;
}

// Mock existing customers data
const mockCustomers = [
  {
    id: "1",
    name: "Metro Hospital",
    email: "purchasing@metrohospital.com",
    phone: "+1 (555) 123-4567",
    address: {
      street: "123 Medical Center Dr",
      city: "Chicago",
      state: "IL",
      zipCode: "60601",
      country: "United States",
    },
  },
  {
    id: "2", 
    name: "City Medical Center",
    email: "orders@citymedical.com",
    phone: "+1 (555) 987-6543",
    address: {
      street: "456 Healthcare Blvd",
      city: "Los Angeles",
      state: "CA",
      zipCode: "90210",
      country: "United States",
    },
  },
  {
    id: "3",
    name: "Regional Health System",
    email: "procurement@regionalhealth.org",
    phone: "+1 (555) 456-7890",
    address: {
      street: "789 Wellness Way",
      city: "Denver",
      state: "CO",
      zipCode: "80202",
      country: "United States",
    },
  },
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export function CustomerInfoStep({ form, onNext }: CustomerInfoStepProps) {
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [selectedExistingCustomer, setSelectedExistingCustomer] = useState<string | null>(null);

  const filteredCustomers = mockCustomers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  const handleSelectExistingCustomer = (customer: typeof mockCustomers[0]) => {
    setSelectedExistingCustomer(customer.id);
    form.setValue("customerInfo.customerId", customer.id);
    form.setValue("customerInfo.name", customer.name);
    form.setValue("customerInfo.email", customer.email);
    form.setValue("customerInfo.phone", customer.phone);
    form.setValue("customerInfo.shippingAddress", customer.address);
    setShowNewCustomerForm(false);
  };

  const handleNewCustomer = () => {
    setSelectedExistingCustomer(null);
    setShowNewCustomerForm(true);
    form.setValue("customerInfo.customerId", undefined);
    form.resetField("customerInfo.name");
    form.resetField("customerInfo.email");
    form.resetField("customerInfo.phone");
    form.resetField("customerInfo.shippingAddress");
  };

  return (
    <div className="space-y-6">
      {/* Customer Selection */}
      <div>
        <h3 className="text-lg font-medium mb-4">Customer Selection</h3>
        
        {!showNewCustomerForm && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search existing customers..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Existing Customers */}
            {customerSearchQuery && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedExistingCustomer === customer.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => handleSelectExistingCustomer(customer)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-primary/10 p-2">
                            <Building className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{customer.name}</h4>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                            <p className="text-sm text-muted-foreground">{customer.phone}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {customer.address.street}, {customer.address.city}, {customer.address.state} {customer.address.zipCode}
                            </p>
                          </div>
                        </div>
                        {selectedExistingCustomer === customer.id && (
                          <Badge variant="complete">Selected</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredCustomers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No customers found matching your search.
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleNewCustomer}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add New Customer
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Customer Form */}
      {showNewCustomerForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              New Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              {/* Basic Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customerInfo.name"
                  rules={{ required: "Customer name is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerInfo.email"
                  rules={{ 
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address"
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="customer@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="customerInfo.phone"
                rules={{ required: "Phone number is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Shipping Address */}
              <div className="space-y-4">
                <h4 className="font-medium">Shipping Address</h4>
                
                <FormField
                  control={form.control}
                  name="customerInfo.shippingAddress.street"
                  rules={{ required: "Street address is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="customerInfo.shippingAddress.city"
                    rules={{ required: "City is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerInfo.shippingAddress.state"
                    rules={{ required: "State is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerInfo.shippingAddress.zipCode"
                    rules={{ required: "ZIP code is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="customerInfo.shippingAddress.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="Mexico">Mexico</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewCustomerForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  // Basic validation - in real app, would use form validation
                  const name = form.getValues("customerInfo.name");
                  const email = form.getValues("customerInfo.email");
                  if (name && email) {
                    onNext();
                  }
                }}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Customer Summary */}
      {selectedExistingCustomer && !showNewCustomerForm && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Building className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{form.getValues("customerInfo.name")}</h4>
                <p className="text-sm text-muted-foreground">{form.getValues("customerInfo.email")}</p>
                <p className="text-sm text-muted-foreground">{form.getValues("customerInfo.phone")}</p>
                <div className="mt-2">
                  <p className="text-sm font-medium">Shipping Address:</p>
                  <p className="text-sm text-muted-foreground">
                    {form.getValues("customerInfo.shippingAddress.street")}<br />
                    {form.getValues("customerInfo.shippingAddress.city")}, {form.getValues("customerInfo.shippingAddress.state")} {form.getValues("customerInfo.shippingAddress.zipCode")}<br />
                    {form.getValues("customerInfo.shippingAddress.country")}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewCustomerForm(true)}
              >
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}