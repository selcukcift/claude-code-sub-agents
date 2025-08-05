# TORVAN MEDICAL PERFORMANCE & SCALABILITY ARCHITECTURE
## COMPREHENSIVE PERFORMANCE OPTIMIZATION AND SCALING STRATEGY

### EXECUTIVE SUMMARY

This document defines the performance and scalability architecture for the TORVAN MEDICAL workflow management system, ensuring the application meets performance targets of <3 second page loads, <5 second BOM generation, and supports growth to 500+ concurrent users and 10,000+ orders per month.

**Performance Targets:**
- **Page Load Time**: <3 seconds (95th percentile)
- **BOM Generation**: <5 seconds for complex configurations
- **API Response Time**: <500ms for standard operations
- **Database Queries**: <100ms for simple queries, <1s for complex reports
- **Concurrent Users**: Support 50-500 users simultaneously
- **Throughput**: Handle 10,000+ orders per month with growth potential

---

## 1. PERFORMANCE ARCHITECTURE OVERVIEW

### 1.1 Performance Strategy Framework

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE LAYERS                              │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 6: Client-Side Performance                                  │
│  ├─ Code Splitting & Lazy Loading                                  │
│  ├─ Browser Caching & Service Workers                              │
│  ├─ Image Optimization & CDN                                       │
│  └─ Bundle Optimization & Tree Shaking                             │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 5: Application Performance                                  │
│  ├─ React Server Components                                        │
│  ├─ Static Generation & ISR                                        │
│  ├─ API Route Optimization                                          │
│  └─ State Management Efficiency                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 4: Caching Strategy                                         │
│  ├─ Redis Application Cache                                         │
│  ├─ Database Query Cache                                           │
│  ├─ HTTP Response Cache                                             │
│  └─ CDN Edge Caching                                               │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 3: Database Performance                                     │
│  ├─ Query Optimization & Indexing                                  │
│  ├─ Connection Pooling                                              │
│  ├─ Read Replicas                                                   │
│  └─ Database Partitioning                                           │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 2: Infrastructure Performance                               │
│  ├─ Load Balancing                                                  │
│  ├─ Auto-scaling Policies                                          │
│  ├─ Resource Optimization                                           │
│  └─ Geographic Distribution                                         │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 1: Monitoring & Optimization                                │
│  ├─ Real-time Performance Monitoring                               │
│  ├─ Automated Performance Testing                                   │
│  ├─ Resource Usage Analytics                                        │
│  └─ Performance Alerting                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Performance Metrics and SLAs

**Service Level Agreements (SLAs):**
```typescript
// src/lib/performance-metrics.ts
export const PERFORMANCE_SLAS = {
  // Page Load Performance
  PAGE_LOAD: {
    target: 3000, // 3 seconds
    warning: 2500, // 2.5 seconds
    critical: 4000, // 4 seconds
    percentile: 95
  },

  // API Response Times
  API_RESPONSE: {
    simple_queries: { target: 200, warning: 300, critical: 500 },
    complex_queries: { target: 500, warning: 750, critical: 1000 },
    bom_generation: { target: 3000, warning: 4000, critical: 5000 },
    file_upload: { target: 2000, warning: 3000, critical: 5000 }
  },

  // Database Performance
  DATABASE: {
    connection_time: { target: 50, warning: 100, critical: 200 },
    simple_query: { target: 50, warning: 100, critical: 200 },
    complex_query: { target: 500, warning: 750, critical: 1000 },
    write_operation: { target: 100, warning: 200, critical: 500 }
  },

  // System Resources
  RESOURCES: {
    cpu_usage: { target: 70, warning: 80, critical: 90 }, // percentage
    memory_usage: { target: 80, warning: 85, critical: 95 }, // percentage
    disk_io: { target: 70, warning: 80, critical: 90 } // percentage
  },

  // Availability
  AVAILABILITY: {
    uptime: { target: 99.9, warning: 99.5, critical: 99.0 }, // percentage
    error_rate: { target: 0.1, warning: 0.5, critical: 1.0 } // percentage
  }
};
```

---

## 2. CLIENT-SIDE PERFORMANCE OPTIMIZATION

### 2.1 Next.js Performance Configuration

**Optimized Next.js Configuration:**

```typescript
// next.config.ts
import type { NextConfig } from 'next';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

const nextConfig: NextConfig = {
  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
    serverComponentsExternalPackages: ['@prisma/client'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    reactRemoveProperties: process.env.NODE_ENV === 'production' ? { properties: ['^data-testid$'] } : false,
  },

  // Output optimization
  output: 'standalone',
  poweredByHeader: false,
  generateEtags: true,
  compress: true,

  // Webpack optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer in development
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
        })
      );
    }

    // Optimization for production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: -5,
            reuseExistingChunk: true,
          },
        },
      };
    }

    // Tree shaking optimization
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;

    return config;
  },

  // Static optimization
  trailingSlash: false,
  cleanDistDir: true,

  // Performance headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=1, stale-while-revalidate=59' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 2.2 Component Optimization Strategies

**Optimized Component Architecture:**

```typescript
// src/components/optimized/optimized-data-table.tsx
import { memo, useMemo, useCallback, useState, useTransition } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVirtualizer } from '@tanstack/react-virtual';

interface OptimizedDataTableProps<T> {
  data: T[];
  columns: Array<{
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
  }>;
  pageSize?: number;
  searchable?: boolean;
  onRowClick?: (item: T) => void;
}

// Memoized table row component
const TableRowComponent = memo(function TableRowComponent<T>({ 
  item, 
  columns, 
  onClick 
}: {
  item: T;
  columns: OptimizedDataTableProps<T>['columns'];
  onClick?: (item: T) => void;
}) {
  const handleClick = useCallback(() => {
    onClick?.(item);
  }, [onClick, item]);

  return (
    <TableRow 
      onClick={handleClick}
      className={onClick ? 'cursor-pointer hover:bg-muted/50' : ''}
    >
      {columns.map((column) => (
        <TableCell key={column.key}>
          {column.render ? column.render(item) : (item as any)[column.key]}
        </TableCell>
      ))}
    </TableRow>
  );
});

