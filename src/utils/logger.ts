/**
 * 日志工具类
 * 提供统一的日志记录功能，支持不同级别和格式化输出
 * @author hqzqaq
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import { LogLevel, LogEntry } from '../types';

/**
 * 日志记录器类
 */
export class Logger {
    /** 日志源标识 */
    private readonly source: string;
    
    /** 当前日志级别 */
    private logLevel: LogLevel;
    
    /** 是否启用控制台输出 */
    private enableConsole: boolean;
    
    /** 是否启用输出窗口输出 */
    private enableOutputChannel: boolean;
    
    /** 日志条目缓存 */
    private logCache: LogEntry[] = [];
    
    /** 最大缓存条目数 */
    private maxCacheSize: number = 1000;
    
    /** VS Code输出通道 */
    private static outputChannel: vscode.OutputChannel | undefined;
    
    /** 日志级别优先级映射 */
    private static readonly LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 1,
        [LogLevel.WARN]: 2,
        [LogLevel.ERROR]: 3
    };

    /** 日志级别颜色映射（用于控制台输出） */
    private static readonly LOG_LEVEL_COLORS: Record<LogLevel, string> = {
        [LogLevel.DEBUG]: '\x1b[36m', // 青色
        [LogLevel.INFO]: '\x1b[32m',  // 绿色
        [LogLevel.WARN]: '\x1b[33m',  // 黄色
        [LogLevel.ERROR]: '\x1b[31m'  // 红色
    };

    /** 重置颜色代码 */
    private static readonly RESET_COLOR = '\x1b[0m';

    /**
     * 构造函数
     * @param source 日志源标识
     * @param logLevel 日志级别，默认为INFO
     * @param enableConsole 是否启用控制台输出，默认为true
     * @param enableOutputChannel 是否启用VS Code输出窗口输出，默认为true
     */
    constructor(
        source: string, 
        logLevel: LogLevel = LogLevel.INFO, 
        enableConsole: boolean = true,
        enableOutputChannel: boolean = true
    ) {
        this.source = source;
        this.logLevel = logLevel;
        this.enableConsole = enableConsole;
        this.enableOutputChannel = enableOutputChannel;
        
        // 确保输出通道已创建
        Logger.ensureOutputChannel();
    }
    
    /**
     * 确保VS Code输出通道已创建
     */
    private static ensureOutputChannel(): void {
        if (!Logger.outputChannel && typeof vscode !== 'undefined') {
            Logger.outputChannel = vscode.window.createOutputChannel('QuickAI');
        }
    }

    /**
     * 记录调试日志
     * @param message 日志消息
     * @param data 额外数据
     */
    public debug(message: string, data?: any): void {
        this.log(LogLevel.DEBUG, message, data);
    }

    /**
     * 记录信息日志
     * @param message 日志消息
     * @param data 额外数据
     */
    public info(message: string, data?: any): void {
        this.log(LogLevel.INFO, message, data);
    }

    /**
     * 记录警告日志
     * @param message 日志消息
     * @param data 额外数据
     */
    public warn(message: string, data?: any): void {
        this.log(LogLevel.WARN, message, data);
    }

    /**
     * 记录错误日志
     * @param message 日志消息
     * @param error 错误对象或额外数据
     * @param data 额外数据
     */
    public error(message: string, error?: Error | any, data?: any): void {
        let logData = data;
        let stack: string | undefined;

        if (error instanceof Error) {
            stack = error.stack;
            logData = {
                ...data,
                error: error.message,
                name: error.name
            };
        } else if (error !== undefined) {
            logData = error;
        }

        this.log(LogLevel.ERROR, message, logData, stack);
    }

    /**
     * 记录日志
     * @param level 日志级别
     * @param message 日志消息
     * @param data 额外数据
     * @param stack 错误堆栈
     */
    private log(level: LogLevel, message: string, data?: any, stack?: string): void {
        // 检查日志级别
        if (!this.shouldLog(level)) {
            return;
        }

        // 创建日志条目
        const entry: LogEntry = {
            level,
            message,
            timestamp: Date.now(),
            source: this.source,
            data,
            stack
        };

        // 添加到缓存
        this.addToCache(entry);

        // 输出日志
        this.outputToConsole(entry);
    }

    /**
     * 检查是否应该记录该级别的日志
     * @param level 日志级别
     * @returns 应该记录返回true
     */
    private shouldLog(level: LogLevel): boolean {
        const currentPriority = Logger.LOG_LEVEL_PRIORITY[this.logLevel];
        const logPriority = Logger.LOG_LEVEL_PRIORITY[level];
        return logPriority >= currentPriority;
    }

    /**
     * 添加日志条目到缓存
     * @param entry 日志条目
     */
    private addToCache(entry: LogEntry): void {
        this.logCache.push(entry);
        
        // 限制缓存大小
        if (this.logCache.length > this.maxCacheSize) {
            this.logCache = this.logCache.slice(-this.maxCacheSize);
        }
    }

    /**
     * 格式化数据为字符串
     * @param data 要格式化的数据
     * @returns 格式化后的字符串
     */
    private formatData(data: any): string {
        try {
            if (typeof data === 'string') {
                return data;
            }
            return JSON.stringify(data, null, 2);
        } catch {
            return String(data);
        }
    }

    /**
     * 输出日志到控制台和VS Code输出窗口
     * @param entry 日志条目
     */
    private outputToConsole(entry: LogEntry): void {
        const timestamp = new Date(entry.timestamp).toISOString();
        const levelColor = Logger.LOG_LEVEL_COLORS[entry.level];
        const levelStr = entry.level.toUpperCase().padEnd(5);
        
        // 控制台输出（带颜色）
        if (this.enableConsole) {
            let consoleOutput = `${levelColor}[${timestamp}] ${levelStr} [${entry.source}]${Logger.RESET_COLOR} ${entry.message}`;
            
            // 添加额外数据
            if (entry.data !== undefined) {
                consoleOutput += ` ${this.formatData(entry.data)}`;
            }
            
            // 选择合适的控制台方法
            switch (entry.level) {
                case LogLevel.DEBUG:
                    console.debug(consoleOutput);
                    break;
                case LogLevel.INFO:
                    console.log(consoleOutput);
                    break;
                case LogLevel.WARN:
                    console.warn(consoleOutput);
                    break;
                case LogLevel.ERROR:
                    console.error(consoleOutput);
                    if (entry.stack) {
                        console.error(entry.stack);
                    }
                    break;
            }
        }
        
        // VS Code输出窗口输出（无颜色）
        if (this.enableOutputChannel && Logger.outputChannel) {
            let outputText = `[${timestamp}] ${levelStr} [${entry.source}] ${entry.message}`;
            
            // 添加额外数据
            if (entry.data !== undefined) {
                outputText += ` ${this.formatData(entry.data)}`;
            }
            
            Logger.outputChannel.appendLine(outputText);
            
            // 如果是错误级别，添加堆栈信息
            if (entry.level === LogLevel.ERROR && entry.stack) {
                Logger.outputChannel.appendLine(entry.stack);
            }
        }
    }

    /**
     * 设置日志级别
     * @param level 新的日志级别
     */
    public setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    /**
     * 获取当前日志级别
     * @returns 当前日志级别
     */
    public getLogLevel(): LogLevel {
        return this.logLevel;
    }

    /**
     * 设置是否启用控制台输出
     * @param enabled 是否启用
     */
    public setConsoleEnabled(enabled: boolean): void {
        this.enableConsole = enabled;
    }
    
    /**
     * 设置是否启用VS Code输出窗口输出
     * @param enabled 是否启用
     */
    public setOutputChannelEnabled(enabled: boolean): void {
        this.enableOutputChannel = enabled;
    }
    
    /**
     * 获取是否启用VS Code输出窗口输出
     * @returns 是否启用
     */
    public isOutputChannelEnabled(): boolean {
        return this.enableOutputChannel;
    }
    
    /**
     * 显示VS Code输出窗口
     */
    public showOutputChannel(): void {
        Logger.outputChannel?.show();
    }

    /**
     * 获取日志缓存
     * @param level 可选的日志级别过滤
     * @param limit 返回的最大条目数
     * @returns 日志条目数组
     */
    public getLogs(level?: LogLevel, limit?: number): LogEntry[] {
        let logs = this.logCache;

        // 按级别过滤
        if (level) {
            logs = logs.filter(entry => entry.level === level);
        }

        // 限制数量
        if (limit && limit > 0) {
            logs = logs.slice(-limit);
        }

        return [...logs]; // 返回副本
    }

    /**
     * 清空日志缓存
     */
    public clearLogs(): void {
        this.logCache = [];
    }

    /**
     * 设置最大缓存大小
     * @param size 最大缓存条目数
     */
    public setMaxCacheSize(size: number): void {
        this.maxCacheSize = Math.max(0, size);
        
        // 如果当前缓存超出限制，则截断
        if (this.logCache.length > this.maxCacheSize) {
            this.logCache = this.logCache.slice(-this.maxCacheSize);
        }
    }

    /**
     * 获取日志统计信息
     * @returns 日志统计信息
     */
    public getLogStats(): {
        total: number;
        byLevel: Record<LogLevel, number>;
        oldestTimestamp?: number;
        newestTimestamp?: number;
    } {
        const stats = {
            total: this.logCache.length,
            byLevel: {
                [LogLevel.DEBUG]: 0,
                [LogLevel.INFO]: 0,
                [LogLevel.WARN]: 0,
                [LogLevel.ERROR]: 0
            } as Record<LogLevel, number>,
            oldestTimestamp: undefined as number | undefined,
            newestTimestamp: undefined as number | undefined
        };

        if (this.logCache.length > 0) {
            stats.oldestTimestamp = this.logCache[0].timestamp;
            stats.newestTimestamp = this.logCache[this.logCache.length - 1].timestamp;

            for (const entry of this.logCache) {
                stats.byLevel[entry.level]++;
            }
        }

        return stats;
    }

    /**
     * 导出日志为JSON字符串
     * @param level 可选的日志级别过滤
     * @param limit 导出的最大条目数
     * @returns JSON格式的日志字符串
     */
    public exportLogs(level?: LogLevel, limit?: number): string {
        const logs = this.getLogs(level, limit);
        return JSON.stringify(logs, null, 2);
    }

    /**
     * 创建子记录器
     * @param subSource 子源标识
     * @returns 新的日志记录器实例
     */
    public createSubLogger(subSource: string): Logger {
        const fullSource = `${this.source}:${subSource}`;
        return new Logger(fullSource, this.logLevel, this.enableConsole);
    }
    
    /**
     * 释放输出通道资源
     */
    public static disposeOutputChannel(): void {
        if (Logger.outputChannel) {
            Logger.outputChannel.dispose();
            Logger.outputChannel = undefined;
        }
    }
}

