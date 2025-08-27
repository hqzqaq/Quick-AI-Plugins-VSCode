/**
 * 缓存管理模块
 * 提供高性能的缓存机制，支持TTL过期、LRU淘汰策略等
 * @author hqzqaq
 * @version 1.0.0
 */

import {
    CacheEntry,
    CacheManagerConfig,
    PerformanceMetrics
} from './types';

/**
 * 缓存管理器类
 * 实现了多级缓存机制、自动过期清理、性能监控等功能
 */
export class CacheManager {
    /** 默认缓存配置 */
    private static readonly DEFAULT_CONFIG: CacheManagerConfig = {
        settingsCacheTtl: 1000,        // 设置缓存1秒
        projectPathCacheTtl: 5000,     // 项目路径缓存5秒
        editorStateCacheTtl: 5000,     // 编辑器状态缓存5秒
        maxCacheSize: 100              // 最大缓存条目数
    };

    /** 缓存存储映射 */
    private readonly cache: Map<string, CacheEntry> = new Map();

    /** 访问时间记录（用于LRU淘汰） */
    private readonly accessTimes: Map<string, number> = new Map();

    /** 缓存配置 */
    private config: CacheManagerConfig;

    /** 性能指标 */
    private metrics: PerformanceMetrics = {
        commandExecutionCount: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        errorCount: 0,
        lastUpdated: Date.now()
    };

    /** 缓存统计信息 */
    private stats = {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        evictions: 0
    };

    /** 清理定时器 */
    private cleanupTimer: NodeJS.Timeout | undefined;

    /** 单例实例 */
    private static instance: CacheManager | undefined;

    /**
     * 私有构造函数，实现单例模式
     * @param config 缓存配置
     */
    private constructor(config?: Partial<CacheManagerConfig>) {
        this.config = { ...CacheManager.DEFAULT_CONFIG, ...config };
        this.startCleanupTimer();
    }

