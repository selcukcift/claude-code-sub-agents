# TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
## COMPREHENSIVE API SPECIFICATION

### EXECUTIVE SUMMARY

This document defines the complete RESTful API specification for the TORVAN Medical Workflow Management System. The APIs are designed following REST principles with tRPC integration for type-safe communication, supporting 6 user roles, hierarchical inventory management, dynamic BOM generation, and comprehensive order lifecycle management.

**API Architecture Overview:**
- **Pattern**: RESTful APIs with tRPC integration for type safety
- **Authentication**: JWT-based authentication with role-based access control
- **Data Format**: JSON request/response with proper content types
- **Versioning**: URL path versioning (/api/v1/)
- **Security**: OAuth 2.0 compatible with extensive input validation

---

## 1. AUTHENTICATION & AUTHORIZATION APIS

### 1.1 Authentication Endpoints

**Base URL**: `/api/v1/auth`

#### POST /api/v1/auth/login
**Description**: Authenticate user credentials and return JWT token
**Access**: Public

**Request:**
```json
{
  "email": "user@torvan.com",
  "password": "securePassword123",
  "rememberMe": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@torvan.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "PRODUCTION_COORDINATOR",
      "permissions": ["order:create", "order:read", "bom:generate"],
      "lastLogin": "2025-01-15T10:30:00Z"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account locked due to failed attempts
- `422 Unprocessable Entity`: Invalid email format or missing fields

#### POST /api/v1/auth/logout
**Description**: Invalidate current session and tokens
**Access**: Authenticated users
**Headers**: `Authorization: Bearer <token>`

**Request:** Empty body
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /api/v1/auth/refresh
**Description**: Generate new access token using refresh token
**Access**: Valid refresh token required

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

#### POST /api/v1/auth/forgot-password
**Description**: Initiate password reset process
**Access**: Public

**Request:**
```json
{
  "email": "user@torvan.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset email sent if account exists"
}
```

#### POST /api/v1/auth/reset-password
**Description**: Reset password using reset token
**Access**: Valid reset token required

**Request:**
```json
{
  "token": "reset_token_here",
  "newPassword": "newSecurePassword123",
  "confirmPassword": "newSecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### 1.2 User Profile & Session Management

#### GET /api/v1/auth/profile
**Description**: Get current user profile information
**Access**: Authenticated users

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@torvan.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "PRODUCTION_COORDINATOR",
    "permissions": ["order:create", "order:read", "bom:generate"],
    "preferences": {
      "theme": "light",
      "timezone": "America/New_York",
      "notifications": {
        "email": true,
        "push": false
      }
    },
    "lastLogin": "2025-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT /api/v1/auth/profile
**Description**: Update user profile information
**Access**: Authenticated users

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "preferences": {
    "theme": "dark",
    "timezone": "America/New_York",
    "notifications": {
      "email": true,
      "push": true
    }
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@torvan.com",
    "firstName": "John",
    "lastName": "Smith",
    "preferences": {
      "theme": "dark",
      "timezone": "America/New_York",
      "notifications": {
        "email": true,
        "push": true
      }
    }
  }
}
```

#### POST /api/v1/auth/change-password
**Description**: Change user password
**Access**: Authenticated users

**Request:**
```json
{
  "currentPassword": "currentPassword123",
  "newPassword": "newSecurePassword123",
  "confirmPassword": "newSecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 1.3 Role-Based Access Control

#### GET /api/v1/auth/permissions
**Description**: Get current user's permissions
**Access**: Authenticated users

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "role": "PRODUCTION_COORDINATOR",
    "permissions": [
      {
        "resource": "order",
        "actions": ["create", "read", "update:pending"]
      },
      {
        "resource": "bom",
        "actions": ["generate", "read"]
      },
      {
        "resource": "inventory",
        "actions": ["read"]
      }
    ]
  }
}
```

#### POST /api/v1/auth/validate-permission
**Description**: Validate if user has specific permission
**Access**: Authenticated users

**Request:**
```json
{
  "resource": "order",
  "action": "create"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hasPermission": true
  }
}
```

---

## 2. ORDER MANAGEMENT APIS

### 2.1 Order Creation Workflow (5-Step Process)

**Base URL**: `/api/v1/orders`

#### POST /api/v1/orders/draft
**Description**: Create draft order (Step 1 - Customer Information)
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `order:create`

**Request:**
```json
{
  "customer": {
    "companyName": "Medical Center ABC",
    "contactName": "Dr. Jane Smith",
    "email": "jane.smith@medcenter.com",
    "phone": "+1-555-0123",
    "shippingAddress": {
      "street": "123 Hospital Drive",
      "city": "Healthcare City",
      "state": "CA",
      "zipCode": "90210",
      "country": "USA"
    }
  },
  "priority": "STANDARD",
  "specialInstructions": "Please handle with care - sterile environment"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440001",
    "orderNumber": "TOR-2025-0001",
    "status": "DRAFT",
    "step": 1,
    "customer": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "companyName": "Medical Center ABC",
      "contactName": "Dr. Jane Smith",
      "email": "jane.smith@medcenter.com",
      "phone": "+1-555-0123",
      "shippingAddress": {
        "street": "123 Hospital Drive",
        "city": "Healthcare City",
        "state": "CA",
        "zipCode": "90210",
        "country": "USA"
      }
    },
    "priority": "STANDARD",
    "specialInstructions": "Please handle with care - sterile environment",
    "createdAt": "2025-01-15T10:30:00Z",
    "createdBy": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### PUT /api/v1/orders/{orderId}/sink-selection
**Description**: Step 2 - Add sink selections to order
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `order:update:draft`

**Request:**
```json
{
  "sinks": [
    {
      "sinkFamilyId": "550e8400-e29b-41d4-a716-446655440003",
      "quantity": 2,
      "buildNumbers": ["BN-2025-001", "BN-2025-002"]
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440001",
    "orderNumber": "TOR-2025-0001",
    "status": "DRAFT",
    "step": 2,
    "sinks": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "sinkFamily": {
          "id": "550e8400-e29b-41d4-a716-446655440003",
          "name": "CleanStation Pro",
          "description": "Professional reprocessing sink"
        },
        "quantity": 2,
        "buildNumbers": ["BN-2025-001", "BN-2025-002"]
      }
    ],
    "updatedAt": "2025-01-15T10:35:00Z"
  }
}
```

#### PUT /api/v1/orders/{orderId}/sink-configuration
**Description**: Step 3 - Configure sink specifications
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `order:update:draft`

**Request:**
```json
{
  "sinkId": "550e8400-e29b-41d4-a716-446655440004",
  "configuration": {
    "body": {
      "material": "STAINLESS_STEEL_316L",
      "size": "48x24x36",
      "mounting": "FLOOR_MOUNTED"
    },
    "basin": {
      "type": "SINGLE_BASIN",
      "depth": "12_INCH"
    },
    "pegboard": {
      "size": "STANDARD_24X18",
      "holePattern": "UNIVERSAL",
      "material": "STAINLESS_STEEL"
    },
    "legs": {
      "height": "ADJUSTABLE_34_38",
      "material": "STAINLESS_STEEL",
      "style": "H_FRAME"
    },
    "additionalComponents": [
      {
        "componentId": "550e8400-e29b-41d4-a716-446655440005",
        "quantity": 1
      }
    ]
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440001",
    "step": 3,
    "sinkConfiguration": {
      "sinkId": "550e8400-e29b-41d4-a716-446655440004",
      "configuration": {
        "body": {
          "material": "STAINLESS_STEEL_316L",
          "size": "48x24x36",
          "mounting": "FLOOR_MOUNTED"
        },
        "basin": {
          "type": "SINGLE_BASIN",
          "depth": "12_INCH"
        },
        "pegboard": {
          "size": "STANDARD_24X18",
          "holePattern": "UNIVERSAL",
          "material": "STAINLESS_STEEL"
        },
        "legs": {
          "height": "ADJUSTABLE_34_38",
          "material": "STAINLESS_STEEL",
          "style": "H_FRAME"
        }
      },
      "estimatedCost": 4250.00,
      "customParts": [
        {
          "partNumber": "700-1001",
          "description": "Custom pegboard assembly",
          "cost": 125.00
        }
      ]
    },
    "updatedAt": "2025-01-15T10:40:00Z"
  }
}
```

#### PUT /api/v1/orders/{orderId}/accessories
**Description**: Step 4 - Add accessories to order
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `order:update:draft`

**Request:**
```json
{
  "accessories": [
    {
      "accessoryId": "550e8400-e29b-41d4-a716-446655440006",
      "quantity": 2
    },
    {
      "accessoryId": "550e8400-e29b-41d4-a716-446655440007",
      "quantity": 1
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440001",
    "step": 4,
    "accessories": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440006",
        "name": "Splash Guard Assembly",
        "partNumber": "ACC-1001",
        "quantity": 2,
        "unitCost": 75.00,
        "totalCost": 150.00
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440007",
        "name": "Instrument Holder",
        "partNumber": "ACC-2001",
        "quantity": 1,
        "unitCost": 125.00,
        "totalCost": 125.00
      }
    ],
    "accessoryTotal": 275.00,
    "updatedAt": "2025-01-15T10:45:00Z"
  }
}
```

#### POST /api/v1/orders/{orderId}/submit
**Description**: Step 5 - Review and submit order
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `order:submit`

**Request:**
```json
{
  "finalReview": true,
  "customerApproval": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440001",
    "orderNumber": "TOR-2025-0001",
    "status": "PENDING",
    "step": 5,
    "orderSummary": {
      "customer": {
        "companyName": "Medical Center ABC",
        "contactName": "Dr. Jane Smith"
      },
      "sinks": [
        {
          "name": "CleanStation Pro",
          "quantity": 2,
          "configuredCost": 4250.00
        }
      ],
      "accessories": [
        {
          "name": "Splash Guard Assembly",
          "quantity": 2,
          "cost": 150.00
        },
        {
          "name": "Instrument Holder",
          "quantity": 1,
          "cost": 125.00
        }
      ],
      "subtotal": 8775.00,
      "tax": 702.00,
      "shipping": 250.00,
      "total": 9727.00
    },
    "submittedAt": "2025-01-15T10:50:00Z",
    "estimatedDelivery": "2025-02-15T00:00:00Z"
  }
}
```

### 2.2 Order Lifecycle Management (8-Phase Status)

#### GET /api/v1/orders
**Description**: Get orders with filtering and pagination
**Access**: All authenticated users (filtered by role permissions)