/**
 * 日志管理器类
 * 管理多个日志记录器实例
 */
export class LoggerManager {
    /** 日志记录器实例映射 */
    private static loggers: Map<string, Logger> = new Map();
    
    /** 全局日志级别 */
    private static globalLogLevel: LogLevel = LogLevel.INFO;
    
    /** 全局控制台输出开关 */
    private static globalConsoleEnabled: boolean = true;
    
    /** 全局VS Code输出窗口输出开关 */
    private static globalOutputChannelEnabled: boolean = true;

    /**
     * 获取或创建日志记录器
     * @param source 日志源标识
     * @returns 日志记录器实例
     */
    public static getLogger(source: string): Logger {
        if (!LoggerManager.loggers.has(source)) {
            const logger = new Logger(
                source, 
                LoggerManager.globalLogLevel, 
                LoggerManager.globalConsoleEnabled,
                LoggerManager.globalOutputChannelEnabled
            );
            LoggerManager.loggers.set(source, logger);
        }
        
        return LoggerManager.loggers.get(source)!;
    }

    /**
     * 设置全局日志级别
     * @param level 日志级别
     */
    public static setGlobalLogLevel(level: LogLevel): void {
        LoggerManager.globalLogLevel = level;
        
        // 更新所有现有记录器的日志级别
        for (const logger of LoggerManager.loggers.values()) {
            logger.setLogLevel(level);
        }
    }

