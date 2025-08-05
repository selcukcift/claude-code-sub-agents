# TORVAN MEDICAL DEPLOYMENT & INFRASTRUCTURE ARCHITECTURE
## COMPREHENSIVE DEPLOYMENT STRATEGY AND CLOUD INFRASTRUCTURE DESIGN

### EXECUTIVE SUMMARY

This document defines the complete deployment and infrastructure architecture for the TORVAN MEDICAL workflow management system, providing a scalable, secure, and cost-effective cloud infrastructure strategy that supports development, staging, and production environments with automated deployment pipelines and comprehensive monitoring.

**Infrastructure Goals:**
- **High Availability**: 99.9% uptime with multi-region deployment capability
- **Scalability**: Auto-scaling from 10 to 500+ concurrent users
- **Security**: Zero-trust architecture with comprehensive monitoring
- **Cost Optimization**: Efficient resource utilization with auto-scaling
- **Developer Experience**: Streamlined CI/CD with automated testing and deployment

---

## 1. CLOUD INFRASTRUCTURE OVERVIEW

### 1.1 Cloud Provider Strategy

**Primary Cloud Provider: AWS (Amazon Web Services)**

**Decision Rationale:**
- **Mature Ecosystem**: Comprehensive service offerings for all requirements
- **Security Compliance**: SOC 2, HIPAA, GDPR compliance capabilities
- **Global Presence**: Multi-region deployment options
- **Cost Efficiency**: Reserved instances and spot pricing for cost optimization
- **Integration**: Excellent third-party integrations and marketplace

**Alternative Providers:**
- **Secondary**: Microsoft Azure (for hybrid scenarios)
- **Tertiary**: Google Cloud Platform (for specific AI/ML services if needed)

### 1.2 Infrastructure Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CLOUD INFRASTRUCTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 7: CDN & Edge Services                                      │
│  ├─ CloudFront CDN                                                  │
│  ├─ Route 53 DNS                                                    │
│  ├─ WAF & DDoS Protection                                          │
│  └─ SSL/TLS Termination                                             │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 6: Load Balancing & API Gateway                             │
│  ├─ Application Load Balancer (ALB)                                │
│  ├─ API Gateway                                                     │
│  ├─ Target Groups                                                   │
│  └─ Health Checks                                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 5: Compute Services                                         │
│  ├─ ECS Fargate (Containerized Apps)                               │
│  ├─ Auto Scaling Groups                                             │
│  ├─ Lambda Functions (Serverless)                                   │
│  └─ EC2 Instances (if needed)                                       │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 4: Data Services                                            │
│  ├─ RDS PostgreSQL (Primary DB)                                    │
│  ├─ ElastiCache Redis (Caching)                                    │
│  ├─ S3 (File Storage)                                              │
│  └─ DocumentDB (if MongoDB needed)                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 3: Networking & Security                                    │
│  ├─ VPC with Public/Private Subnets                                │
│  ├─ Security Groups & NACLs                                        │
│  ├─ NAT Gateways                                                    │
│  └─ VPN Gateway                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 2: Monitoring & Logging                                     │
│  ├─ CloudWatch Monitoring                                          │
│  ├─ CloudTrail Audit Logging                                       │
│  ├─ X-Ray Distributed Tracing                                      │
│  └─ ElasticSearch (Log Analytics)                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 1: Management & Governance                                  │
│  ├─ IAM Roles & Policies                                           │
│  ├─ AWS Config (Compliance)                                        │
│  ├─ Secrets Manager                                                 │
│  └─ CloudFormation/CDK (IaC)                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Environment Strategy

**Multi-Environment Architecture:**

