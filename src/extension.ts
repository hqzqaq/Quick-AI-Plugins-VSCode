/**
 * QuickAI VS Code插件主入口文件
 * 负责插件的激活、初始化和销毁，集成所有功能模块
 * @author hqzqaq
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import {
    EditorConfig,
    ProjectContext,
    ProjectType,
    LogLevel
} from './types';
import { ConfigManager } from './configManager';
import { CacheManager } from './cacheManager';
import { MouseListener } from './mouseListener';
import { CommandExecutor } from './commandExecutor';
import { WebViewManager } from './webview/webViewManager';
import {
    Logger,
    LoggerManager,
    PerformanceMonitor,
    MemoryMonitor
} from './utils';

// 创建全局实例
const globalLogger = new Logger('QuickAI');
const globalPerformanceMonitor = new PerformanceMonitor();
const globalMemoryMonitor = new MemoryMonitor();

/**
 * QuickAI插件主类
 * 管理插件的生命周期和核心功能
 */
export class QuickAIExtension {
    /** 配置管理器实例 */
    private configManager!: ConfigManager;

    /** 缓存管理器实例 */
    private cacheManager!: CacheManager;

    /** 鼠标监听器实例 */
    private mouseListener!: MouseListener;

    /** 命令执行器实例 */
    private commandExecutor!: CommandExecutor;

    /** WebView管理器实例 */
    private webViewManager!: WebViewManager;

    /** 日志记录器 */
    private logger = globalLogger;

    /** 插件上下文 */
    private context: vscode.ExtensionContext | undefined;

    /** 一次性资源数组 */
    private disposables: vscode.Disposable[] = [];

    /** 插件是否已激活 */
    private isActivated: boolean = false;

    /** 性能监控开始时间 */
    private activationStartTime: number = 0;

    /**
     * 构造函数
     */
    constructor() {
        this.logger.info('QuickAI插件实例创建');
        
        // 初始化核心模块
        this.initializeCore();
    }

    /**
     * 激活插件
     * @param context VS Code扩展上下文
     */
    public async activate(context: vscode.ExtensionContext): Promise<void> {
        try {
            this.activationStartTime = Date.now();
            this.context = context;
            
            this.logger.info('开始激活QuickAI插件', {
                version: '1.0.0',
                vscodeVersion: vscode.version,
                workspaceFolders: vscode.workspace.workspaceFolders?.length || 0
            });

            // 性能监控
            globalPerformanceMonitor.start('extension-activation');

            // 初始化插件
            await this.initialize();

            // 注册命令
            this.registerCommands();

            // 启动功能模块
            await this.startServices();

            // 设置状态栏
            this.setupStatusBar();

            // 记录激活完成
            const activationTime = globalPerformanceMonitor.end('extension-activation') || 0;
            this.isActivated = true;

            this.logger.info('QuickAI插件激活完成', {
                activationTime: `${activationTime.toFixed(2)}ms`,
                memoryUsage: globalMemoryMonitor.getFormattedCurrentUsage()
            });

            // 显示欢迎消息（仅首次安装）
            await this.showWelcomeMessage();

        } catch (error) {
            this.logger.error('插件激活失败', error as Error);
            this.showErrorMessage('QuickAI插件激活失败', error as Error);
            throw error;
        }
    }

    /**
     * 停用插件
     */
    public async deactivate(): Promise<void> {
        try {
            // 插件停用时，日志通道可能已关闭，避免调用
            // this.logger.info('开始停用QuickAI插件');

            // 停止所有服务
            await this.stopServices();

            // 销毁所有资源
            this.dispose();

            this.isActivated = false;
            // this.logger.info('QuickAI插件停用完成');

        } catch (error) {
            // 在停用阶段，简单地在控制台记录错误
            console.log('[QuickAI] 插件停用失败', error);
        }
    }