**Query Parameters:**
- `status`: Filter by order status (PENDING, IN_PRODUCTION, PRE_QC, etc.)
- `priority`: Filter by priority (STANDARD, RUSH, EMERGENCY)
- `customerId`: Filter by customer ID
- `createdBy`: Filter by creator user ID
- `dateFrom`: Filter orders created from date (ISO 8601)
- `dateTo`: Filter orders created to date (ISO 8601)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Sort field (createdAt, updatedAt, orderNumber)
- `sortOrder`: Sort direction (asc, desc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "orderNumber": "TOR-2025-0001",
        "status": "IN_PRODUCTION",
        "priority": "STANDARD",
        "customer": {
          "companyName": "Medical Center ABC",
          "contactName": "Dr. Jane Smith"
        },
        "totalAmount": 9727.00,
        "createdAt": "2025-01-15T10:50:00Z",
        "updatedAt": "2025-01-16T09:15:00Z",
        "estimatedDelivery": "2025-02-15T00:00:00Z",
        "assignedTo": {
          "id": "550e8400-e29b-41d4-a716-446655440008",
          "name": "Mike Johnson",
          "role": "ASSEMBLER"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "itemsPerPage": 20,
      "totalItems": 45,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

#### GET /api/v1/orders/{orderId}
**Description**: Get detailed order information
**Access**: All authenticated users (with role-based field filtering)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "orderNumber": "TOR-2025-0001",
    "status": "IN_PRODUCTION",
    "priority": "STANDARD",
    "customer": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "companyName": "Medical Center ABC",
      "contactName": "Dr. Jane Smith",
      "email": "jane.smith@medcenter.com",
      "phone": "+1-555-0123",
      "shippingAddress": {
        "street": "123 Hospital Drive",
        "city": "Healthcare City",
        "state": "CA",
        "zipCode": "90210",
        "country": "USA"
      }
    },
    "sinks": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "sinkFamily": {
          "name": "CleanStation Pro",
          "model": "CSP-4824"
        },
        "quantity": 2,
        "buildNumbers": ["BN-2025-001", "BN-2025-002"],
        "configuration": {
          "body": {
            "material": "STAINLESS_STEEL_316L",
            "size": "48x24x36",
            "mounting": "FLOOR_MOUNTED"
          },
          "basin": {
            "type": "SINGLE_BASIN",
            "depth": "12_INCH"
          }
        }
      }
    ],
    "accessories": [
      {
        "name": "Splash Guard Assembly",
        "partNumber": "ACC-1001",
        "quantity": 2,
        "unitCost": 75.00,
        "totalCost": 150.00
      }
    ],
    "bom": {
      "id": "550e8400-e29b-41d4-a716-446655440009",
      "version": 1,
      "status": "APPROVED",
      "generatedAt": "2025-01-15T11:00:00Z"
    },
    "timeline": [
      {
        "status": "DRAFT",
        "timestamp": "2025-01-15T10:30:00Z",
        "user": "John Doe",
        "notes": "Order created"
      },
      {
        "status": "PENDING",
        "timestamp": "2025-01-15T10:50:00Z",
        "user": "John Doe",
        "notes": "Order submitted for processing"
      },
      {
        "status": "IN_PRODUCTION",
        "timestamp": "2025-01-16T09:15:00Z",
        "user": "Sarah Wilson",
        "notes": "Assigned to production team"
      }
    ],
    "totalAmount": 9727.00,
    "specialInstructions": "Please handle with care - sterile environment",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-16T09:15:00Z",
    "createdBy": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "role": "PRODUCTION_COORDINATOR"
    },
    "assignedTo": {
      "id": "550e8400-e29b-41d4-a716-446655440008",
      "name": "Mike Johnson",
      "role": "ASSEMBLER"
    },
    "estimatedDelivery": "2025-02-15T00:00:00Z"
  }
}
```

#### PUT /api/v1/orders/{orderId}/status
**Description**: Update order status (role-based transitions)
**Access**: Role-specific permissions for status transitions

**Request:**
```json
{
  "status": "PRE_QC",
  "notes": "Assembly completed, ready for initial quality check",
  "completedTasks": [
    "550e8400-e29b-41d4-a716-446655440010",
    "550e8400-e29b-41d4-a716-446655440011"
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440001",
    "previousStatus": "IN_PRODUCTION",
    "currentStatus": "PRE_QC",
    "statusChangedAt": "2025-01-17T14:30:00Z",
    "statusChangedBy": {
      "id": "550e8400-e29b-41d4-a716-446655440008",
      "name": "Mike Johnson",
      "role": "ASSEMBLER"
    },
    "notes": "Assembly completed, ready for initial quality check",
    "nextPossibleStatuses": ["PRODUCTION_COMPLETE", "IN_PRODUCTION"],
    "assignedTo": {
      "id": "550e8400-e29b-41d4-a716-446655440012",
      "name": "Lisa Chen",
      "role": "QC_PERSON"
    }
  }
}
```

#### GET /api/v1/orders/{orderId}/status-history
**Description**: Get complete status change history for order
**Access**: All authenticated users with order access

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440001",
    "statusHistory": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440013",
        "fromStatus": null,
        "toStatus": "DRAFT",
        "timestamp": "2025-01-15T10:30:00Z",
        "user": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "John Doe",
          "role": "PRODUCTION_COORDINATOR"
        },
        "notes": "Order created",
        "duration": null
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440014",
        "fromStatus": "DRAFT",
        "toStatus": "PENDING",
        "timestamp": "2025-01-15T10:50:00Z",
        "user": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "John Doe",
          "role": "PRODUCTION_COORDINATOR"
        },
        "notes": "Order submitted for processing",
        "duration": "00:20:00"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440015",
        "fromStatus": "PENDING",
        "toStatus": "IN_PRODUCTION",
        "timestamp": "2025-01-16T09:15:00Z",
        "user": {
          "id": "550e8400-e29b-41d4-a716-446655440016",
          "name": "Sarah Wilson",
          "role": "PRODUCTION_COORDINATOR"
        },
        "notes": "Assigned to production team",
        "duration": "22:25:00"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440017",
        "fromStatus": "IN_PRODUCTION",
        "toStatus": "PRE_QC",
        "timestamp": "2025-01-17T14:30:00Z",
        "user": {
          "id": "550e8400-e29b-41d4-a716-446655440008",
          "name": "Mike Johnson",
          "role": "ASSEMBLER"
        },
        "notes": "Assembly completed, ready for initial quality check",
        "duration": "29:15:00"
      }
    ],
    "currentStatus": "PRE_QC",
    "totalDuration": "51:60:00"
  }
}
```

### 2.3 Order Modification & Management

#### PUT /api/v1/orders/{orderId}
**Description**: Update order details (only for pending orders or with admin override)
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `order:update` (with status restrictions)

**Request:**
```json
{
  "customer": {
    "contactName": "Dr. John Smith",
    "email": "john.smith@medcenter.com",
    "phone": "+1-555-0124"
  },
  "priority": "RUSH",
  "specialInstructions": "Updated instructions - expedited delivery required",
  "adminOverride": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440001",
    "updatedFields": ["customer.contactName", "customer.email", "customer.phone", "priority", "specialInstructions"],
    "previousValues": {
      "customer.contactName": "Dr. Jane Smith",
      "customer.email": "jane.smith@medcenter.com",
      "customer.phone": "+1-555-0123",
      "priority": "STANDARD"
    },
    "updatedAt": "2025-01-15T11:30:00Z",
    "updatedBy": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "role": "PRODUCTION_COORDINATOR"
    }
  }
}
```

#### DELETE /api/v1/orders/{orderId}
**Description**: Cancel/delete order (only pending orders or admin override)
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `order:delete`

**Request:**
```json
{
  "reason": "Customer requested cancellation",
  "adminOverride": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440001",
    "status": "CANCELLED",
    "cancelledAt": "2025-01-15T12:00:00Z",
    "cancelledBy": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "role": "PRODUCTION_COORDINATOR"
    },
    "reason": "Customer requested cancellation"
  }
}
```

---

## 3. INVENTORY MANAGEMENT APIS

### 3.1 Hierarchical Inventory Browsing

**Base URL**: `/api/v1/inventory`

#### GET /api/v1/inventory/categories
**Description**: Get all inventory categories
**Access**: All authenticated users
**Permissions**: `inventory:read`

**Query Parameters:**
- `includeInactive`: Include inactive categories (default: false)
- `sortBy`: Sort field (name, sortOrder)
- `sortOrder`: Sort direction (asc, desc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440020",
        "name": "Sinks",
        "description": "Complete sink assemblies and families",
        "sortOrder": 1,
        "isActive": true,
        "assemblyCount": 45,
        "createdAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440021",
        "name": "Assemblies",
        "description": "Primary component assemblies",
        "sortOrder": 2,
        "isActive": true,
        "assemblyCount": 89,
        "createdAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440022",
        "name": "Sub-Assemblies",
        "description": "Secondary component assemblies",
        "sortOrder": 3,
        "isActive": true,
        "assemblyCount": 125,
        "createdAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440023",
        "name": "Parts",
        "description": "Individual components and parts",
        "sortOrder": 4,
        "isActive": true,
        "assemblyCount": 1247,
        "createdAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440024",
        "name": "Accessories",
        "description": "Optional accessories and add-ons",
        "sortOrder": 5,
        "isActive": true,
        "assemblyCount": 67,
        "createdAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440025",
        "name": "Service Parts",
        "description": "Replacement and service parts",
        "sortOrder": 6,
        "isActive": true,
        "assemblyCount": 342,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "totalCategories": 6
  }
}
```

#### GET /api/v1/inventory/categories/{categoryId}/assemblies
**Description**: Get assemblies within a specific category
**Access**: All authenticated users
**Permissions**: `inventory:read`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `search`: Search assemblies by name or part number
- `includeInactive`: Include inactive assemblies (default: false)
- `sortBy`: Sort field (name, partNumber, cost, createdAt)
- `sortOrder`: Sort direction (asc, desc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "categoryId": "550e8400-e29b-41d4-a716-446655440020",
    "categoryName": "Sinks",
    "assemblies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440030",
        "partNumber": "SINK-CS-PRO-48",
        "name": "CleanStation Pro 48-inch",
        "description": "Professional reprocessing sink with integrated pegboard",
        "cost": 3500.00,
        "isActive": true,
        "subAssemblyCount": 12,
        "specifications": {
          "dimensions": "48x24x36",
          "material": "316L Stainless Steel",
          "weight": "125 lbs",
          "capacity": "15 gallons"
        },
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-12-15T10:30:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440031",
        "partNumber": "SINK-CS-STD-36",
        "name": "CleanStation Standard 36-inch",
        "description": "Standard reprocessing sink for smaller facilities",
        "cost": 2800.00,
        "isActive": true,
        "subAssemblyCount": 10,
        "specifications": {
          "dimensions": "36x24x36",
          "material": "316L Stainless Steel",
          "weight": "95 lbs",
          "capacity": "12 gallons"
        },
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-11-20T14:45:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "itemsPerPage": 20,
      "totalItems": 45,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

#### GET /api/v1/inventory/assemblies/{assemblyId}/sub-assemblies
**Description**: Get sub-assemblies within a specific assembly
**Access**: All authenticated users
**Permissions**: `inventory:read`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 200)
- `includeInactive`: Include inactive sub-assemblies (default: false)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "assemblyId": "550e8400-e29b-41d4-a716-446655440030",
    "assemblyName": "CleanStation Pro 48-inch",
    "subAssemblies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440040",
        "partNumber": "SUB-BASIN-48-SS",
        "name": "Basin Assembly 48-inch Stainless",
        "description": "Main basin assembly with drain and overflow",
        "cost": 850.00,
        "isActive": true,
        "partCount": 15,
        "isRequired": true,
        "specifications": {
          "material": "316L Stainless Steel",
          "finish": "Brushed",
          "drain": "3-inch center drain"
        },
        "createdAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440041",
        "partNumber": "SUB-PEG-48-UNI",
        "name": "Pegboard Assembly 48-inch Universal",
        "description": "Universal pegboard with standard hole pattern",
        "cost": 425.00,
        "isActive": true,
        "partCount": 8,
        "isRequired": false,
        "specifications": {
          "dimensions": "46x18x0.125",
          "holes": "0.25 inch diameter",
          "pattern": "1 inch centers"
        },
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "itemsPerPage": 50,
      "totalItems": 12,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

#### GET /api/v1/inventory/sub-assemblies/{subAssemblyId}/parts
**Description**: Get individual parts within a specific sub-assembly
**Access**: All authenticated users
**Permissions**: `inventory:read`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "subAssemblyId": "550e8400-e29b-41d4-a716-446655440040",
    "subAssemblyName": "Basin Assembly 48-inch Stainless",
    "parts": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440050",
        "partNumber": "BASIN-48-316L",
        "name": "Basin Bowl 48-inch 316L",
        "description": "Main basin bowl - 48 inch length",
        "cost": 450.00,
        "quantityOnHand": 25,
        "reorderLevel": 5,
        "isActive": true,
        "isCustom": false,
        "specifications": {
          "material": "316L Stainless Steel",
          "gauge": "16 gauge",
          "finish": "Brushed #4",
          "dimensions": "48x24x12"
        },
        "supplier": {
          "name": "Stainless Supply Co",
          "partNumber": "SS-BASIN-48-316L"
        },
        "createdAt": "2024-01-01T00:00:00Z",
        "lastInventoryUpdate": "2025-01-14T16:30:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440051",
        "partNumber": "DRAIN-3-CENTER",
        "name": "Center Drain Assembly 3-inch",
        "description": "3-inch center drain with strainer",
        "cost": 125.00,
        "quantityOnHand": 48,
        "reorderLevel": 10,
        "isActive": true,
        "isCustom": false,
        "specifications": {
          "diameter": "3 inches",
          "material": "316L Stainless Steel",
          "thread": "NPT"
        },
        "supplier": {
          "name": "Drain Systems Inc",
          "partNumber": "DSI-CD-3-SS"
        },
        "createdAt": "2024-01-01T00:00:00Z",
        "lastInventoryUpdate": "2025-01-14T16:30:00Z"
      }
    ],
    "totalParts": 15,
    "totalValue": 2850.00
  }
}
```

### 3.2 Part Search and Discovery

#### GET /api/v1/inventory/search
**Description**: Advanced search across all inventory items
**Access**: All authenticated users
**Permissions**: `inventory:read`

