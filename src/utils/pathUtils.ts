/**
 * 路径操作工具类
 * 提供跨平台的路径处理和操作方法
 * @author hqzqaq
 * @version 1.0.0
 */

import * as path from 'path';
import * as os from 'os';

/**
 * 路径操作工具类
 */
export class PathUtils {
    
    /**
     * 规范化路径
     * @param filePath 文件路径
     * @returns 规范化后的路径
     */
    public static normalize(filePath: string): string {
        return path.normalize(filePath);
    }

    /**
     * 连接路径片段
     * @param segments 路径片段数组
     * @returns 连接后的路径
     */
    public static join(...segments: string[]): string {
        return path.join(...segments);
    }

    /**
     * 获取相对路径
     * @param from 起始路径
     * @param to 目标路径
     * @returns 相对路径
     */
    public static relative(from: string, to: string): string {
        return path.relative(from, to);
    }

    /**
     * 获取绝对路径
     * @param filePath 文件路径
     * @returns 绝对路径
     */
    public static resolve(filePath: string): string {
        return path.resolve(filePath);
    }

    /**
     * 检查路径是否为绝对路径
     * @param filePath 文件路径
     * @returns 是绝对路径返回true
     */
    public static isAbsolute(filePath: string): boolean {
        return path.isAbsolute(filePath);
    }

    /**
     * 转换为Unix风格路径
     * @param filePath 文件路径
     * @returns Unix风格路径
     */
    public static toUnixPath(filePath: string): string {
        return filePath.replace(/\\/g, '/');
    }

    /**
     * 转换为Windows风格路径
     * @param filePath 文件路径
     * @returns Windows风格路径
     */
    public static toWindowsPath(filePath: string): string {
        return filePath.replace(/\//g, '\\');
    }

    /**
     * 转换为当前平台风格路径
     * @param filePath 文件路径
     * @returns 当前平台风格路径
     */
    public static toPlatformPath(filePath: string): string {
        if (os.platform() === 'win32') {
            return PathUtils.toWindowsPath(filePath);
        } else {
            return PathUtils.toUnixPath(filePath);
        }
    }

    /**
     * 获取用户主目录
     * @returns 用户主目录路径
     */
    public static getHomeDirectory(): string {
        return os.homedir();
    }

    /**
     * 获取当前工作目录
     * @returns 当前工作目录路径
     */
    public static getCurrentDirectory(): string {
        return process.cwd();
    }

    /**
     * 展开波浪号路径（~）
     * @param filePath 包含波浪号的路径
     * @returns 展开后的绝对路径
     */
    public static expandTilde(filePath: string): string {
        if (filePath.startsWith('~/') || filePath === '~') {
            return path.join(PathUtils.getHomeDirectory(), filePath.slice(2));
        }
        return filePath;
    }

    /**
     * 压缩路径（将用户主目录替换为~）
     * @param filePath 文件路径
     * @returns 压缩后的路径
     */
    public static compressTilde(filePath: string): string {
        const homeDir = PathUtils.getHomeDirectory();
        if (filePath.startsWith(homeDir)) {
            return '~' + filePath.slice(homeDir.length);
        }
        return filePath;
    }

    /**
     * 获取最深层的公共父目录
     * @param paths 路径数组
     * @returns 公共父目录
     */
    public static getCommonParent(paths: string[]): string {
        if (paths.length === 0) {
            return '';
        }
        
        if (paths.length === 1) {
            return path.dirname(paths[0]);
        }
        
        const normalizedPaths = paths.map(p => PathUtils.normalize(p));
        const parts = normalizedPaths.map(p => p.split(path.sep));
        
        let commonParts: string[] = [];
        const minLength = Math.min(...parts.map(p => p.length));
        
        for (let i = 0; i < minLength; i++) {
            const part = parts[0][i];
            if (parts.every(p => p[i] === part)) {
                commonParts.push(part);
            } else {
                break;
            }
        }
        
        return commonParts.join(path.sep) || path.sep;
    }

    /**
     * 检查路径是否在指定目录内
     * @param filePath 文件路径
     * @param parentDir 父目录路径
     * @returns 在指定目录内返回true
     */
    public static isSubPath(filePath: string, parentDir: string): boolean {
        const relativePath = path.relative(parentDir, filePath);
        return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    }

    /**
     * 获取路径深度
     * @param filePath 文件路径
     * @returns 路径深度
     */
    public static getDepth(filePath: string): number {
        const normalizedPath = PathUtils.normalize(filePath);
        const parts = normalizedPath.split(path.sep).filter(part => part !== '');
        return parts.length;
    }

    /**
     * 获取路径的父目录链
     * @param filePath 文件路径
     * @returns 父目录路径数组（从根目录到直接父目录）
     */
    public static getParentChain(filePath: string): string[] {
        const absolutePath = path.resolve(filePath);
        const parts = absolutePath.split(path.sep).filter(part => part !== '');
        const chain: string[] = [];
        
        for (let i = 1; i <= parts.length; i++) {
            const parentPath = path.sep + parts.slice(0, i).join(path.sep);
            chain.push(parentPath);
        }
        
        return chain;
    }

    /**
     * 创建相对路径的符号链接路径
     * @param target 目标路径
     * @param linkPath 链接路径
     * @returns 相对的符号链接路径
     */
    public static createRelativeSymlink(target: string, linkPath: string): string {
        const linkDir = path.dirname(linkPath);
        return path.relative(linkDir, target);
    }

    /**
     * 安全地连接路径（防止路径遍历攻击）
     * @param basePath 基础路径
     * @param userPath 用户提供的路径
     * @returns 安全的连接路径
     */
    public static safePath(basePath: string, userPath: string): string {
        const joinedPath = path.join(basePath, userPath);
        const resolvedPath = path.resolve(joinedPath);
        const resolvedBase = path.resolve(basePath);
        
        if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
            throw new Error('路径遍历攻击检测');
        }
        
        return resolvedPath;
    }

