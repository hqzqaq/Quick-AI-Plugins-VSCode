/**
 * 鼠标事件监听模块
 * 负责监听鼠标点击事件，检查修饰键状态，并触发相应的跳转动作
 * @author hqzqaq
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import {
    KeyboardModifiers,
    MouseEventHandlerConfig,
    ProjectContext,
    ProjectType,
    EventListener
} from './types';
import { ConfigManager } from './configManager';
import { CacheManager } from './cacheManager';

/**
 * 鼠标事件监听器类
 * 实现鼠标点击事件的监听、修饰键检查、防抖处理等功能
 */
export class MouseListener {
    /** 配置管理器实例 */
    private readonly configManager: ConfigManager;

    /** 缓存管理器实例 */
    // private readonly cacheManager: CacheManager;

    /** 事件监听器配置 */
    private config: MouseEventHandlerConfig;

    /** 防抖定时器 */
    private debounceTimer: NodeJS.Timeout | undefined;

    /** 是否正在处理事件 */
    private isProcessing: boolean = false;

    /** 事件监听器数组 */
    private readonly eventListeners: Array<vscode.Disposable> = [];

    /** 跳转回调函数 */
    private jumpCallback: ((context: ProjectContext) => Promise<void>) | undefined;

    /** 事件统计 */
    private readonly eventStats = {
        totalEvents: 0,
        validEvents: 0,
        ignoredEvents: 0,
        errorEvents: 0
    };

    /**
     * 构造函数
     * @param configManager 配置管理器实例
     * @param cacheManager 缓存管理器实例
     */
    constructor(configManager: ConfigManager, cacheManager: CacheManager) {
        this.configManager = configManager;
        // this.cacheManager = cacheManager;
        
        // 避免未使用参数警告
        void cacheManager;
        
        // 初始化配置
        this.config = this.createConfig();
        
        // 监听配置变化
        this.setupConfigurationWatcher();
    }

    /**
     * 启动鼠标事件监听
     * @param jumpCallback 跳转回调函数
     */
    public start(jumpCallback: (context: ProjectContext) => Promise<void>): void {
        try {
            this.jumpCallback = jumpCallback;
            this.registerEventListeners();
            this.logInfo('鼠标事件监听器已启动');

        } catch (error) {
            this.logError('启动鼠标事件监听器失败', error as Error);
            throw error;
        }
    }

    /**
     * 停止鼠标事件监听
     */
    public stop(): void {
        try {
            this.unregisterEventListeners();
            this.clearDebounceTimer();
            this.jumpCallback = undefined;
            this.logInfo('鼠标事件监听器已停止');

        } catch (error) {
            this.logError('停止鼠标事件监听器失败', error as Error);
        }
    }

    /**
     * 重新启动监听器
     * @param jumpCallback 跳转回调函数
     */
    public restart(jumpCallback: (context: ProjectContext) => Promise<void>): void {
        this.stop();
        this.start(jumpCallback);
    }

    /**
     * 更新配置
     * @param newConfig 新配置
     */
    public updateConfig(newConfig: Partial<MouseEventHandlerConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.logInfo('鼠标监听器配置已更新', this.config);
    }

    /**
     * 获取事件统计信息
     * @returns 事件统计信息
     */
    public getEventStats() {
        return { ...this.eventStats };
    }

    /**
     * 重置事件统计
     */
    public resetEventStats(): void {
        this.eventStats.totalEvents = 0;
        this.eventStats.validEvents = 0;
        this.eventStats.ignoredEvents = 0;
        this.eventStats.errorEvents = 0;
        this.logInfo('事件统计已重置');
    }

    /**
     * 创建初始配置
     * @returns 鼠标事件处理器配置
     */
    private createConfig(): MouseEventHandlerConfig {
        return {
            modifiers: this.configManager.getKeyboardModifiers(),
            debounceTime: this.configManager.getDebounceTime(),
            enabled: true,
            debugMode: false
        };
    }

    /**
     * 设置配置监听器
     */
    private setupConfigurationWatcher(): void {
        // 监听快捷键配置变化
        this.configManager.onConfigurationChange('quickai.keyboardModifiers', (newConfig) => {
            this.config.modifiers = newConfig;
            this.logDebug('快捷键配置已更新', newConfig);
        });

        // 监听防抖时间配置变化
        this.configManager.onConfigurationChange('quickai.debounceTime', (newConfig) => {
            this.config.debounceTime = newConfig;
            this.logDebug('防抖时间配置已更新', { debounceTime: newConfig });
        });
    }