    /**
     * 初始化核心模块
     */
    private initializeCore(): void {
        try {
            // 创建核心实例
            this.configManager = ConfigManager.getInstance();
            this.cacheManager = CacheManager.getInstance();
            this.commandExecutor = new CommandExecutor(this.cacheManager);
            this.mouseListener = new MouseListener(this.configManager, this.cacheManager);
            
            // 初始化WebView管理器（在context可用后）
            if (this.context) {
                this.webViewManager = new WebViewManager(this.context, this.configManager, this.commandExecutor);
            }

            // 设置错误处理器
            this.commandExecutor.setErrorHandler((error, context) => {
                this.logger.error('命令执行错误', error, context);
                this.showErrorMessage('跳转到外部编辑器失败', error);
            });

            this.logger.info('核心模块初始化完成');

        } catch (error) {
            this.logger.error('核心模块初始化失败', error as Error);
            throw error;
        }
    }

    /**
     * 初始化插件
     */
    private async initialize(): Promise<void> {
        try {
            // 设置日志级别
            const debugMode = vscode.workspace.getConfiguration('quickai').get<boolean>('debugMode', false);
            LoggerManager.setGlobalLogLevel(debugMode ? LogLevel.DEBUG : LogLevel.INFO);

            // 验证配置
            await this.validateConfiguration();

            // 初始化缓存
            await this.initializeCache();

            // 初始化WebView管理器（如果还未初始化）
            if (!this.webViewManager && this.context) {
                this.webViewManager = new WebViewManager(this.context, this.configManager, this.commandExecutor);
            }

            this.logger.info('插件初始化完成');

        } catch (error) {
            this.logger.error('插件初始化失败', error as Error);
            throw error;
        }
    }

    /**
     * 验证配置
     */
    private async validateConfiguration(): Promise<void> {
        try {
            const editors = this.configManager.getEditors();
            const modifiers = this.configManager.getKeyboardModifiers();

            this.logger.info('配置验证', {
                editorsCount: editors.length,
                modifiers,
                cacheEnabled: this.configManager.isCacheEnabled(),
                debounceTime: this.configManager.getDebounceTime()
            });

            // 检查是否有可用的编辑器
            if (editors.length === 0) {
                this.logger.warn('未配置任何外部编辑器');
                this.showWarningMessage('未配置外部编辑器，请打开设置进行配置');
            }

        } catch (error) {
            this.logger.error('配置验证失败', error as Error);
            throw error;
        }
    }

    /**
     * 初始化缓存
     */
    private async initializeCache(): Promise<void> {
        try {
            if (!this.configManager.isCacheEnabled()) {
                this.logger.info('缓存已禁用');
                return;
            }

            // 预热缓存
            const preloadData = new Map();
            
            // 缓存编辑器配置
            const editors = this.configManager.getEditors();
            preloadData.set('editors', { data: editors, ttl: 5000 });
            
            // 缓存修饰键配置
            const modifiers = this.configManager.getKeyboardModifiers();
            preloadData.set('modifiers', { data: modifiers, ttl: 1000 });

            await this.cacheManager.preload(preloadData);
            this.logger.info('缓存初始化完成');

        } catch (error) {
            this.logger.error('缓存初始化失败', error as Error);
        }
    }

    /**
     * 注册命令
     */
    private registerCommands(): void {
        try {
            if (!this.context) {
                throw new Error('扩展上下文未初始化');
            }

            // 注册跳转命令
            const jumpCommand = vscode.commands.registerCommand('quickai.jumpToExternalEditor', async () => {
                await this.handleJumpCommand();
            });

            // 注册编辑器管理命令
            const editorManagerCommand = vscode.commands.registerCommand('quickai.openEditorManager', async () => {
                await this.openEditorManager();
            });

            // 注册快捷键设置命令
            const keyboardSettingsCommand = vscode.commands.registerCommand('quickai.openKeyboardSettings', async () => {
                await this.openKeyboardSettings();
            });

            // 注册测试编辑器命令
            const testEditorCommand = vscode.commands.registerCommand('quickai.testEditor', async (editorId?: string) => {
                await this.testEditor(editorId);
            });

            // 注册诊断命令
            const diagnosticsCommand = vscode.commands.registerCommand('quickai.showDiagnostics', async () => {
                await this.showDiagnostics();
            });

            // 注册动态快捷键命令（根据配置的修饰键组合）
            this.registerDynamicKeyboardShortcut();

            // 将命令添加到VS Code订阅中
            this.context.subscriptions.push(
                jumpCommand,
                editorManagerCommand,
                keyboardSettingsCommand,
                testEditorCommand,
                diagnosticsCommand
            );

            // 同时添加到内部一次性资源（用于内部清理）
            this.disposables.push(
                jumpCommand,
                editorManagerCommand,
                keyboardSettingsCommand,
                testEditorCommand,
                diagnosticsCommand
            );

            this.logger.info('命令注册完成', {
                registeredCommands: [
                    'quickai.jumpToExternalEditor',
                    'quickai.openEditorManager',
                    'quickai.openKeyboardSettings',
                    'quickai.testEditor',
                    'quickai.showDiagnostics'
                ]
            });

        } catch (error) {
            this.logger.error('命令注册失败', error as Error);
            throw error;
        }
    }