    /**
     * 获取缓存管理器实例（单例模式）
     * @param config 缓存配置
     * @returns 缓存管理器实例
     */
    public static getInstance(config?: Partial<CacheManagerConfig>): CacheManager {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager(config);
        }
        return CacheManager.instance;
    }

    /**
     * 设置缓存项
     * @param key 缓存键
     * @param data 要缓存的数据
     * @param ttl 过期时间（毫秒），可选，默认使用配置中的settingsCacheTtl
     * @returns 设置成功返回true
     */
    public set<T>(key: string, data: T, ttl?: number): boolean {
        try {
            // 检查缓存大小限制
            if (this.cache.size >= this.config.maxCacheSize && !this.cache.has(key)) {
                this.evictLeastRecentlyUsed();
            }

            // 创建缓存条目
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
                ttl: ttl || this.config.settingsCacheTtl,
                key
            };

            // 存储缓存
            this.cache.set(key, entry);
            this.accessTimes.set(key, Date.now());

            this.logDebug(`缓存设置成功: ${key}`, { ttl: entry.ttl });
            return true;

        } catch (error) {
            this.logError('缓存设置失败', error as Error, { key });
            return false;
        }
    }

    /**
     * 获取缓存项
     * @param key 缓存键
     * @returns 缓存的数据，如果不存在或已过期则返回undefined
     */
    public get<T>(key: string): T | undefined {
        this.stats.totalRequests++;

        try {
            const entry = this.cache.get(key) as CacheEntry<T> | undefined;

            if (!entry) {
                this.stats.cacheMisses++;
                this.updateCacheHitRate();
                return undefined;
            }

            // 检查是否过期
            if (this.isExpired(entry)) {
                this.delete(key);
                this.stats.cacheMisses++;
                this.updateCacheHitRate();
                return undefined;
            }

            // 更新访问时间
            this.accessTimes.set(key, Date.now());
            this.stats.cacheHits++;
            this.updateCacheHitRate();

            this.logDebug(`缓存命中: ${key}`);
            return entry.data;

        } catch (error) {
            this.logError('缓存获取失败', error as Error, { key });
            this.stats.cacheMisses++;
            this.updateCacheHitRate();
            return undefined;
        }
    }

    /**
     * 删除缓存项
     * @param key 缓存键
     * @returns 删除成功返回true
     */
    public delete(key: string): boolean {
        try {
            const deleted = this.cache.delete(key);
            this.accessTimes.delete(key);

            if (deleted) {
                this.logDebug(`缓存删除成功: ${key}`);
            }

            return deleted;

        } catch (error) {
            this.logError('缓存删除失败', error as Error, { key });
            return false;
        }
    }

    /**
     * 检查缓存项是否存在且未过期
     * @param key 缓存键
     * @returns 存在且未过期返回true
     */
    public has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }

        if (this.isExpired(entry)) {
            this.delete(key);
            return false;
        }

        return true;
    }

    /**
     * 清空所有缓存
     */
    public clear(): void {
        try {
            const size = this.cache.size;
            this.cache.clear();
            this.accessTimes.clear();
            this.logInfo(`清空所有缓存，共清理 ${size} 个条目`);

        } catch (error) {
            this.logError('清空缓存失败', error as Error);
        }
    }

    /**
     * 获取缓存大小
     * @returns 当前缓存条目数量
     */
    public size(): number {
        return this.cache.size;
    }

    /**
     * 获取所有缓存键
     * @returns 缓存键数组
     */
    public keys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * 设置项目路径缓存
     * @param projectPath 项目路径
     * @param data 要缓存的数据
     */
    public setProjectPathCache<T>(projectPath: string, data: T): void {
        const key = `project_path:${projectPath}`;
        this.set(key, data, this.config.projectPathCacheTtl);
    }

    /**
     * 获取项目路径缓存
     * @param projectPath 项目路径
     * @returns 缓存的数据
     */
    public getProjectPathCache<T>(projectPath: string): T | undefined {
        const key = `project_path:${projectPath}`;
        return this.get<T>(key);
    }

    /**
     * 设置编辑器状态缓存
     * @param editorId 编辑器ID
     * @param data 要缓存的状态数据
     */
    public setEditorStateCache<T>(editorId: string, data: T): void {
        const key = `editor_state:${editorId}`;
        this.set(key, data, this.config.editorStateCacheTtl);
    }

    /**
     * 获取编辑器状态缓存
     * @param editorId 编辑器ID
     * @returns 缓存的状态数据
     */
    public getEditorStateCache<T>(editorId: string): T | undefined {
        const key = `editor_state:${editorId}`;
        return this.get<T>(key);
    }

    /**
     * 设置设置缓存
     * @param settingKey 设置键
     * @param data 要缓存的设置数据
     */
    public setSettingsCache<T>(settingKey: string, data: T): void {
        const key = `settings:${settingKey}`;
        this.set(key, data, this.config.settingsCacheTtl);
    }

    /**
     * 获取设置缓存
     * @param settingKey 设置键
     * @returns 缓存的设置数据
     */
    public getSettingsCache<T>(settingKey: string): T | undefined {
        const key = `settings:${settingKey}`;
        return this.get<T>(key);
    }

    /**
     * 更新缓存配置
     * @param newConfig 新的配置
     */
    public updateConfig(newConfig: Partial<CacheManagerConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.logInfo('缓存配置已更新', this.config);
    }

    /**
     * 获取性能指标
     * @returns 当前性能指标
     */
    public getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * 获取缓存统计信息
     * @returns 缓存统计信息
     */
    public getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            hitRate: this.calculateHitRate(),
            config: this.config
        };
    }

    /**
     * 预热缓存
     * @param preloadData 预加载数据映射
     */
    public async preload(preloadData: Map<string, { data: any; ttl?: number }>): Promise<void> {
        try {
            for (const [key, { data, ttl }] of preloadData) {
                this.set(key, data, ttl);
            }
            this.logInfo(`缓存预热完成，加载了 ${preloadData.size} 个条目`);

        } catch (error) {
            this.logError('缓存预热失败', error as Error);
        }
    }

    /**
     * 检查缓存项是否过期
     * @param entry 缓存条目
     * @returns 过期返回true
     */
    private isExpired(entry: CacheEntry): boolean {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    /**
     * 淘汰最近最少使用的缓存项
     */
    private evictLeastRecentlyUsed(): void {
        let oldestKey: string | undefined;
        let oldestTime = Date.now();

        for (const [key, accessTime] of this.accessTimes) {
            if (accessTime < oldestTime) {
                oldestTime = accessTime;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.delete(oldestKey);
            this.stats.evictions++;
            this.logDebug(`LRU淘汰缓存项: ${oldestKey}`);
        }
    }

    /**
     * 清理过期的缓存项
     */
    private cleanupExpiredEntries(): void {
        let cleanedCount = 0;
        const now = Date.now();

        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > entry.ttl) {
                this.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            this.logDebug(`清理过期缓存，共清理 ${cleanedCount} 个条目`);
        }
    }

    /**
     * 启动清理定时器
     */
    private startCleanupTimer(): void {
        // 每30秒清理一次过期缓存
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredEntries();
        }, 30000);
    }

    /**
     * 停止清理定时器
     */
    private stopCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
    }

    /**
     * 计算缓存命中率
     * @returns 命中率（百分比）
     */
    private calculateHitRate(): number {
        if (this.stats.totalRequests === 0) {
            return 0;
        }
        return (this.stats.cacheHits / this.stats.totalRequests) * 100;
    }

    /**
     * 更新缓存命中率指标
     */
    private updateCacheHitRate(): void {
        this.metrics.cacheHitRate = this.calculateHitRate();
        this.metrics.lastUpdated = Date.now();
    }

    /**
     * 记录调试日志
     * @param message 日志消息
     * @param data 额外数据
     */
    private logDebug(message: string, data?: any): void {
        console.debug(`[QuickAI:Cache] ${message}`, data);
    }

    /**
     * 记录信息日志
     * @param message 日志消息
     * @param data 额外数据
     */
    private logInfo(message: string, data?: any): void {
        console.log(`[QuickAI:Cache] ${message}`, data);
    }

    /**
     * 记录错误日志
     * @param message 错误消息
     * @param error 错误对象
     * @param context 上下文信息
     */
    private logError(message: string, error: Error, context?: any): void {
        console.error(`[QuickAI:Cache] ${message}`, {
            error: error.message,
            stack: error.stack,
            context
        });
        this.metrics.errorCount++;
    }

    /**
     * 销毁缓存管理器
     * 清理所有资源
     */
    public dispose(): void {
        this.stopCleanupTimer();
        this.clear();
        CacheManager.instance = undefined;
        this.logInfo('缓存管理器已销毁');
    }
}