```typescript
// infrastructure/environments/config.ts
interface EnvironmentConfig {
  name: string;
  domain: string;
  compute: {
    minInstances: number;
    maxInstances: number;
    instanceSize: string;
  };
  database: {
    instanceClass: string;
    multiAZ: boolean;
    backupRetention: number;
  };
  cache: {
    nodeType: string;
    numNodes: number;
  };
  monitoring: {
    logRetention: number;
    alerting: boolean;
  };
}

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  development: {
    name: 'development',
    domain: 'dev.torvan-medical.com',
    compute: {
      minInstances: 1,
      maxInstances: 2,
      instanceSize: 't3.small'
    },
    database: {
      instanceClass: 'db.t3.micro',
      multiAZ: false,
      backupRetention: 3
    },
    cache: {
      nodeType: 'cache.t3.micro',
      numNodes: 1
    },
    monitoring: {
      logRetention: 7,
      alerting: false
    }
  },

  staging: {
    name: 'staging',
    domain: 'staging.torvan-medical.com',
    compute: {
      minInstances: 2,
      maxInstances: 4,
      instanceSize: 't3.medium'
    },
    database: {
      instanceClass: 'db.t3.small',
      multiAZ: true,
      backupRetention: 7
    },
    cache: {
      nodeType: 'cache.t3.small',
      numNodes: 2
    },
    monitoring: {
      logRetention: 14,
      alerting: true
    }
  },

  production: {
    name: 'production',
    domain: 'app.torvan-medical.com',
    compute: {
      minInstances: 3,
      maxInstances: 20,
      instanceSize: 't3.large'
    },
    database: {
      instanceClass: 'db.r5.large',
      multiAZ: true,
      backupRetention: 30
    },
    cache: {
      nodeType: 'cache.r5.large',
      numNodes: 3
    },
    monitoring: {
      logRetention: 90,
      alerting: true
    }
  }
};
```

---

## 2. CONTAINERIZATION STRATEGY

### 2.1 Docker Configuration

**Optimized Dockerfile for Production:**

```dockerfile
# Dockerfile
# Multi-stage build for optimal image size
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set correct permissions
USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

**Docker Compose for Development:**

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/torvan_dev
      - REDIS_URL=redis://redis:6379
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=dev-secret-key
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - db
      - redis
    networks:
      - torvan-network

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=torvan_dev
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    networks:
      - torvan-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - torvan-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - torvan-network

volumes:
  postgres_data:
  redis_data:

networks:
  torvan-network:
    driver: bridge
```

### 2.2 Container Orchestration with ECS

**ECS Task Definition:**

```json
{
  "family": "torvan-medical-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "torvan-app",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/torvan-medical:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:torvan/database-url"
        },
        {
          "name": "NEXTAUTH_SECRET",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:torvan/nextauth-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/torvan-medical",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

**ECS Service Configuration:**

```typescript
// infrastructure/ecs-service.ts
import * as aws from '@pulumi/aws';

export class ECSService {
  constructor(
    name: string,
    cluster: aws.ecs.Cluster,
    taskDefinition: aws.ecs.TaskDefinition,
    targetGroup: aws.lb.TargetGroup,
    subnets: string[],
    securityGroups: string[]
  ) {
    // ECS Service
    const service = new aws.ecs.Service(`${name}-service`, {
      cluster: cluster.arn,
      taskDefinition: taskDefinition.arn,
      launchType: 'FARGATE',
      platformVersion: '1.4.0',
      
      // Desired capacity
      desiredCount: 3,
      
      // Network configuration
      networkConfiguration: {
        subnets: subnets,
        securityGroups: securityGroups,
        assignPublicIp: false
      },
      
      // Load balancer configuration
      loadBalancers: [{
        targetGroupArn: targetGroup.arn,
        containerName: 'torvan-app',
        containerPort: 3000
      }],
      
      // Deployment configuration
      deploymentConfiguration: {
        maximumPercent: 200,
        minimumHealthyPercent: 50,
        deploymentCircuitBreaker: {
          enable: true,
          rollback: true
        }
      },
      
      // Service discovery
      serviceRegistries: [{
        registryArn: this.createServiceRegistry(name),
        containerName: 'torvan-app'
      }],
      
      // Auto scaling
      enableExecuteCommand: true,
      
      tags: {
        Environment: process.env.ENVIRONMENT || 'production',
        Application: 'torvan-medical'
      }
    });

    // Auto Scaling
    this.setupAutoScaling(service);
  }

