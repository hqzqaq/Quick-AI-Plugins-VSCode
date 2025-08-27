/**
 * 防抖工具类
 * 提供防抖和节流功能，用于优化事件处理性能
 * @author hqzqaq
 * @version 1.0.0
 */

/**
 * 防抖函数类型定义
 */
export type DebouncedFunction<T extends (...args: any[]) => any> = {
    (...args: Parameters<T>): void;
    cancel(): void;
    flush(): void;
    pending(): boolean;
};

/**
 * 节流函数类型定义
 */
export type ThrottledFunction<T extends (...args: any[]) => any> = {
    (...args: Parameters<T>): void;
    cancel(): void;
    flush(): void;
    pending(): boolean;
};

/**
 * 防抖配置接口
 */
export interface DebounceOptions {
    /** 是否在延迟开始前调用函数 */
    leading?: boolean;
    /** 是否在延迟结束后调用函数 */
    trailing?: boolean;
    /** 最大等待时间 */
    maxWait?: number;
}

/**
 * 节流配置接口
 */
export interface ThrottleOptions {
    /** 是否在节流开始前调用函数 */
    leading?: boolean;
    /** 是否在节流结束后调用函数 */
    trailing?: boolean;
}

/**
 * 防抖和节流工具类
 */
export class DebounceUtils {
    
    /**
     * 创建防抖函数
     * @param func 要防抖的函数
     * @param wait 等待时间（毫秒）
     * @param options 防抖选项
     * @returns 防抖函数
     */
    public static debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number,
        options: DebounceOptions = {}
    ): DebouncedFunction<T> {
        const {
            leading = false,
            trailing = true,
            maxWait
        } = options;

        let timerId: NodeJS.Timeout | undefined;
        let maxTimerId: NodeJS.Timeout | undefined;
        let lastCallTime: number | undefined;
        let lastInvokeTime = 0;
        let lastArgs: Parameters<T> | undefined;
        let result: ReturnType<T>;

        /**
         * 调用函数
         */
        function invokeFunc(time: number): ReturnType<T> {
            const args = lastArgs!;
            lastArgs = undefined;
            lastInvokeTime = time;
            result = func.apply(undefined, args);
            return result;
        }

        /**
         * 开始计时器
         */
        function startTimer(pendingFunc: () => void, wait: number): NodeJS.Timeout {
            return setTimeout(pendingFunc, wait);
        }

        /**
         * 取消计时器
         */
        function cancelTimer(id: NodeJS.Timeout | undefined): void {
            if (id) {
                clearTimeout(id);
            }
        }

        /**
         * leading 边缘调用
         */
        function leadingEdge(time: number): ReturnType<T> {
            lastInvokeTime = time;
            timerId = startTimer(timerExpired, wait);
            return leading ? invokeFunc(time) : result;
        }

        /**
         * 计算剩余等待时间
         */
        function remainingWait(time: number): number {
            const timeSinceLastCall = time - lastCallTime!;
            const timeSinceLastInvoke = time - lastInvokeTime;
            const timeWaiting = wait - timeSinceLastCall;

            return maxWait !== undefined
                ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
                : timeWaiting;
        }

        /**
         * 检查是否应该调用函数
         */
        function shouldInvoke(time: number): boolean {
            const timeSinceLastCall = time - lastCallTime!;
            const timeSinceLastInvoke = time - lastInvokeTime;

            return (
                lastCallTime === undefined ||
                timeSinceLastCall >= wait ||
                timeSinceLastCall < 0 ||
                (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
            );
        }

        /**
         * 计时器过期处理
         */
        function timerExpired(): ReturnType<T> | undefined {
            const time = Date.now();
            if (shouldInvoke(time)) {
                return trailingEdge(time);
            }
            timerId = startTimer(timerExpired, remainingWait(time));
            return undefined;
        }

        /**
         * trailing 边缘调用
         */
        function trailingEdge(time: number): ReturnType<T> {
            timerId = undefined;

            if (trailing && lastArgs) {
                return invokeFunc(time);
            }
            lastArgs = undefined;
            return result;
        }

        /**
         * 取消防抖
         */
        function cancel(): void {
            if (timerId !== undefined) {
                cancelTimer(timerId);
            }
            if (maxTimerId !== undefined) {
                cancelTimer(maxTimerId);
            }
            lastInvokeTime = 0;
            lastArgs = undefined;
            lastCallTime = undefined;
            timerId = undefined;
            maxTimerId = undefined;
        }

        /**
         * 立即执行
         */
        function flush(): ReturnType<T> | undefined {
            return timerId === undefined ? result : trailingEdge(Date.now());
        }

        /**
         * 检查是否有待执行的调用
         */
        function pending(): boolean {
            return timerId !== undefined;
        }

        /**
         * 防抖主函数
         */
        function debounced(...args: Parameters<T>): void {
            const time = Date.now();
            const isInvoking = shouldInvoke(time);

            lastArgs = args;
            lastCallTime = time;

            if (isInvoking) {
                if (timerId === undefined) {
                    leadingEdge(lastCallTime);
                    return;
                }
                if (maxWait !== undefined) {
                    timerId = startTimer(timerExpired, wait);
                    return invokeFunc(lastCallTime);
                }
            }
            if (timerId === undefined) {
                timerId = startTimer(timerExpired, wait);
            }
        }

        debounced.cancel = cancel;
        debounced.flush = flush;
        debounced.pending = pending;

        return debounced;
    }

    /**
     * 创建节流函数
     * @param func 要节流的函数
     * @param wait 等待时间（毫秒）
     * @param options 节流选项
     * @returns 节流函数
     */
    public static throttle<T extends (...args: any[]) => any>(
        func: T,
        wait: number,
        options: ThrottleOptions = {}
    ): ThrottledFunction<T> {
        const {
            leading = true,
            trailing = true
        } = options;

        return DebounceUtils.debounce(func, wait, {
            leading,
            trailing,
            maxWait: wait
        }) as ThrottledFunction<T>;
    }

    /**
     * 创建简单的防抖函数（只支持 trailing）
     * @param func 要防抖的函数
     * @param delay 延迟时间（毫秒）
     * @returns 防抖函数
     */
    public static simpleDebounce<T extends (...args: any[]) => any>(
        func: T,
        delay: number
    ): (...args: Parameters<T>) => void {
        let timeoutId: NodeJS.Timeout | undefined;

        return (...args: Parameters<T>) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => func(...args), delay);
        };
    }

    /**
     * 创建简单的节流函数
     * @param func 要节流的函数
     * @param limit 限制时间（毫秒）
     * @returns 节流函数
     */
    public static simpleThrottle<T extends (...args: any[]) => any>(
        func: T,
        limit: number
    ): (...args: Parameters<T>) => void {
        let inThrottle = false;

        return (...args: Parameters<T>) => {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
        };
    }

    /**
     * 创建自适应防抖函数
     * 根据调用频率自动调整防抖时间
     * @param func 要防抖的函数
     * @param baseDelay 基础延迟时间
     * @param maxDelay 最大延迟时间
     * @param adaptationFactor 适应因子
     * @returns 自适应防抖函数
     */
    public static adaptiveDebounce<T extends (...args: any[]) => any>(
        func: T,
        baseDelay: number,
        maxDelay: number = baseDelay * 5,
        adaptationFactor: number = 1.5
    ): (...args: Parameters<T>) => void {
        let timeoutId: NodeJS.Timeout | undefined;
        let currentDelay = baseDelay;
        let lastCallTime = 0;

        return (...args: Parameters<T>) => {
            const now = Date.now();
            const timeSinceLastCall = now - lastCallTime;

            // 根据调用频率调整延迟时间
            if (timeSinceLastCall < currentDelay) {
                currentDelay = Math.min(currentDelay * adaptationFactor, maxDelay);
            } else {
                currentDelay = Math.max(currentDelay / adaptationFactor, baseDelay);
            }

            lastCallTime = now;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                func(...args);
                currentDelay = baseDelay; // 重置延迟时间
            }, currentDelay);
        };
    }

    /**
     * 创建批处理函数
     * 将多个调用批量处理
     * @param func 处理函数，接收参数数组
     * @param delay 批处理延迟时间
     * @param maxBatchSize 最大批处理大小
     * @returns 批处理函数
     */
    public static batch<T>(
        func: (items: T[]) => void,
        delay: number,
        maxBatchSize: number = 100
    ): (item: T) => void {
        let items: T[] = [];
        let timeoutId: NodeJS.Timeout | undefined;

        const processBatch = () => {
            if (items.length > 0) {
                const batch = items.slice();
                items = [];
                func(batch);
            }
            timeoutId = undefined;
        };

        return (item: T) => {
            items.push(item);

            // 如果达到最大批处理大小，立即处理
            if (items.length >= maxBatchSize) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = undefined;
                }
                processBatch();
                return;
            }

            // 设置延迟处理
            if (!timeoutId) {
                timeoutId = setTimeout(processBatch, delay);
            }
        };
    }

    /**
     * 创建限频函数
     * 在指定时间窗口内最多执行指定次数
     * @param func 要限频的函数
     * @param maxCalls 最大调用次数
     * @param timeWindow 时间窗口（毫秒）
     * @returns 限频函数
     */
    public static rateLimit<T extends (...args: any[]) => any>(
        func: T,
        maxCalls: number,
        timeWindow: number
    ): (...args: Parameters<T>) => boolean {
        const calls: number[] = [];

        return (...args: Parameters<T>): boolean => {
            const now = Date.now();
            
            // 移除时间窗口外的调用记录
            while (calls.length > 0 && calls[0] <= now - timeWindow) {
                calls.shift();
            }

            // 检查是否超过限制
            if (calls.length >= maxCalls) {
                return false; // 被限频
            }

            // 记录调用并执行函数
            calls.push(now);
            func(...args);
            return true; // 执行成功
        };
    }

    /**
     * 创建单次执行函数
     * 确保函数只执行一次
     * @param func 要执行的函数
     * @returns 单次执行函数
     */
    public static once<T extends (...args: any[]) => any>(
        func: T
    ): (...args: Parameters<T>) => ReturnType<T> | undefined {
        let called = false;
        let result: ReturnType<T>;

        return (...args: Parameters<T>): ReturnType<T> | undefined => {
            if (!called) {
                called = true;
                result = func(...args);
                return result;
            }
            return result;
        };
    }

    /**
     * 创建延迟执行函数
     * @param func 要延迟执行的函数
     * @param delay 延迟时间（毫秒）
     * @returns Promise
     */
    public static delay<T extends (...args: any[]) => any>(
        func: T,
        delay: number
    ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
        return (...args: Parameters<T>): Promise<ReturnType<T>> => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(func(...args));
                }, delay);
            });
        };
    }

    /**
     * 创建重试函数
     * @param func 要重试的函数
     * @param maxRetries 最大重试次数
     * @param retryDelay 重试延迟时间
     * @returns 重试函数
     */
    public static retry<T extends (...args: any[]) => Promise<any>>(
        func: T,
        maxRetries: number = 3,
        retryDelay: number = 1000
    ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
        return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
            let lastError: Error | undefined;

            for (let i = 0; i <= maxRetries; i++) {
                try {
                    return await func(...args);
                } catch (error) {
                    lastError = error as Error;
                    
                    if (i < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                }
            }

            throw lastError;
        };
    }
}

/**
 * 防抖装饰器
 * @param wait 等待时间（毫秒）
 * @param options 防抖选项
 */
export function debounce(wait: number, options?: DebounceOptions) {
    return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;
        descriptor.value = DebounceUtils.debounce(method, wait, options);
        return descriptor;
    };
}

/**
 * 节流装饰器
 * @param wait 等待时间（毫秒）
 * @param options 节流选项
 */
export function throttle(wait: number, options?: ThrottleOptions) {
    return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;
        descriptor.value = DebounceUtils.throttle(method, wait, options);
        return descriptor;
    };
}

/**
 * 单次执行装饰器
 */
export function once(_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = DebounceUtils.once(method);
    return descriptor;
}