**Query Parameters:**
- `query`: Search term for name, part number, or description
- `type`: Filter by item type (category, assembly, sub_assembly, part)
- `categoryId`: Filter by category
- `minCost`: Minimum cost filter
- `maxCost`: Maximum cost filter
- `inStock`: Filter by availability (true/false)
- `isActive`: Filter by active status (true/false)
- `isCustom`: Filter custom parts (true/false) - 700-series numbering
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Sort field (relevance, name, partNumber, cost, quantityOnHand)
- `sortOrder`: Sort direction (asc, desc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "searchQuery": "stainless steel basin",
    "results": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440050",
        "type": "part",
        "partNumber": "BASIN-48-316L",
        "name": "Basin Bowl 48-inch 316L",
        "description": "Main basin bowl - 48 inch length",
        "cost": 450.00,
        "quantityOnHand": 25,
        "isActive": true,
        "isCustom": false,
        "categoryPath": "Sinks > CleanStation Pro 48-inch > Basin Assembly 48-inch Stainless",
        "relevanceScore": 0.95,
        "specifications": {
          "material": "316L Stainless Steel",
          "gauge": "16 gauge",
          "dimensions": "48x24x12"
        }
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440052",
        "type": "part",
        "partNumber": "BASIN-36-316L",
        "name": "Basin Bowl 36-inch 316L",
        "description": "Main basin bowl - 36 inch length",
        "cost": 380.00,
        "quantityOnHand": 18,
        "isActive": true,
        "isCustom": false,
        "categoryPath": "Sinks > CleanStation Standard 36-inch > Basin Assembly 36-inch Stainless",
        "relevanceScore": 0.89
      }
    ],
    "filters": {
      "applied": {
        "query": "stainless steel basin",
        "isActive": true
      },
      "available": {
        "categories": [
          {
            "id": "550e8400-e29b-41d4-a716-446655440020",
            "name": "Sinks",
            "count": 2
          }
        ],
        "priceRanges": [
          {"min": 0, "max": 100, "count": 0},
          {"min": 100, "max": 500, "count": 2},
          {"min": 500, "max": 1000, "count": 0}
        ]
      }
    },
    "pagination": {
      "currentPage": 1,
      "itemsPerPage": 20,
      "totalItems": 2,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

#### GET /api/v1/inventory/parts/{partId}
**Description**: Get detailed information for a specific part
**Access**: All authenticated users
**Permissions**: `inventory:read`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440050",
    "partNumber": "BASIN-48-316L",
    "name": "Basin Bowl 48-inch 316L",
    "description": "Main basin bowl - 48 inch length, brushed finish",
    "cost": 450.00,
    "quantityOnHand": 25,
    "reorderLevel": 5,
    "leadTime": "2-3 weeks",
    "isActive": true,
    "isCustom": false,
    "specifications": {
      "material": "316L Stainless Steel",
      "gauge": "16 gauge",
      "finish": "Brushed #4",
      "dimensions": "48x24x12",
      "weight": "25 lbs",
      "certifications": ["NSF", "FDA"]
    },
    "supplier": {
      "id": "550e8400-e29b-41d4-a716-446655440060",
      "name": "Stainless Supply Co",
      "partNumber": "SS-BASIN-48-316L",
      "contactInfo": {
        "phone": "+1-800-555-0199",
        "email": "orders@stainlesssupply.com"
      }
    },
    "categoryPath": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440020",
        "name": "Sinks",
        "type": "category"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440030",
        "name": "CleanStation Pro 48-inch",
        "type": "assembly"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440040",
        "name": "Basin Assembly 48-inch Stainless",
        "type": "sub_assembly"
      }
    ],
    "usedInAssemblies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440040",
        "name": "Basin Assembly 48-inch Stainless",
        "quantity": 1
      }
    ],
    "inventoryHistory": [
      {
        "date": "2025-01-14",
        "quantityChange": -2,
        "newQuantity": 25,
        "reason": "Used in order TOR-2025-0001",
        "orderId": "550e8400-e29b-41d4-a716-446655440001"
      },
      {
        "date": "2025-01-10",
        "quantityChange": +15,
        "newQuantity": 27,
        "reason": "Stock replenishment",
        "supplier": "Stainless Supply Co"
      }
    ],
    "documents": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440070",
        "name": "Installation Guide",
        "type": "PDF",
        "url": "/api/v1/documents/550e8400-e29b-41d4-a716-446655440070"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440071",
        "name": "Material Certificate",
        "type": "PDF",
        "url": "/api/v1/documents/550e8400-e29b-41d4-a716-446655440071"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2025-01-14T16:30:00Z",
    "createdBy": {
      "id": "550e8400-e29b-41d4-a716-446655440072",
      "name": "System Admin",
      "role": "ADMIN"
    }
  }
}
```

### 3.3 Inventory Management Operations

#### PUT /api/v1/inventory/parts/{partId}/quantity
**Description**: Update part quantity (inventory adjustment)
**Access**: PROCUREMENT, ADMIN
**Permissions**: `inventory:update`

**Request:**
```json
{
  "quantityChange": -5,
  "reason": "Used in production order TOR-2025-0001",
  "orderId": "550e8400-e29b-41d4-a716-446655440001",
  "notes": "Assembly completion for CleanStation Pro"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "partId": "550e8400-e29b-41d4-a716-446655440050",
    "partNumber": "BASIN-48-316L",
    "previousQuantity": 25,
    "quantityChange": -5,
    "newQuantity": 20,
    "reason": "Used in production order TOR-2025-0001",
    "updatedAt": "2025-01-17T15:45:00Z",
    "updatedBy": {
      "id": "550e8400-e29b-41d4-a716-446655440073",
      "name": "Jane Procurement",
      "role": "PROCUREMENT"
    },
    "needsReorder": false,
    "reorderLevel": 5
  }
}
```

#### POST /api/v1/inventory/parts
**Description**: Create new part (including custom 700-series parts)
**Access**: PROCUREMENT, ADMIN
**Permissions**: `inventory:create`

**Request:**
```json
{
  "subAssemblyId": "550e8400-e29b-41d4-a716-446655440040",
  "name": "Custom Basin Extension",
  "description": "Custom extension for basin assembly - customer specific",
  "cost": 275.00,
  "quantityOnHand": 0,
  "reorderLevel": 2,
  "isCustom": true,
  "specifications": {
    "material": "316L Stainless Steel",
    "dimensions": "12x6x2",
    "finish": "Brushed #4",
    "customization": "Drilled for customer-specific mounting"
  },
  "supplier": {
    "id": "550e8400-e29b-41d4-a716-446655440060",
    "supplierPartNumber": "SS-CUSTOM-001"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440080",
    "partNumber": "700-1024",
    "name": "Custom Basin Extension",
    "description": "Custom extension for basin assembly - customer specific",
    "cost": 275.00,
    "quantityOnHand": 0,
    "reorderLevel": 2,
    "isActive": true,
    "isCustom": true,
    "specifications": {
      "material": "316L Stainless Steel",
      "dimensions": "12x6x2",
      "finish": "Brushed #4",
      "customization": "Drilled for customer-specific mounting"
    },
    "subAssembly": {
      "id": "550e8400-e29b-41d4-a716-446655440040",
      "name": "Basin Assembly 48-inch Stainless"
    },
    "supplier": {
      "id": "550e8400-e29b-41d4-a716-446655440060",
      "name": "Stainless Supply Co",
      "supplierPartNumber": "SS-CUSTOM-001"
    },
    "createdAt": "2025-01-17T16:00:00Z",
    "createdBy": {
      "id": "550e8400-e29b-41d4-a716-446655440073",
      "name": "Jane Procurement",
      "role": "PROCUREMENT"
    }
  }
}
```

#### GET /api/v1/inventory/low-stock
**Description**: Get parts below reorder level
**Access**: PROCUREMENT, ADMIN
**Permissions**: `inventory:read`

**Query Parameters:**
- `threshold`: Override reorder level threshold (percentage)
- `categoryId`: Filter by category
- `urgent`: Only parts at or below 50% of reorder level

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "lowStockParts": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440081",
        "partNumber": "GASKET-DRAIN-3",
        "name": "Drain Gasket 3-inch",
        "quantityOnHand": 2,
        "reorderLevel": 10,
        "cost": 15.00,
        "stockPercentage": 20,
        "urgencyLevel": "HIGH",
        "leadTime": "1 week",
        "supplier": {
          "name": "Seal Tech Inc",
          "phone": "+1-800-555-0188"
        },
        "lastUsed": "2025-01-15",
        "averageMonthlyUsage": 8
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440082",
        "partNumber": "BOLT-SS-M8X25",
        "name": "Stainless Steel Bolt M8x25",
        "quantityOnHand": 15,
        "reorderLevel": 25,
        "cost": 2.50,
        "stockPercentage": 60,
        "urgencyLevel": "MEDIUM",
        "leadTime": "2 weeks",
        "supplier": {
          "name": "Fastener Supply Co",
          "phone": "+1-800-555-0177"
        },
        "lastUsed": "2025-01-14",
        "averageMonthlyUsage": 35
      }
    ],
    "summary": {
      "totalLowStockParts": 2,
      "totalValue": 67.50,
      "urgentParts": 1,
      "mediumParts": 1,
      "lowParts": 0
    }
  }
}
```

---

## 4. CONFIGURATION & BOM APIS

### 4.1 Sink Configuration Management

**Base URL**: `/api/v1/configurations`

#### GET /api/v1/configurations/sink-families
**Description**: Get available sink families for configuration
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `configuration:read`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sinkFamilies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440100",
        "name": "CleanStation Pro",
        "description": "Professional reprocessing sink line",
        "baseModel": "CSP",
        "isActive": true,
        "availableSizes": ["36", "48", "60"],
        "configurableOptions": {
          "body": {
            "materials": ["STAINLESS_STEEL_316L", "STAINLESS_STEEL_304"],
            "mountingTypes": ["FLOOR_MOUNTED", "WALL_MOUNTED", "ISLAND"],
            "sizesAvailable": ["36x24x36", "48x24x36", "60x30x36"]
          },
          "basin": {
            "types": ["SINGLE_BASIN", "DOUBLE_BASIN", "TRIPLE_BASIN"],
            "depths": ["10_INCH", "12_INCH", "14_INCH"],
            "drainPositions": ["CENTER", "LEFT", "RIGHT", "DUAL"]
          },
          "pegboard": {
            "sizes": ["STANDARD_24X18", "LARGE_30X24", "CUSTOM"],
            "holePatterns": ["UNIVERSAL", "CUSTOM", "NONE"],
            "materials": ["STAINLESS_STEEL", "ALUMINUM"]
          },
          "legs": {
            "heights": ["FIXED_34", "ADJUSTABLE_34_38", "ADJUSTABLE_32_40"],
            "materials": ["STAINLESS_STEEL", "ALUMINUM"],
            "styles": ["H_FRAME", "CABINET_BASE", "PEDESTAL"]
          }
        },
        "basePrice": 2800.00,
        "createdAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440101",
        "name": "CleanStation Standard",
        "description": "Standard reprocessing sink line",
        "baseModel": "CSS",
        "isActive": true,
        "availableSizes": ["30", "36", "42"],
        "configurableOptions": {
          "body": {
            "materials": ["STAINLESS_STEEL_316L"],
            "mountingTypes": ["FLOOR_MOUNTED", "WALL_MOUNTED"],
            "sizesAvailable": ["30x20x34", "36x24x36", "42x24x36"]
          },
          "basin": {
            "types": ["SINGLE_BASIN", "DOUBLE_BASIN"],
            "depths": ["10_INCH", "12_INCH"],
            "drainPositions": ["CENTER", "LEFT", "RIGHT"]
          }
        },
        "basePrice": 1800.00,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### POST /api/v1/configurations/validate
**Description**: Validate sink configuration before BOM generation
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `configuration:validate`

**Request:**
```json
{
  "sinkFamilyId": "550e8400-e29b-41d4-a716-446655440100",
  "configuration": {
    "body": {
      "material": "STAINLESS_STEEL_316L",
      "size": "48x24x36",
      "mounting": "FLOOR_MOUNTED"
    },
    "basin": {
      "type": "SINGLE_BASIN",
      "depth": "12_INCH",
      "drainPosition": "CENTER"
    },
    "pegboard": {
      "size": "STANDARD_24X18",
      "holePattern": "UNIVERSAL",
      "material": "STAINLESS_STEEL"
    },
    "legs": {
      "height": "ADJUSTABLE_34_38",
      "material": "STAINLESS_STEEL",
      "style": "H_FRAME"
    },
    "additionalOptions": [
      {
        "optionId": "550e8400-e29b-41d4-a716-446655440102",
        "quantity": 1
      }
    ]
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "validationResults": {
      "body": {
        "isValid": true,
        "selectedOptions": {
          "material": "STAINLESS_STEEL_316L",
          "size": "48x24x36",
          "mounting": "FLOOR_MOUNTED"
        }
      },
      "basin": {
        "isValid": true,
        "compatibility": "COMPATIBLE",
        "selectedOptions": {
          "type": "SINGLE_BASIN",
          "depth": "12_INCH",
          "drainPosition": "CENTER"
        }
      },
      "pegboard": {
        "isValid": true,
        "customRequired": false
      },
      "legs": {
        "isValid": true,
        "loadCapacity": "500 lbs"
      }
    },
    "estimatedCost": 4250.00,
    "customPartsRequired": [
      {
        "component": "pegboard",
        "reason": "Standard size with universal pattern",
        "estimatedCost": 125.00,
        "partNumber": "700-1025"
      }
    ],
    "warnings": [],
    "recommendations": [
      {
        "component": "basin",
        "suggestion": "Consider 14-inch depth for enhanced ergonomics",
        "additionalCost": 85.00
      }
    ]
  }
}
```

#### GET /api/v1/configurations/templates
**Description**: Get predefined configuration templates
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `configuration:read`

