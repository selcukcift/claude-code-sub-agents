/**
 * TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
 * DATABASE SEED SCRIPT
 * 
 * This script seeds the database with initial data required for the system:
 * - Categories and subcategories
 * - User roles and permissions
 * - Default admin user
 * - Configuration rules
 * - QC processes
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Clean up existing data (be careful in production!)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning up existing data...')
    
    // Delete in reverse dependency order
    await prisma.auditLog.deleteMany({})
    await prisma.userSession.deleteMany({})
    await prisma.syncLog.deleteMany({})
    await prisma.document.deleteMany({})
    await prisma.qcInspectionItem.deleteMany({})
    await prisma.qcInspection.deleteMany({})
    await prisma.qcProcess.deleteMany({})
    await prisma.productionTask.deleteMany({})
    await prisma.bomLineItem.deleteMany({})
    await prisma.bOM.deleteMany({})
    await prisma.configuration.deleteMany({})
    await prisma.configurationRule.deleteMany({})
    await prisma.orderStatusHistory.deleteMany({})
    await prisma.orderItem.deleteMany({})
    await prisma.order.deleteMany({})
    await prisma.customer.deleteMany({})
    await prisma.productVariant.deleteMany({})
    await prisma.assemblyComponent.deleteMany({})
    await prisma.part.deleteMany({})
    await prisma.assembly.deleteMany({})
    await prisma.subcategory.deleteMany({})
    await prisma.category.deleteMany({})
    await prisma.rolePermission.deleteMany({})
    await prisma.userRole_Assignment.deleteMany({})
    await prisma.permission.deleteMany({})
    await prisma.role.deleteMany({})
    await prisma.user.deleteMany({})
    await prisma.externalSystem.deleteMany({})
  }

  // 1. Create Categories (based on existing data analysis)
  console.log('📁 Creating categories and subcategories...')
  
  const categories = [
    {
      id: '718',
      name: 'Control Box Systems',
      description: 'Control box assemblies and components',
      displayOrder: 1
    },
    {
      id: '719',
      name: 'Basin Systems',
      description: 'Wash basin assemblies and related components',
      displayOrder: 2
    },
    {
      id: '720',
      name: 'Lighting Systems',
      description: 'Overhead and basin lighting components',
      displayOrder: 3
    },
    {
      id: '721',
      name: 'Plumbing Systems',
      description: 'Water supply and drainage components',
      displayOrder: 4
    },
    {
      id: '722',
      name: 'Electrical Systems',
      description: 'Electrical components and assemblies',
      displayOrder: 5
    },
    {
      id: '723',
      name: 'Mechanical Systems',
      description: 'Mechanical hardware and assemblies',
      displayOrder: 6
    }
  ]

  for (const category of categories) {
    await prisma.category.create({
      data: category
    })
  }

  // Create some example subcategories
  const subcategories = [
    { id: '718.001', categoryId: '718', name: '1 Basin Control', description: 'Single basin control systems', displayOrder: 1 },
    { id: '718.002', categoryId: '718', name: '2 Basin Control', description: 'Dual basin control systems', displayOrder: 2 },
    { id: '719.001', categoryId: '719', name: 'Standard Basins', description: 'Standard wash basins', displayOrder: 1 },
    { id: '719.002', categoryId: '719', name: 'Deep Basins', description: 'Deep wash basins', displayOrder: 2 },
    { id: '720.001', categoryId: '720', name: 'Overhead Lighting', description: 'Overhead lighting systems', displayOrder: 1 },
    { id: '720.002', categoryId: '720', name: 'Basin Lighting', description: 'Basin-specific lighting', displayOrder: 2 }
  ]

  for (const subcategory of subcategories) {
    await prisma.subcategory.create({
      data: subcategory
    })
  }

  // 2. Create Permissions
  console.log('🔐 Creating permissions...')
  
  const permissions = [
    // System permissions
    { permissionName: 'System Administration', permissionCode: 'system:admin', resourceType: 'system', action: 'admin', category: 'SYSTEM' },
    { permissionName: 'User Management', permissionCode: 'users:manage', resourceType: 'users', action: 'manage', category: 'SYSTEM' },
    
    // Order permissions
    { permissionName: 'Create Orders', permissionCode: 'orders:create', resourceType: 'orders', action: 'create', category: 'ORDERS' },
    { permissionName: 'Read Orders', permissionCode: 'orders:read', resourceType: 'orders', action: 'read', category: 'ORDERS' },
    { permissionName: 'Update Orders', permissionCode: 'orders:update', resourceType: 'orders', action: 'update', category: 'ORDERS' },
    { permissionName: 'Delete Orders', permissionCode: 'orders:delete', resourceType: 'orders', action: 'delete', category: 'ORDERS' },
    { permissionName: 'Approve Orders', permissionCode: 'orders:approve', resourceType: 'orders', action: 'approve', category: 'ORDERS' },
    
    // Inventory permissions
    { permissionName: 'Manage Inventory', permissionCode: 'inventory:manage', resourceType: 'inventory', action: 'manage', category: 'INVENTORY' },
    { permissionName: 'View Inventory', permissionCode: 'inventory:read', resourceType: 'inventory', action: 'read', category: 'INVENTORY' },
    
    // Production permissions
    { permissionName: 'Manage Production', permissionCode: 'production:manage', resourceType: 'production', action: 'manage', category: 'PRODUCTION' },
    { permissionName: 'View Production', permissionCode: 'production:read', resourceType: 'production', action: 'read', category: 'PRODUCTION' },
    
    // QC permissions
    { permissionName: 'Perform QC', permissionCode: 'qc:perform', resourceType: 'qc', action: 'perform', category: 'QC' },
    { permissionName: 'Approve QC', permissionCode: 'qc:approve', resourceType: 'qc', action: 'approve', category: 'QC' },
    
    // Financial permissions
    { permissionName: 'View Financials', permissionCode: 'financial:read', resourceType: 'financial', action: 'read', category: 'FINANCIAL' },
    { permissionName: 'Manage Financials', permissionCode: 'financial:manage', resourceType: 'financial', action: 'manage', category: 'FINANCIAL' }
  ]

  for (const permission of permissions) {
    await prisma.permission.create({
      data: permission
    })
  }

  // 3. Create Roles
  console.log('👥 Creating user roles...')
  
  const roles = [
    {
      roleName: 'Administrator',
      roleCode: 'ADMIN',
      description: 'Full system access and administration',
      canCreateOrders: true,
      canApproveOrders: true,
      canModifyBOMs: true,
      canAccessFinancials: true,
      canManageUsers: true,
      canConfigureSystem: true
    },
    {
      roleName: 'Production Coordinator',
      roleCode: 'PRODUCTION_COORDINATOR',
      description: 'Manages production workflows and assignments',
      canCreateOrders: true,
      canApproveOrders: false,
      canModifyBOMs: true,
      canAccessFinancials: false,
      canManageUsers: false,
      canConfigureSystem: false
    },
    {
      roleName: 'Procurement Manager',
      roleCode: 'PROCUREMENT_MANAGER',
      description: 'Manages procurement and inventory',
      canCreateOrders: true,
      canApproveOrders: false,
      canModifyBOMs: false,
      canAccessFinancials: true,
      canManageUsers: false,
      canConfigureSystem: false
    },
    {
      roleName: 'QC Inspector',
      roleCode: 'QC_INSPECTOR',
      description: 'Performs quality control inspections',
      canCreateOrders: false,
      canApproveOrders: false,
      canModifyBOMs: false,
      canAccessFinancials: false,
      canManageUsers: false,
      canConfigureSystem: false
    },
    {
      roleName: 'Assembler',
      roleCode: 'ASSEMBLER',
      description: 'Performs assembly tasks',
      canCreateOrders: false,
      canApproveOrders: false,
      canModifyBOMs: false,
      canAccessFinancials: false,
      canManageUsers: false,
      canConfigureSystem: false
    },
    {
      roleName: 'Service Department',
      roleCode: 'SERVICE_DEPT',
      description: 'Handles service and support',
      canCreateOrders: true,
      canApproveOrders: false,
      canModifyBOMs: false,
      canAccessFinancials: false,
      canManageUsers: false,
      canConfigureSystem: false
    }
  ]

  const createdRoles: any[] = []
  for (const role of roles) {
    const createdRole = await prisma.role.create({
      data: role
    })
    createdRoles.push(createdRole)
  }

  // 4. Assign permissions to roles
  console.log('🔗 Assigning permissions to roles...')
  
  const adminRole = createdRoles.find(r => r.roleCode === 'ADMIN')
  const allPermissions = await prisma.permission.findMany()
  
  // Admin gets all permissions
  for (const permission of allPermissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: adminRole.id,
        permissionId: permission.id,
        grantedBy: 1 // Will be created admin user
      }
    })
  }

  // Other roles get specific permissions (simplified for demo)
  const productionRole = createdRoles.find(r => r.roleCode === 'PRODUCTION_COORDINATOR')
  const productionPermissions = allPermissions.filter(p => 
    p.category === 'ORDERS' || p.category === 'PRODUCTION' || p.category === 'INVENTORY'
  )
  
  for (const permission of productionPermissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: productionRole.id,
        permissionId: permission.id,
        grantedBy: 1
      }
    })
  }

  // 5. Create Default Admin User
  console.log('👤 Creating default admin user...')
  
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@torvan.com',
      passwordHash: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      jobTitle: 'System Administrator',
      department: 'IT',
      isActive: true,
      emailVerified: true,
      mustChangePassword: true
    }
  })

  // Assign admin role to admin user
  await prisma.userRole_Assignment.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
      assignedBy: adminUser.id
    }
  })

  // 6. Create Sample Customer
  console.log('🏢 Creating sample customer...')
  
  await prisma.customer.create({
    data: {
      customerCode: 'CUST001',
      companyName: 'Sample Medical Facility',
      industry: 'Healthcare',
      companySize: 'MEDIUM',
      primaryContactName: 'John Smith',
      primaryContactEmail: 'john.smith@example.com',
      primaryContactPhone: '+1-555-0123',
      billingAddress: {
        street: '123 Medical Drive',
        city: 'Healthcare City',
        state: 'HC',
        zipCode: '12345',
        country: 'USA'
      },
      shippingAddress: {
        street: '123 Medical Drive',
        city: 'Healthcare City',
        state: 'HC',
        zipCode: '12345',
        country: 'USA'
      },
      paymentTerms: 30,
      creditLimit: 50000.00
    }
  })

  // 7. Create Configuration Rules
  console.log('⚙️ Creating configuration rules...')
  
  const configRules = [
    {
      ruleName: 'Basin Count Validation',
      ruleType: 'VALIDATION',
      conditions: { basinCount: { min: 1, max: 3 } },
      actions: { validate: 'Basin count must be between 1 and 3' },
      priority: 100,
      description: 'Validates basin count is within acceptable range'
    },
    {
      ruleName: 'Lifter Type Selection',
      ruleType: 'COMPONENT_SELECTION',
      conditions: { hasLifter: true },
      actions: { requireComponent: 'lifter_type' },
      priority: 200,
      description: 'When lifter is selected, lifter type must be specified'
    }
  ]

  for (const rule of configRules) {
    await prisma.configurationRule.create({
      data: {
        ...rule,
        createdBy: adminUser.id
      }
    })
  }

  // 8. Create External Systems
  console.log('🔌 Creating external system configurations...')
  
  await prisma.externalSystem.create({
    data: {
      systemName: 'ERP System',
      systemType: 'ERP',
      endpointUrl: 'https://erp.example.com/api',
      authenticationType: 'API_KEY',
      connectionConfig: {
        apiKey: 'placeholder-key',
        timeout: 30000
      },
      syncFrequencyMinutes: 60
    }
  })

  await prisma.externalSystem.create({
    data: {
      systemName: 'Document Management System',
      systemType: 'DOCUMENT_MANAGEMENT',
      endpointUrl: 'https://docs.example.com/api',
      authenticationType: 'OAUTH',
      connectionConfig: {
        clientId: 'placeholder-client-id',
        clientSecret: 'placeholder-client-secret'
      },
      syncFrequencyMinutes: 120
    }
  })

  console.log('✅ Database seeding completed successfully!')
  console.log(`
📊 Seeded Data Summary:
- Categories: ${categories.length}
- Subcategories: ${subcategories.length}
- Permissions: ${permissions.length}
- Roles: ${roles.length}
- Users: 1 (admin)
- Customers: 1
- Configuration Rules: ${configRules.length}
- External Systems: 2

🔑 Admin Login:
- Username: admin
- Email: admin@torvan.com
- Password: admin123 (must change on first login)
  `)
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })