/**
 * 性能监控工具类
 * 提供性能测量、监控和分析功能
 * @author hqzqaq
 * @version 1.0.0
 */

/**
 * 性能计时器接口
 */
export interface PerformanceTimer {
    /** 计时器名称 */
    name: string;
    /** 开始时间戳 */
    startTime: number;
    /** 结束时间戳 */
    endTime?: number;
    /** 执行时间（毫秒） */
    duration?: number;
    /** 额外数据 */
    metadata?: Record<string, any> | undefined;
}

/**
 * 性能统计信息接口
 */
export interface PerformanceStats {
    /** 总执行次数 */
    count: number;
    /** 总执行时间 */
    totalTime: number;
    /** 平均执行时间 */
    averageTime: number;
    /** 最小执行时间 */
    minTime: number;
    /** 最大执行时间 */
    maxTime: number;
    /** 最近执行时间 */
    lastTime: number;
    /** 执行时间分布 */
    distribution: Record<string, number>;
}

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
    /** 活动计时器映射 */
    private activeTimers: Map<string, PerformanceTimer> = new Map();
    
    /** 完成的计时器记录 */
    private completedTimers: PerformanceTimer[] = [];
    
    /** 性能统计数据 */
    private stats: Map<string, PerformanceStats> = new Map();
    
    /** 最大记录数量 */
    private maxRecords: number = 1000;
    
    /** 是否启用 */
    private enabled: boolean = true;

    /**
     * 构造函数
     * @param maxRecords 最大记录数量
     * @param enabled 是否启用监控
     */
    constructor(maxRecords: number = 1000, enabled: boolean = true) {
        this.maxRecords = maxRecords;
        this.enabled = enabled;
    }

    /**
     * 开始计时
     * @param name 计时器名称
     * @param metadata 额外数据
     */
    public start(name: string, metadata?: Record<string, any>): void {
        if (!this.enabled) {
            return;
        }

        const timer: PerformanceTimer = {
            name,
            startTime: performance.now(),
            metadata
        };

        this.activeTimers.set(name, timer);
    }

    /**
     * 结束计时
     * @param name 计时器名称
     * @returns 执行时间（毫秒）
     */
    public end(name: string): number | undefined {
        if (!this.enabled) {
            return undefined;
        }

        const timer = this.activeTimers.get(name);
        if (!timer) {
            console.warn(`[PerformanceMonitor] 未找到计时器: ${name}`);
            return undefined;
        }

        timer.endTime = performance.now();
        timer.duration = timer.endTime - timer.startTime;

        // 移除活动计时器
        this.activeTimers.delete(name);

        // 添加到完成记录
        this.addCompletedTimer(timer);

        // 更新统计信息
        this.updateStats(timer);

        return timer.duration;
    }

    /**
     * 测量函数执行时间
     * @param name 测量名称
     * @param func 要测量的函数
     * @param metadata 额外数据
     * @returns 函数执行结果和执行时间
     */
    public measure<T>(
        name: string, 
        func: () => T, 
        metadata?: Record<string, any>
    ): { result: T; duration: number } {
        this.start(name, metadata);
        const result = func();
        const duration = this.end(name) || 0;
        return { result, duration };
    }

    /**
     * 测量异步函数执行时间
     * @param name 测量名称
     * @param func 要测量的异步函数
     * @param metadata 额外数据
     * @returns 函数执行结果和执行时间
     */
    public async measureAsync<T>(
        name: string, 
        func: () => Promise<T>, 
        metadata?: Record<string, any>
    ): Promise<{ result: T; duration: number }> {
        this.start(name, metadata);
        const result = await func();
        const duration = this.end(name) || 0;
        return { result, duration };
    }

    /**
     * 获取指定名称的性能统计
     * @param name 统计名称
     * @returns 性能统计信息
     */
    public getStats(name: string): PerformanceStats | undefined {
        return this.stats.get(name);
    }

    /**
     * 获取所有性能统计
     * @returns 所有性能统计信息
     */
    public getAllStats(): Record<string, PerformanceStats> {
        const result: Record<string, PerformanceStats> = {};
        for (const [name, stats] of this.stats) {
            result[name] = { ...stats };
        }
        return result;
    }

    /**
     * 获取活动计时器列表
     * @returns 活动计时器数组
     */
    public getActiveTimers(): PerformanceTimer[] {
        return Array.from(this.activeTimers.values());
    }

    /**
     * 获取完成的计时器记录
     * @param name 可选的计时器名称过滤
     * @param limit 返回的最大记录数
     * @returns 计时器记录数组
     */
    public getCompletedTimers(name?: string, limit?: number): PerformanceTimer[] {
        let timers = this.completedTimers;

        if (name) {
            timers = timers.filter(timer => timer.name === name);
        }

        if (limit && limit > 0) {
            timers = timers.slice(-limit);
        }

        return [...timers]; // 返回副本
    }

    /**
     * 清除所有记录
     */
    public clear(): void {
        this.activeTimers.clear();
        this.completedTimers = [];
        this.stats.clear();
    }

    /**
     * 清除指定名称的记录
     * @param name 要清除的名称
     */
    public clearByName(name: string): void {
        // 清除活动计时器
        this.activeTimers.delete(name);
        
        // 清除完成的计时器
        this.completedTimers = this.completedTimers.filter(timer => timer.name !== name);
        
        // 清除统计信息
        this.stats.delete(name);
    }

    /**
     * 设置最大记录数量
     * @param maxRecords 最大记录数量
     */
    public setMaxRecords(maxRecords: number): void {
        this.maxRecords = maxRecords;
        this.trimRecords();
    }

    /**
     * 启用或禁用监控
     * @param enabled 是否启用
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        
        if (!enabled) {
            this.activeTimers.clear();
        }
    }

    /**
     * 检查是否启用
     * @returns 是否启用
     */
    public isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * 获取性能摘要
     * @returns 性能摘要信息
     */
    public getSummary(): {
        totalOperations: number;
        activeTimers: number;
        averageTime: number;
        slowestOperation: string | null;
        fastestOperation: string | null;
    } {
        let totalOperations = 0;
        let totalTime = 0;
        let slowestTime = 0;
        let fastestTime = Infinity;
        let slowestOperation: string | null = null;
        let fastestOperation: string | null = null;

        for (const [name, stats] of this.stats) {
            totalOperations += stats.count;
            totalTime += stats.totalTime;

            if (stats.averageTime > slowestTime) {
                slowestTime = stats.averageTime;
                slowestOperation = name;
            }

            if (stats.averageTime < fastestTime) {
                fastestTime = stats.averageTime;
                fastestOperation = name;
            }
        }

        return {
            totalOperations,
            activeTimers: this.activeTimers.size,
            averageTime: totalOperations > 0 ? totalTime / totalOperations : 0,
            slowestOperation,
            fastestOperation: fastestTime !== Infinity ? fastestOperation : null
        };
    }

    /**
     * 导出性能数据
     * @returns JSON格式的性能数据
     */
    public export(): string {
        return JSON.stringify({
            stats: this.getAllStats(),
            activeTimers: this.getActiveTimers(),
            completedTimers: this.completedTimers,
            summary: this.getSummary(),
            exportTime: Date.now()
        }, null, 2);
    }

    /**
     * 添加完成的计时器到记录
     * @param timer 计时器
     */
    private addCompletedTimer(timer: PerformanceTimer): void {
        this.completedTimers.push(timer);
        this.trimRecords();
    }

    /**
     * 更新统计信息
     * @param timer 计时器
     */
    private updateStats(timer: PerformanceTimer): void {
        if (!timer.duration) {
            return;
        }

        const name = timer.name;
        let stats = this.stats.get(name);

        if (!stats) {
            stats = {
                count: 0,
                totalTime: 0,
                averageTime: 0,
                minTime: Infinity,
                maxTime: 0,
                lastTime: 0,
                distribution: {}
            };
            this.stats.set(name, stats);
        }

        // 更新基本统计
        stats.count++;
        stats.totalTime += timer.duration;
        stats.averageTime = stats.totalTime / stats.count;
        stats.minTime = Math.min(stats.minTime, timer.duration);
        stats.maxTime = Math.max(stats.maxTime, timer.duration);
        stats.lastTime = timer.duration;

        // 更新时间分布
        const bucket = this.getTimeBucket(timer.duration);
        stats.distribution[bucket] = (stats.distribution[bucket] || 0) + 1;
    }

    /**
     * 获取时间分布桶
     * @param time 执行时间
     * @returns 分布桶名称
     */
    private getTimeBucket(time: number): string {
        if (time < 1) return '< 1ms';
        if (time < 10) return '1-10ms';
        if (time < 50) return '10-50ms';
        if (time < 100) return '50-100ms';
        if (time < 500) return '100-500ms';
        if (time < 1000) return '500ms-1s';
        if (time < 5000) return '1-5s';
        return '> 5s';
    }

    /**
     * 修剪记录数量
     */
    private trimRecords(): void {
        if (this.completedTimers.length > this.maxRecords) {
            this.completedTimers = this.completedTimers.slice(-this.maxRecords);
        }
    }
}