    /**
     * 注册动态键盘快捷键
     * 根据用户配置的修饰键组合动态注册快捷键
     */
    private registerDynamicKeyboardShortcut(): void {
        try {
            // 监听鼠标点击事件，结合快捷键触发跳转
            const clickListener = vscode.window.onDidChangeTextEditorSelection(async (event) => {
                // 只处理鼠标点击事件
                if (event.kind !== vscode.TextEditorSelectionChangeKind.Mouse) {
                    return;
                }

                // 检查是否有活跃的编辑器
                if (!event.textEditor) {
                    return;
                }

                // 获取当前光标位置上下文
                const context = this.getProjectContextFromEditor(event.textEditor);
                if (!context) {
                    return;
                }

                // 暂存上下文，等待快捷键触发
                this.lastClickContext = context;
                this.lastClickTime = Date.now();
            });

            // 注册快捷键命令（用户可以自定义快捷键绑定）
            const shortcutCommand = vscode.commands.registerCommand('quickai.triggerWithShortcut', async () => {
                await this.handleShortcutTriggeredJump();
            });

            if (this.context) {
                this.context.subscriptions.push(clickListener, shortcutCommand);
            }
            this.disposables.push(clickListener, shortcutCommand);

            this.logger.info('动态快捷键注册完成');

        } catch (error) {
            this.logger.error('注册动态快捷键失败', error as Error);
        }
    }

    /** 最后点击的上下文 */
    private lastClickContext: ProjectContext | undefined;

    /** 最后点击时间 */
    private lastClickTime: number = 0;