  private setupAutoScaling(service: aws.ecs.Service): void {
    // Auto Scaling Target
    const scalingTarget = new aws.appautoscaling.Target('ecs-target', {
      maxCapacity: 20,
      minCapacity: 3,
      resourceId: pulumi.interpolate`service/${cluster.name}/${service.name}`,
      scalableDimension: 'ecs:service:DesiredCount',
      serviceNamespace: 'ecs'
    });

    // CPU-based scaling policy
    new aws.appautoscaling.Policy('ecs-cpu-policy', {
      name: 'cpu-scaling',
      policyType: 'TargetTrackingScaling',
      resourceId: scalingTarget.resourceId,
      scalableDimension: scalingTarget.scalableDimension,
      serviceNamespace: scalingTarget.serviceNamespace,
      targetTrackingScalingPolicyConfiguration: {
        predefinedMetricSpecification: {
          predefinedMetricType: 'ECSServiceAverageCPUUtilization'
        },
        targetValue: 70.0,
        scaleOutCooldown: 300,
        scaleInCooldown: 300
      }
    });

    // Memory-based scaling policy
    new aws.appautoscaling.Policy('ecs-memory-policy', {
      name: 'memory-scaling',
      policyType: 'TargetTrackingScaling',
      resourceId: scalingTarget.resourceId,
      scalableDimension: scalingTarget.scalableDimension,
      serviceNamespace: scalingTarget.serviceNamespace,
      targetTrackingScalingPolicyConfiguration: {
        predefinedMetricSpecification: {
          predefinedMetricType: 'ECSServiceAverageMemoryUtilization'
        },
        targetValue: 80.0,
        scaleOutCooldown: 300,
        scaleInCooldown: 300
      }
    });
  }

  private createServiceRegistry(name: string): aws.servicediscovery.Service {
    return new aws.servicediscovery.Service(`${name}-registry`, {
      dnsConfig: {
        dnsRecords: [{
          type: 'A',
          ttl: 60
        }],
        namespaceId: 'ns-123456' // Replace with actual namespace ID
      },
      healthCheckCustomConfig: {
        failureThreshold: 1
      }
    });
  }
}
```

---

## 3. INFRASTRUCTURE AS CODE (IAC)

### 3.1 AWS CDK Implementation

**Main Infrastructure Stack:**

```typescript
// infrastructure/torvan-infrastructure-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as route53 from 'aws-cdk-lib/aws-route53';