/**
 * 全局性能监控器实例
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * 性能测量装饰器
 * @param name 测量名称，默认使用方法名
 * @param metadata 额外数据
 */
export function measurePerformance(name?: string, metadata?: Record<string, any>) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;
        const measureName = name || `${target.constructor.name}.${propertyName}`;

        descriptor.value = function (...args: any[]) {
            return globalPerformanceMonitor.measure(measureName, () => {
                return method.apply(this, args);
            }, metadata).result;
        };

        return descriptor;
    };
}

/**
 * 异步性能测量装饰器
 * @param name 测量名称，默认使用方法名
 * @param metadata 额外数据
 */
export function measureAsyncPerformance(name?: string, metadata?: Record<string, any>) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;
        const measureName = name || `${target.constructor.name}.${propertyName}`;

        descriptor.value = async function (...args: any[]) {
            const result = await globalPerformanceMonitor.measureAsync(measureName, () => {
                return method.apply(this, args);
            }, metadata);
            return result.result;
        };

        return descriptor;
    };
}

/**
 * 创建性能监控器实例
 * @param maxRecords 最大记录数量
 * @param enabled 是否启用
 * @returns 性能监控器实例
 */
export function createPerformanceMonitor(maxRecords?: number, enabled?: boolean): PerformanceMonitor {
    return new PerformanceMonitor(maxRecords, enabled);
}

