/**
 * QuickAI VS Code插件的TypeScript类型定义
 * @author hqzqaq
 * @version 1.0.0
 */

/**
 * 外部编辑器配置接口
 * 定义了外部编辑器的基本信息和配置
 */
export interface EditorConfig {
    /** 编辑器唯一标识符 */
    readonly id: string;
    
    /** 编辑器显示名称 */
    name: string;
    
    /** 编辑器可执行文件的绝对路径 */
    path: string;
    
    /** 是否为默认编辑器 */
    isDefault: boolean;
    
    /** 编辑器类型（可选） */
    type?: EditorType;
    
    /** 跳转模式（可选） */
    jumpMode?: JumpMode;
    
    /** 创建时间戳 */
    readonly createdAt: number;
    
    /** 最后修改时间戳 */
    updatedAt: number;
}

/**
 * 支持的编辑器类型枚举
 */
export enum EditorType {
    /** IntelliJ IDEA */
    IDEA = 'idea',
    
    /** PyCharm */
    PYCHARM = 'pycharm',
    
    /** WebStorm */
    WEBSTORM = 'webstorm',
    
    /** 其他Jetbrains IDE */
    JETBRAINS = 'jetbrains',
    
    /** Visual Studio Code及其衍生版本 */
    VSCODE = 'vscode',
    
    /** 自定义编辑器 */
    CUSTOM = 'custom'
}

/**
 * 编辑器跳转模式枚举
 */
export enum JumpMode {
    /** IDEA模式：使用--line参数 */
    IDEA = 'idea',
    
    /** VSCode模式：使用-g参数 */
    VSCODE = 'vscode'
}

/**
 * 键盘修饰键配置接口
 * 定义了触发快捷键所需的修饰键组合
 */
export interface KeyboardModifiers {
    /** Ctrl键是否启用 */
    ctrl: boolean;
    
    /** Shift键是否启用 */
    shift: boolean;
    
    /** Alt键是否启用（macOS为Option键） */
    alt: boolean;
    
    /** Meta键是否启用（Windows为Win键，macOS为Cmd键） */
    meta: boolean;
}

/**
 * 项目上下文信息接口
 * 包含当前项目的相关信息和状态
 */
export interface ProjectContext {
    /** 项目根目录路径 */
    readonly rootPath: string;
    
    /** 当前打开的文件路径 */
    readonly currentFilePath: string;
    
    /** 当前光标所在行号（从1开始） */
    readonly currentLineNumber: number;
    
    /** 当前光标所在列号（从1开始） */
    readonly currentColumnNumber: number;
    
    /** 工作区名称 */
    readonly workspaceName?: string;
    
    /** 项目类型（可选） */
    readonly projectType?: ProjectType;
}

/**
 * 项目类型枚举
 */
export enum ProjectType {
    /** Java项目 */
    JAVA = 'java',
    
    /** Python项目 */
    PYTHON = 'python',
    
    /** JavaScript/TypeScript项目 */
    JAVASCRIPT = 'javascript',
    
    /** 其他类型 */
    OTHER = 'other'
}

/**
 * 缓存条目接口
 * 定义了缓存系统中单个条目的结构
 */
export interface CacheEntry<T = any> {
    /** 缓存的数据 */
    readonly data: T;
    
    /** 缓存创建时间戳 */
    readonly timestamp: number;
    
    /** 缓存过期时间（毫秒） */
    readonly ttl: number;
    
    /** 缓存键 */
    readonly key: string;
}

/**
 * 缓存管理器配置接口
 */
export interface CacheManagerConfig {
    /** 设置缓存时长（毫秒），默认1000ms */
    settingsCacheTtl: number;
    
    /** 项目路径缓存时长（毫秒），默认5000ms */
    projectPathCacheTtl: number;
    
    /** 编辑器状态缓存时长（毫秒），默认5000ms */
    editorStateCacheTtl: number;
    
    /** 最大缓存条目数量，默认100 */
    maxCacheSize: number;
}

/**
 * 命令执行参数接口
 * 定义了执行外部编辑器命令所需的参数
 */
export interface CommandExecutionParams {
    /** 目标编辑器配置 */
    readonly editor: EditorConfig;
    
    /** 要打开的文件路径 */
    readonly filePath: string;
    
    /** 要跳转的行号 */
    readonly lineNumber: number;
    
    /** 要跳转的列号（可选） */
    readonly columnNumber?: number;
    
    /** 项目根目录路径（必需） */
    readonly projectRoot: string;
}

/**
 * 命令执行结果接口
 */
export interface CommandExecutionResult {
    /** 执行是否成功 */
    readonly success: boolean;
    
    /** 错误信息（如果执行失败） */
    readonly error?: string;
    