**Query Parameters:**
- `sinkFamilyId`: Filter templates by sink family
- `category`: Filter by template category (STANDARD, CUSTOM, POPULAR)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440110",
        "name": "Standard Surgery Suite",
        "description": "Common configuration for surgical facilities",
        "category": "STANDARD",
        "sinkFamily": {
          "id": "550e8400-e29b-41d4-a716-446655440100",
          "name": "CleanStation Pro"
        },
        "configuration": {
          "body": {
            "material": "STAINLESS_STEEL_316L",
            "size": "48x24x36",
            "mounting": "FLOOR_MOUNTED"
          },
          "basin": {
            "type": "SINGLE_BASIN",
            "depth": "12_INCH",
            "drainPosition": "CENTER"
          },
          "pegboard": {
            "size": "STANDARD_24X18",
            "holePattern": "UNIVERSAL",
            "material": "STAINLESS_STEEL"
          },
          "legs": {
            "height": "ADJUSTABLE_34_38",
            "material": "STAINLESS_STEEL",
            "style": "H_FRAME"
          }
        },
        "estimatedCost": 4250.00,
        "popularity": 85,
        "lastUsed": "2025-01-15T14:30:00Z",
        "createdAt": "2024-06-01T00:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440111",
        "name": "Compact Laboratory",
        "description": "Space-efficient configuration for lab environments",
        "category": "POPULAR",
        "sinkFamily": {
          "id": "550e8400-e29b-41d4-a716-446655440101",
          "name": "CleanStation Standard"
        },
        "configuration": {
          "body": {
            "material": "STAINLESS_STEEL_316L",
            "size": "36x24x36",
            "mounting": "WALL_MOUNTED"
          },
          "basin": {
            "type": "SINGLE_BASIN",
            "depth": "10_INCH",
            "drainPosition": "CENTER"
          }
        },
        "estimatedCost": 2650.00,
        "popularity": 72,
        "lastUsed": "2025-01-14T11:20:00Z",
        "createdAt": "2024-04-15T00:00:00Z"
      }
    ]
  }
}
```

### 4.2 Dynamic BOM Generation

#### POST /api/v1/bom/generate
**Description**: Generate BOM based on sink configuration
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `bom:generate`

**Request:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440001",
  "sinkConfigurations": [
    {
      "sinkId": "550e8400-e29b-41d4-a716-446655440004",
      "quantity": 2,
      "configuration": {
        "body": {
          "material": "STAINLESS_STEEL_316L",
          "size": "48x24x36",
          "mounting": "FLOOR_MOUNTED"
        },
        "basin": {
          "type": "SINGLE_BASIN",
          "depth": "12_INCH",
          "drainPosition": "CENTER"
        },
        "pegboard": {
          "size": "STANDARD_24X18",
          "holePattern": "UNIVERSAL",
          "material": "STAINLESS_STEEL"
        },
        "legs": {
          "height": "ADJUSTABLE_34_38",
          "material": "STAINLESS_STEEL",
          "style": "H_FRAME"
        }
      }
    }
  ],
  "accessories": [
    {
      "accessoryId": "550e8400-e29b-41d4-a716-446655440006",
      "quantity": 2
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "bomId": "550e8400-e29b-41d4-a716-446655440120",
    "orderId": "550e8400-e29b-41d4-a716-446655440001",
    "version": 1,
    "status": "DRAFT",
    "bomItems": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440121",
        "category": "ASSEMBLY",
        "item": {
          "id": "550e8400-e29b-41d4-a716-446655440030",
          "partNumber": "SINK-CS-PRO-48",
          "name": "CleanStation Pro 48-inch Base",
          "type": "assembly"
        },
        "quantity": 2,
        "unitCost": 3500.00,
        "totalCost": 7000.00,
        "source": "STANDARD",
        "isCustom": false,
        "subItems": [
          {
            "id": "550e8400-e29b-41d4-a716-446655440122",
            "item": {
              "id": "550e8400-e29b-41d4-a716-446655440040",
              "partNumber": "SUB-BASIN-48-SS",
              "name": "Basin Assembly 48-inch Stainless",
              "type": "sub_assembly"
            },
            "quantity": 2,
            "unitCost": 850.00,
            "totalCost": 1700.00,
            "parts": [
              {
                "id": "550e8400-e29b-41d4-a716-446655440050",
                "partNumber": "BASIN-48-316L",
                "name": "Basin Bowl 48-inch 316L",
                "quantity": 2,
                "unitCost": 450.00,
                "totalCost": 900.00,
                "availableStock": 25,
                "needsProcurement": false
              },
              {
                "id": "550e8400-e29b-41d4-a716-446655440051",
                "partNumber": "DRAIN-3-CENTER",
                "name": "Center Drain Assembly 3-inch",
                "quantity": 2,
                "unitCost": 125.00,
                "totalCost": 250.00,
                "availableStock": 48,
                "needsProcurement": false
              }
            ]
          }
        ]
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440123",
        "category": "CUSTOM_PART",
        "item": {
          "partNumber": "700-1025",
          "name": "Custom Pegboard Assembly Universal 24x18",
          "type": "part",
          "isCustom": true
        },
        "quantity": 2,
        "unitCost": 125.00,
        "totalCost": 250.00,
        "source": "GENERATED",
        "isCustom": true,
        "specifications": {
          "dimensions": "24x18x0.125",
          "material": "316L Stainless Steel",
          "holePattern": "Universal 0.25\" holes on 1\" centers",
          "finish": "Brushed #4"
        },
        "availableStock": 0,
        "needsProcurement": true,
        "estimatedLeadTime": "2-3 weeks"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440124",
        "category": "ACCESSORY",
        "item": {
          "id": "550e8400-e29b-41d4-a716-446655440006",
          "partNumber": "ACC-1001",
          "name": "Splash Guard Assembly",
          "type": "accessory"
        },
        "quantity": 2,
        "unitCost": 75.00,
        "totalCost": 150.00,
        "source": "SELECTED",
        "isCustom": false,
        "availableStock": 12,
        "needsProcurement": false
      }
    ],
    "summary": {
      "totalItems": 3,
      "totalStandardParts": 1,
      "totalCustomParts": 1,
      "totalAccessories": 1,
      "subtotal": 7400.00,
      "customPartsCost": 250.00,
      "standardPartsCost": 7150.00,
      "procurementRequired": true,
      "estimatedLeadTime": "2-3 weeks"
    },
    "availability": {
      "allPartsAvailable": false,
      "partsNeedingProcurement": 1,
      "customPartsCount": 1,
      "estimatedReadyDate": "2025-02-07T00:00:00Z"
    },
    "generatedAt": "2025-01-17T16:30:00Z",
    "generatedBy": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "role": "PRODUCTION_COORDINATOR"
    }
  }
}
```

#### PUT /api/v1/production/tasks/{taskId}
**Description**: Update production task progress and status
**Access**: ASSEMBLER, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `production:update`

**Request:**
```json
{
  "status": "COMPLETED",
  "progressPercentage": 100,
  "actualDuration": "95 minutes",
  "completedSteps": [1, 2, 3],
  "notes": "Assembly completed successfully, all quality checks passed",
  "qualityMetrics": {
    "accuracy": "PASS",
    "completeness": "PASS",
    "defects": 0
  },
  "nextTask": {
    "create": true,
    "title": "Final Assembly Integration",
    "assignTo": "550e8400-e29b-41d4-a716-446655440012"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "taskId": "550e8400-e29b-41d4-a716-446655440200",
    "previousStatus": "IN_PROGRESS",
    "currentStatus": "COMPLETED",
    "progressPercentage": 100,
    "actualDuration": "95 minutes",
    "completedAt": "2025-01-18T14:30:00Z",
    "updatedBy": {
      "id": "550e8400-e29b-41d4-a716-446655440008",
      "name": "Mike Johnson",
      "role": "ASSEMBLER"
    },
    "qualityMetrics": {
      "accuracy": "PASS",
      "completeness": "PASS",
      "defects": 0
    },
    "nextTask": {
      "id": "550e8400-e29b-41d4-a716-446655440201",
      "title": "Final Assembly Integration",
      "status": "PENDING",
      "assignedTo": {
        "id": "550e8400-e29b-41d4-a716-446655440012",
        "name": "Lisa Chen",
        "role": "ASSEMBLER"
      }
    }
  }
}
```

#### POST /api/v1/production/tasks
**Description**: Create new production task
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `production:create`

**Request:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440001",
  "bomItemId": "550e8400-e29b-41d4-a716-446655440123",
  "title": "Custom Pegboard Fabrication",
  "description": "Fabricate custom pegboard with universal hole pattern",
  "priority": "HIGH",
  "assignTo": "550e8400-e29b-41d4-a716-446655440008",
  "estimatedDuration": "180 minutes",
  "dueDate": "2025-01-22T16:00:00Z",
  "workInstructions": [
    {
      "step": 1,
      "instruction": "Cut stainless steel sheet to 24x18 dimensions"
    },
    {
      "step": 2,
      "instruction": "Drill universal hole pattern per specification"
    },
    {
      "step": 3,
      "instruction": "Apply brushed finish and quality inspection"
    }
  ],
  "requiredMaterials": [
    {
      "materialId": "550e8400-e29b-41d4-a716-446655440300",
      "quantity": 1
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440202",
    "orderId": "550e8400-e29b-41d4-a716-446655440001",
    "orderNumber": "TOR-2025-0001",
    "title": "Custom Pegboard Fabrication",
    "description": "Fabricate custom pegboard with universal hole pattern",
    "status": "PENDING",
    "priority": "HIGH",
    "assignedTo": {
      "id": "550e8400-e29b-41d4-a716-446655440008",
      "name": "Mike Johnson",
      "role": "ASSEMBLER"
    },
    "bomItem": {
      "id": "550e8400-e29b-41d4-a716-446655440123",
      "partNumber": "700-1025",
      "name": "Custom Pegboard Assembly Universal 24x18"
    },
    "estimatedDuration": "180 minutes",
    "dueDate": "2025-01-22T16:00:00Z",
    "workInstructions": [
      {
        "step": 1,
        "instruction": "Cut stainless steel sheet to 24x18 dimensions",
        "completed": false
      },
      {
        "step": 2,
        "instruction": "Drill universal hole pattern per specification",
        "completed": false
      },
      {
        "step": 3,
        "instruction": "Apply brushed finish and quality inspection",
        "completed": false
      }
    ],
    "createdAt": "2025-01-18T15:00:00Z",
    "createdBy": {
      "id": "550e8400-e29b-41d4-a716-446655440016",
      "name": "Sarah Wilson",
      "role": "PRODUCTION_COORDINATOR"
    }
  }
}
```

### 5.2 Production Scheduling and Workflow

#### GET /api/v1/production/schedule
**Description**: Get production schedule with capacity planning
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `production:schedule:read`

**Query Parameters:**
- `startDate`: Schedule start date (ISO 8601)
- `endDate`: Schedule end date (ISO 8601)
- `workcenterId`: Filter by work center
- `assignedTo`: Filter by assigned user
- `view`: Schedule view (day, week, month)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "scheduleView": "week",
    "dateRange": {
      "startDate": "2025-01-20T00:00:00Z",
      "endDate": "2025-01-26T23:59:59Z"
    },
    "workCenters": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440400",
        "name": "Assembly Station 1",
        "capacity": {
          "hoursPerDay": 8,
          "utilizationPercentage": 85
        },
        "assignments": [
          {
            "date": "2025-01-20",
            "tasks": [
              {
                "id": "550e8400-e29b-41d4-a716-446655440200",
                "title": "Assemble Basin Components",
                "orderId": "550e8400-e29b-41d4-a716-446655440001",
                "assignedTo": {
                  "id": "550e8400-e29b-41d4-a716-446655440008",
                  "name": "Mike Johnson"
                },
                "scheduledStart": "2025-01-20T08:00:00Z",
                "scheduledEnd": "2025-01-20T10:30:00Z",
                "estimatedDuration": "150 minutes",
                "priority": "HIGH",
                "status": "SCHEDULED"
              }
            ],
            "totalHours": 6.5,
            "availableHours": 1.5
          }
        ]
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440401",
        "name": "Fabrication Station",
        "capacity": {
          "hoursPerDay": 8,
          "utilizationPercentage": 72
        },
        "assignments": [
          {
            "date": "2025-01-21",
            "tasks": [
              {
                "id": "550e8400-e29b-41d4-a716-446655440202",
                "title": "Custom Pegboard Fabrication",
                "orderId": "550e8400-e29b-41d4-a716-446655440001",
                "assignedTo": {
                  "id": "550e8400-e29b-41d4-a716-446655440008",
                  "name": "Mike Johnson"
                },
                "scheduledStart": "2025-01-21T09:00:00Z",
                "scheduledEnd": "2025-01-21T12:00:00Z",
                "estimatedDuration": "180 minutes",
                "priority": "HIGH",
                "status": "SCHEDULED"
              }
            ],
            "totalHours": 5.8,
            "availableHours": 2.2
          }
        ]
      }
    ],
    "summary": {
      "totalCapacityHours": 40,
      "scheduledHours": 31.2,
      "availableHours": 8.8,
      "utilizationPercentage": 78,
      "overallocation": false
    }
  }
}
```

#### PUT /api/v1/production/schedule/task/{taskId}
**Description**: Reschedule production task
**Access**: PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `production:schedule:update`

**Request:**
```json
{
  "scheduledStart": "2025-01-21T10:00:00Z",
  "workcenterId": "550e8400-e29b-41d4-a716-446655440401",
  "assignTo": "550e8400-e29b-41d4-a716-446655440012",
  "priority": "URGENT",
  "reason": "Customer expedite request"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "taskId": "550e8400-e29b-41d4-a716-446655440202",
    "previousSchedule": {
      "scheduledStart": "2025-01-21T09:00:00Z",
      "workcenterId": "550e8400-e29b-41d4-a716-446655440400",
      "assignedTo": "550e8400-e29b-41d4-a716-446655440008"
    },
    "newSchedule": {
      "scheduledStart": "2025-01-21T10:00:00Z",
      "scheduledEnd": "2025-01-21T13:00:00Z",
      "workcenterId": "550e8400-e29b-41d4-a716-446655440401",
      "assignedTo": {
        "id": "550e8400-e29b-41d4-a716-446655440012",
        "name": "Lisa Chen",
        "role": "ASSEMBLER"
      }
    },
    "priority": "URGENT",
    "reason": "Customer expedite request",
    "impactAnalysis": {
      "delayedTasks": 0,
      "resourceConflicts": false,
      "estimatedDeliveryChange": "No change"
    },
    "rescheduledAt": "2025-01-18T16:30:00Z",
    "rescheduledBy": {
      "id": "550e8400-e29b-41d4-a716-446655440016",
      "name": "Sarah Wilson",
      "role": "PRODUCTION_COORDINATOR"
    }
  }
}
```

### 5.3 Issue Reporting and Resolution

#### POST /api/v1/production/issues
**Description**: Report production issue or problem
**Access**: ASSEMBLER, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `production:issues:create`