/**
 * 简单的性能测量函数
 * @param name 测量名称
 * @param func 要测量的函数
 * @returns 执行结果和执行时间
 */
export function measure<T>(name: string, func: () => T): { result: T; duration: number } {
    return globalPerformanceMonitor.measure(name, func);
}

/**
 * 简单的异步性能测量函数
 * @param name 测量名称
 * @param func 要测量的异步函数
 * @returns 执行结果和执行时间
 */
export async function measureAsync<T>(name: string, func: () => Promise<T>): Promise<{ result: T; duration: number }> {
    return globalPerformanceMonitor.measureAsync(name, func);
}

/**
 * 内存使用情况监控类
 */
export class MemoryMonitor {
    /** 内存快照历史 */
    private snapshots: Array<{
        timestamp: number;
        usage: NodeJS.MemoryUsage;
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
    }> = [];

    /** 最大快照数量 */
    private maxSnapshots: number = 100;

    /**
     * 构造函数
     * @param maxSnapshots 最大快照数量
     */
    constructor(maxSnapshots: number = 100) {
        this.maxSnapshots = maxSnapshots;
    }

    /**
     * 获取当前内存使用情况
     * @returns 内存使用情况
     */
    public getCurrentUsage(): NodeJS.MemoryUsage {
        return process.memoryUsage();
    }

    /**
     * 创建内存快照
     */
    public takeSnapshot(): void {
        const usage = this.getCurrentUsage();
        const snapshot = {
            timestamp: Date.now(),
            usage,
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external,
            rss: usage.rss
        };

        this.snapshots.push(snapshot);

        // 限制快照数量
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots = this.snapshots.slice(-this.maxSnapshots);
        }
    }

    /**
     * 获取内存使用趋势
     * @returns 内存使用趋势分析
     */
    public getUsageTrend(): {
        totalSnapshots: number;
        timeSpan: number;
        heapUsedTrend: 'increasing' | 'decreasing' | 'stable';
        averageHeapUsed: number;
        peakHeapUsed: number;
        memoryLeakSuspicion: boolean;
    } {
        if (this.snapshots.length < 2) {
            return {
                totalSnapshots: this.snapshots.length,
                timeSpan: 0,
                heapUsedTrend: 'stable',
                averageHeapUsed: 0,
                peakHeapUsed: 0,
                memoryLeakSuspicion: false
            };
        }

        const first = this.snapshots[0];
        const last = this.snapshots[this.snapshots.length - 1];
        const timeSpan = last.timestamp - first.timestamp;

        const heapUsedValues = this.snapshots.map(s => s.heapUsed);
        const averageHeapUsed = heapUsedValues.reduce((a, b) => a + b, 0) / heapUsedValues.length;
        const peakHeapUsed = Math.max(...heapUsedValues);

        // 简单的趋势分析
        let heapUsedTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        const diff = last.heapUsed - first.heapUsed;
        const threshold = averageHeapUsed * 0.1; // 10% 阈值

        if (diff > threshold) {
            heapUsedTrend = 'increasing';
        } else if (diff < -threshold) {
            heapUsedTrend = 'decreasing';
        }

        // 内存泄漏嫌疑检测
        const memoryLeakSuspicion = heapUsedTrend === 'increasing' && 
                                   (last.heapUsed / first.heapUsed) > 1.5;

        return {
            totalSnapshots: this.snapshots.length,
            timeSpan,
            heapUsedTrend,
            averageHeapUsed,
            peakHeapUsed,
            memoryLeakSuspicion
        };
    }

    /**
     * 格式化内存大小
     * @param bytes 字节数
     * @returns 格式化后的内存大小字符串
     */
    public formatMemorySize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * 获取格式化的当前内存使用情况
     * @returns 格式化的内存使用情况
     */
    public getFormattedCurrentUsage(): Record<string, string> {
        const usage = this.getCurrentUsage();
        return {
            rss: this.formatMemorySize(usage.rss),
            heapTotal: this.formatMemorySize(usage.heapTotal),
            heapUsed: this.formatMemorySize(usage.heapUsed),
            external: this.formatMemorySize(usage.external)
        };
    }

    /**
     * 清除所有快照
     */
    public clearSnapshots(): void {
        this.snapshots = [];
    }
}

/**
 * 全局内存监控器实例
 */
export const globalMemoryMonitor = new MemoryMonitor();