    /**
     * 注册事件监听器
     */
    private registerEventListeners(): void {
        // 监听文本编辑器的鼠标点击事件
        const mouseDownListener = vscode.window.onDidChangeTextEditorSelection((event) => {
            this.handleSelectionChange(event);
        });

        this.eventListeners.push(mouseDownListener);

        this.logDebug('鼠标事件监听器已注册');
    }

    /**
     * 注销事件监听器
     */
    private unregisterEventListeners(): void {
        this.eventListeners.forEach(listener => listener.dispose());
        this.eventListeners.length = 0;
        this.logDebug('鼠标事件监听器已注销');
    }

    /**
     * 处理选择变化事件
     * @param event 选择变化事件
     */
    private handleSelectionChange(event: vscode.TextEditorSelectionChangeEvent): void {
        try {
            this.eventStats.totalEvents++;

            // 检查事件是否启用
            if (!this.config.enabled) {
                this.eventStats.ignoredEvents++;
                return;
            }

            // 检查是否正在处理其他事件
            if (this.isProcessing) {
                this.eventStats.ignoredEvents++;
                return;
            }

            // 检查事件类型（只处理鼠标点击事件）
            if (!this.isMouseEvent(event)) {
                this.eventStats.ignoredEvents++;
                return;
            }

            // 检查修饰键状态
            if (!this.checkModifierKeys()) {
                this.eventStats.ignoredEvents++;
                return;
            }

            // 获取项目上下文
            const context = this.getProjectContext(event.textEditor);
            if (!context) {
                this.eventStats.ignoredEvents++;
                this.logWarn('无法获取项目上下文');
                return;
            }

            // 防抖处理
            this.debounceEventHandling(context);

        } catch (error) {
            this.eventStats.errorEvents++;
            this.logError('处理选择变化事件失败', error as Error, { event });
        }
    }

    /**
     * 检查是否为鼠标事件
     * @param event 选择变化事件
     * @returns 是鼠标事件返回true
     */
    private isMouseEvent(event: vscode.TextEditorSelectionChangeEvent): boolean {
        // 检查事件种类，排除键盘导致的选择变化
        return event.kind === vscode.TextEditorSelectionChangeKind.Mouse;
    }

    /**
     * 检查修饰键状态
     * 注意：由于VS Code API限制，无法直接获取实时修饰键状态
     * 改为依赖VS Code的快捷键绑定系统，禁用自动鼠标监听
     * @returns 始终返回false，禁用自动触发，只通过快捷键触发
     */
    private checkModifierKeys(): boolean {
        // 禁用自动鼠标监听，只通过快捷键触发跳转
        // 这样可以避免任何鼠标点击都触发跳转的问题
        return false;
    }


    /**
     * 比较修饰键状态
     * @param required 要求的修饰键状态
     * @param current 当前修饰键状态
     * @returns 状态匹配返回true
     */
    private compareModifierStates(required: KeyboardModifiers, current: KeyboardModifiers): boolean {
        return (
            required.ctrl === current.ctrl &&
            required.shift === current.shift &&
            required.alt === current.alt &&
            required.meta === current.meta
        );
    }

    /**
     * 获取项目上下文信息
     * @param textEditor 文本编辑器
     * @returns 项目上下文信息
     */
    private getProjectContext(textEditor: vscode.TextEditor): ProjectContext | undefined {
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
                currentLineNumber: selection.active.line + 1, // VS Code行号从0开始，转换为从1开始
                currentColumnNumber: selection.active.character + 1,
                workspaceName: workspaceFolder.name,
                projectType: this.detectProjectType(document.uri.fsPath)
            };