    /** 执行的命令字符串 */
    readonly command: string;
    
    /** 执行耗时（毫秒） */
    readonly executionTime: number;
    
    /** 进程ID（如果可用） */
    readonly processId?: number | undefined;
}

/**
 * 平台信息接口
 */
export interface PlatformInfo {
    /** 操作系统类型 */
    readonly platform: NodeJS.Platform;
    
    /** 是否为Windows系统 */
    readonly isWindows: boolean;
    
    /** 是否为macOS系统 */
    readonly isMacOS: boolean;
    
    /** 是否为Linux系统 */
    readonly isLinux: boolean;
    
    /** 系统架构 */
    readonly arch: string;
    
    /** 系统版本信息 */
    readonly version: string;
}

/**
 * 鼠标事件处理器配置接口
 */
export interface MouseEventHandlerConfig {
    /** 启用的修饰键配置 */
    modifiers: KeyboardModifiers;
    
    /** 防抖延迟时间（毫秒） */
    debounceTime: number;
    
    /** 是否启用事件处理 */
    enabled: boolean;
    
    /** 调试模式 */
    debugMode?: boolean;
}

/**
 * WebView消息接口
 * 定义了WebView与扩展之间的通信消息格式
 */
export interface WebViewMessage {
    /** 消息类型 */
    readonly type: WebViewMessageType;
    
    /** 消息数据 */
    readonly data?: any;
    
    /** 消息ID（用于响应匹配） */
    readonly messageId?: string;
    
    /** 时间戳 */
    readonly timestamp: number;
}

/**
 * WebView消息类型枚举
 */
export enum WebViewMessageType {
    /** 获取编辑器列表 */
    GET_EDITORS = 'getEditors',
    
    /** 添加编辑器 */
    ADD_EDITOR = 'addEditor',
    
    /** 更新编辑器 */
    UPDATE_EDITOR = 'updateEditor',
    
    /** 删除编辑器 */
    DELETE_EDITOR = 'deleteEditor',
    
    /** 设置默认编辑器 */
    SET_DEFAULT_EDITOR = 'setDefaultEditor',
    
    /** 获取快捷键配置 */
    GET_KEYBOARD_CONFIG = 'getKeyboardConfig',
    
    /** 更新快捷键配置 */
    UPDATE_KEYBOARD_CONFIG = 'updateKeyboardConfig',
    
    /** 测试编辑器路径 */
    TEST_EDITOR_PATH = 'testEditorPath',
    
    /** 选择编辑器路径 */
    SELECT_EDITOR_PATH = 'selectEditorPath',
    
    /** 响应消息 */
    RESPONSE = 'response',
    
    /** 错误消息 */
    ERROR = 'error'
}

/**
 * 配置验证结果接口
 */
export interface ConfigValidationResult {
    /** 验证是否通过 */
    readonly isValid: boolean;
    
    /** 错误信息列表 */
    readonly errors: string[];
    
    /** 警告信息列表 */
    readonly warnings: string[];
    
    /** 验证的配置项名称 */
    readonly configName: string;
}

/**
 * 性能监控指标接口
 */
export interface PerformanceMetrics {
    /** 命令执行次数 */
    commandExecutionCount: number;
    
    /** 平均执行时间（毫秒） */
    averageExecutionTime: number;
    
    /** 缓存命中率（百分比） */
    cacheHitRate: number;
    
    /** 错误次数 */
    errorCount: number;
    
    /** 最后更新时间 */
    lastUpdated: number;
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
    /** 调试信息 */
    DEBUG = 'debug',
    
    /** 一般信息 */
    INFO = 'info',
    
    /** 警告信息 */
    WARN = 'warn',
    
    /** 错误信息 */
    ERROR = 'error'
}

/**
 * 日志条目接口
 */
export interface LogEntry {
    /** 日志级别 */
    readonly level: LogLevel;
    
    /** 日志消息 */
    readonly message: string;
    
    /** 时间戳 */
    readonly timestamp: number;
    
    /** 日志来源 */
    readonly source: string;
    
    /** 额外数据 */
    readonly data?: any;
    
    /** 错误堆栈（如果适用） */
    readonly stack?: string | undefined;
}

/**
 * 事件发射器类型定义
 */
export type EventListener<T = any> = (data: T) => void;

/**
 * 异步操作结果类型
 */
export type AsyncResult<T> = Promise<T | undefined>;

/**
 * 配置更新回调类型
 */
export type ConfigUpdateCallback = (newConfig: any, oldConfig: any) => void;

/**
 * 命令构建器函数类型
 */
export type CommandBuilder = (params: CommandExecutionParams, platform: PlatformInfo) => string;

/**
 * 错误处理器函数类型
 */
export type ErrorHandler = (error: Error, context?: any) => void;