export class TorvanInfrastructureStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Environment configuration
    const environment = process.env.ENVIRONMENT || 'production';
    const config = ENVIRONMENTS[environment];

    // VPC
    const vpc = this.createVPC();

    // Security Groups
    const securityGroups = this.createSecurityGroups(vpc);

    // Database
    const database = this.createDatabase(vpc, securityGroups.database, config);

    // Cache
    const cache = this.createCache(vpc, securityGroups.cache, config);

    // File Storage
    const storage = this.createStorage();

    // ECS Cluster
    const cluster = this.createECSCluster(vpc);

    // Load Balancer
    const loadBalancer = this.createLoadBalancer(vpc, securityGroups.loadBalancer);

    // ECS Service
    const service = this.createECSService(
      cluster, 
      database, 
      cache, 
      storage, 
      loadBalancer,
      config
    );

    // CDN
    const distribution = this.createCloudFrontDistribution(loadBalancer, storage);

    // DNS
    this.createDNS(distribution, config.domain);

    // Monitoring
    this.createMonitoring(service, database, cache);

    // Outputs
    this.createOutputs(loadBalancer, distribution, database);
  }

  private createVPC(): ec2.Vpc {
    return new ec2.Vpc(this, 'TorvanVPC', {
      maxAzs: 3,
      cidr: '10.0.0.0/16',
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          cidrMask: 24
        },
        {
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24
        }
      ],
      natGateways: 3, // One per AZ for high availability
      enableDnsHostnames: true,
      enableDnsSupport: true
    });
  }

  private createSecurityGroups(vpc: ec2.Vpc): {
    loadBalancer: ec2.SecurityGroup;
    application: ec2.SecurityGroup;
    database: ec2.SecurityGroup;
    cache: ec2.SecurityGroup;
  } {
    // Load Balancer Security Group
    const loadBalancerSG = new ec2.SecurityGroup(this, 'LoadBalancerSG', {
      vpc,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true
    });
    
    loadBalancerSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic'
    );
    
    loadBalancerSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic'
    );

    // Application Security Group
    const applicationSG = new ec2.SecurityGroup(this, 'ApplicationSG', {
      vpc,
      description: 'Security group for ECS application',
      allowAllOutbound: true
    });
    
    applicationSG.addIngressRule(
      loadBalancerSG,
      ec2.Port.tcp(3000),
      'Allow traffic from Load Balancer'
    );

    // Database Security Group
    const databaseSG = new ec2.SecurityGroup(this, 'DatabaseSG', {
      vpc,
      description: 'Security group for RDS database',
      allowAllOutbound: false
    });
    
    databaseSG.addIngressRule(
      applicationSG,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL traffic from application'
    );

    // Cache Security Group
    const cacheSG = new ec2.SecurityGroup(this, 'CacheSG', {
      vpc,
      description: 'Security group for ElastiCache',
      allowAllOutbound: false
    });
    
    cacheSG.addIngressRule(
      applicationSG,
      ec2.Port.tcp(6379),
      'Allow Redis traffic from application'
    );

    return {
      loadBalancer: loadBalancerSG,
      application: applicationSG,
      database: databaseSG,
      cache: cacheSG
    };
  }

  private createDatabase(
    vpc: ec2.Vpc, 
    securityGroup: ec2.SecurityGroup, 
    config: EnvironmentConfig
  ): rds.DatabaseInstance {
    // Subnet Group
    const subnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc,
      description: 'Subnet group for RDS database',
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      }
    });

    // Parameter Group
    const parameterGroup = new rds.ParameterGroup(this, 'DatabaseParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_3
      }),
      parameters: {
        'shared_preload_libraries': 'pg_stat_statements',
        'log_statement': 'all',
        'log_duration': 'on',
        'log_min_duration_statement': '1000', // Log queries > 1 second
        'max_connections': '200',
        'effective_cache_size': '1GB',
        'maintenance_work_mem': '64MB',
        'checkpoint_completion_target': '0.9',
        'wal_buffers': '16MB',
        'default_statistics_target': '100'
      }
    });

    // Database Instance
    return new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_3
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.LARGE
      ),
      vpc,
      subnetGroup,
      securityGroups: [securityGroup],
      parameterGroup,
      
      // Storage
      allocatedStorage: 100,
      maxAllocatedStorage: 1000,
      storageType: rds.StorageType.GP2,
      storageEncrypted: true,
      
      // High Availability
      multiAz: config.database.multiAZ,
      
      // Backup
      backupRetention: cdk.Duration.days(config.database.backupRetention),
      deleteAutomatedBackups: false,
      deletionProtection: environment === 'production',
      
      // Monitoring
      monitoringInterval: cdk.Duration.seconds(60),
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
      
      // Maintenance
      autoMinorVersionUpgrade: true,
      allowMajorVersionUpgrade: false,
      
      // Credentials
      credentials: rds.Credentials.fromGeneratedSecret('torvan_admin', {
        secretName: 'torvan/database-credentials'
      }),
      
      databaseName: 'torvan_medical'
    });
  }

  private createCache(
    vpc: ec2.Vpc, 
    securityGroup: ec2.SecurityGroup, 
    config: EnvironmentConfig
  ): elasticache.CfnReplicationGroup {
    // Subnet Group
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
      description: 'Subnet group for ElastiCache',
      subnetIds: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
      }).subnetIds
    });

    // Parameter Group
    const parameterGroup = new elasticache.CfnParameterGroup(this, 'CacheParameterGroup', {
      cacheParameterGroupFamily: 'redis7.x',
      description: 'Parameter group for Redis 7.x',
      properties: {
        'maxmemory-policy': 'allkeys-lru',
        'timeout': '300',
        'tcp-keepalive': '300'
      }
    });

    // Replication Group
    return new elasticache.CfnReplicationGroup(this, 'CacheCluster', {
      description: 'Redis cluster for Torvan Medical',
      replicationGroupId: 'torvan-redis',
      
      // Configuration
      cacheNodeType: config.cache.nodeType,
      numCacheClusters: config.cache.numNodes,
      port: 6379,
      
      // Security
      securityGroupIds: [securityGroup.securityGroupId],
      subnetGroupName: subnetGroup.ref,
      cacheParameterGroupName: parameterGroup.ref,
      
      // High Availability
      multiAzEnabled: environment === 'production',
      automaticFailoverEnabled: environment === 'production',
      
      // Backup
      snapshotRetentionLimit: environment === 'production' ? 7 : 1,
      snapshotWindow: '03:00-05:00',
      
      // Maintenance
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
      
      // Encryption
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      authToken: 'replace-with-secure-token',
      
      // Engine
      engine: 'redis',
      engineVersion: '7.0'
    });
  }

  private createStorage(): s3.Bucket {
    return new s3.Bucket(this, 'Storage', {
      bucketName: `torvan-medical-storage-${environment}`,
      
      // Security
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      
      // Versioning
      versioned: true,
      
      // Lifecycle
      lifecycleRules: [
        {
          id: 'transition-to-ia',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30)
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90)
            }
          ]
        }
      ],
      
      // CORS
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
          allowedOrigins: [`https://${config.domain}`],
          allowedHeaders: ['*'],
          maxAge: 3000
        }
      ]
    });
  }

  private createECSCluster(vpc: ec2.Vpc): ecs.Cluster {
    return new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: 'torvan-medical-cluster',
      containerInsights: true,
      enableFargateCapacityProviders: true
    });
  }

  private createLoadBalancer(
    vpc: ec2.Vpc, 
    securityGroup: ec2.SecurityGroup
  ): elbv2.ApplicationLoadBalancer {
    return new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: true,
      securityGroup,
      loadBalancerName: 'torvan-medical-alb',
      deletionProtection: environment === 'production'
    });
  }

  private createECSService(
    cluster: ecs.Cluster,
    database: rds.DatabaseInstance,
    cache: elasticache.CfnReplicationGroup,
    storage: s3.Bucket,
    loadBalancer: elbv2.ApplicationLoadBalancer,
    config: EnvironmentConfig
  ): ecs.FargateService {
    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: 2048,
      cpu: 1024,
      family: 'torvan-medical-app'
    });

    // Container
    const container = taskDefinition.addContainer('app', {
      image: ecs.ContainerImage.fromRegistry('ACCOUNT.dkr.ecr.REGION.amazonaws.com/torvan-medical:latest'),
      memoryLimitMiB: 2048,
      cpu: 1024,
      environment: {
        NODE_ENV: environment,
        PORT: '3000'
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, 'DatabaseSecret', 'torvan/database-url')
        ),
        REDIS_URL: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, 'RedisSecret', 'torvan/redis-url')
        )
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'torvan-medical',
        logRetention: logs.RetentionDays.ONE_MONTH
      }),
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/api/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60)
      }
    });

    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP
    });

    // Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc: cluster.vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        enabled: true,
        path: '/api/health',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3
      }
    });

    // Listener
    loadBalancer.addListener('Listener', {
      port: 80,
      defaultTargetGroups: [targetGroup]
    });

    // ECS Service
    return new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
      desiredCount: config.compute.minInstances,
      assignPublicIp: false,
      securityGroups: [securityGroups.application],
      enableExecuteCommand: true,
      serviceName: 'torvan-medical-service'
    });
  }
}
```

---

## 4. CI/CD PIPELINE ARCHITECTURE

### 4.1 GitHub Actions Workflow

**Complete CI/CD Pipeline:**

```yaml
# .github/workflows/deploy.yml
name: Deploy Torvan Medical

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: torvan-medical
  ECS_SERVICE: torvan-medical-service
  ECS_CLUSTER: torvan-medical-cluster