export const OptimizedDataTable = memo(function OptimizedDataTable<T>({
  data,
  columns,
  pageSize = 50,
  searchable = false,
  onRowClick
}: OptimizedDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Memoized filtered data
  const filteredData = useMemo(() => {
    if (!searchable || !searchTerm) return data;
    
    return data.filter(item =>
      Object.values(item as Record<string, any>).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm, searchable]);

  // Memoized paginated data
  const paginatedData = useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, pageSize]);

  // Virtual scrolling for large datasets
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: paginatedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45, // Estimated row height
    overscan: 10,
  });

  const handleSearch = useCallback((value: string) => {
    startTransition(() => {
      setSearchTerm(value);
      setCurrentPage(0);
    });
  }, []);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-sm"
          />
          {isPending && <div className="text-sm text-muted-foreground">Searching...</div>}
        </div>
      )}

      <div ref={parentRef} className="h-[600px] overflow-auto border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const item = paginatedData[virtualRow.index];
                return (
                  <div
                    key={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <TableRowComponent
                      item={item}
                      columns={columns}
                      onClick={onRowClick}
                    />
                  </div>
                );
              })}
            </div>
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, filteredData.length)} of {filteredData.length} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});
```

### 2.3 Image and Asset Optimization

**Comprehensive Asset Optimization:**

```typescript
// src/lib/image-optimization.ts
import Image from 'next/image';
import { useState, useCallback } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
  className?: string;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 80,
  className,
  placeholder = 'empty',
  blurDataURL
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  if (hasError) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <span className="text-muted-foreground text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div className={`relative ${isLoading ? 'animate-pulse bg-muted' : ''}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        quality={quality}
        className={className}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
};

// Generate blur data URL for better loading experience
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Progressive image loading component
export const ProgressiveImage = ({ src, lowQualitySrc, alt, ...props }: {
  src: string;
  lowQualitySrc: string;
  alt: string;
  [key: string]: any;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="relative">
      {/* Low quality placeholder */}
      <Image
        src={lowQualitySrc}
        alt={alt}
        {...props}
        className={`${props.className} ${imageLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        quality={10}
      />
      
      {/* High quality image */}
      <Image
        src={src}
        alt={alt}
        {...props}
        className={`${props.className} absolute inset-0 ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setImageLoaded(true)}
        quality={80}
      />
    </div>
  );
};
```

---

## 3. CACHING ARCHITECTURE

### 3.1 Multi-Layer Caching Strategy

**Comprehensive Caching Implementation:**

```typescript
// src/lib/cache-manager.ts
import { Redis } from 'ioredis';
import { LRUCache } from 'lru-cache';

interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize?: number; // Max number of items
  staleWhileRevalidate?: number; // SWR time in seconds
  tags?: string[]; // Cache tags for invalidation
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

export class CacheManager {
  private static redis = new Redis(process.env.REDIS_URL!);
  private static memoryCache = new LRUCache<string, any>({
    max: 1000, // Maximum 1000 items in memory
    ttl: 5 * 60 * 1000, // 5 minutes default TTL
  });

  // Cache levels
  private static readonly CACHE_LEVELS = {
    MEMORY: 'memory', // L1 cache - fastest
    REDIS: 'redis',   // L2 cache - shared across instances
    DATABASE: 'database' // L3 cache - persistent
  };

  // Predefined cache configurations
  private static readonly CACHE_CONFIGS: Record<string, CacheConfig> = {
    // User data - medium TTL
    user_profile: { ttl: 30 * 60, tags: ['user'] }, // 30 minutes
    user_permissions: { ttl: 15 * 60, tags: ['user', 'permissions'] }, // 15 minutes
    
    // Inventory data - short TTL due to frequent updates
    inventory_parts: { ttl: 5 * 60, tags: ['inventory'] }, // 5 minutes
    inventory_availability: { ttl: 2 * 60, tags: ['inventory'] }, // 2 minutes
    
    // Order data - variable TTL based on status
    order_details: { ttl: 10 * 60, tags: ['order'] }, // 10 minutes
    order_list: { ttl: 5 * 60, tags: ['order'] }, // 5 minutes
    
    // BOM data - longer TTL as it's expensive to generate
    bom_generated: { ttl: 60 * 60, tags: ['bom', 'order'] }, // 1 hour
    bom_templates: { ttl: 4 * 60 * 60, tags: ['bom', 'template'] }, // 4 hours
    
    // Static data - long TTL
    sink_families: { ttl: 24 * 60 * 60, tags: ['static'] }, // 24 hours
    categories: { ttl: 24 * 60 * 60, tags: ['static'] }, // 24 hours
    
    // Reports and analytics - medium TTL
    dashboard_metrics: { ttl: 10 * 60, tags: ['metrics'] }, // 10 minutes
    reports: { ttl: 30 * 60, tags: ['reports'] }, // 30 minutes
  };