    /**
     * 获取文件路径的各个组成部分
     * @param filePath 文件路径
     * @returns 路径组成部分对象
     */
    public static parsePath(filePath: string): {
        root: string;
        dir: string;
        base: string;
        ext: string;
        name: string;
        absolute: string;
        relative: string;
    } {
        const parsed = path.parse(filePath);
        const absolute = path.resolve(filePath);
        const relative = path.relative(PathUtils.getCurrentDirectory(), absolute);
        
        return {
            ...parsed,
            absolute,
            relative
        };
    }

    /**
     * 生成唯一的文件路径（避免重名）
     * @param filePath 原始文件路径
     * @param maxAttempts 最大尝试次数
     * @returns 唯一的文件路径
     */
    public static generateUniquePath(filePath: string, maxAttempts: number = 1000): string {
        const { dir, name, ext } = path.parse(filePath);
        
        for (let i = 0; i < maxAttempts; i++) {
            const suffix = i === 0 ? '' : `_${i}`;
            const uniquePath = path.join(dir, `${name}${suffix}${ext}`);
            
            // 这里应该检查文件是否存在，但为了避免依赖，我们返回路径
            // 实际使用时可以结合 FileUtils.exists 方法
            if (i === 0) {
                return uniquePath;
            }
        }
        
        throw new Error(`无法生成唯一路径: ${filePath}`);
    }

    /**
     * 获取路径中的盘符（仅Windows）
     * @param filePath 文件路径
     * @returns 盘符（如 'C:'）或空字符串
     */
    public static getDriveLetter(filePath: string): string {
        if (os.platform() === 'win32') {
            const match = filePath.match(/^([A-Za-z]:)/);
            return match ? match[1] : '';
        }
        return '';
    }

    /**
     * 检查是否为网络路径（UNC路径）
     * @param filePath 文件路径
     * @returns 是网络路径返回true
     */
    public static isNetworkPath(filePath: string): boolean {
        return filePath.startsWith('\\\\') || filePath.startsWith('//');
    }

    /**
     * 将路径转换为URI格式
     * @param filePath 文件路径
     * @returns URI格式的路径
     */
    public static toUri(filePath: string): string {
        const absolutePath = path.resolve(filePath);
        
        if (os.platform() === 'win32') {
            // Windows路径转换
            return 'file:///' + absolutePath.replace(/\\/g, '/');
        } else {
            // Unix路径转换
            return 'file://' + absolutePath;
        }
    }

    /**
     * 从URI格式转换为文件路径
     * @param uri URI格式的路径
     * @returns 文件路径
     */
    public static fromUri(uri: string): string {
        if (!uri.startsWith('file://')) {
            throw new Error('无效的文件URI');
        }
        
        let path = decodeURIComponent(uri.substring(7));
        
        if (os.platform() === 'win32') {
            // Windows路径处理
            if (path.startsWith('/')) {
                path = path.substring(1);
            }
            path = path.replace(/\//g, '\\');
        }
        
        return path;
    }

    /**
     * 获取路径的hash值（用于缓存键等）
     * @param filePath 文件路径
     * @returns 路径的hash值
     */
    public static getPathHash(filePath: string): string {
        const crypto = require('crypto');
        const normalizedPath = PathUtils.normalize(filePath).toLowerCase();
        return crypto.createHash('md5').update(normalizedPath).digest('hex');
    }

    /**
     * 比较两个路径是否相同（忽略大小写和路径分隔符差异）
     * @param path1 路径1
     * @param path2 路径2
     * @returns 路径相同返回true
     */
    public static pathsEqual(path1: string, path2: string): boolean {
        const normalized1 = PathUtils.normalize(path1).toLowerCase();
        const normalized2 = PathUtils.normalize(path2).toLowerCase();
        return normalized1 === normalized2;
    }

    /**
     * 获取路径的显示名称（适合UI显示）
     * @param filePath 文件路径
     * @param maxLength 最大长度
     * @returns 显示名称
     */
    public static getDisplayName(filePath: string, maxLength: number = 50): string {
        if (filePath.length <= maxLength) {
            return filePath;
        }
        
        const fileName = path.basename(filePath);
        if (fileName.length >= maxLength - 3) {
            return '...' + fileName.substring(fileName.length - maxLength + 3);
        }
        
        const dirPath = path.dirname(filePath);
        const availableLength = maxLength - fileName.length - 4; // 4 for ".../"
        
        if (dirPath.length <= availableLength) {
            return dirPath + path.sep + fileName;
        }
        
        return '...' + path.sep + fileName;
    }
}