/**
 * 缓存装饰器
 * 为方法添加缓存功能
 * @param ttl 缓存过期时间（毫秒）
 * @param keyGenerator 缓存键生成函数
 */
export function Cacheable(ttl: number = 1000, keyGenerator?: (...args: any[]) => string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;
        const cache = CacheManager.getInstance();

        descriptor.value = function (...args: any[]) {
            // 生成缓存键
            const cacheKey = keyGenerator 
                ? keyGenerator(...args)
                : `${target.constructor.name}.${propertyName}:${JSON.stringify(args)}`;

            // 尝试从缓存获取
            const cachedResult = cache.get(cacheKey);
            if (cachedResult !== undefined) {
                return cachedResult;
            }

            // 执行原方法
            const result = method.apply(this, args);

            // 缓存结果
            if (result !== undefined) {
                cache.set(cacheKey, result, ttl);
            }

            return result;
        };

        return descriptor;
    };
}

/**
 * 异步缓存装饰器
 * 为异步方法添加缓存功能
 * @param ttl 缓存过期时间（毫秒）
 * @param keyGenerator 缓存键生成函数
 */
export function AsyncCacheable(ttl: number = 1000, keyGenerator?: (...args: any[]) => string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;
        const cache = CacheManager.getInstance();

        descriptor.value = async function (...args: any[]) {
            // 生成缓存键
            const cacheKey = keyGenerator 
                ? keyGenerator(...args)
                : `${target.constructor.name}.${propertyName}:${JSON.stringify(args)}`;

            // 尝试从缓存获取
            const cachedResult = cache.get(cacheKey);
            if (cachedResult !== undefined) {
                return cachedResult;
            }

            // 执行原方法
            const result = await method.apply(this, args);

            // 缓存结果
            if (result !== undefined) {
                cache.set(cacheKey, result, ttl);
            }

            return result;
        };

        return descriptor;
    };
}