**Request:**
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440200",
  "orderId": "550e8400-e29b-41d4-a716-446655440001",
  "title": "Defective Drain Assembly",
  "description": "Center drain assembly has damaged threads, cannot complete installation",
  "severity": "HIGH",
  "category": "QUALITY",
  "affectedParts": [
    {
      "partId": "550e8400-e29b-41d4-a716-446655440051",
      "partNumber": "DRAIN-3-CENTER",
      "defectDescription": "Cross-threaded NPT connection",
      "quantityAffected": 1
    }
  ],
  "photos": [
    {
      "url": "/api/v1/files/550e8400-e29b-41d4-a716-446655440500",
      "description": "Damaged threads close-up"
    }
  ],
  "suggestedResolution": "Replace with new drain assembly from stock"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440600",
    "issueNumber": "ISS-2025-0001",
    "taskId": "550e8400-e29b-41d4-a716-446655440200",
    "orderId": "550e8400-e29b-41d4-a716-446655440001",
    "orderNumber": "TOR-2025-0001",
    "title": "Defective Drain Assembly",
    "description": "Center drain assembly has damaged threads, cannot complete installation",
    "status": "OPEN",
    "severity": "HIGH",
    "category": "QUALITY",
    "priority": "HIGH",
    "reportedBy": {
      "id": "550e8400-e29b-41d4-a716-446655440008",
      "name": "Mike Johnson",
      "role": "ASSEMBLER"
    },
    "assignedTo": {
      "id": "550e8400-e29b-41d4-a716-446655440073",
      "name": "Jane Procurement",
      "role": "PROCUREMENT"
    },
    "affectedParts": [
      {
        "partId": "550e8400-e29b-41d4-a716-446655440051",
        "partNumber": "DRAIN-3-CENTER",
        "name": "Center Drain Assembly 3-inch",
        "defectDescription": "Cross-threaded NPT connection",
        "quantityAffected": 1
      }
    ],
    "estimatedImpact": {
      "delayHours": 4,
      "additionalCost": 125.00,
      "deliveryImpact": "No change"
    },
    "suggestedResolution": "Replace with new drain assembly from stock",
    "photos": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440500",
        "url": "/api/v1/files/550e8400-e29b-41d4-a716-446655440500",
        "description": "Damaged threads close-up",
        "uploadedAt": "2025-01-18T14:45:00Z"
      }
    ],
    "createdAt": "2025-01-18T14:45:00Z",
    "dueDate": "2025-01-19T14:45:00Z"
  }
}
```

#### GET /api/v1/production/issues
**Description**: Get production issues with filtering
**Access**: All authenticated users (filtered by permissions)
**Permissions**: `production:issues:read`

**Query Parameters:**
- `status`: Filter by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- `severity`: Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)
- `category`: Filter by category (QUALITY, EQUIPMENT, MATERIAL, PROCESS)
- `assignedTo`: Filter by assigned user ID
- `reportedBy`: Filter by reporter user ID
- `orderId`: Filter by order ID
- `dateFrom`: Filter issues from date
- `dateTo`: Filter issues to date
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440600",
        "issueNumber": "ISS-2025-0001",
        "title": "Defective Drain Assembly",
        "status": "RESOLVED",
        "severity": "HIGH",
        "category": "QUALITY",
        "orderNumber": "TOR-2025-0001",
        "reportedBy": {
          "name": "Mike Johnson",
          "role": "ASSEMBLER"
        },
        "assignedTo": {
          "name": "Jane Procurement",
          "role": "PROCUREMENT"
        },
        "resolution": {
          "description": "Replaced defective part with new drain assembly",
          "resolvedAt": "2025-01-18T16:30:00Z",
          "resolvedBy": {
            "name": "Jane Procurement",
            "role": "PROCUREMENT"
          },
          "actualCost": 125.00,
          "actualDelay": "2 hours"
        },
        "createdAt": "2025-01-18T14:45:00Z",
        "resolvedAt": "2025-01-18T16:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "itemsPerPage": 20,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    },
    "summary": {
      "totalIssues": 1,
      "openIssues": 0,
      "inProgressIssues": 0,
      "resolvedIssues": 1,
      "criticalIssues": 0,
      "averageResolutionTime": "1.75 hours"
    }
  }
}
```

#### PUT /api/v1/production/issues/{issueId}
**Description**: Update production issue status and resolution
**Access**: Issue assignee, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `production:issues:update`

**Request:**
```json
{
  "status": "RESOLVED",
  "resolution": {
    "description": "Replaced defective part with new drain assembly from stock",
    "actionsTaken": [
      "Removed defective drain assembly",
      "Installed new DRAIN-3-CENTER part",
      "Tested fit and seal integrity",
      "Updated inventory records"
    ],
    "replacementParts": [
      {
        "partId": "550e8400-e29b-41d4-a716-446655440051",
        "quantity": 1,
        "cost": 125.00
      }
    ],
    "actualCost": 125.00,
    "actualDelay": "2 hours",
    "preventiveActions": "Added thread inspection to QC checklist"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "issueId": "550e8400-e29b-41d4-a716-446655440600",
    "issueNumber": "ISS-2025-0001",
    "previousStatus": "IN_PROGRESS",
    "currentStatus": "RESOLVED",
    "resolution": {
      "description": "Replaced defective part with new drain assembly from stock",
      "actionsTaken": [
        "Removed defective drain assembly",
        "Installed new DRAIN-3-CENTER part",
        "Tested fit and seal integrity",
        "Updated inventory records"
      ],
      "replacementParts": [
        {
          "partId": "550e8400-e29b-41d4-a716-446655440051",
          "partNumber": "DRAIN-3-CENTER",
          "name": "Center Drain Assembly 3-inch",
          "quantity": 1,
          "cost": 125.00
        }
      ],
      "actualCost": 125.00,
      "actualDelay": "2 hours",
      "preventiveActions": "Added thread inspection to QC checklist",
      "resolvedAt": "2025-01-18T16:30:00Z",
      "resolvedBy": {
        "id": "550e8400-e29b-41d4-a716-446655440073",
        "name": "Jane Procurement",
        "role": "PROCUREMENT"
      }
    },
    "taskUpdate": {
      "taskId": "550e8400-e29b-41d4-a716-446655440200",
      "status": "IN_PROGRESS",
      "canContinue": true
    }
  }
}
```

---

## 6. QUALITY CONTROL APIS

### 6.1 QC Checklists and Inspections

**Base URL**: `/api/v1/quality`

#### GET /api/v1/quality/checklists
**Description**: Get quality control checklists by type and phase
**Access**: QC_PERSON, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `quality:read`

**Query Parameters:**
- `type`: Checklist type (PRE_QC, PRODUCTION_COMPLETE, END_OF_LINE, FINAL_QC, CUSTOMER_SPECIFIC)
- `sinkFamilyId`: Filter by sink family
- `isActive`: Filter active checklists (default: true)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "checklists": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440700",
        "name": "Pre-QC Basin Assembly Checklist",
        "type": "PRE_QC",
        "phase": "PRE_QC",
        "applicableTo": [
          {
            "sinkFamilyId": "550e8400-e29b-41d4-a716-446655440100",
            "sinkFamilyName": "CleanStation Pro"
          }
        ],
        "version": 2,
        "isActive": true,
        "checkItems": [
          {
            "id": "550e8400-e29b-41d4-a716-446655440701",
            "sequence": 1,
            "category": "DIMENSIONAL",
            "description": "Verify basin dimensions per drawing",
            "requirement": "48\" x 24\" x 12\" ±0.125\"",
            "measurementType": "DIMENSIONAL",
            "criticalItem": true,
            "passCriteria": "Within tolerance",
            "photos": {
              "required": true,
              "minimum": 2
            }
          },
          {
            "id": "550e8400-e29b-41d4-a716-446655440702",
            "sequence": 2,
            "category": "FUNCTIONAL",
            "description": "Test drain flow rate",
            "requirement": "15 GPM minimum flow rate",
            "measurementType": "FLOW_RATE",
            "criticalItem": true,
            "passCriteria": "≥15 GPM",
            "testProcedure": "Fill basin and measure drain time for 10 gallons"
          },
          {
            "id": "550e8400-e29b-41d4-a716-446655440703",
            "sequence": 3,
            "category": "VISUAL",
            "description": "Inspect weld quality and finish",
            "requirement": "Smooth continuous welds, brushed finish",
            "measurementType": "VISUAL",
            "criticalItem": false,
            "passCriteria": "No visible defects, uniform finish",
            "photos": {
              "required": true,
              "minimum": 4
            }
          }
        ],
        "estimatedDuration": "45 minutes",
        "requiredCertifications": ["QC Level 2"],
        "createdAt": "2024-06-01T00:00:00Z",
        "updatedAt": "2024-12-15T10:30:00Z"
      }
    ],
    "totalChecklists": 1
  }
}
```

#### POST /api/v1/quality/inspections
**Description**: Create new quality inspection
**Access**: QC_PERSON, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `quality:create`

**Request:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440001",
  "taskId": "550e8400-e29b-41d4-a716-446655440200",
  "checklistId": "550e8400-e29b-41d4-a716-446655440700",
  "inspectionType": "PRE_QC",
  "bomItemId": "550e8400-e29b-41d4-a716-446655440122",
  "serialNumber": "BN-2025-001",
  "inspectorNotes": "Initial inspection after basin assembly completion"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440800",
    "inspectionNumber": "QC-2025-0001",
    "orderId": "550e8400-e29b-41d4-a716-446655440001",
    "orderNumber": "TOR-2025-0001",
    "taskId": "550e8400-e29b-41d4-a716-446655440200",
    "checklistId": "550e8400-e29b-41d4-a716-446655440700",
    "inspectionType": "PRE_QC",
    "status": "IN_PROGRESS",
    "bomItem": {
      "id": "550e8400-e29b-41d4-a716-446655440122",
      "partNumber": "SUB-BASIN-48-SS",
      "name": "Basin Assembly 48-inch Stainless"
    },
    "serialNumber": "BN-2025-001",
    "checklist": {
      "id": "550e8400-e29b-41d4-a716-446655440700",
      "name": "Pre-QC Basin Assembly Checklist",
      "version": 2,
      "totalItems": 3
    },
    "inspector": {
      "id": "550e8400-e29b-41d4-a716-446655440012",
      "name": "Lisa Chen",
      "role": "QC_PERSON",
      "certifications": ["QC Level 2", "Welding Inspector"]
    },
    "checkItems": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440701",
        "sequence": 1,
        "description": "Verify basin dimensions per drawing",
        "requirement": "48\" x 24\" x 12\" ±0.125\"",
        "status": "PENDING",
        "criticalItem": true
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440702",
        "sequence": 2,
        "description": "Test drain flow rate",
        "requirement": "15 GPM minimum flow rate",
        "status": "PENDING",
        "criticalItem": true
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440703",
        "sequence": 3,
        "description": "Inspect weld quality and finish",
        "requirement": "Smooth continuous welds, brushed finish",
        "status": "PENDING",
        "criticalItem": false
      }
    ],
    "inspectorNotes": "Initial inspection after basin assembly completion",
    "startedAt": "2025-01-18T15:00:00Z",
    "estimatedCompletion": "2025-01-18T15:45:00Z",
    "createdAt": "2025-01-18T15:00:00Z"
  }
}
```

#### PUT /api/v1/quality/inspections/{inspectionId}/check-item/{checkItemId}
**Description**: Update individual check item results
**Access**: QC_PERSON, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `quality:update`

**Request:**
```json
{
  "result": "PASS",
  "measuredValue": "48.062 x 24.031 x 12.015",
  "notes": "All dimensions within tolerance",
  "photos": [
    {
      "url": "/api/v1/files/550e8400-e29b-41d4-a716-446655440801",
      "description": "Length measurement"
    },
    {
      "url": "/api/v1/files/550e8400-e29b-41d4-a716-446655440802",
      "description": "Width measurement"
    }
  ],
  "inspector": "550e8400-e29b-41d4-a716-446655440012",
  "completedAt": "2025-01-18T15:15:00Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "inspectionId": "550e8400-e29b-41d4-a716-446655440800",
    "checkItemId": "550e8400-e29b-41d4-a716-446655440701",
    "sequence": 1,
    "description": "Verify basin dimensions per drawing",
    "requirement": "48\" x 24\" x 12\" ±0.125\"",
    "result": "PASS",
    "measuredValue": "48.062 x 24.031 x 12.015",
    "variance": "+0.062, +0.031, +0.015",
    "withinTolerance": true,
    "criticalItem": true,
    "notes": "All dimensions within tolerance",
    "photos": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440801",
        "url": "/api/v1/files/550e8400-e29b-41d4-a716-446655440801",
        "description": "Length measurement",
        "uploadedAt": "2025-01-18T15:15:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440802",
        "url": "/api/v1/files/550e8400-e29b-41d4-a716-446655440802",
        "description": "Width measurement",
        "uploadedAt": "2025-01-18T15:15:00Z"
      }
    ],
    "inspector": {
      "id": "550e8400-e29b-41d4-a716-446655440012",
      "name": "Lisa Chen",
      "role": "QC_PERSON"
    },
    "completedAt": "2025-01-18T15:15:00Z",
    "inspectionStatus": "IN_PROGRESS",
    "completedItems": 1,
    "totalItems": 3
  }
}
```

#### PUT /api/v1/quality/inspections/{inspectionId}/complete
**Description**: Complete quality inspection
**Access**: QC_PERSON assigned to inspection, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `quality:complete`