    /**
     * 处理快捷键触发的跳转
     */
    private async handleShortcutTriggeredJump(): Promise<void> {
        try {
            const now = Date.now();
            const timeDiff = now - this.lastClickTime;

            // 检查是否在有效时间窗口内（2秒）
            if (timeDiff > 2000 || !this.lastClickContext) {
                // 如果没有最近的点击上下文，使用当前活跃编辑器位置
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    this.logger.warn('没有活跃的编辑器');
                    return;
                }

                const context = this.getProjectContextFromEditor(activeEditor);
                if (!context) {
                    this.logger.warn('无法获取当前编辑器上下文');
                    return;
                }

                await this.handleJumpToEditor(context);
            } else {
                // 使用最近点击的上下文
                await this.handleJumpToEditor(this.lastClickContext);
            }

        } catch (error) {
            this.logger.error('处理快捷键触发跳转失败', error as Error);
        }
    }

    /**
     * 从编辑器获取项目上下文
     */
    private getProjectContextFromEditor(textEditor: vscode.TextEditor): ProjectContext | undefined {
        try {
            const document = textEditor.document;
            const selection = textEditor.selection;
            
            // 获取当前工作区根路径
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            if (!workspaceFolder) {
                return undefined;
            }

            const context: ProjectContext = {
                rootPath: workspaceFolder.uri.fsPath,
                currentFilePath: document.uri.fsPath,
                currentLineNumber: selection.active.line + 1,
                currentColumnNumber: selection.active.character + 1,
                workspaceName: workspaceFolder.name,
                projectType: this.detectProjectType(document.uri.fsPath)
            };

            return context;

        } catch (error) {
            this.logger.error('获取项目上下文失败', error as Error);
            return undefined;
        }
    }

    /**
     * 启动服务
     */
    private async startServices(): Promise<void> {
        try {
            // 启动鼠标监听器
            this.mouseListener.start(async (context: ProjectContext) => {
                await this.handleJumpToEditor(context);
            });

            // 定期创建内存快照
            const memorySnapshotTimer = setInterval(() => {
                globalMemoryMonitor.takeSnapshot();
            }, 60000); // 每分钟创建一次快照

            const timerDisposable = {
                dispose: () => clearInterval(memorySnapshotTimer)
            };

            // 添加到VS Code订阅中
            if (this.context) {
                this.context.subscriptions.push(timerDisposable);
            }

            // 同时添加到内部一次性资源
            this.disposables.push(timerDisposable);

            this.logger.info('服务启动完成');

        } catch (error) {
            this.logger.error('服务启动失败', error as Error);
            throw error;
        }
    }

    /**
     * 停止服务
     */
    private async stopServices(): Promise<void> {
        try {
            // 停止鼠标监听器
            this.mouseListener.stop();

            // 终止所有运行的进程
            this.commandExecutor.killAllProcesses();

            this.logger.info('服务停止完成');

        } catch (error) {
            this.logger.error('服务停止失败', error as Error);
        }
    }

    /**
     * 设置状态栏
     */
    private setupStatusBar(): void {
        try {
            if (!this.context) {
                throw new Error('扩展上下文未初始化');
            }

            const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
            
            statusBarItem.text = "$(rocket) QuickAI";
            statusBarItem.tooltip = "QuickAI: 快速跳转到外部编辑器";
            statusBarItem.command = 'quickai.openEditorManager';
            statusBarItem.show();

            // 添加到VS Code订阅中
            this.context.subscriptions.push(statusBarItem);
            
            // 同时添加到内部一次性资源
            this.disposables.push(statusBarItem);
            
            this.logger.debug('状态栏设置完成');

        } catch (error) {
            this.logger.error('状态栏设置失败', error as Error);
        }
    }

    /**
     * 处理跳转命令
     */
    private async handleJumpCommand(): Promise<void> {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                this.showWarningMessage('没有活动的编辑器');
                return;
            }

            const context = this.createProjectContext(activeEditor);
            if (!context) {
                this.showWarningMessage('无法获取项目上下文');
                return;
            }

            await this.handleJumpToEditor(context);

        } catch (error) {
            this.logger.error('处理跳转命令失败', error as Error);
            this.showErrorMessage('跳转命令执行失败', error as Error);
        }
    }

    /**
     * 处理跳转到外部编辑器
     * @param context 项目上下文
     */
    private async handleJumpToEditor(context: ProjectContext): Promise<void> {
        try {
            globalPerformanceMonitor.start('jump-to-editor');

            // 获取默认编辑器
            const defaultEditor = this.configManager.getDefaultEditor();
            if (!defaultEditor) {
                this.showWarningMessage('未设置默认编辑器，请先配置编辑器');
                return;
            }

            this.logger.info('准备跳转到外部编辑器', {
                editor: defaultEditor.name,
                editorPath: defaultEditor.path,
                file: context.currentFilePath,
                line: context.currentLineNumber,
                column: context.currentColumnNumber,
                projectRoot: context.rootPath
            });

            // 执行跳转命令
            const result = await this.commandExecutor.executeJumpCommand({
                editor: defaultEditor,
                filePath: context.currentFilePath,
                lineNumber: context.currentLineNumber,
                columnNumber: context.currentColumnNumber,
                projectRoot: context.rootPath
            });

            const jumpTime = globalPerformanceMonitor.end('jump-to-editor') || 0;

            if (result.success) {
                this.logger.info('跳转成功', {
                    editorName: defaultEditor.name,
                    executedCommand: result.command,
                    executionTime: `${result.executionTime.toFixed(2)}ms`,
                    totalTime: `${jumpTime.toFixed(2)}ms`,
                    processId: result.processId,
                    targetFile: context.currentFilePath,
                    targetLine: context.currentLineNumber
                });

                // 显示成功提示（可选）
                const showNotification = vscode.workspace.getConfiguration('quickai').get<boolean>('showSuccessNotification', false);
                if (showNotification) {
                    this.showInfoMessage(`已跳转到 ${defaultEditor.name}\n执行命令: ${result.command}`);
                }
            } else {
                this.logger.error('跳转失败', new Error(result.error || '未知错误'), {
                    editorName: defaultEditor.name,
                    editorPath: defaultEditor.path,
                    targetFile: context.currentFilePath,
                    targetLine: context.currentLineNumber,
                    errorMessage: result.error,
                    executionTime: `${result.executionTime.toFixed(2)}ms`,
                    totalTime: `${jumpTime.toFixed(2)}ms`,
                    command: result.command
                });
                this.showErrorMessage('跳转失败', new Error(result.error || '未知错误'));
            }

        } catch (error) {
            globalPerformanceMonitor.end('jump-to-editor');
            this.logger.error('跳转到外部编辑器失败', error as Error, { context });
            this.showErrorMessage('跳转失败', error as Error);
        }
    }

    /**
     * 创建项目上下文
     * @param textEditor 文本编辑器
     * @returns 项目上下文
     */
    private createProjectContext(textEditor: vscode.TextEditor): ProjectContext | undefined {
        try {
            const document = textEditor.document;
            const selection = textEditor.selection;
            
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            if (!workspaceFolder) {
                return undefined;
            }

            return {
                rootPath: workspaceFolder.uri.fsPath,
                currentFilePath: document.uri.fsPath,
                currentLineNumber: selection.active.line + 1,
                currentColumnNumber: selection.active.character + 1,
                workspaceName: workspaceFolder.name,
                projectType: this.detectProjectType(document.uri.fsPath)
            };

        } catch (error) {
            this.logger.error('创建项目上下文失败', error as Error);
            return undefined;
        }
    }

    /**
     * 检测项目类型
     * @param filePath 文件路径
     * @returns 项目类型
     */
    private detectProjectType(filePath: string): ProjectType {
        const extension = filePath.split('.').pop()?.toLowerCase();
        
        switch (extension) {
            case 'java':
                return ProjectType.JAVA;
            case 'py':
                return ProjectType.PYTHON;
            case 'js':
            case 'ts':
            case 'jsx':
            case 'tsx':
                return ProjectType.JAVASCRIPT;
            default:
                return ProjectType.OTHER;
        }
    }

    /**
     * 打开编辑器管理器
     */
    private async openEditorManager(): Promise<void> {
        try {
            if (!this.webViewManager) {
                this.showWarningMessage('系统未初始化完成，请稍后再试');
                return;
            }
            
            await this.webViewManager.openEditorManager();
            this.logger.info('打开编辑器管理器');

        } catch (error) {
            this.logger.error('打开编辑器管理器失败', error as Error);
            this.showErrorMessage('无法打开编辑器管理器', error as Error);
        }
    }

    /**
     * 打开快捷键设置
     */
    private async openKeyboardSettings(): Promise<void> {
        try {
            if (!this.webViewManager) {
                this.showWarningMessage('系统未初始化完成，请稍后再试');
                return;
            }
            
            await this.webViewManager.openKeyboardSettings();
            this.logger.info('打开快捷键设置');

        } catch (error) {
            this.logger.error('打开快捷键设置失败', error as Error);
            this.showErrorMessage('无法打开快捷键设置', error as Error);
        }
    }

    /**
     * 测试编辑器
     * @param editorId 编辑器ID（可选）
     */
    private async testEditor(editorId?: string): Promise<void> {
        try {
            let editor: EditorConfig | undefined;

            if (editorId) {
                const editors = this.configManager.getEditors();
                editor = editors.find(e => e.id === editorId);
            } else {
                editor = this.configManager.getDefaultEditor();
            }

            if (!editor) {
                this.showWarningMessage('未找到要测试的编辑器');
                return;
            }

            this.logger.info('开始测试编辑器', { editorName: editor.name, editorPath: editor.path });

            const result = await this.commandExecutor.testEditor(editor);

            if (result.success) {
                this.showInfoMessage(`编辑器 ${editor.name} 测试成功`);
            } else {
                this.showErrorMessage(`编辑器 ${editor.name} 测试失败`, new Error(result.error || '未知错误'));
            }

        } catch (error) {
            this.logger.error('测试编辑器失败', error as Error);
            this.showErrorMessage('编辑器测试失败', error as Error);
        }
    }

    /**
     * 显示诊断信息
     */
    private async showDiagnostics(): Promise<void> {
        try {
            const diagnostics = {
                extension: {
                    version: '1.0.0',
                    activated: this.isActivated,
                    activationTime: Date.now() - this.activationStartTime
                },
                performance: {
                    summary: globalPerformanceMonitor.getSummary(),
                    memory: globalMemoryMonitor.getUsageTrend()
                },
                configuration: {
                    editors: this.configManager.getEditors().length,
                    defaultEditor: this.configManager.getDefaultEditor()?.name || 'None',
                    modifiers: this.configManager.getKeyboardModifiers(),
                    cacheEnabled: this.configManager.isCacheEnabled()
                },
                cache: this.cacheManager.getStats(),
                execution: this.commandExecutor.getExecutionStats()
            };

            const content = JSON.stringify(diagnostics, null, 2);
            const document = await vscode.workspace.openTextDocument({
                content,
                language: 'json'
            });

            await vscode.window.showTextDocument(document);
            this.logger.info('显示诊断信息');

        } catch (error) {
            this.logger.error('显示诊断信息失败', error as Error);
            this.showErrorMessage('无法显示诊断信息', error as Error);
        }
    }

    /**
     * 显示欢迎消息
     */
    private async showWelcomeMessage(): Promise<void> {
        try {
            const isFirstInstall = !this.context?.globalState.get('quickai.welcomed', false);
            
            if (isFirstInstall) {
                const action = await vscode.window.showInformationMessage(
                    '欢迎使用 QuickAI！点击配置编辑器开始使用。',
                    '配置编辑器',
                    '稍后配置'
                );

                if (action === '配置编辑器') {
                    await this.openEditorManager();
                }

                await this.context?.globalState.update('quickai.welcomed', true);
            }

        } catch (error) {
            this.logger.error('显示欢迎消息失败', error as Error);
        }
    }

    /**
     * 显示信息消息
     * @param message 消息内容
     */
    private showInfoMessage(message: string): void {
        vscode.window.showInformationMessage(`[QuickAI] ${message}`);
    }

    /**
     * 显示警告消息
     * @param message 消息内容
     */
    private showWarningMessage(message: string): void {
        vscode.window.showWarningMessage(`[QuickAI] ${message}`);
    }

    /**
     * 显示错误消息
     * @param message 消息内容
     * @param error 错误对象
     */
    private showErrorMessage(message: string, error: Error): void {
        const fullMessage = `[QuickAI] ${message}: ${error.message}`;
        vscode.window.showErrorMessage(fullMessage);
    }

    /**
     * 销毁资源
     */
    private dispose(): void {
        try {
            // 销毁一次性资源
            this.disposables.forEach(disposable => {
                try {
                    disposable.dispose();
                } catch (error) {
                    this.logger.error('销毁资源失败', error as Error);
                }
            });
            this.disposables = [];

            // 销毁核心模块
            this.mouseListener?.dispose();
            this.commandExecutor?.dispose();
            this.cacheManager?.dispose();
            this.configManager?.dispose();

            // 销毁日志管理器
            LoggerManager.dispose();

            this.logger.info('资源销毁完成');

        } catch (error) {
            console.error('[QuickAI] 资源销毁失败', error);
        }
    }
}

/** 全局插件实例 */
let extensionInstance: QuickAIExtension | undefined;

/**
 * VS Code插件激活函数
 * @param context 扩展上下文
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    try {
        extensionInstance = new QuickAIExtension();
        await extensionInstance.activate(context);

    } catch (error) {
        console.error('[QuickAI] 插件激活失败', error);
        throw error;
    }
}

/**
 * VS Code插件停用函数
 */
export async function deactivate(): Promise<void> {
    if (extensionInstance) {
        await extensionInstance.deactivate();
        extensionInstance = undefined;
    }
}

/**
 * 获取插件实例（用于测试）
 * @returns 插件实例
 */
export function getExtensionInstance(): QuickAIExtension | undefined {
    return extensionInstance;
}