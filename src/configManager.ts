/**
 * 配置管理模块
 * 负责管理QuickAI插件的所有配置，包括编辑器配置、快捷键设置等
 * @author hqzqaq
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import {
    EditorConfig,
    KeyboardModifiers,
    ConfigValidationResult,
    EditorType,
    ConfigUpdateCallback
} from './types';

/**
 * 配置管理器类
 * 提供对插件配置的统一管理和操作接口
 */
export class ConfigManager {
    /** 配置键名常量 */
    private static readonly CONFIG_KEYS = {
        EDITORS: 'quickai.editors',
        KEYBOARD_MODIFIERS: 'quickai.keyboardModifiers',
        ENABLE_CACHE: 'quickai.enableCache',
        DEBOUNCE_TIME: 'quickai.debounceTime'
    } as const;

    /** 默认配置常量 */
    private static readonly DEFAULT_CONFIG = {
        KEYBOARD_MODIFIERS: {
            ctrl: true,
            shift: false,
            alt: false,
            meta: false
        } as KeyboardModifiers,
        DEBOUNCE_TIME: 150,
        ENABLE_CACHE: true
    } as const;

    /** 配置更新回调函数映射 */
    private readonly configUpdateCallbacks: Map<string, ConfigUpdateCallback[]> = new Map();

    /** 单例实例 */
    private static instance: ConfigManager | undefined;

    /**
     * 私有构造函数，实现单例模式
     */
    private constructor() {
        this.initializeConfigurationWatcher();
    }

