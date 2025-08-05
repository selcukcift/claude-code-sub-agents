"use client";

import React from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Code, Layers, Zap } from "lucide-react";

export function ComponentShowcase() {
  const breadcrumbs = [
    { label: "Design System", href: "/design-system" },
    { label: "Components" },
  ];

  return (
    <DashboardLayout
      title="TORVAN Design System"
      description="Medical device UI component library and design tokens"
      breadcrumbs={breadcrumbs}
    >
      <Tabs defaultValue="components" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="usage">Usage Guidelines</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-6">
          {/* Buttons */}
          <DashboardSection title="Buttons" description="Interactive button components with multiple variants">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Button Variants</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button>Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="medical">Medical</Button>
                    <Button variant="medical-success">Success</Button>
                    <Button variant="medical-warning">Warning</Button>
                    <Button variant="medical-danger">Danger</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Button Sizes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon">
                      <Zap className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DashboardSection>

          {/* Badges */}
          <DashboardSection title="Badges" description="Status indicators and labels">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="pending">Pending</Badge>
                  <Badge variant="in-production">In Production</Badge>
                  <Badge variant="qc-pending">QC Pending</Badge>
                  <Badge variant="complete">Complete</Badge>
                  <Badge variant="shipped">Shipped</Badge>
                  <Badge variant="priority">Priority</Badge>
                </div>
              </CardContent>
            </Card>
          </DashboardSection>

          {/* Form Controls */}
          <DashboardSection title="Form Controls" description="Input components for data collection">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Input Fields</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="standard">Standard Input</Label>
                    <Input id="standard" placeholder="Enter text" />
                  </div>
                  <div>
                    <Label htmlFor="error">Error State</Label>
                    <Input id="error" placeholder="Invalid input" error />
                  </div>
                  <div>
                    <Label htmlFor="textarea">Textarea</Label>
                    <Textarea id="textarea" placeholder="Enter description" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Selection Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="select">Select Dropdown</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="option1">Option 1</SelectItem>
                        <SelectItem value="option2">Option 2</SelectItem>
                        <SelectItem value="option3">Option 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="checkbox" />
                    <Label htmlFor="checkbox">Checkbox option</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DashboardSection>
        </TabsContent>

        <TabsContent value="colors" className="space-y-6">
          <DashboardSection title="Color Palette" description="Medical device color system">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Primary Colors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary"></div>
                      <div>
                        <p className="font-medium">Primary</p>
                        <p className="text-sm text-muted-foreground">hsl(221.2 83.2% 53.3%)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-secondary"></div>
                      <div>
                        <p className="font-medium">Secondary</p>
                        <p className="text-sm text-muted-foreground">hsl(210 40% 96%)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Medical Colors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg medical-blue"></div>
                      <div>
                        <p className="font-medium">Medical Blue</p>
                        <p className="text-sm text-muted-foreground">hsl(210 100% 50%)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg medical-green"></div>
                      <div>
                        <p className="font-medium">Medical Green</p>
                        <p className="text-sm text-muted-foreground">hsl(142 76% 36%)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg medical-amber"></div>
                      <div>
                        <p className="font-medium">Medical Amber</p>
                        <p className="text-sm text-muted-foreground">hsl(43 96% 56%)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg medical-red"></div>
                      <div>
                        <p className="font-medium">Medical Red</p>
                        <p className="text-sm text-muted-foreground">hsl(0 84% 60%)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DashboardSection>
        </TabsContent>

        <TabsContent value="typography" className="space-y-6">
          <DashboardSection title="Typography Scale" description="Text styles and hierarchy">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h1 className="text-4xl font-bold">Heading 1</h1>
                  <p className="text-sm text-muted-foreground">text-4xl font-bold</p>
                </div>
                <div>
                  <h2 className="text-3xl font-semibold">Heading 2</h2>
                  <p className="text-sm text-muted-foreground">text-3xl font-semibold</p>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold">Heading 3</h3>
                  <p className="text-sm text-muted-foreground">text-2xl font-semibold</p>
                </div>
                <div>
                  <h4 className="text-xl font-medium">Heading 4</h4>
                  <p className="text-sm text-muted-foreground">text-xl font-medium</p>
                </div>
                <div>
                  <p className="text-base">Body Text</p>
                  <p className="text-sm text-muted-foreground">text-base</p>
                </div>
                <div>
                  <p className="text-sm">Small Text</p>
                  <p className="text-sm text-muted-foreground">text-sm</p>
                </div>
                <div>
                  <p className="text-xs">Extra Small Text</p>
                  <p className="text-sm text-muted-foreground">text-xs</p>
                </div>
              </CardContent>
            </Card>
          </DashboardSection>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <DashboardSection title="Usage Guidelines" description="Best practices for medical device interfaces">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Color Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium">Medical Blue</p>
                    <p className="text-muted-foreground">Primary actions, navigation, medical device branding</p>
                  </div>
                  <div>
                    <p className="font-medium">Medical Green</p>
                    <p className="text-muted-foreground">Success states, completion indicators, safety confirmations</p>
                  </div>
                  <div>
                    <p className="font-medium">Medical Amber</p>
                    <p className="text-muted-foreground">Warnings, pending states, attention required</p>
                  </div>
                  <div>
                    <p className="font-medium">Medical Red</p>
                    <p className="text-muted-foreground">Errors, critical alerts, dangerous actions</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Accessibility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium">WCAG 2.1 AA Compliance</p>
                    <p className="text-muted-foreground">All components meet accessibility standards</p>
                  </div>
                  <div>
                    <p className="font-medium">Keyboard Navigation</p>
                    <p className="text-muted-foreground">Full keyboard support with visible focus indicators</p>
                  </div>
                  <div>
                    <p className="font-medium">Screen Reader Support</p>
                    <p className="text-muted-foreground">Semantic HTML and ARIA labels</p>
                  </div>
                  <div>
                    <p className="font-medium">Color Contrast</p>
                    <p className="text-muted-foreground">4.5:1 minimum contrast ratio for text</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DashboardSection>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}