**Request:**
```json
{
  "overallResult": "PASS",
  "inspectorNotes": "All checks passed, basin assembly meets specifications",
  "recommendations": [
    "Consider tighter weld uniformity controls for future batches"
  ],
  "disposition": "ACCEPT",
  "nextPhase": "PRODUCTION_COMPLETE"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "inspectionId": "550e8400-e29b-41d4-a716-446655440800",
    "inspectionNumber": "QC-2025-0001",
    "overallResult": "PASS",
    "status": "COMPLETED",
    "disposition": "ACCEPT",
    "completedAt": "2025-01-18T15:45:00Z",
    "actualDuration": "45 minutes",
    "inspector": {
      "id": "550e8400-e29b-41d4-a716-446655440012",
      "name": "Lisa Chen",
      "role": "QC_PERSON"
    },
    "summary": {
      "totalItems": 3,
      "passedItems": 3,
      "failedItems": 0,
      "criticalItems": 2,
      "criticalPassed": 2,
      "passRate": 100
    },
    "checkResults": [
      {
        "sequence": 1,
        "description": "Verify basin dimensions per drawing",
        "result": "PASS",
        "criticalItem": true
      },
      {
        "sequence": 2,
        "description": "Test drain flow rate",
        "result": "PASS",
        "criticalItem": true,
        "measuredValue": "16.2 GPM"
      },
      {
        "sequence": 3,
        "description": "Inspect weld quality and finish",
        "result": "PASS",
        "criticalItem": false
      }
    ],
    "inspectorNotes": "All checks passed, basin assembly meets specifications",
    "recommendations": [
      "Consider tighter weld uniformity controls for future batches"
    ],
    "nextPhase": "PRODUCTION_COMPLETE",
    "orderUpdate": {
      "orderId": "550e8400-e29b-41d4-a716-446655440001",
      "previousStatus": "PRE_QC",
      "newStatus": "PRODUCTION_COMPLETE",
      "canProceed": true
    }
  }
}
```

### 6.2 Quality Metrics and Reporting

#### GET /api/v1/quality/metrics
**Description**: Get quality metrics and performance data
**Access**: QC_PERSON, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `quality:metrics:read`

**Query Parameters:**
- `period`: Time period (day, week, month, quarter, year)
- `startDate`: Start date for metrics (ISO 8601)
- `endDate`: End date for metrics (ISO 8601)
- `inspectionType`: Filter by inspection type
- `inspector`: Filter by inspector ID
- `sinkFamily`: Filter by sink family

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "dateRange": {
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-01-31T23:59:59Z"
    },
    "overallMetrics": {
      "totalInspections": 45,
      "passedInspections": 42,
      "failedInspections": 3,
      "passRate": 93.3,
      "averageInspectionTime": "52 minutes",
      "criticalDefects": 1,
      "minorDefects": 8,
      "reworkRequired": 2
    },
    "byInspectionType": [
      {
        "type": "PRE_QC",
        "totalInspections": 15,
        "passRate": 86.7,
        "averageTime": "45 minutes",
        "defectRate": 13.3
      },
      {
        "type": "PRODUCTION_COMPLETE",
        "totalInspections": 12,
        "passRate": 100,
        "averageTime": "38 minutes",
        "defectRate": 0
      },
      {
        "type": "END_OF_LINE",
        "totalInspections": 10,
        "passRate": 90,
        "averageTime": "75 minutes",
        "defectRate": 10
      },
      {
        "type": "FINAL_QC",
        "totalInspections": 8,
        "passRate": 100,
        "averageTime": "90 minutes",
        "defectRate": 0
      }
    ],
    "byInspector": [
      {
        "inspectorId": "550e8400-e29b-41d4-a716-446655440012",
        "name": "Lisa Chen",
        "totalInspections": 25,
        "passRate": 96,
        "averageTime": "48 minutes",
        "defectsFound": 3
      },
      {
        "inspectorId": "550e8400-e29b-41d4-a716-446655440900",
        "name": "David Kim",
        "totalInspections": 20,
        "passRate": 90,
        "averageTime": "58 minutes",
        "defectsFound": 6
      }
    ],
    "defectAnalysis": {
      "totalDefects": 9,
      "bySeverity": {
        "critical": 1,
        "major": 2,
        "minor": 6
      },
      "byCategory": {
        "dimensional": 3,
        "functional": 2,
        "visual": 3,
        "material": 1
      },
      "commonDefects": [
        {
          "description": "Weld uniformity variation",
          "count": 3,
          "percentage": 33.3
        },
        {
          "description": "Surface finish inconsistency",
          "count": 2,
          "percentage": 22.2
        }
      ]
    },
    "trends": {
      "passRateTrend": "IMPROVING",
      "defectRateTrend": "DECREASING",
      "inspectionTimeTrend": "STABLE"
    },
    "recommendations": [
      "Focus on weld training to reduce uniformity variations",
      "Implement additional surface finish quality gates",
      "Consider additional QC staffing during peak periods"
    ]
  }
}
```

#### POST /api/v1/quality/photo-upload
**Description**: Upload quality control photos
**Access**: QC_PERSON, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `quality:photos:upload`

**Request:** Multipart form data
- `inspectionId`: Inspection ID
- `checkItemId`: Check item ID (optional)
- `description`: Photo description
- `file`: Image file (JPEG, PNG, max 10MB)

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440803",
    "inspectionId": "550e8400-e29b-41d4-a716-446655440800",
    "checkItemId": "550e8400-e29b-41d4-a716-446655440701",
    "filename": "basin_dimension_check.jpg",
    "description": "Basin length measurement verification",
    "url": "/api/v1/files/550e8400-e29b-41d4-a716-446655440803",
    "thumbnailUrl": "/api/v1/files/550e8400-e29b-41d4-a716-446655440803/thumbnail",
    "fileSize": 2485760,
    "contentType": "image/jpeg",
    "uploadedBy": {
      "id": "550e8400-e29b-41d4-a716-446655440012",
      "name": "Lisa Chen",
      "role": "QC_PERSON"
    },
    "uploadedAt": "2025-01-18T15:15:00Z"
  }
}
```

---

## 7. SERVICE PARTS APIS

### 7.1 Service Parts Catalog and Search

**Base URL**: `/api/v1/service`

#### GET /api/v1/service/catalog
**Description**: Browse service parts catalog with hierarchical navigation
**Access**: SERVICE_TECH, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `service:catalog:read`

**Query Parameters:**
- `category`: Filter by part category (WEAR_PARTS, GASKETS_SEALS, HARDWARE, ELECTRICAL)
- `sinkModel`: Filter by compatible sink model
- `search`: Search parts by name, part number, or description
- `inStock`: Filter by availability (true/false)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Sort field (name, partNumber, price, popularity)
- `sortOrder`: Sort direction (asc, desc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "550e8400-e29b-41d4-a716-446655441000",
        "name": "Wear Parts",
        "description": "Commonly replaced components",
        "partCount": 45,
        "subcategories": [
          {
            "id": "550e8400-e29b-41d4-a716-446655441001",
            "name": "Drain Components",
            "partCount": 12
          },
          {
            "id": "550e8400-e29b-41d4-a716-446655441002",
            "name": "Faucet Parts",
            "partCount": 18
          }
        ]
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655441003",
        "name": "Gaskets & Seals",
        "description": "Sealing components and gaskets",
        "partCount": 28
      }
    ],
    "parts": [
      {
        "id": "550e8400-e29b-41d4-a716-446655441100",
        "partNumber": "SVC-GASKET-DRAIN-3",
        "name": "Drain Gasket 3-inch Service Kit",
        "description": "Replacement gasket kit for 3-inch center drains",
        "category": "Gaskets & Seals",
        "subcategory": "Drain Components",
        "price": 18.50,
        "listPrice": 25.00,
        "quantityAvailable": 125,
        "isInStock": true,
        "popularityRank": 3,
        "compatibleSinks": [
          {
            "sinkFamilyId": "550e8400-e29b-41d4-a716-446655440100",
            "sinkFamily": "CleanStation Pro",
            "models": ["CSP-36", "CSP-48", "CSP-60"]
          },
          {
            "sinkFamilyId": "550e8400-e29b-41d4-a716-446655440101",
            "sinkFamily": "CleanStation Standard",
            "models": ["CSS-30", "CSS-36", "CSS-42"]
          }
        ],
        "specifications": {
          "material": "EPDM Rubber",
          "durometer": "70 Shore A",
          "temperatureRange": "-40°F to +250°F",
          "chemicalCompatibility": "Healthcare disinfectants"
        },
        "packaging": {
          "unitsPerKit": 2,
          "weight": "0.5 lbs",
          "dimensions": "4x4x1 inches"
        },
        "leadTime": "Same day",
        "warranty": "12 months",
        "installationNotes": "Apply thin layer of food-grade lubricant before installation",
        "relatedParts": [
          {
            "partNumber": "SVC-DRAIN-3-ASSY",
            "name": "Complete Drain Assembly 3-inch",
            "relationship": "UPGRADE"
          }
        ],
        "images": [
          {
            "url": "/api/v1/files/550e8400-e29b-41d4-a716-446655441101",
            "type": "PRIMARY",
            "description": "Product image"
          },
          {
            "url": "/api/v1/files/550e8400-e29b-41d4-a716-446655441102",
            "type": "INSTALLATION",
            "description": "Installation diagram"
          }
        ],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "itemsPerPage": 20,
      "totalItems": 156,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "filters": {
      "applied": {
        "category": "Gaskets & Seals",
        "inStock": true
      },
      "available": {
        "categories": [
          {"name": "Wear Parts", "count": 45},
          {"name": "Gaskets & Seals", "count": 28},
          {"name": "Hardware", "count": 83}
        ],
        "sinkModels": [
          {"name": "CleanStation Pro", "count": 98},
          {"name": "CleanStation Standard", "count": 67}
        ],
        "priceRanges": [
          {"min": 0, "max": 25, "count": 89},
          {"min": 25, "max": 100, "count": 52},
          {"min": 100, "max": 500, "count": 15}
        ]
      }
    }
  }
}
```

#### GET /api/v1/service/parts/{partId}
**Description**: Get detailed information for a specific service part
**Access**: SERVICE_TECH, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `service:catalog:read`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655441100",
    "partNumber": "SVC-GASKET-DRAIN-3",
    "name": "Drain Gasket 3-inch Service Kit",
    "description": "Complete replacement gasket kit for 3-inch center drains, includes primary gasket and backup O-ring",
    "category": "Gaskets & Seals",
    "subcategory": "Drain Components",
    "price": 18.50,
    "listPrice": 25.00,
    "discount": 26,
    "quantityAvailable": 125,
    "reorderLevel": 25,
    "isInStock": true,
    "popularityRank": 3,
    "salesRank": 5,
    "compatibleSinks": [
      {
        "sinkFamilyId": "550e8400-e29b-41d4-a716-446655440100",
        "sinkFamily": "CleanStation Pro",
        "models": ["CSP-36", "CSP-48", "CSP-60"],
        "years": ["2020-Present"],
        "notes": "Standard compatibility"
      },
      {
        "sinkFamilyId": "550e8400-e29b-41d4-a716-446655440101",
        "sinkFamily": "CleanStation Standard",
        "models": ["CSS-30", "CSS-36", "CSS-42"],
        "years": ["2018-Present"],
        "notes": "Verify drain model before ordering"
      }
    ],
    "specifications": {
      "material": "EPDM Rubber",
      "durometer": "70 Shore A",
      "temperatureRange": "-40°F to +250°F",
      "pressureRating": "150 PSI",
      "chemicalCompatibility": [
        "Quaternary ammonium compounds",
        "Hydrogen peroxide",
        "Alcohol-based disinfectants",
        "Enzymatic cleaners"
      ],
      "certifications": ["FDA approved", "NSF/ANSI 61"]
    },
    "packaging": {
      "unitsPerKit": 2,
      "weight": "0.5 lbs",
      "dimensions": "4x4x1 inches",
      "upc": "123456789012"
    },
    "availability": {
      "leadTime": "Same day",
      "shippingWeight": "1.0 lbs",
      "hazmat": false,
      "dropShipAvailable": true
    },
    "warranty": "12 months",
    "installationNotes": [
      "Clean drain flange thoroughly before installation",
      "Apply thin layer of food-grade lubricant to gasket",
      "Torque drain assembly to 25-30 ft-lbs",
      "Test for leaks before returning to service"
    ],
    "safetyInformation": [
      "Wear nitrile gloves during installation",
      "Ensure proper ventilation when using lubricants",
      "Follow lockout/tagout procedures"
    ],
    "relatedParts": [
      {
        "partNumber": "SVC-DRAIN-3-ASSY",
        "name": "Complete Drain Assembly 3-inch",
        "relationship": "UPGRADE",
        "price": 145.00
      },
      {
        "partNumber": "SVC-LUBRICANT-FG",
        "name": "Food-Grade Gasket Lubricant",
        "relationship": "ACCESSORY",
        "price": 12.00
      },
      {
        "partNumber": "SVC-TOOL-DRAIN",
        "name": "Drain Installation Tool",
        "relationship": "TOOL",
        "price": 35.00
      }
    ],
    "frequentlyBoughtTogether": [
      {
        "partNumber": "SVC-CLEANER-DRAIN",
        "name": "Drain Cleaner Concentrate",
        "price": 8.50,
        "bundleDiscount": 15
      }
    ],
    "images": [
      {
        "id": "550e8400-e29b-41d4-a716-446655441101",
        "url": "/api/v1/files/550e8400-e29b-41d4-a716-446655441101",
        "thumbnailUrl": "/api/v1/files/550e8400-e29b-41d4-a716-446655441101/thumbnail",
        "type": "PRIMARY",
        "description": "Product image",
        "altText": "Drain gasket service kit"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655441102",
        "url": "/api/v1/files/550e8400-e29b-41d4-a716-446655441102",
        "thumbnailUrl": "/api/v1/files/550e8400-e29b-41d4-a716-446655441102/thumbnail",
        "type": "INSTALLATION",
        "description": "Installation diagram",
        "altText": "Step-by-step installation guide"
      }
    ],
    "documents": [
      {
        "id": "550e8400-e29b-41d4-a716-446655441103",
        "name": "Installation Instructions",
        "type": "PDF",
        "url": "/api/v1/documents/550e8400-e29b-41d4-a716-446655441103",
        "size": "245KB"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655441104",
        "name": "Material Safety Data Sheet",
        "type": "PDF",
        "url": "/api/v1/documents/550e8400-e29b-41d4-a716-446655441104",
        "size": "156KB"
      }
    ],
    "reviews": {
      "averageRating": 4.7,
      "totalReviews": 28,
      "ratingDistribution": {
        "5": 20,
        "4": 6,
        "3": 2,
        "2": 0,
        "1": 0
      }
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

### 7.2 Service Cart and Order Management

#### GET /api/v1/service/cart
**Description**: Get current user's service cart
**Access**: SERVICE_TECH, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `service:cart:read`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "cartId": "550e8400-e29b-41d4-a716-446655441200",
    "userId": "550e8400-e29b-41d4-a716-446655441201",
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655441202",
        "partId": "550e8400-e29b-41d4-a716-446655441100",
        "partNumber": "SVC-GASKET-DRAIN-3",
        "name": "Drain Gasket 3-inch Service Kit",
        "quantity": 3,
        "unitPrice": 18.50,
        "totalPrice": 55.50,
        "availability": "IN_STOCK",
        "leadTime": "Same day",
        "addedAt": "2025-01-18T14:30:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655441203",
        "partId": "550e8400-e29b-41d4-a716-446655441150",
        "partNumber": "SVC-FAUCET-AERO",
        "name": "Aerator Assembly Standard",
        "quantity": 2,
        "unitPrice": 12.75,
        "totalPrice": 25.50,
        "availability": "LOW_STOCK",
        "leadTime": "2-3 days",
        "addedAt": "2025-01-18T14:35:00Z"
      }
    ],
    "summary": {
      "itemCount": 2,
      "totalQuantity": 5,
      "subtotal": 81.00,
      "shipping": 15.00,
      "tax": 7.29,
      "total": 103.29,
      "savings": 12.50,
      "estimatedDelivery": "2025-01-21T00:00:00Z"
    },
    "shipping": {
      "method": "STANDARD",
      "cost": 15.00,
      "estimatedDays": 3,
      "options": [
        {
          "method": "STANDARD",
          "cost": 15.00,
          "estimatedDays": 3
        },
        {
          "method": "EXPRESS",
          "cost": 35.00,
          "estimatedDays": 1
        }
      ]
    },
    "createdAt": "2025-01-18T14:30:00Z",
    "updatedAt": "2025-01-18T14:35:00Z"
  }
}
```

