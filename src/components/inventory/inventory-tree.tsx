"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Package,
  Layers,
  Component,
  Search,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock inventory data with hierarchical structure
const mockInventoryData = [
  {
    id: "cat-1",
    name: "Sink Bodies",
    type: "category" as const,
    description: "Main sink body components",
    assemblies: [
      {
        id: "asm-1",
        partNumber: "SB-001",
        name: "Single Basin Body",
        description: "Standard single basin stainless steel body",
        type: "assembly" as const,
        subAssemblies: [
          {
            id: "sub-1",
            partNumber: "SBB-001",
            name: "Basin Assembly",
            description: "Single basin with drain integration",
            type: "subAssembly" as const,
            parts: [
              {
                id: "part-1",
                partNumber: "BSN-001",
                name: "Stainless Steel Basin",
                description: "18-gauge stainless steel basin",
                cost: 145.50,
                inStock: 25,
                minimumStock: 10,
                status: "good" as const,
              },
              {
                id: "part-2",
                partNumber: "DRN-001",
                name: "Drain Assembly",
                description: "Standard 3.5\" drain with strainer",
                cost: 42.75,
                inStock: 8,
                minimumStock: 15,
                status: "low" as const,
              },
            ],
          },
          {
            id: "sub-2",
            partNumber: "SBM-001",
            name: "Mounting Hardware",
            description: "Wall mounting bracket system",
            type: "subAssembly" as const,
            parts: [
              {
                id: "part-3",
                partNumber: "MBR-001",
                name: "Mounting Brackets",
                description: "Heavy-duty wall mounting brackets",
                cost: 32.25,
                inStock: 45,
                minimumStock: 20,
                status: "good" as const,
              },
              {
                id: "part-4",
                partNumber: "FST-001",
                name: "Fastener Kit",
                description: "Stainless steel bolts and screws",
                cost: 8.95,
                inStock: 2,
                minimumStock: 25,
                status: "critical" as const,
              },
            ],
          },
        ],
      },
      {
        id: "asm-2",
        partNumber: "DB-001",
        name: "Double Basin Body",
        description: "Dual basin stainless steel body",
        type: "assembly" as const,
        subAssemblies: [
          {
            id: "sub-3",
            partNumber: "DBB-001",
            name: "Double Basin Assembly",
            description: "Dual basin with dual drain integration",
            type: "subAssembly" as const,
            parts: [
              {
                id: "part-5",
                partNumber: "BSN-002",
                name: "Double Stainless Steel Basin",
                description: "18-gauge stainless steel double basin",
                cost: 285.75,
                inStock: 12,
                minimumStock: 8,
                status: "good" as const,
              },
              {
                id: "part-6",
                partNumber: "DRN-002",
                name: "Dual Drain Assembly",
                description: "Two 3.5\" drains with strainers",
                cost: 78.50,
                inStock: 15,
                minimumStock: 10,
                status: "good" as const,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "cat-2",
    name: "Plumbing Components",
    type: "category" as const,
    description: "Water supply and drainage components",
    assemblies: [
      {
        id: "asm-3",
        partNumber: "FT-001",
        name: "Faucet Assembly",
        description: "Medical-grade sensor faucets",
        type: "assembly" as const,
        subAssemblies: [
          {
            id: "sub-4",
            partNumber: "SFT-001",
            name: "Sensor Faucet",
            description: "Touchless sensor-activated faucet",
            type: "subAssembly" as const,
            parts: [
              {
                id: "part-7",
                partNumber: "FCT-001",
                name: "Faucet Body",
                description: "Chrome-plated brass faucet body",
                cost: 125.00,
                inStock: 18,
                minimumStock: 12,
                status: "good" as const,
              },
              {
                id: "part-8",
                partNumber: "SNS-001",
                name: "Infrared Sensor",
                description: "Battery-powered IR sensor module",
                cost: 89.95,
                inStock: 5,
                minimumStock: 15,
                status: "low" as const,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "cat-3",
    name: "Accessories",
    type: "category" as const,
    description: "Optional accessories and add-ons",
    assemblies: [
      {
        id: "asm-4",
        partNumber: "PB-001",
        name: "Pegboard System",
        description: "Modular pegboard accessory system",
        type: "assembly" as const,
        subAssemblies: [
          {
            id: "sub-5",
            partNumber: "PBB-001",
            name: "Pegboard Base",
            description: "Stainless steel pegboard base",
            type: "subAssembly" as const,
            parts: [
              {
                id: "part-9",
                partNumber: "PGB-001",
                name: "Pegboard Panel",
                description: "Perforated stainless steel panel",
                cost: 95.25,
                inStock: 8,
                minimumStock: 12,
                status: "low" as const,
              },
              {
                id: "part-10",
                partNumber: "HK-001",
                name: "Hook Set",
                description: "Assorted pegboard hooks",
                cost: 24.95,
                inStock: 30,
                minimumStock: 15,
                status: "good" as const,
              },
            ],
          },
        ],
      },
    ],
  },
];

type InventoryItem = typeof mockInventoryData[0]["assemblies"][0]["subAssemblies"][0]["parts"][0];
type SubAssembly = typeof mockInventoryData[0]["assemblies"][0]["subAssemblies"][0];
type Assembly = typeof mockInventoryData[0]["assemblies"][0];
type Category = typeof mockInventoryData[0];

interface InventoryTreeProps {
  onItemSelect?: (item: InventoryItem) => void;
  selectedItemId?: string;
}

export function InventoryTree({ onItemSelect, selectedItemId }: InventoryTreeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["cat-1"]);
  const [expandedAssemblies, setExpandedAssemblies] = useState<string[]>(["asm-1"]);
  const [expandedSubAssemblies, setExpandedSubAssemblies] = useState<string[]>(["sub-1"]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleAssembly = (assemblyId: string) => {
    setExpandedAssemblies(prev =>
      prev.includes(assemblyId)
        ? prev.filter(id => id !== assemblyId)
        : [...prev, assemblyId]
    );
  };

  const toggleSubAssembly = (subAssemblyId: string) => {
    setExpandedSubAssemblies(prev =>
      prev.includes(subAssemblyId)
        ? prev.filter(id => id !== subAssemblyId)
        : [...prev, subAssemblyId]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "low":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "low":
        return <Badge variant="pending">Low Stock</Badge>;
      default:
        return <Badge variant="complete">Good</Badge>;
    }
  };

  const filteredData = mockInventoryData.map(category => ({
    ...category,
    assemblies: category.assemblies.map(assembly => ({
      ...assembly,
      subAssemblies: assembly.subAssemblies.map(subAssembly => ({
        ...subAssembly,
        parts: subAssembly.parts.filter(part =>
          part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          part.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          part.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(subAssembly =>
        subAssembly.parts.length > 0 ||
        subAssembly.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subAssembly.partNumber.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    })).filter(assembly =>
      assembly.subAssemblies.length > 0 ||
      assembly.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assembly.partNumber.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category =>
    category.assemblies.length > 0 ||
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search inventory items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Inventory Tree */}
      <div className="space-y-2">
        {filteredData.map((category) => (
          <Card key={category.id}>
            <Collapsible
              open={expandedCategories.includes(category.id)}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                  <div className="flex items-center gap-3">
                    {expandedCategories.includes(category.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Layers className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <Badge variant="outline">
                      {category.assemblies.length} assemblies
                    </Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  {category.assemblies.map((assembly) => (
                    <Card key={assembly.id} className="ml-4">
                      <Collapsible
                        open={expandedAssemblies.includes(assembly.id)}
                        onOpenChange={() => toggleAssembly(assembly.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-2">
                            <div className="flex items-center gap-3">
                              {expandedAssemblies.includes(assembly.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <Package className="h-4 w-4 text-blue-500" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{assembly.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {assembly.partNumber}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{assembly.description}</p>
                              </div>
                              <Badge variant="outline">
                                {assembly.subAssemblies.length} sub-assemblies
                              </Badge>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-2">
                            {assembly.subAssemblies.map((subAssembly) => (
                              <Card key={subAssembly.id} className="ml-4">
                                <Collapsible
                                  open={expandedSubAssemblies.includes(subAssembly.id)}
                                  onOpenChange={() => toggleSubAssembly(subAssembly.id)}
                                >
                                  <CollapsibleTrigger asChild>
                                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-2">
                                      <div className="flex items-center gap-3">
                                        {expandedSubAssemblies.includes(subAssembly.id) ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                        <Component className="h-4 w-4 text-green-500" />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{subAssembly.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {subAssembly.partNumber}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground">{subAssembly.description}</p>
                                        </div>
                                        <Badge variant="outline">
                                          {subAssembly.parts.length} parts
                                        </Badge>
                                      </div>
                                    </CardHeader>
                                  </CollapsibleTrigger>

                                  <CollapsibleContent>
                                    <CardContent className="pt-0 space-y-1">
                                      {subAssembly.parts.map((part) => (
                                        <div
                                          key={part.id}
                                          className={cn(
                                            "ml-4 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                                            selectedItemId === part.id && "ring-2 ring-primary"
                                          )}
                                          onClick={() => onItemSelect?.(part)}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              {getStatusIcon(part.status)}
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium text-sm">{part.name}</span>
                                                  <Badge variant="outline" className="text-xs">
                                                    {part.partNumber}
                                                  </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">{part.description}</p>
                                                <div className="flex items-center gap-4 mt-1 text-xs">
                                                  <span>Stock: {part.inStock}</span>
                                                  <span>Min: {part.minimumStock}</span>
                                                  <span>Cost: ${part.cost}</span>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {getStatusBadge(part.status)}
                                              <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                                  <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </CardContent>
                                  </CollapsibleContent>
                                </Collapsible>
                              </Card>
                            ))}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No items found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms to find inventory items.
          </p>
        </div>
      )}
    </div>
  );
}