jobs:
  test:
    name: Test Application
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: torvan_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup environment
        run: |
          cp .env.example .env.test
          echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/torvan_test" >> .env.test
          echo "REDIS_URL=redis://localhost:6379" >> .env.test

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/torvan_test

      - name: Run type checking
        run: npm run type-check

      - name: Run linting
        run: npm run lint

      - name: Run unit tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/torvan_test
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/torvan_test
          REDIS_URL: redis://localhost:6379

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/torvan_test
          REDIS_URL: redis://localhost:6379

      - name: Upload test coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  security:
    name: Security Scanning
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Run CodeQL analysis
        uses: github/codeql-action/init@v2
        with:
          languages: javascript

      - name: Perform CodeQL analysis
        uses: github/codeql-action/analyze@v2

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

  build:
    name: Build and Push Image
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'

    outputs:
      image: ${{ steps.image.outputs.image }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Output image
        id: image
        run: echo "image=${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}" >> $GITHUB_OUTPUT

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }}-staging \
            --service ${{ env.ECS_SERVICE }}-staging \
            --force-new-deployment \
            --desired-count 2

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }}-staging \
            --services ${{ env.ECS_SERVICE }}-staging

      - name: Run smoke tests
        run: |
          curl -f https://staging.torvan-medical.com/api/health || exit 1

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Update task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: .aws/task-definition.json
          container-name: torvan-app
          image: ${{ needs.build.outputs.image }}

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true

      - name: Run post-deployment tests
        run: |
          # Health check
          curl -f https://app.torvan-medical.com/api/health || exit 1
          
          # Database migration check
          curl -f https://app.torvan-medical.com/api/health/database || exit 1
          
          # Critical functionality test
          npm run test:smoke

      - name: Notify deployment success
        uses: 8398a7/action-slack@v3
        with:
          status: success
          channel: '#deployments'
          message: 'Production deployment successful! :rocket:'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  rollback:
    name: Rollback on Failure
    runs-on: ubuntu-latest
    needs: [deploy-production]
    if: failure()

    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Rollback deployment
        run: |
          # Get previous stable task definition
          PREV_TASK_DEF=$(aws ecs describe-services \
            --cluster ${{ env.ECS_CLUSTER }} \
            --services ${{ env.ECS_SERVICE }} \
            --query 'services[0].taskDefinition' --output text)
          
          # Rollback to previous version
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --task-definition $PREV_TASK_DEF \
            --force-new-deployment

      - name: Notify rollback
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          channel: '#deployments'
          message: 'Production deployment failed and was rolled back! :warning:'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 4.2 Deployment Scripts