#### POST /api/v1/service/cart/items
**Description**: Add item to service cart
**Access**: SERVICE_TECH, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `service:cart:update`

**Request:**
```json
{
  "partId": "550e8400-e29b-41d4-a716-446655441100",
  "quantity": 3,
  "notes": "For emergency repair on unit #TOR-2025-0001"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "cartItemId": "550e8400-e29b-41d4-a716-446655441202",
    "partId": "550e8400-e29b-41d4-a716-446655441100",
    "partNumber": "SVC-GASKET-DRAIN-3",
    "name": "Drain Gasket 3-inch Service Kit",
    "quantity": 3,
    "unitPrice": 18.50,
    "totalPrice": 55.50,
    "availability": "IN_STOCK",
    "leadTime": "Same day",
    "notes": "For emergency repair on unit #TOR-2025-0001",
    "addedAt": "2025-01-18T14:30:00Z",
    "cartSummary": {
      "itemCount": 1,
      "totalQuantity": 3,
      "subtotal": 55.50,
      "total": 62.79
    }
  }
}
```

#### PUT /api/v1/service/cart/items/{cartItemId}
**Description**: Update cart item quantity
**Access**: SERVICE_TECH, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `service:cart:update`

**Request:**
```json
{
  "quantity": 5
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "cartItemId": "550e8400-e29b-41d4-a716-446655441202",
    "partNumber": "SVC-GASKET-DRAIN-3",
    "previousQuantity": 3,
    "newQuantity": 5,
    "unitPrice": 18.50,
    "newTotalPrice": 92.50,
    "updatedAt": "2025-01-18T15:00:00Z",
    "cartSummary": {
      "itemCount": 2,
      "totalQuantity": 7,
      "subtotal": 118.00,
      "total": 133.79
    }
  }
}
```

#### DELETE /api/v1/service/cart/items/{cartItemId}
**Description**: Remove item from cart
**Access**: SERVICE_TECH, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `service:cart:update`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "removedItem": {
      "cartItemId": "550e8400-e29b-41d4-a716-446655441202",
      "partNumber": "SVC-GASKET-DRAIN-3",
      "quantity": 5,
      "totalPrice": 92.50
    },
    "cartSummary": {
      "itemCount": 1,
      "totalQuantity": 2,
      "subtotal": 25.50,
      "total": 40.79
    }
  }
}
```

#### POST /api/v1/service/orders
**Description**: Create service parts order from cart
**Access**: SERVICE_TECH, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `service:orders:create`

**Request:**
```json
{
  "shippingAddress": {
    "name": "TORVAN Service Center",
    "street": "456 Service Drive",
    "city": "Repair City",
    "state": "TX",
    "zipCode": "75001",
    "country": "USA"
  },
  "shippingMethod": "EXPRESS",
  "purchaseOrder": "PO-SVC-2025-001",
  "urgency": "STANDARD",
  "specialInstructions": "Deliver to service bay loading dock",
  "jobReference": {
    "type": "SERVICE_CALL",
    "referenceNumber": "SC-2025-0123",
    "customerName": "Medical Center ABC"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655441300",
    "orderNumber": "SVC-2025-0001",
    "status": "PENDING",
    "orderType": "SERVICE_PARTS",
    "items": [
      {
        "partId": "550e8400-e29b-41d4-a716-446655441100",
        "partNumber": "SVC-GASKET-DRAIN-3",
        "name": "Drain Gasket 3-inch Service Kit",
        "quantity": 3,
        "unitPrice": 18.50,
        "totalPrice": 55.50
      },
      {
        "partId": "550e8400-e29b-41d4-a716-446655441150",
        "partNumber": "SVC-FAUCET-AERO",
        "name": "Aerator Assembly Standard",
        "quantity": 2,
        "unitPrice": 12.75,
        "totalPrice": 25.50
      }
    ],
    "pricing": {
      "subtotal": 81.00,
      "shipping": 35.00,
      "tax": 10.44,
      "total": 126.44,
      "discount": 12.50
    },
    "shipping": {
      "method": "EXPRESS",
      "cost": 35.00,
      "estimatedDelivery": "2025-01-19T16:00:00Z",
      "trackingNumber": null,
      "address": {
        "name": "TORVAN Service Center",
        "street": "456 Service Drive",
        "city": "Repair City",
        "state": "TX",
        "zipCode": "75001",
        "country": "USA"
      }
    },
    "purchaseOrder": "PO-SVC-2025-001",
    "urgency": "STANDARD",
    "specialInstructions": "Deliver to service bay loading dock",
    "jobReference": {
      "type": "SERVICE_CALL",
      "referenceNumber": "SC-2025-0123",
      "customerName": "Medical Center ABC"
    },
    "orderedBy": {
      "id": "550e8400-e29b-41d4-a716-446655441201",
      "name": "Tom Service",
      "role": "SERVICE_TECH"
    },
    "createdAt": "2025-01-18T15:30:00Z",
    "estimatedShipDate": "2025-01-19T08:00:00Z"
  }
}
```

### 7.3 Service Order Tracking and History

#### GET /api/v1/service/orders
**Description**: Get service orders with filtering and pagination
**Access**: SERVICE_TECH, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `service:orders:read`

**Query Parameters:**
- `status`: Filter by order status (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
- `orderedBy`: Filter by user who placed order
- `urgency`: Filter by urgency level (STANDARD, URGENT, EMERGENCY)
- `dateFrom`: Filter orders from date (ISO 8601)
- `dateTo`: Filter orders to date (ISO 8601)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "550e8400-e29b-41d4-a716-446655441300",
        "orderNumber": "SVC-2025-0001",
        "status": "SHIPPED",
        "orderType": "SERVICE_PARTS",
        "totalAmount": 126.44,
        "itemCount": 2,
        "urgency": "STANDARD",
        "orderedBy": {
          "id": "550e8400-e29b-41d4-a716-446655441201",
          "name": "Tom Service",
          "role": "SERVICE_TECH"
        },
        "shipping": {
          "method": "EXPRESS",
          "trackingNumber": "1Z999AA1234567890",
          "estimatedDelivery": "2025-01-19T16:00:00Z",
          "actualShipDate": "2025-01-19T08:15:00Z"
        },
        "jobReference": {
          "type": "SERVICE_CALL",
          "referenceNumber": "SC-2025-0123",
          "customerName": "Medical Center ABC"
        },
        "createdAt": "2025-01-18T15:30:00Z",
        "updatedAt": "2025-01-19T08:15:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "itemsPerPage": 20,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    },
    "summary": {
      "totalOrders": 1,
      "pendingOrders": 0,
      "shippedOrders": 1,
      "deliveredOrders": 0,
      "totalValue": 126.44
    }
  }
}
```

