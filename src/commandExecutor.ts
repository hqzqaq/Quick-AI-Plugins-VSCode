/**
 * 跨平台命令执行模块
 * 负责构建和执行启动外部编辑器的命令，支持Windows、macOS、Linux
 * @author hqzqaq
 * @version 1.0.0
 */

import { spawn, exec, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import {
    CommandExecutionParams,
    CommandExecutionResult,
    PlatformInfo,
    EditorConfig,
    CommandBuilder,
    ErrorHandler
} from './types';
import { CacheManager, Cacheable } from './cacheManager';

/**
 * 命令执行器类
 * 提供跨平台的外部编辑器启动功能
 */
export class CommandExecutor {
    /** 缓存管理器实例 */
    private readonly cacheManager: CacheManager;

    /** 平台信息 */
    private readonly platformInfo: PlatformInfo;

    /** 执行统计信息 */
    private readonly executionStats = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0
    };

    /** 错误处理器 */
    private errorHandler: ErrorHandler | undefined;

    /** 正在运行的进程映射 */
    private readonly runningProcesses: Map<string, ChildProcess> = new Map();

    /** 命令构建器映射 */
    private readonly commandBuilders: Map<string, CommandBuilder> = new Map();

    /** 默认超时时间（毫秒） */
    private static readonly DEFAULT_TIMEOUT = 10000;

    /**
     * 构造函数
     * @param cacheManager 缓存管理器实例
     */
    constructor(cacheManager: CacheManager) {
        this.cacheManager = cacheManager;
        this.platformInfo = this.initializePlatformInfo();
        this.initializeCommandBuilders();
    }

    /**
     * 执行跳转到外部编辑器的命令
     * @param params 命令执行参数
     * @returns 命令执行结果
     */
    public async executeJumpCommand(params: CommandExecutionParams): Promise<CommandExecutionResult> {
        const startTime = Date.now();
        this.executionStats.totalExecutions++;

        try {
            this.logInfo('开始执行跳转命令', {
                editorName: params.editor.name,
                editorPath: params.editor.path,
                filePath: params.filePath,
                lineNumber: params.lineNumber,
                columnNumber: params.columnNumber
            });

            // 验证参数
            const validationResult = this.validateExecutionParams(params);
            if (!validationResult.success) {
                throw new Error(validationResult.error);
            }

            // 检查编辑器路径是否存在
            const pathExists = await this.verifyEditorPath(params.editor.path);
            if (!pathExists) {
                throw new Error(`编辑器路径不存在: ${params.editor.path}`);
            }

            this.logInfo('参数验证和路径检查通过');

            // 构建命令
            const command = this.buildCommand(params);
            if (!command) {
                throw new Error('无法构建有效的执行命令');
            }

            this.logInfo('最终执行命令', { 
                command: command,
                platform: this.platformInfo.platform,
                editorName: params.editor.name,
                targetFile: params.filePath,
                targetLine: params.lineNumber
            });

            // 执行命令
            const result = await this.executeCommand(command, params);
            
            const executionTime = Date.now() - startTime;
            this.updateExecutionStats(true, executionTime);

            this.logInfo('命令执行成功', { 
                command, 
                executionTime: `${executionTime}ms`,
                processId: result.processId,
                editorName: params.editor.name
            });

            return {
                success: true,
                command,
                executionTime,
                processId: result.processId || undefined
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.updateExecutionStats(false, executionTime);

            const errorMessage = (error as Error).message;
            this.logError('命令执行失败', error as Error, { 
                params,
                executionTime: `${executionTime}ms`,
                platform: this.platformInfo.platform
            });

            // 调用错误处理器
            if (this.errorHandler) {
                this.errorHandler(error as Error, { params });
            }

            return {
                success: false,
                error: errorMessage,
                command: '',
                executionTime
            };
        }
    }

    /**
     * 验证编辑器路径是否存在
     * @param editorPath 编辑器路径
     * @returns 路径存在返回true
     */
    @Cacheable(5000, (editorPath: string) => `editor_path_exists:${editorPath}`)
    public async verifyEditorPath(editorPath: string): Promise<boolean> {
        try {
            return fs.existsSync(editorPath);
        } catch (error) {
            this.logError('验证编辑器路径失败', error as Error, { editorPath });
            return false;
        }
    }

    /**
     * 测试编辑器是否可以正常启动
     * @param editor 编辑器配置
     * @returns 测试结果
     */
    public async testEditor(editor: EditorConfig): Promise<CommandExecutionResult> {
        const testParams: CommandExecutionParams = {
            editor,
            filePath: __filename, // 使用当前文件进行测试
            lineNumber: 1,
            columnNumber: 1
        };

        return this.executeJumpCommand(testParams);
    }

    /**
     * 构建执行命令
     * @param params 命令执行参数
     * @returns 构建的命令字符串
     */
    private buildCommand(params: CommandExecutionParams): string {
        try {
            // 从缓存获取命令
            const cacheKey = this.generateCommandCacheKey(params);
            const cachedCommand = this.cacheManager.get<string>(cacheKey);
            if (cachedCommand) {
                return cachedCommand;
            }

            // 获取对应平台的命令构建器
            const builderKey = this.platformInfo.platform;
            const builder = this.commandBuilders.get(builderKey) || this.commandBuilders.get('default');
            
            if (!builder) {
                throw new Error(`不支持的平台: ${this.platformInfo.platform}`);
            }

            // 构建命令
            const command = builder(params, this.platformInfo);
            
            // 缓存命令
            this.cacheManager.set(cacheKey, command, 1000);
            
            return command;

        } catch (error) {
            this.logError('构建命令失败', error as Error, { params });
            throw error;
        }
    }

    /**
     * 执行命令
     * @param command 要执行的命令
     * @param params 执行参数
     * @returns 执行结果
     */
    private async executeCommand(
        command: string, 
        params: CommandExecutionParams
    ): Promise<{ processId?: number }> {
        return new Promise((resolve, reject) => {
            try {
                let childProcess: ChildProcess;

                if (this.platformInfo.isWindows) {
                    // Windows平台使用cmd执行
                    childProcess = exec(command, {
                        timeout: CommandExecutor.DEFAULT_TIMEOUT,
                        windowsHide: true
                    });
                } else {
                    // Unix平台：检查是否包含shell操作符
                    if (this.containsShellOperators(command)) {
                        // 包含shell操作符，使用shell执行
                        childProcess = exec(command, {
                            timeout: CommandExecutor.DEFAULT_TIMEOUT
                        });
                    } else {
                        // 不包含shell操作符，使用spawn执行
                        const args = this.parseCommandForUnix(command);
                        childProcess = spawn(args.program, args.arguments, {
                            detached: true,
                            stdio: 'ignore',
                            timeout: CommandExecutor.DEFAULT_TIMEOUT
                        });
                        
                        // 分离进程，避免父进程等待
                        childProcess.unref();
                    }
                }

                // 记录运行的进程
                const processKey = `${params.editor.id}_${Date.now()}`;
                this.runningProcesses.set(processKey, childProcess);

                childProcess.on('spawn', () => {
                    this.logDebug('进程启动成功', { 
                        pid: childProcess.pid, 
                        command 
                    });
                    resolve({ processId: childProcess.pid });
                });

                childProcess.on('error', (error) => {
                    this.runningProcesses.delete(processKey);
                    this.logError('进程启动失败', error, { command });
                    reject(error);
                });

                childProcess.on('exit', (code, signal) => {
                    this.runningProcesses.delete(processKey);
                    this.logDebug('进程退出', { 
                        code, 
                        signal, 
                        pid: childProcess.pid 
                    });
                });

                // 对于Windows平台，立即resolve
                if (this.platformInfo.isWindows) {
                    setTimeout(() => {
                        resolve({ processId: childProcess.pid });
                    }, 100);
                }

            } catch (error) {
                this.logError('执行命令异常', error as Error, { command });
                reject(error);
            }
        });
    }

    /**
     * 检查命令是否包含shell操作符
     * @param command 命令字符串
     * @returns 包含shell操作符返回true
     */
    private containsShellOperators(command: string): boolean {
        const shellOperators = ['nohup', '>', '<', '&', '|', '&&', '||', ';', '$(', '`'];
        return shellOperators.some(operator => command.includes(operator));
    }

    /**
     * 解析Unix命令
     * @param command 完整命令字符串
     * @returns 解析后的程序和参数
     */
    private parseCommandForUnix(command: string): { program: string; arguments: string[] } {
        // 简单的命令解析，处理引号和转义字符
        const parts = command.match(/(?:[^\s\"]+|\"[^\"]*\")+/g) || [];
        
        if (parts.length === 0) {
            throw new Error('无效的命令格式');
        }

        const program = parts[0]?.replace(/\"/g, '') || '';
        const args = parts.slice(1).map(arg => arg.replace(/\"/g, ''));

        return { program, arguments: args };
    }

    /**
     * 初始化平台信息
     * @returns 平台信息对象
     */
    private initializePlatformInfo(): PlatformInfo {
        const platform = process.platform;
        
        return {
            platform,
            isWindows: platform === 'win32',
            isMacOS: platform === 'darwin',
            isLinux: platform === 'linux',
            arch: process.arch,
            version: os.release()
        };
    }

    /**
     * 初始化命令构建器
     */
    private initializeCommandBuilders(): void {
        // Windows命令构建器
        this.commandBuilders.set('win32', (params, _platform) => {
            const editorPath = this.escapeWindowsPath(params.editor.path);
            const filePath = this.escapeWindowsPath(params.filePath);
            
            return `"${editorPath}" --line ${params.lineNumber} "${filePath}"`;
        });

        // macOS命令构建器
        this.commandBuilders.set('darwin', (params, _platform) => {
            const editorPath = this.escapeUnixPath(params.editor.path);
            const filePath = this.escapeUnixPath(params.filePath);
            
            return `nohup '${editorPath}' --line ${params.lineNumber} "${filePath}" > /dev/null 2>&1 &`;
        });

        // Linux命令构建器
        this.commandBuilders.set('linux', (params, _platform) => {
            const editorPath = this.escapeUnixPath(params.editor.path);
            const filePath = this.escapeUnixPath(params.filePath);
            
            return `nohup '${editorPath}' --line ${params.lineNumber} "${filePath}" > /dev/null 2>&1 &`;
        });

        // 默认命令构建器
        this.commandBuilders.set('default', (params, _platform) => {
            const editorPath = params.editor.path;
            const filePath = params.filePath;
            
            return `"${editorPath}" --line ${params.lineNumber} "${filePath}"`;
        });
    }

    /**
     * 转义Windows路径
     * @param filePath 文件路径
     * @returns 转义后的路径
     */
    private escapeWindowsPath(filePath: string): string {
        return filePath.replace(/\\/g, '\\\\');
    }

    /**
     * 转义Unix路径
     * @param filePath 文件路径
     * @returns 转义后的路径
     */
    private escapeUnixPath(filePath: string): string {
        return filePath.replace(/'/g, "'\"'\"'");
    }

    /**
     * 验证执行参数
     * @param params 执行参数
     * @returns 验证结果
     */
    private validateExecutionParams(params: CommandExecutionParams): { success: boolean; error?: string } {
        if (!params.editor) {
            return { success: false, error: '编辑器配置不能为空' };
        }

        if (!params.editor.path || params.editor.path.trim() === '') {
            return { success: false, error: '编辑器路径不能为空' };
        }

        if (!params.filePath || params.filePath.trim() === '') {
            return { success: false, error: '文件路径不能为空' };
        }

        if (params.lineNumber < 1) {
            return { success: false, error: '行号必须大于等于1' };
        }

        return { success: true };
    }

    /**
     * 生成命令缓存键
     * @param params 执行参数
     * @returns 缓存键
     */
    private generateCommandCacheKey(params: CommandExecutionParams): string {
        return `command:${params.editor.id}:${this.platformInfo.platform}`;
    }

    /**
     * 更新执行统计信息
     * @param success 是否成功
     * @param executionTime 执行时间
     */
    private updateExecutionStats(success: boolean, executionTime: number): void {
        if (success) {
            this.executionStats.successfulExecutions++;
        } else {
            this.executionStats.failedExecutions++;
        }

        this.executionStats.totalExecutionTime += executionTime;
        this.executionStats.averageExecutionTime = 
            this.executionStats.totalExecutionTime / this.executionStats.totalExecutions;
    }

    /**
     * 设置错误处理器
     * @param handler 错误处理器函数
     */
    public setErrorHandler(handler: ErrorHandler): void {
        this.errorHandler = handler;
    }

    /**
     * 获取执行统计信息
     * @returns 执行统计信息
     */
    public getExecutionStats() {
        return { ...this.executionStats };
    }

    /**
     * 获取平台信息
     * @returns 平台信息
     */
    public getPlatformInfo(): PlatformInfo {
        return { ...this.platformInfo };
    }

    /**
     * 获取正在运行的进程数量
     * @returns 进程数量
     */
    public getRunningProcessCount(): number {
        return this.runningProcesses.size;
    }

    /**
     * 终止所有正在运行的进程
     */
    public killAllProcesses(): void {
        for (const [_key, process] of this.runningProcesses) {
            try {
                if (!process.killed) {
                    process.kill();
                    this.logInfo('终止进程', { pid: process.pid });
                }
            } catch (error) {
                this.logError('终止进程失败', error as Error, { pid: process.pid });
            }
        }
        this.runningProcesses.clear();
    }

    /**
     * 重置执行统计
     */
    public resetExecutionStats(): void {
        this.executionStats.totalExecutions = 0;
        this.executionStats.successfulExecutions = 0;
        this.executionStats.failedExecutions = 0;
        this.executionStats.totalExecutionTime = 0;
        this.executionStats.averageExecutionTime = 0;
        this.logInfo('执行统计已重置');
    }

    /**
     * 添加自定义命令构建器
     * @param platform 平台标识
     * @param builder 命令构建器函数
     */
    public addCommandBuilder(platform: string, builder: CommandBuilder): void {
        this.commandBuilders.set(platform, builder);
        this.logInfo('添加自定义命令构建器', { platform });
    }

    /**
     * 移除命令构建器
     * @param platform 平台标识
     */
    public removeCommandBuilder(platform: string): void {
        this.commandBuilders.delete(platform);
        this.logInfo('移除命令构建器', { platform });
    }

    /**
     * 记录调试日志
     * @param message 日志消息
     * @param data 额外数据
     */
    private logDebug(message: string, data?: any): void {
        console.debug(`[QuickAI:CommandExecutor] ${message}`, data);
    }

    /**
     * 记录信息日志
     * @param message 日志消息
     * @param data 额外数据
     */
    private logInfo(message: string, data?: any): void {
        console.log(`[QuickAI:CommandExecutor] ${message}`, data);
    }

    /**
     * 记录错误日志
     * @param message 错误消息
     * @param error 错误对象
     * @param context 上下文信息
     */
    private logError(message: string, error: Error, context?: any): void {
        console.error(`[QuickAI:CommandExecutor] ${message}`, {
            error: error.message,
            stack: error.stack,
            context
        });
    }

    /**
     * 销毁命令执行器
     */
    public dispose(): void {
        this.killAllProcesses();
        this.commandBuilders.clear();
        this.logInfo('命令执行器已销毁');
    }
}

/**
 * 命令执行工厂类
 * 提供不同类型的命令执行器实例
 */
export class CommandExecutorFactory {
    /** 执行器实例缓存 */
    private static instances: Map<string, CommandExecutor> = new Map();

    /**
     * 创建或获取命令执行器实例
     * @param type 执行器类型
     * @param cacheManager 缓存管理器
     * @returns 命令执行器实例
     */
    public static getInstance(type: string = 'default', cacheManager: CacheManager): CommandExecutor {
        if (!CommandExecutorFactory.instances.has(type)) {
            const executor = new CommandExecutor(cacheManager);
            CommandExecutorFactory.instances.set(type, executor);
        }
        
        return CommandExecutorFactory.instances.get(type)!;
    }

    /**
     * 销毁所有执行器实例
     */
    public static disposeAll(): void {
        for (const [_type, executor] of CommandExecutorFactory.instances) {
            executor.dispose();
        }
        CommandExecutorFactory.instances.clear();
    }
}

/**
 * 命令执行器构建器
 * 提供流式API来配置和创建命令执行器
 */
export class CommandExecutorBuilder {
    private cacheManager: CacheManager | undefined;
    private errorHandler: ErrorHandler | undefined;
    private customBuilders: Map<string, CommandBuilder> = new Map();

    /**
     * 设置缓存管理器
     * @param cacheManager 缓存管理器实例
     * @returns 构建器实例
     */
    public withCacheManager(cacheManager: CacheManager): CommandExecutorBuilder {
        this.cacheManager = cacheManager;
        return this;
    }

    /**
     * 设置错误处理器
     * @param handler 错误处理器
     * @returns 构建器实例
     */
    public withErrorHandler(handler: ErrorHandler): CommandExecutorBuilder {
        this.errorHandler = handler;
        return this;
    }

    /**
     * 添加自定义命令构建器
     * @param platform 平台标识
     * @param builder 命令构建器
     * @returns 构建器实例
     */
    public withCustomBuilder(platform: string, builder: CommandBuilder): CommandExecutorBuilder {
        this.customBuilders.set(platform, builder);
        return this;
    }

    /**
     * 构建命令执行器实例
     * @returns 命令执行器实例
     */
    public build(): CommandExecutor {
        if (!this.cacheManager) {
            throw new Error('缓存管理器是必需的');
        }

        const executor = new CommandExecutor(this.cacheManager);
        
        if (this.errorHandler) {
            executor.setErrorHandler(this.errorHandler);
        }

        for (const [platform, builder] of this.customBuilders) {
            executor.addCommandBuilder(platform, builder);
        }

        return executor;
    }
}