    /**
     * 设置全局控制台输出开关
     * @param enabled 是否启用
     */
    public static setGlobalConsoleEnabled(enabled: boolean): void {
        LoggerManager.globalConsoleEnabled = enabled;
        
        // 更新所有现有记录器的控制台输出设置
        for (const logger of LoggerManager.loggers.values()) {
            logger.setConsoleEnabled(enabled);
        }
    }
    
    /**
     * 设置全局VS Code输出窗口输出开关
     * @param enabled 是否启用
     */
    public static setGlobalOutputChannelEnabled(enabled: boolean): void {
        LoggerManager.globalOutputChannelEnabled = enabled;
        
        // 更新所有现有记录器的VS Code输出窗口输出设置
        for (const logger of LoggerManager.loggers.values()) {
            logger.setOutputChannelEnabled(enabled);
        }
    }
    
    /**
     * 显示VS Code输出窗口
     */
    public static showOutputChannel(): void {
        // 获取任意一个记录器并调用其showOutputChannel方法
        if (LoggerManager.loggers.size > 0) {
            const logger = LoggerManager.loggers.values().next().value;
            logger?.showOutputChannel();
        }
    }

    /**
     * 获取所有日志记录器的统计信息
     * @returns 统计信息对象
     */
    public static getAllLogStats(): Record<string, any> {
        const stats: Record<string, any> = {};
        
        for (const [source, logger] of LoggerManager.loggers) {
            stats[source] = logger.getLogStats();
        }
        
        return stats;
    }

    /**
     * 清空所有日志记录器的缓存
     */
    public static clearAllLogs(): void {
        for (const logger of LoggerManager.loggers.values()) {
            logger.clearLogs();
        }
    }

    /**
     * 导出所有日志记录器的日志
     * @returns 所有日志的JSON字符串
     */
    public static exportAllLogs(): string {
        const allLogs: Record<string, LogEntry[]> = {};
        
        for (const [source, logger] of LoggerManager.loggers) {
            allLogs[source] = logger.getLogs();
        }
        
        return JSON.stringify(allLogs, null, 2);
    }

    /**
     * 移除指定的日志记录器
     * @param source 日志源标识
     */
    public static removeLogger(source: string): void {
        LoggerManager.loggers.delete(source);
    }

    /**
     * 获取所有日志记录器的源标识列表
     * @returns 源标识数组
     */
    public static getLoggerSources(): string[] {
        return Array.from(LoggerManager.loggers.keys());
    }

    /**
     * 销毁所有日志记录器
     */
    public static dispose(): void {
        LoggerManager.loggers.clear();
        // 安全地释放输出通道
        Logger.disposeOutputChannel();
    }
}

/**
 * 创建全局日志记录器的便捷函数
 */
export const createLogger = (source: string): Logger => {
    return LoggerManager.getLogger(source);
};

/**
 * 获取QuickAI插件的主日志记录器
 */
export const getQuickAILogger = (): Logger => {
    return LoggerManager.getLogger('QuickAI');
};