#### GET /api/v1/service/orders/{orderId}
**Description**: Get detailed service order information
**Access**: SERVICE_TECH, PRODUCTION_COORDINATOR, ADMIN
**Permissions**: `service:orders:read`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655441300",
    "orderNumber": "SVC-2025-0001",
    "status": "DELIVERED",
    "orderType": "SERVICE_PARTS",
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655441301",
        "partId": "550e8400-e29b-41d4-a716-446655441100",
        "partNumber": "SVC-GASKET-DRAIN-3",
        "name": "Drain Gasket 3-inch Service Kit",
        "quantity": 3,
        "unitPrice": 18.50,
        "totalPrice": 55.50,
        "serialNumbers": ["DG3-001", "DG3-002", "DG3-003"]
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655441302",
        "partId": "550e8400-e29b-41d4-a716-446655441150",
        "partNumber": "SVC-FAUCET-AERO",
        "name": "Aerator Assembly Standard",
        "quantity": 2,
        "unitPrice": 12.75,
        "totalPrice": 25.50,
        "serialNumbers": ["FA-STD-101", "FA-STD-102"]
      }
    ],
    "pricing": {
      "subtotal": 81.00,
      "shipping": 35.00,
      "tax": 10.44,
      "discount": 12.50,
      "total": 126.44
    },
    "shipping": {
      "method": "EXPRESS",
      "cost": 35.00,
      "trackingNumber": "1Z999AA1234567890",
      "estimatedDelivery": "2025-01-19T16:00:00Z",
      "actualDelivery": "2025-01-19T15:45:00Z",
      "carrierName": "UPS",
      "address": {
        "name": "TORVAN Service Center",
        "street": "456 Service Drive",
        "city": "Repair City",
        "state": "TX",
        "zipCode": "75001",
        "country": "USA"
      },
      "deliveryNotes": "Delivered to loading dock, signed by J. Martinez",
      "signatureRequired": true,
      "signedBy": "J. Martinez"
    },
    "purchaseOrder": "PO-SVC-2025-001",
    "urgency": "STANDARD",
    "specialInstructions": "Deliver to service bay loading dock",
    "jobReference": {
      "type": "SERVICE_CALL",
      "referenceNumber": "SC-2025-0123",
      "customerName": "Medical Center ABC",
      "serviceDate": "2025-01-20T09:00:00Z"
    },
    "timeline": [
      {
        "status": "PENDING",
        "timestamp": "2025-01-18T15:30:00Z",
        "description": "Order placed",
        "user": "Tom Service"
      },
      {
        "status": "PROCESSING",
        "timestamp": "2025-01-19T07:00:00Z",
        "description": "Order processing started",
        "user": "System"
      },
      {
        "status": "SHIPPED",
        "timestamp": "2025-01-19T08:15:00Z",
        "description": "Order shipped via UPS Express",
        "user": "Warehouse",
        "details": {
          "trackingNumber": "1Z999AA1234567890",
          "carrier": "UPS"
        }
      },
      {
        "status": "DELIVERED",
        "timestamp": "2025-01-19T15:45:00Z",
        "description": "Package delivered to TORVAN Service Center",
        "user": "UPS",
        "details": {
          "signedBy": "J. Martinez",
          "location": "Loading dock"
        }
      }
    ],
    "orderedBy": {
      "id": "550e8400-e29b-41d4-a716-446655441201",
      "name": "Tom Service",
      "role": "SERVICE_TECH",
      "email": "tom.service@torvan.com",
      "phone": "+1-555-0199"
    },
    "createdAt": "2025-01-18T15:30:00Z",
    "updatedAt": "2025-01-19T15:45:00Z",
    "completedAt": "2025-01-19T15:45:00Z"
  }
}
```

---

## 8. REPORTING & ANALYTICS APIS

### 8.1 Dashboard and Real-time Data

**Base URL**: `/api/v1/analytics`

#### GET /api/v1/analytics/dashboard
**Description**: Get comprehensive dashboard data for role-based views
**Access**: All authenticated users (data filtered by role)
**Permissions**: `analytics:dashboard:read`

**Query Parameters:**
- `timeframe`: Time range (today, week, month, quarter, year)
- `metrics`: Specific metrics to include (orders, production, quality, inventory, financial)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "timeframe": "month",
    "dateRange": {
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-01-31T23:59:59Z"
    },
    "overview": {
      "totalOrders": 45,
      "activeOrders": 23,
      "completedOrders": 22,
      "totalRevenue": 437250.00,
      "averageOrderValue": 9716.67,
      "onTimeDeliveryRate": 95.5,
      "qualityPassRate": 93.3,
      "inventoryTurnover": 4.2
    },
    "orderMetrics": {
      "newOrders": 8,
      "ordersInProduction": 15,
      "ordersAwaitingQC": 5,
      "ordersReadyToShip": 3,
      "ordersByPriority": {
        "STANDARD": 35,
        "RUSH": 8,
        "EMERGENCY": 2
      },
      "averageOrderCycleTime": "12.5 days",
      "orderBacklog": 23,
      "estimatedBacklogValue": 189500.00
    },
    "productionMetrics": {
      "activeProduction": 18,
      "completedTasks": 156,
      "pendingTasks": 47,
      "utilizationRate": 78.5,
      "averageTaskTime": "3.2 hours",
      "issuesReported": 12,
      "issuesResolved": 10,
      "customPartsRequired": 8
    },
    "qualityMetrics": {
      "inspectionsCompleted": 42,
      "passRate": 93.3,
      "defectsFound": 9,
      "reworkRequired": 3,
      "averageInspectionTime": "52 minutes",
      "criticalDefects": 1,
      "qualityTrend": "IMPROVING"
    },
    "inventoryMetrics": {
      "totalParts": 1247,
      "lowStockItems": 23,
      "outOfStockItems": 3,
      "reordersPending": 15,
      "inventoryValue": 2850000.00,
      "turnoverRate": 4.2,
      "deadStock": 156
    },
    "financialMetrics": {
      "monthlyRevenue": 437250.00,
      "grossMargin": 42.5,
      "avgOrderMargin": 38.2,
      "costOfGoodsSold": 251418.75,
      "operatingExpenses": 89450.00,
      "netIncome": 96381.25
    },
    "recentActivity": [
      {
        "type": "ORDER_COMPLETED",
        "timestamp": "2025-01-18T16:30:00Z",
        "description": "Order TOR-2025-0015 completed and ready for shipping",
        "orderNumber": "TOR-2025-0015",
        "value": 8750.00
      },
      {
        "type": "QUALITY_ISSUE",
        "timestamp": "2025-01-18T14:45:00Z",
        "description": "Quality issue reported on order TOR-2025-0012",
        "severity": "HIGH",
        "orderNumber": "TOR-2025-0012"
      },
      {
        "type": "INVENTORY_LOW",
        "timestamp": "2025-01-18T13:20:00Z",
        "description": "Low stock alert for GASKET-DRAIN-3",
        "partNumber": "GASKET-DRAIN-3",
        "quantityRemaining": 2
      }
    ],
    "alerts": [
      {
        "id": "550e8400-e29b-41d4-a716-446655442000",
        "type": "INVENTORY_CRITICAL",
        "severity": "HIGH",
        "message": "3 parts are out of stock, affecting 5 pending orders",
        "actionRequired": true,
        "createdAt": "2025-01-18T09:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655442001",
        "type": "PRODUCTION_DELAY",
        "severity": "MEDIUM",
        "message": "Order TOR-2025-0008 is 2 days behind schedule",
        "actionRequired": false,
        "createdAt": "2025-01-18T10:15:00Z"
      }
    ],
    "trends": {
      "orderVolume": {
        "current": 45,
        "previous": 38,
        "changePercent": 18.4,
        "trend": "UP"
      },
      "revenue": {
        "current": 437250.00,
        "previous": 389650.00,
        "changePercent": 12.2,
        "trend": "UP"
      },
      "qualityRate": {
        "current": 93.3,
        "previous": 91.8,
        "changePercent": 1.6,
        "trend": "UP"
      }
    }
  }
}
```

---

## 9. API VERSIONING & DEPRECATION STRATEGY

### 9.1 Versioning Approach

The TORVAN API uses **URL path versioning** to ensure backward compatibility and smooth migration paths for clients.

**Version Format**: `/api/v{major}/`
- Current version: `/api/v1/`
- Future versions: `/api/v2/`, `/api/v3/`, etc.

**Version Support Policy**:
- **Current Version (v1)**: Full support with new features and bug fixes
- **Previous Version**: 18 months of maintenance support after new version release
- **Deprecated Version**: 6 months notice before end-of-life

### 9.2 Version Information Endpoints

#### GET /api/version
**Description**: Get API version information and status
**Access**: Public (no authentication required)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "currentVersion": "v1",
    "supportedVersions": ["v1"],
    "deprecatedVersions": [],
    "serverVersion": "1.2.4",
    "buildDate": "2025-01-15T10:30:00Z",
    "status": "ACTIVE",
    "maintenance": {
      "scheduled": false,
      "nextWindow": "2025-01-25T02:00:00Z"
    }
  }
}
```

## 10. ERROR HANDLING & STATUS CODES

### 10.1 Standard HTTP Status Codes

The TORVAN API uses standard HTTP status codes with consistent error response format:

**Success Codes:**
- `200 OK`: Request successful
- `201 Created`: Resource created successfully  
- `204 No Content`: Request successful, no response body

**Client Error Codes:**
- `400 Bad Request`: Invalid request format or parameters
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Access denied for requested resource
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (duplicate, etc.)
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded

**Server Error Codes:**
- `500 Internal Server Error`: Unexpected server error
- `502 Bad Gateway`: Upstream service error
- `503 Service Unavailable`: Service temporarily unavailable
- `504 Gateway Timeout`: Upstream service timeout

### 10.2 Standard Error Response Format

All API errors return consistent JSON response format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_FORMAT"
      },
      {
        "field": "quantity", 
        "message": "Must be greater than 0",
        "code": "MIN_VALUE"
      }
    ],
    "timestamp": "2025-01-18T10:30:00Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "documentation": "https://docs.torvan.com/api/errors#VALIDATION_ERROR"
  }
}
```

### 10.3 Error Code Categories

**Authentication Errors (AUTH_*):**
- `AUTH_REQUIRED`: Authentication required
- `AUTH_INVALID_TOKEN`: Invalid or expired token
- `AUTH_INSUFFICIENT_PERMISSIONS`: Insufficient permissions

**Validation Errors (VALIDATION_*):**
- `VALIDATION_ERROR`: General validation failure
- `VALIDATION_REQUIRED_FIELD`: Required field missing
- `VALIDATION_INVALID_FORMAT`: Invalid field format
- `VALIDATION_CONSTRAINT_VIOLATION`: Business rule violation

**Resource Errors (RESOURCE_*):**
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `RESOURCE_CONFLICT`: Resource already exists
- `RESOURCE_LOCKED`: Resource temporarily locked
- `RESOURCE_DELETED`: Resource has been deleted

**Business Logic Errors (BUSINESS_*):**
- `BUSINESS_RULE_VIOLATION`: Business rule constraint
- `BUSINESS_WORKFLOW_ERROR`: Invalid workflow state
- `BUSINESS_INSUFFICIENT_INVENTORY`: Insufficient stock
- `BUSINESS_ORDER_IMMUTABLE`: Order cannot be modified

**System Errors (SYSTEM_*):**
- `SYSTEM_ERROR`: Internal system error
- `SYSTEM_MAINTENANCE`: System under maintenance
- `SYSTEM_OVERLOADED`: System temporarily overloaded

## 11. RATE LIMITING & PERFORMANCE

### 11.1 Rate Limiting Strategy

**Rate Limits by User Role:**

| Role | Requests/Minute | Burst Limit |
|------|----------------|-------------|
| ADMIN | 1000 | 200 |
| PRODUCTION_COORDINATOR | 500 | 100 |
| ASSEMBLER | 300 | 60 |
| QC_PERSON | 300 | 60 |
| PROCUREMENT | 200 | 40 |
| SERVICE_TECH | 200 | 40 |

**Rate Limiting Headers:**
```http
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1642519200
X-RateLimit-Window: 60
```

**Rate Limit Exceeded Response (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Maximum 500 requests per minute allowed.",
    "retryAfter": 30,
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 11.2 Performance Optimization Guidelines

**Response Time Targets:**
- Simple queries: < 200ms (95th percentile)
- Complex searches: < 2s (95th percentile)
- BOM generation: < 5s (95th percentile)
- Reports: < 10s (95th percentile)

**Caching Strategy:**
- Static data (categories, parts): 1 hour cache
- User permissions: 15 minutes cache
- Inventory levels: 5 minutes cache
- Real-time data: No caching

**Pagination Best Practices:**
- Default page size: 20 items
- Maximum page size: 100 items
- Use cursor-based pagination for large datasets
- Include pagination metadata in responses

**Query Optimization:**
- Use field selection: `?fields=id,name,status`
- Implement efficient filtering: `?status=ACTIVE&priority=HIGH`
- Support sorting: `?sortBy=createdAt&sortOrder=desc`
- Provide search optimization: Full-text search with indexing

## 12. AUTHENTICATION & SECURITY

### 12.1 Authentication Methods

**Primary Authentication: JWT Tokens**
- Bearer token authentication in Authorization header
- Token expiration: 1 hour (configurable)
- Refresh token mechanism for token renewal
- Secure token storage requirements

**Authentication Header Format:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 12.2 Role-Based Access Control (RBAC)

**Permission Matrix:**

| Resource | ADMIN | PROD_COORD | ASSEMBLER | QC_PERSON | PROCUREMENT | SERVICE_TECH |
|----------|-------|------------|-----------|-----------|-------------|--------------|
| Orders - Create | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Orders - Read All | ✓ | ✓ | Assigned | Assigned | ✗ | ✗ |
| Orders - Update | ✓ | ✓ | Status Only | Status Only | ✗ | ✗ |
| Orders - Delete | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| BOM - Generate | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| BOM - Approve | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Production - Tasks | ✓ | ✓ | Assigned | ✗ | ✗ | ✗ |
| Quality - Inspect | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Quality - Reports | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Inventory - Read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Inventory - Update | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| Service Parts | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Reports - Financial | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Reports - Production | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| User Management | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

### 12.3 Security Best Practices

**API Security Measures:**
- HTTPS required for all API calls
- Input validation and sanitization
- SQL injection prevention
- XSS protection headers
- CORS configuration
- Request signing for sensitive operations

**Data Protection:**
- Personal data encryption at rest
- Sensitive field masking in logs
- Audit trail for all modifications
- Data retention policies
- GDPR compliance measures

## 13. CONCLUSION & IMPLEMENTATION ROADMAP

### 13.1 API Coverage Summary

This comprehensive API specification covers all 37 user stories and supports:

✅ **Complete Order Lifecycle**: 5-step creation process through 8-phase status management
✅ **Dynamic BOM Generation**: Configuration-based BOM creation with custom parts support
✅ **Hierarchical Inventory**: 6-category system with 219 assemblies and 481 sub-assemblies
✅ **Quality Control Workflows**: Multi-phase inspections with photo documentation
✅ **Production Management**: Task assignment, scheduling, and issue tracking
✅ **Service Parts Management**: Catalog browsing, cart management, and order tracking
✅ **Comprehensive Reporting**: Dashboard analytics, KPIs, and detailed reports
✅ **Role-Based Security**: 6 user types with granular permission matrix

### 13.2 Performance Targets Achieved

- **BOM Generation**: < 5s response time with caching optimization
- **Search Operations**: < 2s with indexed queries and filtering
- **Concurrent Users**: 50+ supported with rate limiting and resource management
- **High Availability**: 99.9% uptime target with proper error handling

### 13.3 Implementation Priority

**Phase 1 (Core Foundation - Months 1-2):**
1. Authentication & user management APIs
2. Basic order management (create, read, update)
3. Inventory browsing and search
4. Core BOM generation

**Phase 2 (Production Workflows - Months 3-4):**
1. Complete order lifecycle management
2. Production task management
3. Quality control workflows
4. Basic reporting and analytics

**Phase 3 (Advanced Features - Months 5-6):**
1. Service parts management
2. Advanced reporting and dashboards
3. Webhook integrations
4. Performance optimization

### 13.4 Integration Considerations

**Frontend Integration:**
- Next.js application with tRPC for type-safe API calls
- Real-time updates via WebSockets for status changes
- Progressive Web App (PWA) capabilities for offline access

**External System Integration:**
- ERP system synchronization via webhooks
- Quality management system data export
- Shipping and logistics provider APIs
- Financial reporting system integration

**Database Considerations:**
- PostgreSQL with proper indexing for performance
- Connection pooling for scalability  
- Regular backup and recovery procedures
- Database migration strategies for schema updates

This API specification provides a complete foundation for the TORVAN Medical Workflow Management System, ensuring scalability, maintainability, and comprehensive feature coverage for all stakeholders in the medical sink manufacturing process.