            return context;

        } catch (error) {
            this.logError('获取项目上下文失败', error as Error, { textEditor });
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
     * 防抖事件处理
     * @param context 项目上下文
     */
    private debounceEventHandling(context: ProjectContext): void {
        // 清除之前的防抖定时器
        this.clearDebounceTimer();

        // 设置新的防抖定时器
        this.debounceTimer = setTimeout(() => {
            this.handleValidEvent(context);
        }, this.config.debounceTime);
    }

    /**
     * 处理有效事件
     * @param context 项目上下文
     */
    private async handleValidEvent(context: ProjectContext): Promise<void> {
        try {
            this.isProcessing = true;

            // 检查跳转回调是否存在
            if (!this.jumpCallback) {
                this.logWarn('跳转回调函数未设置');
                return;
            }

            // 调用跳转回调
            await this.jumpCallback(context);
            
            this.eventStats.validEvents++;
            this.logInfo('成功处理跳转事件', {
                file: context.currentFilePath,
                line: context.currentLineNumber,
                column: context.currentColumnNumber
            });

        } catch (error) {
            this.eventStats.errorEvents++;
            this.logError('处理跳转事件失败', error as Error, { context });
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 清除防抖定时器
     */
    private clearDebounceTimer(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = undefined;
        }
    }

    /**
     * 模拟修饰键检查（用于演示）
     * 在实际使用中，需要通过其他方式获取真实的修饰键状态
     * @returns 模拟的修饰键检查结果
     */
    public simulateModifierCheck(modifiers: KeyboardModifiers): boolean {
        const required = this.config.modifiers;
        return this.compareModifierStates(required, modifiers);
    }

    /**
     * 手动触发跳转事件（用于测试）
     * @param context 项目上下文
     */
    public async manualTrigger(context: ProjectContext): Promise<void> {
        await this.handleValidEvent(context);
    }

    /**
     * 记录调试日志
     * @param message 日志消息
     * @param data 额外数据
     */
    private logDebug(message: string, data?: any): void {
        if (this.config.debugMode) {
            console.debug(`[QuickAI:MouseListener] ${message}`, data);
        }
    }

    /**
     * 记录信息日志
     * @param message 日志消息
     * @param data 额外数据
     */
    private logInfo(message: string, data?: any): void {
        console.log(`[QuickAI:MouseListener] ${message}`, data);
    }

    /**
     * 记录警告日志
     * @param message 警告消息
     * @param data 额外数据
     */
    private logWarn(message: string, data?: any): void {
        console.warn(`[QuickAI:MouseListener] ${message}`, data);
    }

    /**
     * 记录错误日志
     * @param message 错误消息
     * @param error 错误对象
     * @param context 上下文信息
     */
    private logError(message: string, error: Error, context?: any): void {
        console.error(`[QuickAI:MouseListener] ${message}`, {
            error: error.message,
            stack: error.stack,
            context
        });
    }

    /**
     * 销毁监听器
     */
    public dispose(): void {
        this.stop();
        this.logInfo('鼠标事件监听器已销毁');
    }
}

/**
 * 修饰键状态检测器
 * 提供更精确的修饰键状态检测功能
 */
export class ModifierKeyDetector {
    /** 当前修饰键状态 */
    private currentState: KeyboardModifiers = {
        ctrl: false,
        shift: false,
        alt: false,
        meta: false
    };

    /** 状态更新监听器 */
    private readonly stateListeners: EventListener<KeyboardModifiers>[] = [];

    /**
     * 开始检测修饰键状态
     */
    public start(): void {
        // 这里可以添加全局键盘事件监听
        // 由于VS Code API限制，实际实现可能需要使用webview
        this.logInfo('修饰键检测器已启动');
    }

    /**
     * 停止检测修饰键状态
     */
    public stop(): void {
        this.logInfo('修饰键检测器已停止');
    }

    /**
     * 获取当前修饰键状态
     * @returns 当前修饰键状态
     */
    public getCurrentState(): KeyboardModifiers {
        return { ...this.currentState };
    }

    /**
     * 更新修饰键状态
     * @param state 新的修饰键状态
     */
    public updateState(state: Partial<KeyboardModifiers>): void {
        this.currentState = { ...this.currentState, ...state };
        this.notifyStateChange();
    }

    /**
     * 监听状态变化
     * @param listener 状态变化监听器
     */
    public onStateChange(listener: EventListener<KeyboardModifiers>): void {
        this.stateListeners.push(listener);
    }

    /**
     * 取消监听状态变化
     * @param listener 要取消的监听器
     */
    public offStateChange(listener: EventListener<KeyboardModifiers>): void {
        const index = this.stateListeners.indexOf(listener);
        if (index > -1) {
            this.stateListeners.splice(index, 1);
        }
    }

    /**
     * 通知状态变化
     */
    private notifyStateChange(): void {
        this.stateListeners.forEach(listener => {
            try {
                listener(this.currentState);
            } catch (error) {
                console.error('[QuickAI:ModifierKeyDetector] 状态变化通知失败', error);
            }
        });
    }

    /**
     * 记录信息日志
     * @param message 日志消息
     * @param data 额外数据
     */
    private logInfo(message: string, data?: any): void {
        console.log(`[QuickAI:ModifierKeyDetector] ${message}`, data);
    }

    /**
     * 销毁检测器
     */
    public dispose(): void {
        this.stop();
        this.stateListeners.length = 0;
        this.logInfo('修饰键检测器已销毁');
    }
}