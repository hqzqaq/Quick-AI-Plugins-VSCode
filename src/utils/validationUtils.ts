/**
 * 验证工具类
 * 提供各种数据验证和校验功能
 * @author hqzqaq
 * @version 1.0.0
 */

import { EditorConfig, KeyboardModifiers, ConfigValidationResult, JumpMode } from '../types';
import { FileUtils } from './fileUtils';
import { PathUtils } from './pathUtils';
import { PlatformUtils } from './platformUtils';

/**
 * 验证工具类
 */
export class ValidationUtils {
    
    /**
     * 验证编辑器配置
     * @param config 编辑器配置
     * @returns 验证结果
     */
    public static validateEditorConfig(config: Partial<EditorConfig>): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 验证必需字段
        if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
            errors.push('编辑器名称不能为空');
        } else if (config.name.length > 100) {
            warnings.push('编辑器名称过长，建议不超过100个字符');
        }

        if (!config.path || typeof config.path !== 'string' || config.path.trim() === '') {
            errors.push('编辑器路径不能为空');
        } else {
            // 验证路径格式
            const pathValidation = ValidationUtils.validateFilePath(config.path);
            if (!pathValidation.isValid) {
                errors.push(...pathValidation.errors);
            }
            warnings.push(...pathValidation.warnings);
        }

        // 验证布尔字段
        if (config.isDefault !== undefined && typeof config.isDefault !== 'boolean') {
            errors.push('isDefault字段必须是布尔类型');
        }

        // 验证跳转模式字段
        if (config.jumpMode !== undefined) {
            if (!Object.values(JumpMode).includes(config.jumpMode)) {
                errors.push(`jumpMode字段必须是有效的跳转模式值（${Object.values(JumpMode).join('或')}）`);
            }
        }

        // 验证时间戳字段
        if (config.createdAt !== undefined) {
            if (typeof config.createdAt !== 'number' || config.createdAt < 0) {
                errors.push('createdAt字段必须是有效的时间戳');
            }
        }

        if (config.updatedAt !== undefined) {
            if (typeof config.updatedAt !== 'number' || config.updatedAt < 0) {
                errors.push('updatedAt字段必须是有效的时间戳');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'EditorConfig'
        };
    }

    /**
     * 验证键盘修饰符配置
     * @param modifiers 键盘修饰符配置
     * @returns 验证结果
     */
    public static validateKeyboardModifiers(modifiers: Partial<KeyboardModifiers>): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 验证字段类型
        const fields = ['ctrl', 'shift', 'alt', 'meta'] as const;
        for (const field of fields) {
            if (modifiers[field] !== undefined && typeof modifiers[field] !== 'boolean') {
                errors.push(`${field}字段必须是布尔类型`);
            }
        }

        // 检查是否至少有一个修饰键被启用
        const hasAnyModifier = fields.some(field => modifiers[field] === true);
        if (!hasAnyModifier && Object.keys(modifiers).length > 0) {
            warnings.push('建议至少启用一个修饰键以避免意外触发');
        }

        // 平台特定建议
        if (PlatformUtils.isMacOS() && modifiers.meta === false && modifiers.ctrl === true) {
            warnings.push('在macOS上，建议使用Cmd键（meta）而非Ctrl键');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'KeyboardModifiers'
        };
    }

    /**
     * 验证文件路径
     * @param filePath 文件路径
     * @returns 验证结果
     */
    public static validateFilePath(filePath: string): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!filePath || typeof filePath !== 'string') {
            errors.push('文件路径不能为空');
            return { isValid: false, errors, warnings, configName: 'FilePath' };
        }

        const trimmedPath = filePath.trim();
        if (trimmedPath === '') {
            errors.push('文件路径不能为空');
            return { isValid: false, errors, warnings, configName: 'FilePath' };
        }

        // 检查路径长度
        if (trimmedPath.length > 260 && PlatformUtils.isWindows()) {
            warnings.push('Windows系统路径长度建议不超过260个字符');
        } else if (trimmedPath.length > 4096) {
            warnings.push('路径长度过长，可能导致兼容性问题');
        }

        // 检查无效字符
        const invalidChars = ValidationUtils.getInvalidPathCharacters();
        const hasInvalidChars = invalidChars.some(char => trimmedPath.includes(char));
        if (hasInvalidChars) {
            errors.push('路径包含无效字符: ' + invalidChars.filter(char => trimmedPath.includes(char)).join(', '));
        }

        // 检查路径格式
        if (!PathUtils.isAbsolute(trimmedPath)) {
            warnings.push('建议使用绝对路径');
        }

        // 检查路径是否可能是可执行文件
        const ext = FileUtils.getFileExtension(trimmedPath);
        if (ext && !ValidationUtils.isExecutableExtension(ext)) {
            warnings.push(`文件扩展名 .${ext} 可能不是可执行文件`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'FilePath'
        };
    }

    /**
     * 验证行号
     * @param lineNumber 行号
     * @returns 验证结果
     */
    public static validateLineNumber(lineNumber: any): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (typeof lineNumber !== 'number') {
            errors.push('行号必须是数字类型');
            return { isValid: false, errors, warnings, configName: 'LineNumber' };
        }

        if (!Number.isInteger(lineNumber)) {
            errors.push('行号必须是整数');
        }

        if (lineNumber < 1) {
            errors.push('行号必须大于等于1');
        }

        if (lineNumber > 999999) {
            warnings.push('行号过大，可能导致编辑器无法正确跳转');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'LineNumber'
        };
    }

    /**
     * 验证列号
     * @param columnNumber 列号
     * @returns 验证结果
     */
    public static validateColumnNumber(columnNumber: any): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (columnNumber === undefined || columnNumber === null) {
            return { isValid: true, errors, warnings, configName: 'ColumnNumber' };
        }

        if (typeof columnNumber !== 'number') {
            errors.push('列号必须是数字类型');
            return { isValid: false, errors, warnings, configName: 'ColumnNumber' };
        }

        if (!Number.isInteger(columnNumber)) {
            errors.push('列号必须是整数');
        }

        if (columnNumber < 1) {
            errors.push('列号必须大于等于1');
        }

        if (columnNumber > 1000) {
            warnings.push('列号过大，可能导致编辑器无法正确跳转');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'ColumnNumber'
        };
    }

    /**
     * 验证防抖时间
     * @param debounceTime 防抖时间（毫秒）
     * @returns 验证结果
     */
    public static validateDebounceTime(debounceTime: any): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (typeof debounceTime !== 'number') {
            errors.push('防抖时间必须是数字类型');
            return { isValid: false, errors, warnings, configName: 'DebounceTime' };
        }

        if (!Number.isInteger(debounceTime)) {
            errors.push('防抖时间必须是整数');
        }

        if (debounceTime < 0) {
            errors.push('防抖时间不能为负数');
        }

        if (debounceTime > 5000) {
            warnings.push('防抖时间过长，可能影响用户体验');
        } else if (debounceTime < 50) {
            warnings.push('防抖时间过短，可能导致频繁触发');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'DebounceTime'
        };
    }

    /**
     * 验证TTL时间
     * @param ttl TTL时间（毫秒）
     * @returns 验证结果
     */
    public static validateTTL(ttl: any): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (typeof ttl !== 'number') {
            errors.push('TTL时间必须是数字类型');
            return { isValid: false, errors, warnings, configName: 'TTL' };
        }

        if (!Number.isInteger(ttl)) {
            errors.push('TTL时间必须是整数');
        }

        if (ttl <= 0) {
            errors.push('TTL时间必须大于0');
        }

        if (ttl > 86400000) { // 24小时
            warnings.push('TTL时间过长，可能导致缓存不及时更新');
        } else if (ttl < 100) {
            warnings.push('TTL时间过短，可能导致缓存频繁失效');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'TTL'
        };
    }

    /**
     * 验证URL格式
     * @param url URL字符串
     * @returns 验证结果
     */
    public static validateUrl(url: string): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!url || typeof url !== 'string' || url.trim() === '') {
            errors.push('URL不能为空');
            return { isValid: false, errors, warnings, configName: 'URL' };
        }

        try {
            new URL(url);
        } catch {
            errors.push('URL格式无效');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'URL'
        };
    }

    /**
     * 验证JSON字符串
     * @param jsonString JSON字符串
     * @returns 验证结果
     */
    public static validateJsonString(jsonString: string): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!jsonString || typeof jsonString !== 'string') {
            errors.push('JSON字符串不能为空');
            return { isValid: false, errors, warnings, configName: 'JSON' };
        }

        try {
            JSON.parse(jsonString);
        } catch (error) {
            errors.push(`JSON格式无效: ${(error as Error).message}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'JSON'
        };
    }

    /**
     * 验证电子邮件地址
     * @param email 电子邮件地址
     * @returns 验证结果
     */
    public static validateEmail(email: string): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!email || typeof email !== 'string' || email.trim() === '') {
            errors.push('电子邮件地址不能为空');
            return { isValid: false, errors, warnings, configName: 'Email' };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errors.push('电子邮件地址格式无效');
        }

        if (email.length > 254) {
            errors.push('电子邮件地址过长');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'Email'
        };
    }

    /**
     * 获取无效路径字符
     * @returns 无效字符数组
     */
    private static getInvalidPathCharacters(): string[] {
        if (PlatformUtils.isWindows()) {
            return ['<', '>', ':', '"', '|', '?', '*'];
        } else {
            return ['\0']; // Unix系统只有null字符是无效的
        }
    }

    /**
     * 检查是否为可执行文件扩展名
     * @param extension 文件扩展名
     * @returns 是可执行文件扩展名返回true
     */
    private static isExecutableExtension(extension: string): boolean {
        const ext = extension.toLowerCase();
        
        if (PlatformUtils.isWindows()) {
            const windowsExecExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'msi'];
            return windowsExecExtensions.includes(ext);
        } else {
            // Unix系统通常不依赖扩展名来判断可执行性
            const unixExecExtensions = ['sh', 'bash', 'zsh', 'fish', 'csh', 'tcsh', 'run', 'app'];
            return unixExecExtensions.includes(ext) || ext === '';
        }
    }

    /**
     * 验证对象是否包含必需属性
     * @param obj 要验证的对象
     * @param requiredProperties 必需属性列表
     * @returns 验证结果
     */
    public static validateRequiredProperties(obj: any, requiredProperties: string[]): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!obj || typeof obj !== 'object') {
            errors.push('对象不能为空');
            return { isValid: false, errors, warnings, configName: 'Object' };
        }

        for (const prop of requiredProperties) {
            if (!(prop in obj) || obj[prop] === undefined || obj[prop] === null) {
                errors.push(`缺少必需属性: ${prop}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'Object'
        };
    }

    /**
     * 验证数组是否非空
     * @param arr 要验证的数组
     * @param minLength 最小长度
     * @param maxLength 最大长度
     * @returns 验证结果
     */
    public static validateArray(arr: any, minLength: number = 0, maxLength: number = Infinity): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!Array.isArray(arr)) {
            errors.push('必须是数组类型');
            return { isValid: false, errors, warnings, configName: 'Array' };
        }

        if (arr.length < minLength) {
            errors.push(`数组长度不能少于${minLength}个元素`);
        }

        if (arr.length > maxLength) {
            errors.push(`数组长度不能超过${maxLength}个元素`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'Array'
        };
    }

    /**
     * 验证数字范围
     * @param value 要验证的数值
     * @param min 最小值
     * @param max 最大值
     * @param allowFloat 是否允许浮点数
     * @returns 验证结果
     */
    public static validateNumberRange(value: any, min: number, max: number, allowFloat: boolean = true): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (typeof value !== 'number') {
            errors.push('必须是数字类型');
            return { isValid: false, errors, warnings, configName: 'Number' };
        }

        if (!allowFloat && !Number.isInteger(value)) {
            errors.push('必须是整数');
        }

        if (value < min) {
            errors.push(`数值不能小于${min}`);
        }

        if (value > max) {
            errors.push(`数值不能大于${max}`);
        }

        if (!Number.isFinite(value)) {
            errors.push('数值必须是有限数');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'Number'
        };
    }

    /**
     * 验证字符串长度
     * @param str 要验证的字符串
     * @param minLength 最小长度
     * @param maxLength 最大长度
     * @returns 验证结果
     */
    public static validateStringLength(str: any, minLength: number = 0, maxLength: number = Infinity): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (typeof str !== 'string') {
            errors.push('必须是字符串类型');
            return { isValid: false, errors, warnings, configName: 'String' };
        }

        if (str.length < minLength) {
            errors.push(`字符串长度不能少于${minLength}个字符`);
        }

        if (str.length > maxLength) {
            errors.push(`字符串长度不能超过${maxLength}个字符`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            configName: 'String'
        };
    }

    /**
     * 组合多个验证结果
     * @param results 验证结果数组
     * @returns 组合后的验证结果
     */
    public static combineValidationResults(results: ConfigValidationResult[]): ConfigValidationResult {
        const allErrors: string[] = [];
        const allWarnings: string[] = [];
        
        for (const result of results) {
            allErrors.push(...result.errors);
            allWarnings.push(...result.warnings);
        }

        return {
            isValid: allErrors.length === 0,
            errors: allErrors,
            warnings: allWarnings,
            configName: 'Combined'
        };
    }
}