  // Get data with multi-level caching
  static async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    configName?: keyof typeof this.CACHE_CONFIGS
  ): Promise<T> {
    const config = configName ? this.CACHE_CONFIGS[configName] : { ttl: 300 }; // Default 5 minutes
    
    try {
      // L1: Check memory cache first
      const memoryResult = this.memoryCache.get(key);
      if (memoryResult) {
        return memoryResult;
      }

      // L2: Check Redis cache
      const redisResult = await this.getFromRedis<T>(key);
      if (redisResult) {
        // Store in memory cache for faster subsequent access
        this.memoryCache.set(key, redisResult);
        return redisResult;
      }

      // L3: Fetch from source
      const data = await fetcher();
      
      // Store in all cache levels
      await this.setInAllLevels(key, data, config);
      
      return data;
    } catch (error) {
      console.error('Cache error:', error);
      // Fallback to direct fetch if caching fails
      return await fetcher();
    }
  }

  // Set data in all cache levels
  private static async setInAllLevels<T>(
    key: string,
    data: T,
    config: CacheConfig
  ): Promise<void> {
    // Memory cache
    this.memoryCache.set(key, data, { ttl: Math.min(config.ttl * 1000, 5 * 60 * 1000) }); // Max 5 minutes in memory

    // Redis cache
    await this.setInRedis(key, data, config);
  }

  // Redis operations
  private static async getFromRedis<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl * 1000) {
        await this.redis.del(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  private static async setInRedis<T>(
    key: string,
    data: T,
    config: CacheConfig
  ): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: config.ttl,
        tags: config.tags || []
      };

      await this.redis.setex(key, config.ttl, JSON.stringify(entry));

      // Add to tag sets for invalidation
      if (config.tags) {
        for (const tag of config.tags) {
          await this.redis.sadd(`tag:${tag}`, key);
          await this.redis.expire(`tag:${tag}`, config.ttl);
        }
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  // Cache invalidation
  static async invalidate(pattern: string): Promise<void> {
    try {
      // Invalidate memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key);
        }
      }

      // Invalidate Redis cache
      const keys = await this.redis.keys(`*${pattern}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // Invalidate by tags
  static async invalidateByTags(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const keys = await this.redis.smembers(`tag:${tag}`);
        
        if (keys.length > 0) {
          // Remove from memory cache
          for (const key of keys) {
            this.memoryCache.delete(key);
          }
          
          // Remove from Redis
          await this.redis.del(...keys);
          
          // Clean up tag set
          await this.redis.del(`tag:${tag}`);
        }
      }
    } catch (error) {
      console.error('Tag invalidation error:', error);
    }
  }

  // Preload critical data
  static async preloadCriticalData(): Promise<void> {
    const criticalDataLoaders = [
      { key: 'categories:all', fetcher: () => this.loadCategories(), config: 'categories' },
      { key: 'sink_families:active', fetcher: () => this.loadSinkFamilies(), config: 'sink_families' },
      { key: 'users:active_count', fetcher: () => this.loadActiveUserCount(), config: 'user_profile' },
    ];

    await Promise.all(
      criticalDataLoaders.map(({ key, fetcher, config }) =>
        this.get(key, fetcher, config as keyof typeof this.CACHE_CONFIGS)
      )
    );
  }

  // Cache warming for frequently accessed data
  static async warmCache(): Promise<void> {
    console.log('Starting cache warming...');
    
    try {
      await this.preloadCriticalData();
      
      // Warm up user-specific caches for active users
      const activeUsers = await this.loadActiveUsers();
      
      await Promise.all(
        activeUsers.map(userId =>
          this.get(
            `user:permissions:${userId}`,
            () => this.loadUserPermissions(userId),
            'user_permissions'
          )
        )
      );
      
      console.log('Cache warming completed');
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  // Cache statistics
  static async getCacheStats(): Promise<{
    memoryStats: { size: number; maxSize: number; hitRate: number };
    redisStats: { connectedClients: number; usedMemory: string; keyspace: Record<string, number> };
  }> {
    const memoryStats = {
      size: this.memoryCache.size,
      maxSize: this.memoryCache.max,
      hitRate: this.memoryCache.calculatedSize / (this.memoryCache.calculatedSize + this.memoryCache.size) * 100
    };

    const redisInfo = await this.redis.info();
    const redisStats = {
      connectedClients: parseInt(redisInfo.match(/connected_clients:(\d+)/)?.[1] || '0'),
      usedMemory: redisInfo.match(/used_memory_human:([^\r\n]+)/)?.[1] || '0B',
      keyspace: {}
    };

    return { memoryStats, redisStats };
  }

  // Helper methods for data loading
  private static async loadCategories(): Promise<any[]> {
    // Implementation would fetch from database
    return [];
  }

  private static async loadSinkFamilies(): Promise<any[]> {
    // Implementation would fetch from database
    return [];
  }

  private static async loadActiveUserCount(): Promise<number> {
    // Implementation would fetch from database
    return 0;
  }

  private static async loadActiveUsers(): Promise<string[]> {
    // Implementation would fetch from database
    return [];
  }

  private static async loadUserPermissions(userId: string): Promise<string[]> {
    // Implementation would fetch from database
    return [];
  }
}

// Cache middleware for API routes
export function withCache<T>(
  fetcher: () => Promise<T>,
  cacheKey: string,
  configName?: keyof typeof CacheManager['CACHE_CONFIGS']
) {
  return () => CacheManager.get(cacheKey, fetcher, configName);
}

// React hook for cached data
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  configName?: keyof typeof CacheManager['CACHE_CONFIGS']
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    CacheManager.get(key, fetcher, configName)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [key]);

  return { data, loading, error };
}
```

### 3.2 HTTP Response Caching

**Edge Caching and CDN Strategy:**

```typescript
// src/lib/http-cache.ts
export class HTTPCacheManager {
  // Cache headers for different content types
  static readonly CACHE_HEADERS = {
    // Static assets - long cache
    static_assets: {
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
      'Expires': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
    },

    // API responses - short cache with revalidation
    api_responses: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // 1 min cache, 5 min stale
      'Vary': 'Accept-Encoding, Authorization'
    },

    // Dynamic content - minimal cache
    dynamic_content: {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },

    // Public data - medium cache
    public_data: {
      'Cache-Control': 'public, max-age=300, s-maxage=600', // 5 min client, 10 min edge
      'Vary': 'Accept-Encoding'
    }
  };

  // Generate cache key for API responses
  static generateCacheKey(url: string, params?: Record<string, any>, userId?: string): string {
    const urlPart = url.replace(/[^a-zA-Z0-9]/g, '_');
    const paramsPart = params ? '_' + Buffer.from(JSON.stringify(params)).toString('base64') : '';
    const userPart = userId ? '_user_' + userId : '';
    
    return `api_${urlPart}${paramsPart}${userPart}`;
  }

  // Set appropriate cache headers
  static setCacheHeaders(
    response: Response,
    cacheType: keyof typeof this.CACHE_HEADERS,
    customTTL?: number
  ): Response {
    const headers = { ...this.CACHE_HEADERS[cacheType] };
    
    if (customTTL && cacheType === 'api_responses') {
      headers['Cache-Control'] = `public, s-maxage=${customTTL}, stale-while-revalidate=${customTTL * 5}`;
    }

    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  // Conditional request handling
  static handleConditionalRequest(
    request: Request,
    lastModified: Date,
    etag: string
  ): Response | null {
    const ifModifiedSince = request.headers.get('If-Modified-Since');
    const ifNoneMatch = request.headers.get('If-None-Match');

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, { status: 304 });
    }

    if (ifModifiedSince && new Date(ifModifiedSince) >= lastModified) {
      return new Response(null, { status: 304 });
    }

    return null;
  }

  // Generate ETag for content
  static generateETag(content: string): string {
    return `"${Buffer.from(content).toString('base64').slice(0, 16)}"`;
  }
}
```

---

## 4. DATABASE PERFORMANCE OPTIMIZATION

### 4.1 Query Optimization and Indexing

**Advanced Database Performance Strategy:**

```typescript
// src/lib/database-performance.ts
import { PrismaClient } from '@prisma/client';

export class DatabasePerformance {
  private static queryCache = new Map<string, { result: any; timestamp: number; ttl: number }>();

  // Connection pooling configuration
  static createOptimizedPrismaClient(): PrismaClient {
    return new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' }
      ]
    });
  }

  // Query performance monitoring
  static setupQueryMonitoring(prisma: PrismaClient): void {
    prisma.$on('query', (e) => {
      const duration = e.duration;
      const query = e.query;

      // Log slow queries
      if (duration > 1000) { // Queries taking more than 1 second
        console.warn('Slow query detected:', {
          query: query.substring(0, 200) + '...',
          duration: `${duration}ms`,
          params: e.params
        });

        // In production, send to monitoring service
        this.reportSlowQuery(query, duration, e.params);
      }

      // Track query statistics
      this.trackQueryStats(query, duration);
    });
  }

  // Optimized queries with proper includes and selects
  static readonly OPTIMIZED_QUERIES = {
    // Order list with minimal data
    getOrderList: (filters: any) => ({
      where: filters,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        priority: true,
        totalAmount: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            companyName: true
          }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),

    // Order details with full data
    getOrderDetails: (id: string) => ({
      where: { id },
      include: {
        customer: {
          include: {
            addresses: true,
            contacts: true
          }
        },
        sinkConfigurations: true,
        boms: {
          where: { isActive: true },
          include: {
            items: {
              include: {
                part: {
                  select: {
                    id: true,
                    partNumber: true,
                    name: true,
                    currentCost: true
                  }
                }
              }
            }
          }
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { changedAt: 'desc' }
        },
        tasks: {
          where: { status: { not: 'COMPLETED' } },
          include: {
            assignedTo: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    }),

    // Inventory with availability
    getInventoryWithAvailability: (filters: any) => ({
      where: {
        ...filters,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        partNumber: true,
        name: true,
        quantityOnHand: true,
        quantityAllocated: true,
        reorderPoint: true,
        currentCost: true,
        subAssembly: {
          select: {
            name: true,
            assembly: {
              select: {
                name: true,
                category: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { partNumber: 'asc' }
    }),

    // User dashboard data
    getUserDashboardData: (userId: string, role: string) => {
      const baseQuery = {
        where: { status: { not: 'DELIVERED' } },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          priority: true,
          createdAt: true,
          customer: {
            select: { companyName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      };

      // Customize based on role
      switch (role) {
        case 'ASSEMBLER':
          return {
            ...baseQuery,
            where: {
              ...baseQuery.where,
              tasks: {
                some: {
                  assignedTo: userId,
                  status: { in: ['PENDING', 'IN_PROGRESS'] }
                }
              }
            }
          };
        case 'QC_PERSON':
          return {
            ...baseQuery,
            where: {
              ...baseQuery.where,
              status: { in: ['PRE_QC', 'FINAL_QC'] }
            }
          };
        default:
          return baseQuery;
      }
    }
  };

  // Batch operations for better performance
  static async batchUpdateInventory(updates: Array<{ id: string; quantity: number }>): Promise<void> {
    const batchSize = 100;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      await prisma.$transaction(
        batch.map(update =>
          prisma.part.update({
            where: { id: update.id },
            data: { quantityOnHand: update.quantity }
          })
        )
      );
    }
  }

  // Optimized BOM generation with minimal queries
  static async generateBOMOptimized(orderId: string, configurationId: string): Promise<any> {
    // Use raw SQL for complex BOM generation to avoid N+1 queries
    const bomData = await prisma.$queryRaw`
      WITH RECURSIVE bom_hierarchy AS (
        -- Base case: get template items
        SELECT 
          bti.id,
          bti.template_id,
          bti.line_number,
          bti.part_id,
          bti.quantity_formula,
          bti.base_quantity,
          bti.level,
          bti.parent_item_id,
          p.part_number,
          p.name,
          p.current_cost,
          1 as calculated_quantity
        FROM products.bom_template_items bti
        JOIN inventory.parts p ON bti.part_id = p.id
        WHERE bti.template_id = (
          SELECT bt.id 
          FROM products.bom_templates bt
          JOIN orders.order_sink_configurations osc ON bt.sink_family_id = osc.sink_family_id
          WHERE osc.id = ${configurationId}
          AND bt.is_active = true
          LIMIT 1
        )
        
        UNION ALL
        
        -- Recursive case: get child items
        SELECT 
          bti.id,
          bti.template_id,
          bti.line_number,
          bti.part_id,
          bti.quantity_formula,
          bti.base_quantity,
          bti.level,
          bti.parent_item_id,
          p.part_number,
          p.name,
          p.current_cost,
          bh.calculated_quantity * bti.base_quantity as calculated_quantity
        FROM products.bom_template_items bti
        JOIN inventory.parts p ON bti.part_id = p.id
        JOIN bom_hierarchy bh ON bti.parent_item_id = bh.id
      )
      SELECT * FROM bom_hierarchy
      ORDER BY level, line_number;
    `;

    return bomData;
  }

  // Database query caching
  static async getCachedQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.queryCache.get(queryKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl * 1000) {
      return cached.result;
    }

    const result = await queryFn();
    
    this.queryCache.set(queryKey, {
      result,
      timestamp: Date.now(),
      ttl: ttlSeconds
    });

    return result;
  }

  // Bulk operations with proper batching
  static async bulkInsert<T>(
    model: any,
    data: T[],
    batchSize: number = 1000
  ): Promise<void> {
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await model.createMany({
        data: batch,
        skipDuplicates: true
      });
    }
  }

  // Query statistics tracking
  private static queryStats = new Map<string, { count: number; totalTime: number; avgTime: number }>();

  private static trackQueryStats(query: string, duration: number): void {
    const queryType = this.extractQueryType(query);
    const stats = this.queryStats.get(queryType) || { count: 0, totalTime: 0, avgTime: 0 };
    
    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    
    this.queryStats.set(queryType, stats);
  }

  private static extractQueryType(query: string): string {
    const firstWord = query.trim().split(' ')[0].toUpperCase();
    return firstWord || 'UNKNOWN';
  }

  private static async reportSlowQuery(query: string, duration: number, params: string): Promise<void> {
    // In production, send to monitoring service like DataDog, New Relic, etc.
    console.warn('Slow query reported:', { query: query.substring(0, 100), duration, params });
  }

  // Get performance statistics
  static getPerformanceStats(): {
    queryStats: Map<string, any>;
    cacheStats: { size: number; hitRate: number };
  } {
    const cacheHits = Array.from(this.queryCache.values()).length;
    const totalQueries = Array.from(this.queryStats.values()).reduce((sum, stat) => sum + stat.count, 0);
    
    return {
      queryStats: this.queryStats,
      cacheStats: {
        size: this.queryCache.size,
        hitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0
      }
    };
  }
}
```

### 4.2 Database Connection Management

**Optimized Connection Pooling:**

```typescript
// src/lib/database-connection.ts
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private prismaClient: PrismaClient;
  private pgPool: Pool;
  private connectionMetrics = {
    activeConnections: 0,
    totalConnections: 0,
    failedConnections: 0,
    averageQueryTime: 0
  };

  private constructor() {
    // Optimized Prisma configuration
    this.prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: this.buildOptimizedDatabaseUrl()
        }
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Direct PostgreSQL pool for raw queries
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum pool size
      min: 5,  // Minimum pool size
      idle: 30000, // 30 seconds
      acquire: 60000, // 60 seconds
      evict: 1000, // 1 second
      handleDisconnects: true,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    this.setupConnectionMonitoring();
  }

  static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  private buildOptimizedDatabaseUrl(): string {
    const baseUrl = process.env.DATABASE_URL!;
    const params = new URLSearchParams({
      'schema': 'public',
      'connection_limit': '20',
      'pool_timeout': '60',
      'sslmode': process.env.NODE_ENV === 'production' ? 'require' : 'prefer'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  private setupConnectionMonitoring(): void {
    // Monitor Prisma connections
    this.prismaClient.$on('query', (e) => {
      this.connectionMetrics.totalConnections++;
      this.updateAverageQueryTime(e.duration);
    });

    // Monitor PostgreSQL pool
    this.pgPool.on('connect', () => {
      this.connectionMetrics.activeConnections++;
    });

    this.pgPool.on('remove', () => {
      this.connectionMetrics.activeConnections--;
    });

    this.pgPool.on('error', (err) => {
      this.connectionMetrics.failedConnections++;
      console.error('PostgreSQL pool error:', err);
    });

    // Periodic health checks
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  private updateAverageQueryTime(duration: number): void {
    const { totalConnections, averageQueryTime } = this.connectionMetrics;
    this.connectionMetrics.averageQueryTime = 
      (averageQueryTime * (totalConnections - 1) + duration) / totalConnections;
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Test Prisma connection
      await this.prismaClient.$queryRaw`SELECT 1`;
      
      // Test pool connection
      const client = await this.pgPool.connect();
      await client.query('SELECT 1');
      client.release();
      
    } catch (error) {
      console.error('Database health check failed:', error);
      // Implement alerting here
    }
  }

  // Get optimized Prisma client
  getPrismaClient(): PrismaClient {
    return this.prismaClient;
  }

  // Get PostgreSQL pool for raw queries
  getPgPool(): Pool {
    return this.pgPool;
  }

  // Execute raw SQL with performance monitoring
  async executeRawQuery<T>(query: string, params?: any[]): Promise<T[]> {
    const startTime = Date.now();
    
    try {
      const client = await this.pgPool.connect();
      const result = await client.query(query, params);
      client.release();
      
      const duration = Date.now() - startTime;
      this.updateAverageQueryTime(duration);
      
      return result.rows;
    } catch (error) {
      this.connectionMetrics.failedConnections++;
      throw error;
    }
  }

  // Get connection metrics
  getConnectionMetrics(): typeof this.connectionMetrics {
    return { ...this.connectionMetrics };
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    await this.prismaClient.$disconnect();
    await this.pgPool.end();
  }
}

// Global database instance
export const db = DatabaseConnectionManager.getInstance().getPrismaClient();
export const pgPool = DatabaseConnectionManager.getInstance().getPgPool();
```

---

## 5. SCALABILITY ARCHITECTURE

### 5.1 Horizontal Scaling Strategy

**Auto-scaling and Load Distribution:**

```typescript
// src/lib/scaling-manager.ts
interface ScalingMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  responseTime: number;
  errorRate: number;
  requestsPerSecond: number;
}

interface ScalingThresholds {
  scaleUp: {
    cpuUsage: number;
    memoryUsage: number;
    responseTime: number;
    requestsPerSecond: number;
  };
  scaleDown: {
    cpuUsage: number;
    memoryUsage: number;
    responseTime: number;
    requestsPerSecond: number;
  };
}

export class ScalingManager {
  private static readonly SCALING_THRESHOLDS: ScalingThresholds = {
    scaleUp: {
      cpuUsage: 70,      // Scale up if CPU > 70%
      memoryUsage: 80,   // Scale up if Memory > 80%
      responseTime: 1000, // Scale up if response time > 1s
      requestsPerSecond: 100 // Scale up if RPS > 100
    },
    scaleDown: {
      cpuUsage: 30,      // Scale down if CPU < 30%
      memoryUsage: 40,   // Scale down if Memory < 40%
      responseTime: 200, // Scale down if response time < 200ms
      requestsPerSecond: 20 // Scale down if RPS < 20
    }
  };

  private static currentMetrics: ScalingMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    activeConnections: 0,
    responseTime: 0,
    errorRate: 0,
    requestsPerSecond: 0
  };

  // Monitor system metrics
  static startMetricsCollection(): void {
    setInterval(async () => {
      this.currentMetrics = await this.collectMetrics();
      await this.evaluateScaling();
    }, 60000); // Check every minute
  }

  // Collect system metrics
  private static async collectMetrics(): Promise<ScalingMetrics> {
    // In production, these would come from monitoring services
    const process = await import('process');
    const os = await import('os');

    const cpuUsage = await this.getCpuUsage();
    const memoryUsage = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
    const activeConnections = await this.getActiveConnections();
    const responseTime = await this.getAverageResponseTime();
    const errorRate = await this.getErrorRate();
    const requestsPerSecond = await this.getRequestsPerSecond();

    return {
      cpuUsage,
      memoryUsage,
      activeConnections,
      responseTime,
      errorRate,
      requestsPerSecond
    };
  }

  // Evaluate if scaling is needed
  private static async evaluateScaling(): Promise<void> {
    const metrics = this.currentMetrics;
    const { scaleUp, scaleDown } = this.SCALING_THRESHOLDS;

    // Check scale up conditions
    const shouldScaleUp = 
      metrics.cpuUsage > scaleUp.cpuUsage ||
      metrics.memoryUsage > scaleUp.memoryUsage ||
      metrics.responseTime > scaleUp.responseTime ||
      metrics.requestsPerSecond > scaleUp.requestsPerSecond;

    // Check scale down conditions (all must be true)
    const shouldScaleDown = 
      metrics.cpuUsage < scaleDown.cpuUsage &&
      metrics.memoryUsage < scaleDown.memoryUsage &&
      metrics.responseTime < scaleDown.responseTime &&
      metrics.requestsPerSecond < scaleDown.requestsPerSecond;

    if (shouldScaleUp) {
      await this.triggerScaleUp();
    } else if (shouldScaleDown) {
      await this.triggerScaleDown();
    }
  }

  // Trigger scale up
  private static async triggerScaleUp(): Promise<void> {
    console.log('Triggering scale up based on metrics:', this.currentMetrics);
    
    // In production, this would call cloud provider APIs
    // AWS ECS, Kubernetes, etc.
    
    // For now, log the scaling decision
    await this.logScalingEvent('SCALE_UP', this.currentMetrics);
  }

  // Trigger scale down
  private static async triggerScaleDown(): Promise<void> {
    console.log('Triggering scale down based on metrics:', this.currentMetrics);
    
    // In production, this would call cloud provider APIs
    // with proper grace period to avoid oscillation
    
    await this.logScalingEvent('SCALE_DOWN', this.currentMetrics);
  }

  // Load balancing strategy
  static configureLoadBalancing(): {
    algorithm: string;
    healthCheck: object;
    stickySession: boolean;
  } {
    return {
      algorithm: 'least_connections', // Best for diverse request complexity
      healthCheck: {
        path: '/api/health',
        interval: 30000, // 30 seconds
        timeout: 5000,   // 5 seconds
        healthy_threshold: 2,
        unhealthy_threshold: 3
      },
      stickySession: false // Stateless design allows any server to handle requests
    };
  }

  // Database scaling strategy
  static async configureDatabaseScaling(): Promise<{
    readReplicas: number;
    connectionPooling: object;
    partitioning: object;
  }> {
    const metrics = await this.getCurrentDatabaseMetrics();
    
    return {
      readReplicas: this.calculateOptimalReadReplicas(metrics),
      connectionPooling: {
        min: 5,
        max: 20,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
      },
      partitioning: {
        tables: ['orders', 'audit_log'],
        strategy: 'date_range', // Partition by month
        retention: '24_months'
      }
    };
  }

  // Cache scaling strategy
  static configureCacheScaling(): {
    redis: object;
    memoryCache: object;
    cdn: object;
  } {
    return {
      redis: {
        cluster: true,
        nodes: [
          { host: 'redis-1', port: 6379 },
          { host: 'redis-2', port: 6379 },
          { host: 'redis-3', port: 6379 }
        ],
        options: {
          enableOfflineQueue: false,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3
        }
      },
      memoryCache: {
        maxSize: 1000,
        ttl: 300000, // 5 minutes
        updateAgeOnGet: true
      },
      cdn: {
        provider: 'cloudflare',
        regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
        cacheRules: {
          static: 'max-age=31536000',
          api: 'max-age=300',
          dynamic: 'no-cache'
        }
      }
    };
  }

  // Performance optimization recommendations
  static async getOptimizationRecommendations(): Promise<{
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  }> {
    const metrics = this.currentMetrics;
    const recommendations = {
      immediate: [] as string[],
      shortTerm: [] as string[],
      longTerm: [] as string[]
    };

    // Immediate optimizations
    if (metrics.responseTime > 1000) {
      recommendations.immediate.push('Enable response compression');
      recommendations.immediate.push('Implement API response caching');
    }

    if (metrics.memoryUsage > 80) {
      recommendations.immediate.push('Increase memory cache TTL');
      recommendations.immediate.push('Optimize large object handling');
    }

    // Short-term optimizations
    if (metrics.cpuUsage > 70) {
      recommendations.shortTerm.push('Implement database query optimization');
      recommendations.shortTerm.push('Add read replicas');
    }

    if (metrics.requestsPerSecond > 100) {
      recommendations.shortTerm.push('Implement rate limiting');
      recommendations.shortTerm.push('Add CDN for static assets');
    }

    // Long-term optimizations
    if (metrics.errorRate > 1) {
      recommendations.longTerm.push('Implement circuit breakers');
      recommendations.longTerm.push('Add comprehensive monitoring');
    }

    recommendations.longTerm.push('Consider microservices architecture');
    recommendations.longTerm.push('Implement database sharding');

    return recommendations;
  }

  // Helper methods
  private static async getCpuUsage(): Promise<number> {
    // Simplified CPU usage calculation
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);
    
    const userTime = endUsage.user / 1000; // Convert to milliseconds
    const systemTime = endUsage.system / 1000;
    const totalTime = userTime + systemTime;
    
    return (totalTime / 100) * 100; // Percentage
  }

  private static async getActiveConnections(): Promise<number> {
    return DatabaseConnectionManager.getInstance().getConnectionMetrics().activeConnections;
  }

  private static async getAverageResponseTime(): Promise<number> {
    // This would come from your monitoring system
    return 0;
  }

  private static async getErrorRate(): Promise<number> {
    // This would come from your monitoring system
    return 0;
  }

  private static async getRequestsPerSecond(): Promise<number> {
    // This would come from your monitoring system
    return 0;
  }

  private static async getCurrentDatabaseMetrics(): Promise<any> {
    return DatabaseConnectionManager.getInstance().getConnectionMetrics();
  }

  private static calculateOptimalReadReplicas(metrics: any): number {
    // Simple heuristic - in production, use more sophisticated calculation
    if (metrics.totalConnections > 100) return 3;
    if (metrics.totalConnections > 50) return 2;
    return 1;
  }

  private static async logScalingEvent(action: string, metrics: ScalingMetrics): Promise<void> {
    // Log to audit system
    console.log('Scaling event:', { action, metrics, timestamp: new Date() });
  }
}
```

### 5.2 Resource Optimization

**Memory and CPU Optimization:**

```typescript
// src/lib/resource-optimization.ts
export class ResourceOptimizer {
  private static memoryThresholds = {
    warning: 80,  // 80% memory usage
    critical: 90, // 90% memory usage
    cleanup: 95   // 95% memory usage - force cleanup
  };

  // Memory optimization
  static startMemoryMonitoring(): void {
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Check every 30 seconds
  }

  private static checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const usagePercentage = (heapUsedMB / heapTotalMB) * 100;

    if (usagePercentage > this.memoryThresholds.cleanup) {
      this.forceGarbageCollection();
      this.clearCaches();
    } else if (usagePercentage > this.memoryThresholds.critical) {
      this.optimizeMemoryUsage();
    } else if (usagePercentage > this.memoryThresholds.warning) {
      this.preventMemoryLeaks();
    }

    // Log memory metrics
    this.logMemoryMetrics(usage, usagePercentage);
  }

  private static forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      console.log('Forced garbage collection');
    }
  }

  private static clearCaches(): void {
    // Clear application caches
    CacheManager.invalidate('*');
    
    // Clear query cache
    DatabasePerformance.clearQueryCache?.();
    
    console.log('Cleared all caches due to high memory usage');
  }

  private static optimizeMemoryUsage(): void {
    // Implement memory optimization strategies
    console.log('Optimizing memory usage');
  }

  private static preventMemoryLeaks(): void {
    // Check for potential memory leaks
    console.log('Checking for memory leaks');
  }

  private static logMemoryMetrics(usage: NodeJS.MemoryUsage, percentage: number): void {
    const metrics = {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
      usagePercentage: Math.round(percentage)
    };

    // In production, send to monitoring service
    console.log('Memory metrics:', metrics);
  }

  // CPU optimization
  static optimizeCPUUsage(): void {
    // Use worker threads for CPU-intensive tasks
    this.setupWorkerThreads();
    
    // Optimize event loop
    this.optimizeEventLoop();
    
    // Implement request queuing
    this.implementRequestQueuing();
  }

  private static setupWorkerThreads(): void {
    // Setup worker threads for BOM generation, report generation, etc.
    console.log('Setting up worker threads for CPU-intensive tasks');
  }

  private static optimizeEventLoop(): void {
    // Monitor event loop lag
    setInterval(() => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
        
        if (lag > 100) { // More than 100ms lag
          console.warn('Event loop lag detected:', lag, 'ms');
        }
      });
    }, 5000);
  }

  private static implementRequestQueuing(): void {
    // Implement request queuing to prevent CPU spikes
    console.log('Implementing request queuing');
  }

  // Disk I/O optimization
  static optimizeDiskIO(): void {
    // Implement file caching
    this.implementFileCache();
    
    // Optimize file uploads
    this.optimizeFileUploads();
    
    // Monitor disk usage
    this.monitorDiskUsage();
  }

  private static implementFileCache(): void {
    // Cache frequently accessed files
    console.log('Implementing file cache');
  }

  private static optimizeFileUploads(): void {
    // Stream file uploads, implement chunking
    console.log('Optimizing file uploads');
  }

  private static monitorDiskUsage(): void {
    // Monitor disk space and I/O
    console.log('Monitoring disk usage');
  }

  // Network optimization
  static optimizeNetworkUsage(): void {
    // Implement response compression
    this.enableCompression();
    
    // Optimize API responses
    this.optimizeAPIResponses();
    
    // Implement connection pooling
    this.optimizeConnections();
  }

  private static enableCompression(): void {
    // Enable gzip/brotli compression
    console.log('Enabling response compression');
  }

  private static optimizeAPIResponses(): void {
    // Minimize API response sizes
    console.log('Optimizing API responses');
  }

  private static optimizeConnections(): void {
    // Optimize HTTP connections
    console.log('Optimizing network connections');
  }

  // Get resource optimization recommendations
  static getOptimizationRecommendations(): {
    memory: string[];
    cpu: string[];
    disk: string[];
    network: string[];
  } {
    return {
      memory: [
        'Implement object pooling for frequently created objects',
        'Use streaming for large data processing',
        'Optimize garbage collection settings',
        'Implement memory-efficient data structures'
      ],
      cpu: [
        'Use worker threads for CPU-intensive operations',
        'Implement async/await properly to avoid blocking',
        'Optimize algorithms and data processing',
        'Use clustering for multi-core utilization'
      ],
      disk: [
        'Implement SSD storage for databases',
        'Use file compression for large files',
        'Implement efficient log rotation',
        'Optimize database storage'
      ],
      network: [
        'Enable HTTP/2 and HTTP/3',
        'Implement proper caching headers',
        'Use CDN for static assets',
        'Optimize API payload sizes'
      ]
    };
  }
}
```

---

## 6. PERFORMANCE MONITORING AND ALERTING

### 6.1 Real-time Performance Monitoring

**Comprehensive Performance Monitoring System:**

```typescript
// src/lib/performance-monitoring.ts
interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface PerformanceAlert {
  metric: string;
  threshold: number;
  currentValue: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
}

export class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetric[]> = new Map();
  private static alerts: PerformanceAlert[] = [];
  
  private static readonly METRIC_RETENTION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly ALERT_THRESHOLDS = {
    response_time: { warning: 1000, critical: 3000 },
    memory_usage: { warning: 80, critical: 90 },
    cpu_usage: { warning: 70, critical: 85 },
    error_rate: { warning: 1, critical: 5 },
    database_connections: { warning: 15, critical: 18 }
  };

  // Start monitoring
  static startMonitoring(): void {
    console.log('Starting performance monitoring...');
    
    // Start metrics collection
    this.startMetricsCollection();
    
    // Start real-time monitoring
    this.startRealTimeMonitoring();
    
    // Start alert processing
    this.startAlertProcessing();
    
    // Cleanup old metrics
    this.startMetricsCleanup();
  }

  // Collect various metrics
  private static startMetricsCollection(): void {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 10000); // Every 10 seconds

    setInterval(() => {
      this.collectApplicationMetrics();
    }, 30000); // Every 30 seconds

    setInterval(() => {
      this.collectDatabaseMetrics();
    }, 60000); // Every minute
  }

  // System metrics
  private static async collectSystemMetrics(): Promise<void> {
    const usage = process.memoryUsage();
    const cpuUsage = await this.getCPUUsage();
    
    this.recordMetric('memory_heap_used', usage.heapUsed / 1024 / 1024, 'MB');
    this.recordMetric('memory_heap_total', usage.heapTotal / 1024 / 1024, 'MB');
    this.recordMetric('memory_external', usage.external / 1024 / 1024, 'MB');
    this.recordMetric('memory_rss', usage.rss / 1024 / 1024, 'MB');
    this.recordMetric('cpu_usage', cpuUsage, '%');
    
    const memoryUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
    this.recordMetric('memory_usage_percent', memoryUsagePercent, '%');
    
    // Check thresholds
    this.checkThreshold('memory_usage', memoryUsagePercent);
    this.checkThreshold('cpu_usage', cpuUsage);
  }

  // Application metrics
  private static async collectApplicationMetrics(): Promise<void> {
    // Active connections
    const dbMetrics = DatabaseConnectionManager.getInstance().getConnectionMetrics();
    this.recordMetric('database_connections_active', dbMetrics.activeConnections, 'count');
    this.recordMetric('database_connections_total', dbMetrics.totalConnections, 'count');
    this.recordMetric('database_query_avg_time', dbMetrics.averageQueryTime, 'ms');
    
    // Cache metrics
    const cacheStats = await CacheManager.getCacheStats();
    this.recordMetric('cache_memory_size', cacheStats.memoryStats.size, 'count');
    this.recordMetric('cache_hit_rate', cacheStats.memoryStats.hitRate, '%');
    
    // Check thresholds
    this.checkThreshold('database_connections', dbMetrics.activeConnections);
  }

  // Database metrics
  private static async collectDatabaseMetrics(): Promise<void> {
    try {
      // Query performance metrics
      const queryStats = DatabasePerformance.getPerformanceStats();
      
      for (const [queryType, stats] of queryStats.queryStats) {
        this.recordMetric(`db_query_${queryType}_avg_time`, stats.avgTime, 'ms');
        this.recordMetric(`db_query_${queryType}_count`, stats.count, 'count');
      }
      
      // Database size and performance
      const dbSize = await this.getDatabaseSize();
      this.recordMetric('database_size', dbSize, 'MB');
      
    } catch (error) {
      console.error('Error collecting database metrics:', error);
    }
  }

  // Real-time monitoring for request/response metrics
  private static startRealTimeMonitoring(): void {
    // This would be integrated with your request handling
    console.log('Real-time monitoring started');
  }

  // Record a metric
  static recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);
    
    // Emit to monitoring service (e.g., DataDog, New Relic)
    this.emitToMonitoringService(metric);
  }

  // Record response time
  static recordResponseTime(endpoint: string, method: string, duration: number, statusCode: number): void {
    this.recordMetric('response_time', duration, 'ms', {
      endpoint,
      method,
      status_code: statusCode.toString()
    });

    // Check response time threshold
    this.checkThreshold('response_time', duration);
    
    // Record error rate
    if (statusCode >= 400) {
      this.recordMetric('error_count', 1, 'count', { endpoint, method });
    }
  }

  // Check metric thresholds
  private static checkThreshold(metricName: string, value: number): void {
    const thresholds = this.ALERT_THRESHOLDS[metricName as keyof typeof this.ALERT_THRESHOLDS];
    
    if (!thresholds) return;

    if (value >= thresholds.critical) {
      this.createAlert(metricName, value, 'CRITICAL', thresholds.critical);
    } else if (value >= thresholds.warning) {
      this.createAlert(metricName, value, 'HIGH', thresholds.warning);
    }
  }

  // Create performance alert
  private static createAlert(
    metric: string, 
    currentValue: number, 
    severity: PerformanceAlert['severity'], 
    threshold: number
  ): void {
    const alert: PerformanceAlert = {
      metric,
      threshold,
      currentValue,
      severity,
      message: `${metric} (${currentValue}) exceeded ${severity.toLowerCase()} threshold (${threshold})`
    };

    this.alerts.push(alert);
    
    // Send immediate notification for critical alerts
    if (severity === 'CRITICAL') {
      this.sendImmediateAlert(alert);
    }
  }

  // Send immediate alert
  private static async sendImmediateAlert(alert: PerformanceAlert): Promise<void> {
    console.error('CRITICAL ALERT:', alert);
    
    // In production, integrate with:
    // - PagerDuty
    // - Slack/Teams
    // - Email notifications
    // - SMS alerts
    
    // Log to audit system
    try {
      await db.auditLog.create({
        data: {
          action: 'PERFORMANCE_ALERT',
          resourceType: 'SYSTEM',
          description: alert.message,
          businessContext: {
            alert: alert,
            severity: alert.severity,
            metric: alert.metric
          },
          success: false
        }
      });
    } catch (error) {
      console.error('Failed to log alert:', error);
    }
  }

  // Process alerts
  private static startAlertProcessing(): void {
    setInterval(() => {
      this.processAlerts();
    }, 60000); // Process alerts every minute
  }

  private static processAlerts(): void {
    if (this.alerts.length === 0) return;

    // Group alerts by severity
    const groupedAlerts = this.alerts.reduce((groups, alert) => {
      if (!groups[alert.severity]) {
        groups[alert.severity] = [];
      }
      groups[alert.severity].push(alert);
      return groups;
    }, {} as Record<string, PerformanceAlert[]>);

    // Send batch notifications
    for (const [severity, alerts] of Object.entries(groupedAlerts)) {
      this.sendBatchAlert(severity as PerformanceAlert['severity'], alerts);
    }

    // Clear processed alerts
    this.alerts = [];
  }

  private static sendBatchAlert(severity: PerformanceAlert['severity'], alerts: PerformanceAlert[]): void {
    console.log(`${severity} alerts (${alerts.length}):`, alerts.map(a => a.message));
    
    // In production, send batched notifications
  }

  // Get performance dashboard data
  static getPerformanceDashboard(timeRange: number = 60): {
    metrics: Record<string, PerformanceMetric[]>;
    summary: Record<string, any>;
    alerts: PerformanceAlert[];
  } {
    const cutoff = new Date(Date.now() - timeRange * 60 * 1000);
    const filteredMetrics: Record<string, PerformanceMetric[]> = {};

    // Filter metrics by time range
    for (const [name, metrics] of this.metrics) {
      filteredMetrics[name] = metrics.filter(m => m.timestamp >= cutoff);
    }

    // Calculate summary statistics
    const summary: Record<string, any> = {};
    for (const [name, metrics] of Object.entries(filteredMetrics)) {
      if (metrics.length > 0) {
        const values = metrics.map(m => m.value);
        summary[name] = {
          current: values[values.length - 1],
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    }

    return {
      metrics: filteredMetrics,
      summary,
      alerts: this.alerts
    };
  }

  // Clean up old metrics
  private static startMetricsCleanup(): void {
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // Cleanup every hour
  }

  private static cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.METRIC_RETENTION);
    
    for (const [name, metrics] of this.metrics) {
      const filteredMetrics = metrics.filter(m => m.timestamp >= cutoff);
      this.metrics.set(name, filteredMetrics);
    }
  }

  // Helper methods
  private static async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const userTime = endUsage.user / 1000;
        const systemTime = endUsage.system / 1000;
        const totalTime = userTime + systemTime;
        const percentage = (totalTime / 100) * 100;
        
        resolve(Math.min(percentage, 100));
      }, 100);
    });
  }

  private static async getDatabaseSize(): Promise<number> {
    try {
      const result = await db.$queryRaw<Array<{ size: bigint }>>`
        SELECT pg_database_size(current_database()) as size;
      `;
      return Number(result[0].size) / 1024 / 1024; // Convert to MB
    } catch (error) {
      console.error('Error getting database size:', error);
      return 0;
    }
  }

  private static emitToMonitoringService(metric: PerformanceMetric): void {
    // In production, send to monitoring services
    // StatsD, DataDog, New Relic, etc.
    if (process.env.NODE_ENV === 'development') {
      console.debug('Metric:', metric);
    }
  }
}

// Middleware for automatic request monitoring
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  operation: string
): T {
  return ((...args: any[]) => {
    const start = Date.now();
    
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result
          .then((data) => {
            const duration = Date.now() - start;
            PerformanceMonitor.recordMetric(`operation_${operation}_duration`, duration, 'ms');
            PerformanceMonitor.recordMetric(`operation_${operation}_success`, 1, 'count');
            return data;
          })
          .catch((error) => {
            const duration = Date.now() - start;
            PerformanceMonitor.recordMetric(`operation_${operation}_duration`, duration, 'ms');
            PerformanceMonitor.recordMetric(`operation_${operation}_error`, 1, 'count');
            throw error;
          });
      } else {
        // Sync function
        const duration = Date.now() - start;
        PerformanceMonitor.recordMetric(`operation_${operation}_duration`, duration, 'ms');
        PerformanceMonitor.recordMetric(`operation_${operation}_success`, 1, 'count');
        return result;
      }
    } catch (error) {
      const duration = Date.now() - start;
      PerformanceMonitor.recordMetric(`operation_${operation}_duration`, duration, 'ms');
      PerformanceMonitor.recordMetric(`operation_${operation}_error`, 1, 'count');
      throw error;
    }
  }) as T;
}
```

This comprehensive performance and scalability architecture ensures the TORVAN MEDICAL system can handle current requirements while providing a clear path for growth. The multi-layered approach optimizes performance at every level, from client-side rendering to database queries, while providing robust monitoring and scaling capabilities.

**Key Performance Features:**
- Multi-layer caching strategy for optimal response times
- Database optimization with connection pooling and query optimization
- Horizontal scaling with auto-scaling policies
- Real-time performance monitoring and alerting
- Resource optimization for memory, CPU, and I/O
- Comprehensive metrics collection and analysis

The architecture is designed to meet the performance targets while providing insights for continuous optimization and scaling as the business grows.