    /**
     * 获取配置管理器实例（单例模式）
     * @returns 配置管理器实例
     */
    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    /**
     * 初始化配置监听器
     * 监听VS Code配置变化并触发相应的回调函数
     */
    private initializeConfigurationWatcher(): void {
        vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            Object.values(ConfigManager.CONFIG_KEYS).forEach(configKey => {
                if (event.affectsConfiguration(configKey)) {
                    this.notifyConfigurationChange(configKey);
                }
            });
        });
    }

    /**
     * 通知配置变化
     * @param configKey 配置键名
     */
    private notifyConfigurationChange(configKey: string): void {
        const callbacks = this.configUpdateCallbacks.get(configKey);
        if (callbacks) {
            const newConfig = this.getConfigurationValue(configKey);
            callbacks.forEach(callback => {
                try {
                    callback(newConfig, undefined);
                } catch (error) {
                    this.logError('配置变化回调执行失败', error as Error, { configKey });
                }
            });
        }
    }

    /**
     * 获取所有配置的编辑器列表
     * @returns 编辑器配置数组
     */
    public getEditors(): EditorConfig[] {
        const editors = this.getConfigurationValue<EditorConfig[]>(ConfigManager.CONFIG_KEYS.EDITORS);
        return editors || [];
    }

    /**
     * 添加新的编辑器配置
     * @param editorConfig 要添加的编辑器配置（不包含id和时间戳）
     * @returns 添加成功返回新编辑器配置，失败返回undefined
     */
    public async addEditor(editorConfig: Omit<EditorConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<EditorConfig | undefined> {
        try {
            // 验证编辑器配置
            const validationResult = this.validateEditorConfig(editorConfig);
            if (!validationResult.isValid) {
                throw new Error(`编辑器配置验证失败: ${validationResult.errors.join(', ')}`);
            }

            const editors = this.getEditors();
            
            // 检查路径是否已存在
            if (editors.some(editor => editor.path === editorConfig.path)) {
                throw new Error('该编辑器路径已存在');
            }

            // 如果设置为默认编辑器，需要取消其他编辑器的默认状态
            if (editorConfig.isDefault) {
                editors.forEach(editor => editor.isDefault = false);
            }
            
            // 如果是第一个编辑器，自动设为默认；否则不自动设为默认
            const shouldBeDefault = editors.length === 0 ? true : (editorConfig.isDefault || false);

            // 创建新的编辑器配置
            const newEditor: EditorConfig = {
                id: uuidv4(),
                name: editorConfig.name,
                path: editorConfig.path,
                isDefault: shouldBeDefault,
                type: editorConfig.type || this.detectEditorType(editorConfig.path),
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            // 更新配置
            const updatedEditors = [...editors, newEditor];
            await this.updateConfiguration(ConfigManager.CONFIG_KEYS.EDITORS, updatedEditors);

            this.logInfo('成功添加编辑器配置', { 
                editorName: newEditor.name, 
                editorPath: newEditor.path,
                isDefault: newEditor.isDefault,
                isFirstEditor: editors.length === 0
            });
            return newEditor;

        } catch (error) {
            this.logError('添加编辑器配置失败', error as Error, { editorConfig });
            return undefined;
        }
    }

    /**
     * 更新编辑器配置
     * @param editorId 编辑器ID
     * @param updates 要更新的配置项
     * @returns 更新成功返回true，失败返回false
     */
    public async updateEditor(editorId: string, updates: Partial<Omit<EditorConfig, 'id' | 'createdAt'>>): Promise<boolean> {
        try {
            const editors = this.getEditors();
            const editorIndex = editors.findIndex(editor => editor.id === editorId);
            
            if (editorIndex === -1) {
                throw new Error(`未找到ID为 ${editorId} 的编辑器`);
            }

            const originalEditor = editors[editorIndex];
            
            // 创建更新后的编辑器配置
            const updatedEditor: EditorConfig = {
                ...originalEditor,
                ...updates,
                id: originalEditor.id, // 确保ID不被更改
                createdAt: originalEditor.createdAt, // 确保创建时间不被更改
                updatedAt: Date.now()
            };

            // 验证更新后的配置
            const validationResult = this.validateEditorConfig(updatedEditor);
            if (!validationResult.isValid) {
                throw new Error(`编辑器配置验证失败: ${validationResult.errors.join(', ')}`);
            }

            // 如果设置为默认编辑器，需要取消其他编辑器的默认状态
            if (updatedEditor.isDefault && !originalEditor.isDefault) {
                editors.forEach((editor, index) => {
                    if (index !== editorIndex) {
                        editor.isDefault = false;
                    }
                });
            }

            // 更新编辑器列表
            editors[editorIndex] = updatedEditor;
            await this.updateConfiguration(ConfigManager.CONFIG_KEYS.EDITORS, editors);

            this.logInfo('成功更新编辑器配置', { editorId, updates });
            return true;

        } catch (error) {
            this.logError('更新编辑器配置失败', error as Error, { editorId, updates });
            return false;
        }
    }

    /**
     * 删除编辑器配置
     * @param editorId 要删除的编辑器ID
     * @returns 删除成功返回true，失败返回false
     */
    public async deleteEditor(editorId: string): Promise<boolean> {
        try {
            const editors = this.getEditors();
            const editorIndex = editors.findIndex(editor => editor.id === editorId);
            
            if (editorIndex === -1) {
                throw new Error(`未找到ID为 ${editorId} 的编辑器`);
            }

            const deletedEditor = editors[editorIndex];
            
            // 删除编辑器
            const updatedEditors = editors.filter(editor => editor.id !== editorId);
            
            // 如果删除的是默认编辑器，且还有其他编辑器，则设置第一个为默认
            if (deletedEditor.isDefault && updatedEditors.length > 0) {
                updatedEditors[0].isDefault = true;
            }

            await this.updateConfiguration(ConfigManager.CONFIG_KEYS.EDITORS, updatedEditors);

            this.logInfo('成功删除编辑器配置', { editorId, editorName: deletedEditor.name });
            return true;

        } catch (error) {
            this.logError('删除编辑器配置失败', error as Error, { editorId });
            return false;
        }
    }

    /**
     * 设置默认编辑器
     * @param editorId 要设置为默认的编辑器ID
     * @returns 设置成功返回true，失败返回false
     */
    public async setDefaultEditor(editorId: string): Promise<boolean> {
        try {
            const editors = this.getEditors();
            let targetEditor: EditorConfig | undefined;

            // 更新所有编辑器的默认状态
            editors.forEach(editor => {
                if (editor.id === editorId) {
                    editor.isDefault = true;
                    editor.updatedAt = Date.now();
                    targetEditor = editor;
                } else {
                    editor.isDefault = false;
                }
            });

            if (!targetEditor) {
                throw new Error(`未找到ID为 ${editorId} 的编辑器`);
            }

            await this.updateConfiguration(ConfigManager.CONFIG_KEYS.EDITORS, editors);

            this.logInfo('成功设置默认编辑器', { editorId, editorName: targetEditor.name });
            return true;

        } catch (error) {
            this.logError('设置默认编辑器失败', error as Error, { editorId });
            return false;
        }
    }

    /**
     * 获取默认编辑器配置
     * @returns 默认编辑器配置，如果没有则返回undefined
     */
    public getDefaultEditor(): EditorConfig | undefined {
        const editors = this.getEditors();
        return editors.find(editor => editor.isDefault);
    }

    /**
     * 获取快捷键修饰符配置
     * @returns 快捷键修饰符配置
     */
    public getKeyboardModifiers(): KeyboardModifiers {
        const config = this.getConfigurationValue<KeyboardModifiers>(ConfigManager.CONFIG_KEYS.KEYBOARD_MODIFIERS);
        return config || { ...ConfigManager.DEFAULT_CONFIG.KEYBOARD_MODIFIERS };
    }

    /**
     * 更新快捷键修饰符配置
     * @param modifiers 新的修饰符配置
     * @returns 更新成功返回true，失败返回false
     */
    public async updateKeyboardModifiers(modifiers: KeyboardModifiers): Promise<boolean> {
        try {
            // 验证修饰符配置
            const validationResult = this.validateKeyboardModifiers(modifiers);
            if (!validationResult.isValid) {
                throw new Error(`快捷键配置验证失败: ${validationResult.errors.join(', ')}`);
            }

            await this.updateConfiguration(ConfigManager.CONFIG_KEYS.KEYBOARD_MODIFIERS, modifiers);

            this.logInfo('成功更新快捷键配置', { modifiers });
            return true;

        } catch (error) {
            this.logError('更新快捷键配置失败', error as Error, { modifiers });
            return false;
        }
    }

    /**
     * 获取防抖延迟时间
     * @returns 防抖延迟时间（毫秒）
     */
    public getDebounceTime(): number {
        const time = this.getConfigurationValue<number>(ConfigManager.CONFIG_KEYS.DEBOUNCE_TIME);
        return time || ConfigManager.DEFAULT_CONFIG.DEBOUNCE_TIME;
    }

    /**
     * 更新防抖延迟时间
     * @param time 新的防抖延迟时间（毫秒）
     * @returns 更新成功返回true，失败返回false
     */
    public async updateDebounceTime(time: number): Promise<boolean> {
        try {
            if (time < 0 || time > 5000) {
                throw new Error('防抖延迟时间必须在0-5000毫秒之间');
            }

            await this.updateConfiguration(ConfigManager.CONFIG_KEYS.DEBOUNCE_TIME, time);

            this.logInfo('成功更新防抖延迟时间', { time });
            return true;

        } catch (error) {
            this.logError('更新防抖延迟时间失败', error as Error, { time });
            return false;
        }
    }

    /**
     * 获取缓存启用状态
     * @returns 是否启用缓存
     */
    public isCacheEnabled(): boolean {
        const enabled = this.getConfigurationValue<boolean>(ConfigManager.CONFIG_KEYS.ENABLE_CACHE);
        return enabled !== undefined ? enabled : ConfigManager.DEFAULT_CONFIG.ENABLE_CACHE;
    }

    /**
     * 更新缓存启用状态
     * @param enabled 是否启用缓存
     * @returns 更新成功返回true，失败返回false
     */
    public async updateCacheEnabled(enabled: boolean): Promise<boolean> {
        try {
            await this.updateConfiguration(ConfigManager.CONFIG_KEYS.ENABLE_CACHE, enabled);

            this.logInfo('成功更新缓存启用状态', { enabled });
            return true;

        } catch (error) {
            this.logError('更新缓存启用状态失败', error as Error, { enabled });
            return false;
        }
    }

    /**
     * 注册配置更新回调函数
     * @param configKey 配置键名
     * @param callback 回调函数
     */
    public onConfigurationChange(configKey: string, callback: ConfigUpdateCallback): void {
        if (!this.configUpdateCallbacks.has(configKey)) {
            this.configUpdateCallbacks.set(configKey, []);
        }
        this.configUpdateCallbacks.get(configKey)!.push(callback);
    }

    /**
     * 注销配置更新回调函数
     * @param configKey 配置键名
     * @param callback 要注销的回调函数
     */
    public offConfigurationChange(configKey: string, callback: ConfigUpdateCallback): void {
        const callbacks = this.configUpdateCallbacks.get(configKey);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 验证编辑器配置
     * @param config 要验证的编辑器配置
     * @returns 验证结果
     */
    private validateEditorConfig(config: Partial<EditorConfig>): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 验证必需字段
        if (!config.name || config.name.trim() === '') {
            errors.push('编辑器名称不能为空');
        }

        if (!config.path || config.path.trim() === '') {
            errors.push('编辑器路径不能为空');
        }

        // 验证路径格式（简单验证）
        if (config.path && !config.path.includes('/') && !config.path.includes('\\')) {
            warnings.push('编辑器路径可能不是有效的完整路径');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'EditorConfig'
        };
    }

    /**
     * 验证快捷键修饰符配置
     * @param modifiers 要验证的修饰符配置
     * @returns 验证结果
     */
    private validateKeyboardModifiers(modifiers: KeyboardModifiers): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 检查是否至少有一个修饰键被启用
        const hasModifier = modifiers.ctrl || modifiers.shift || modifiers.alt || modifiers.meta;
        if (!hasModifier) {
            warnings.push('建议至少启用一个修饰键以避免意外触发');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'KeyboardModifiers'
        };
    }

    /**
     * 根据编辑器路径检测编辑器类型
     * @param editorPath 编辑器路径
     * @returns 检测到的编辑器类型
     */
    private detectEditorType(editorPath: string): EditorType {
        const path = editorPath.toLowerCase();
        
        if (path.includes('idea')) {
            return EditorType.IDEA;
        } else if (path.includes('pycharm')) {
            return EditorType.PYCHARM;
        } else if (path.includes('webstorm')) {
            return EditorType.WEBSTORM;
        } else if (path.includes('jetbrains')) {
            return EditorType.JETBRAINS;
        } else {
            return EditorType.CUSTOM;
        }
    }

    /**
     * 获取配置值
     * @param key 配置键名
     * @returns 配置值
     */
    private getConfigurationValue<T>(key: string): T | undefined {
        const config = vscode.workspace.getConfiguration();
        return config.get<T>(key);
    }

    /**
     * 更新配置
     * @param key 配置键名
     * @param value 新的配置值
     * @param configurationTarget 配置目标（默认为全局）
     */
    private async updateConfiguration(
        key: string, 
        value: any, 
        configurationTarget: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
    ): Promise<void> {
        const config = vscode.workspace.getConfiguration();
        await config.update(key, value, configurationTarget);
    }

    /**
     * 记录信息日志
     * @param message 日志消息
     * @param data 额外数据
     */
    private logInfo(message: string, data?: any): void {
        console.log(`[QuickAI] ${message}`, data);
    }

    /**
     * 记录错误日志
     * @param message 错误消息
     * @param error 错误对象
     * @param context 上下文信息
     */
    private logError(message: string, error: Error, context?: any): void {
        console.error(`[QuickAI] ${message}`, {
            error: error.message,
            stack: error.stack,
            context
        });
    }

    /**
     * 销毁配置管理器
     * 清理资源，注销事件监听器
     */
    public dispose(): void {
        this.configUpdateCallbacks.clear();
        ConfigManager.instance = undefined;
    }
}