**Database Migration Script:**

```bash
#!/bin/bash
# scripts/deploy-database.sh

set -e

ENVIRONMENT=${1:-production}
DRY_RUN=${2:-false}

echo "Starting database deployment for environment: $ENVIRONMENT"

# Configuration
case $ENVIRONMENT in
  "production")
    DB_HOST=$PROD_DB_HOST
    DB_NAME=$PROD_DB_NAME
    ;;
  "staging")
    DB_HOST=$STAGING_DB_HOST
    DB_NAME=$STAGING_DB_NAME
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    exit 1
    ;;
esac

# Backup current database
echo "Creating database backup..."
BACKUP_FILE="backup_${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > "backups/$BACKUP_FILE"
echo "Backup created: $BACKUP_FILE"

# Run migrations
if [ "$DRY_RUN" = "true" ]; then
  echo "DRY RUN: Would run migrations..."
  npx prisma migrate diff --preview-feature
else
  echo "Running database migrations..."
  npx prisma migrate deploy
  
  # Verify migrations
  echo "Verifying database schema..."
  npx prisma db push --accept-data-loss=false
fi

# Update search indices
echo "Updating search indices..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/update-indices.sql

# Warm up cache
echo "Warming up application cache..."
curl -X POST "https://${ENVIRONMENT}.torvan-medical.com/api/cache/warm" \
  -H "Authorization: Bearer $CACHE_WARM_TOKEN"

echo "Database deployment completed successfully!"
```

**Health Check Script:**

```bash
#!/bin/bash
# scripts/health-check.sh

set -e

ENVIRONMENT=${1:-production}
MAX_RETRIES=30
RETRY_INTERVAL=10

case $ENVIRONMENT in
  "production")
    BASE_URL="https://app.torvan-medical.com"
    ;;
  "staging")
    BASE_URL="https://staging.torvan-medical.com"
    ;;
  "development")
    BASE_URL="https://dev.torvan-medical.com"
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    exit 1
    ;;
esac

echo "Running health checks for $ENVIRONMENT environment..."

# Function to check endpoint
check_endpoint() {
  local endpoint=$1
  local expected_status=$2
  local description=$3
  
  echo "Checking $description..."
  
  for i in $(seq 1 $MAX_RETRIES); do
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" | grep -q "$expected_status"; then
      echo "✓ $description - OK"
      return 0
    fi
    
    if [ $i -eq $MAX_RETRIES ]; then
      echo "✗ $description - FAILED after $MAX_RETRIES attempts"
      return 1
    fi
    
    echo "  Attempt $i/$MAX_RETRIES failed, retrying in ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
  done
}

# Run health checks
check_endpoint "/api/health" "200" "Application Health"
check_endpoint "/api/health/database" "200" "Database Connectivity"
check_endpoint "/api/health/cache" "200" "Cache Connectivity"
check_endpoint "/api/health/storage" "200" "Storage Connectivity"

# Check critical API endpoints
check_endpoint "/api/trpc/user.getProfile" "200" "User API"
check_endpoint "/api/trpc/order.getAll" "200" "Order API"
check_endpoint "/api/trpc/inventory.getCategories" "200" "Inventory API"

# Performance checks
echo "Running performance checks..."

RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/api/health")
if (( $(echo "$RESPONSE_TIME > 3.0" | bc -l) )); then
  echo "✗ Response time too slow: ${RESPONSE_TIME}s (threshold: 3.0s)"
  exit 1
else
  echo "✓ Response time acceptable: ${RESPONSE_TIME}s"
fi

echo "All health checks passed!"
```

---

## 5. MONITORING AND OBSERVABILITY

### 5.1 CloudWatch Configuration

**Comprehensive Monitoring Setup:**

```typescript
// infrastructure/monitoring.ts
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

export class MonitoringStack {
  constructor(
    scope: Construct,
    ecs: ecs.FargateService,
    database: rds.DatabaseInstance,
    cache: elasticache.CfnReplicationGroup,
    loadBalancer: elbv2.ApplicationLoadBalancer
  ) {
    // SNS Topics for alerts
    const criticalAlerts = new sns.Topic(scope, 'CriticalAlerts', {
      displayName: 'Torvan Medical Critical Alerts'
    });
    
    const warningAlerts = new sns.Topic(scope, 'WarningAlerts', {
      displayName: 'Torvan Medical Warning Alerts'
    });

    // Email subscriptions
    criticalAlerts.addSubscription(
      new snsSubscriptions.EmailSubscription('alerts@torvan-medical.com')
    );
    
    // Slack integration
    criticalAlerts.addSubscription(
      new snsSubscriptions.UrlSubscription('https://hooks.slack.com/services/...')
    );

    // Application Metrics
    this.createApplicationMetrics(scope, ecs, criticalAlerts, warningAlerts);
    
    // Database Metrics
    this.createDatabaseMetrics(scope, database, criticalAlerts, warningAlerts);
    
    // Cache Metrics
    this.createCacheMetrics(scope, cache, criticalAlerts, warningAlerts);
    
    // Load Balancer Metrics
    this.createLoadBalancerMetrics(scope, loadBalancer, criticalAlerts, warningAlerts);
    
    // Custom Dashboard
    this.createDashboard(scope, ecs, database, cache, loadBalancer);
  }

  private createApplicationMetrics(
    scope: Construct,
    service: ecs.FargateService,
    criticalAlerts: sns.Topic,
    warningAlerts: sns.Topic
  ): void {
    // CPU Utilization
    const cpuMetric = service.metricCpuUtilization({
      period: cdk.Duration.minutes(5)
    });

    new cloudwatch.Alarm(scope, 'HighCPUAlarm', {
      metric: cpuMetric,
      threshold: 80,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'ECS service CPU utilization is high',
      actionsEnabled: true
    }).addAlarmAction(new cloudwatchActions.SnsAction(warningAlerts));

    new cloudwatch.Alarm(scope, 'CriticalCPUAlarm', {
      metric: cpuMetric,
      threshold: 90,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      alarmDescription: 'ECS service CPU utilization is critical',
      actionsEnabled: true
    }).addAlarmAction(new cloudwatchActions.SnsAction(criticalAlerts));

    // Memory Utilization
    const memoryMetric = service.metricMemoryUtilization({
      period: cdk.Duration.minutes(5)
    });

    new cloudwatch.Alarm(scope, 'HighMemoryAlarm', {
      metric: memoryMetric,
      threshold: 85,
      evaluationPeriods: 2,
      alarmDescription: 'ECS service memory utilization is high'
    }).addAlarmAction(new cloudwatchActions.SnsAction(warningAlerts));

    // Task Count
    const taskCountMetric = new cloudwatch.Metric({
      namespace: 'AWS/ECS',
      metricName: 'RunningTaskCount',
      dimensionsMap: {
        ServiceName: service.serviceName,
        ClusterName: service.cluster.clusterName
      },
      period: cdk.Duration.minutes(1)
    });

    new cloudwatch.Alarm(scope, 'LowTaskCountAlarm', {
      metric: taskCountMetric,
      threshold: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 1,
      alarmDescription: 'ECS service has insufficient running tasks'
    }).addAlarmAction(new cloudwatchActions.SnsAction(criticalAlerts));
  }

  private createDatabaseMetrics(
    scope: Construct,
    database: rds.DatabaseInstance,
    criticalAlerts: sns.Topic,
    warningAlerts: sns.Topic
  ): void {
    // CPU Utilization
    const dbCpuMetric = database.metricCPUUtilization({
      period: cdk.Duration.minutes(5)
    });

    new cloudwatch.Alarm(scope, 'DatabaseHighCPU', {
      metric: dbCpuMetric,
      threshold: 75,
      evaluationPeriods: 2,
      alarmDescription: 'Database CPU utilization is high'
    }).addAlarmAction(new cloudwatchActions.SnsAction(warningAlerts));

    // Database Connections
    const dbConnectionsMetric = database.metricDatabaseConnections({
      period: cdk.Duration.minutes(5)
    });

    new cloudwatch.Alarm(scope, 'DatabaseHighConnections', {
      metric: dbConnectionsMetric,
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Database connection count is high'
    }).addAlarmAction(new cloudwatchActions.SnsAction(warningAlerts));

    // Free Storage Space
    const freeStorageMetric = database.metricFreeStorageSpace({
      period: cdk.Duration.minutes(5)
    });

    new cloudwatch.Alarm(scope, 'DatabaseLowStorage', {
      metric: freeStorageMetric,
      threshold: 5 * 1024 * 1024 * 1024, // 5GB
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 1,
      alarmDescription: 'Database free storage is low'
    }).addAlarmAction(new cloudwatchActions.SnsAction(criticalAlerts));

    // Read/Write Latency
    const readLatencyMetric = database.metricReadLatency({
      period: cdk.Duration.minutes(5)
    });

    new cloudwatch.Alarm(scope, 'DatabaseHighReadLatency', {
      metric: readLatencyMetric,
      threshold: 0.2, // 200ms
      evaluationPeriods: 3,
      alarmDescription: 'Database read latency is high'
    }).addAlarmAction(new cloudwatchActions.SnsAction(warningAlerts));
  }

  private createDashboard(
    scope: Construct,
    service: ecs.FargateService,
    database: rds.DatabaseInstance,
    cache: elasticache.CfnReplicationGroup,
    loadBalancer: elbv2.ApplicationLoadBalancer
  ): void {
    const dashboard = new cloudwatch.Dashboard(scope, 'TorvanDashboard', {
      dashboardName: 'Torvan-Medical-System',
      defaultInterval: cdk.Duration.hours(1)
    });

    // Application Metrics Row
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ECS Service Metrics',
        left: [
          service.metricCpuUtilization(),
          service.metricMemoryUtilization()
        ],
        width: 12,
        height: 6
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Running Tasks',
        metrics: [
          new cloudwatch.Metric({
            namespace: 'AWS/ECS',
            metricName: 'RunningTaskCount',
            dimensionsMap: {
              ServiceName: service.serviceName,
              ClusterName: service.cluster.clusterName
            }
          })
        ],
        width: 6,
        height: 6
      })
    );

    // Database Metrics Row
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Database Performance',
        left: [
          database.metricCPUUtilization(),
          database.metricDatabaseConnections()
        ],
        right: [
          database.metricReadLatency(),
          database.metricWriteLatency()
        ],
        width: 18,
        height: 6
      })
    );

    // Load Balancer Metrics Row
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Load Balancer Metrics',
        left: [
          loadBalancer.metricRequestCount(),
          loadBalancer.metricActiveConnectionCount()
        ],
        right: [
          loadBalancer.metricTargetResponseTime(),
          loadBalancer.metricHttpCodeTarget('2XX', {
            color: cloudwatch.Color.GREEN
          }),
          loadBalancer.metricHttpCodeTarget('4XX', {
            color: cloudwatch.Color.ORANGE
          }),
          loadBalancer.metricHttpCodeTarget('5XX', {
            color: cloudwatch.Color.RED
          })
        ],
        width: 24,
        height: 6
      })
    );

    // Custom Application Metrics Row
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Application Performance',
        left: [
          new cloudwatch.Metric({
            namespace: 'Torvan/Application',
            metricName: 'ResponseTime',
            dimensionsMap: { Environment: 'production' }
          }),
          new cloudwatch.Metric({
            namespace: 'Torvan/Application',
            metricName: 'ErrorRate',
            dimensionsMap: { Environment: 'production' }
          })
        ],
        width: 12,
        height: 6
      }),
      new cloudwatch.GraphWidget({
        title: 'Business Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'Torvan/Business',
            metricName: 'OrdersCreated',
            dimensionsMap: { Environment: 'production' }
          }),
          new cloudwatch.Metric({
            namespace: 'Torvan/Business',
            metricName: 'BOMsGenerated',
            dimensionsMap: { Environment: 'production' }
          })
        ],
        width: 12,
        height: 6
      })
    );
  }
}
```

This comprehensive deployment and infrastructure architecture provides a robust, scalable, and maintainable foundation for the TORVAN MEDICAL workflow management system. The architecture emphasizes:

**Key Infrastructure Features:**
- Multi-environment deployment strategy with proper isolation
- Containerized applications with ECS Fargate for serverless compute
- Infrastructure as Code using AWS CDK for version control and repeatability
- Comprehensive CI/CD pipeline with automated testing and deployment
- Multi-layer security with VPC, security groups, and encryption
- Auto-scaling capabilities for handling variable load
- Comprehensive monitoring and alerting for proactive issue detection
- Cost optimization through reserved instances and auto-scaling

The architecture is designed to support the business requirements while providing operational excellence, security, reliability, performance efficiency, and cost optimization according to AWS Well-Architected Framework principles.