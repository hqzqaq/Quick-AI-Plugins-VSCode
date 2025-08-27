/**
 * 文件操作工具类
 * 提供文件和目录操作的常用方法
 * @author hqzqaq
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

/**
 * 异步文件操作方法
 */
const fsAsync = {
    exists: promisify(fs.exists),
    stat: promisify(fs.stat),
    readFile: promisify(fs.readFile),
    writeFile: promisify(fs.writeFile),
    readdir: promisify(fs.readdir),
    mkdir: promisify(fs.mkdir),
    rmdir: promisify(fs.rmdir),
    unlink: promisify(fs.unlink)
};

/**
 * 文件操作工具类
 */
export class FileUtils {
    
    /**
     * 检查文件或目录是否存在
     * @param filePath 文件或目录路径
     * @returns 存在返回true，不存在返回false
     */
    public static async exists(filePath: string): Promise<boolean> {
        try {
            await fsAsync.stat(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 同步检查文件或目录是否存在
     * @param filePath 文件或目录路径
     * @returns 存在返回true，不存在返回false
     */
    public static existsSync(filePath: string): boolean {
        try {
            return fs.existsSync(filePath);
        } catch (error) {
            return false;
        }
    }

    /**
     * 检查路径是否为文件
     * @param filePath 文件路径
     * @returns 是文件返回true
     */
    public static async isFile(filePath: string): Promise<boolean> {
        try {
            const stats = await fsAsync.stat(filePath);
            return stats.isFile();
        } catch (error) {
            return false;
        }
    }

    /**
     * 检查路径是否为目录
     * @param dirPath 目录路径
     * @returns 是目录返回true
     */
    public static async isDirectory(dirPath: string): Promise<boolean> {
        try {
            const stats = await fsAsync.stat(dirPath);
            return stats.isDirectory();
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取文件大小
     * @param filePath 文件路径
     * @returns 文件大小（字节）
     */
    public static async getFileSize(filePath: string): Promise<number> {
        try {
            const stats = await fsAsync.stat(filePath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    /**
     * 获取文件修改时间
     * @param filePath 文件路径
     * @returns 修改时间
     */
    public static async getModifiedTime(filePath: string): Promise<Date | undefined> {
        try {
            const stats = await fsAsync.stat(filePath);
            return stats.mtime;
        } catch (error) {
            return undefined;
        }
    }

    /**
     * 读取文件内容
     * @param filePath 文件路径
     * @param encoding 编码格式，默认为utf8
     * @returns 文件内容
     */
    public static async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
        try {
            const content = await fsAsync.readFile(filePath, encoding);
            return content;
        } catch (error) {
            throw new Error(`读取文件失败: ${filePath}, 错误: ${(error as Error).message}`);
        }
    }

    /**
     * 写入文件内容
     * @param filePath 文件路径
     * @param content 文件内容
     * @param encoding 编码格式，默认为utf8
     */
    public static async writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): Promise<void> {
        try {
            await fsAsync.writeFile(filePath, content, encoding);
        } catch (error) {
            throw new Error(`写入文件失败: ${filePath}, 错误: ${(error as Error).message}`);
        }
    }

    /**
     * 创建目录（递归创建）
     * @param dirPath 目录路径
     */
    public static async createDirectory(dirPath: string): Promise<void> {
        try {
            await fsAsync.mkdir(dirPath, { recursive: true });
        } catch (error) {
            throw new Error(`创建目录失败: ${dirPath}, 错误: ${(error as Error).message}`);
        }
    }

    /**
     * 删除文件
     * @param filePath 文件路径
     */
    public static async deleteFile(filePath: string): Promise<void> {
        try {
            await fsAsync.unlink(filePath);
        } catch (error) {
            throw new Error(`删除文件失败: ${filePath}, 错误: ${(error as Error).message}`);
        }
    }

    /**
     * 获取目录下的所有文件和子目录
     * @param dirPath 目录路径
     * @returns 文件和目录名称数组
     */
    public static async readDirectory(dirPath: string): Promise<string[]> {
        try {
            return await fsAsync.readdir(dirPath);
        } catch (error) {
            throw new Error(`读取目录失败: ${dirPath}, 错误: ${(error as Error).message}`);
        }
    }

    /**
     * 获取目录下的所有文件（递归）
     * @param dirPath 目录路径
     * @param extensions 文件扩展名过滤器（可选）
     * @returns 文件路径数组
     */
    public static async getAllFiles(dirPath: string, extensions?: string[]): Promise<string[]> {
        const result: string[] = [];
        
        try {
            const items = await fsAsync.readdir(dirPath);
            
            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stats = await fsAsync.stat(fullPath);
                
                if (stats.isDirectory()) {
                    // 递归处理子目录
                    const subFiles = await FileUtils.getAllFiles(fullPath, extensions);
                    result.push(...subFiles);
                } else if (stats.isFile()) {
                    // 检查文件扩展名
                    if (!extensions || extensions.some(ext => fullPath.endsWith(ext))) {
                        result.push(fullPath);
                    }
                }
            }
            
            return result;
        } catch (error) {
            throw new Error(`获取文件列表失败: ${dirPath}, 错误: ${(error as Error).message}`);
        }
    }

    /**
     * 复制文件
     * @param sourcePath 源文件路径
     * @param destPath 目标文件路径
     */
    public static async copyFile(sourcePath: string, destPath: string): Promise<void> {
        try {
            const content = await fsAsync.readFile(sourcePath);
            
            // 确保目标目录存在
            const destDir = path.dirname(destPath);
            await FileUtils.createDirectory(destDir);
            
            await fsAsync.writeFile(destPath, content);
        } catch (error) {
            throw new Error(`复制文件失败: ${sourcePath} -> ${destPath}, 错误: ${(error as Error).message}`);
        }
    }

    /**
     * 移动文件
     * @param sourcePath 源文件路径
     * @param destPath 目标文件路径
     */
    public static async moveFile(sourcePath: string, destPath: string): Promise<void> {
        try {
            await FileUtils.copyFile(sourcePath, destPath);
            await FileUtils.deleteFile(sourcePath);
        } catch (error) {
            throw new Error(`移动文件失败: ${sourcePath} -> ${destPath}, 错误: ${(error as Error).message}`);
        }
    }

    /**
     * 获取文件扩展名
     * @param filePath 文件路径
     * @returns 文件扩展名（不包含点号）
     */
    public static getFileExtension(filePath: string): string {
        return path.extname(filePath).toLowerCase().substring(1);
    }

    /**
     * 获取文件名（不包含扩展名）
     * @param filePath 文件路径
     * @returns 文件名
     */
    public static getFileName(filePath: string): string {
        return path.basename(filePath, path.extname(filePath));
    }

    /**
     * 获取文件名（包含扩展名）
     * @param filePath 文件路径
     * @returns 完整文件名
     */
    public static getFullFileName(filePath: string): string {
        return path.basename(filePath);
    }

    /**
     * 获取文件所在目录
     * @param filePath 文件路径
     * @returns 目录路径
     */
    public static getDirectory(filePath: string): string {
        return path.dirname(filePath);
    }

    /**
     * 检查文件是否为可执行文件
     * @param filePath 文件路径
     * @returns 是可执行文件返回true
     */
    public static async isExecutable(filePath: string): Promise<boolean> {
        try {
            const stats = await fsAsync.stat(filePath);
            
            // 在Unix系统上检查执行权限
            if (process.platform !== 'win32') {
                return (stats.mode & parseInt('111', 8)) !== 0;
            }
            
            // 在Windows上检查文件扩展名
            const ext = FileUtils.getFileExtension(filePath);
            const executableExtensions = ['exe', 'bat', 'cmd', 'com'];
            return executableExtensions.includes(ext);
            
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取临时目录路径
     * @returns 临时目录路径
     */
    public static getTempDirectory(): string {
        return require('os').tmpdir();
    }

    /**
     * 创建临时文件
     * @param content 文件内容
     * @param extension 文件扩展名
     * @returns 临时文件路径
     */
    public static async createTempFile(content: string, extension: string = 'tmp'): Promise<string> {
        const tempDir = FileUtils.getTempDirectory();
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileName = `quickai_${timestamp}_${randomStr}.${extension}`;
        const filePath = path.join(tempDir, fileName);
        
        await FileUtils.writeFile(filePath, content);
        return filePath;
    }

    /**
     * 清理临时文件
     * @param filePath 临时文件路径
     */
    public static async cleanupTempFile(filePath: string): Promise<void> {
        try {
            if (await FileUtils.exists(filePath)) {
                await FileUtils.deleteFile(filePath);
            }
        } catch (error) {
            // 静默处理清理错误
            console.warn(`清理临时文件失败: ${filePath}`, error);
        }
    }

    /**
     * 格式化文件大小
     * @param bytes 字节数
     * @returns 格式化后的文件大小字符串
     */
    public static formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * 生成安全的文件名
     * @param originalName 原始文件名
     * @returns 安全的文件名
     */
    public static sanitizeFileName(originalName: string): string {
        // 移除或替换不安全的字符
        return originalName
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/^\.+/, '')
            .substring(0, 255);
    }

    /**
     * 检查文件是否为文本文件
     * @param filePath 文件路径
     * @returns 是文本文件返回true
     */
    public static isTextFile(filePath: string): boolean {
        const textExtensions = [
            'txt', 'md', 'js', 'ts', 'jsx', 'tsx', 'json', 'xml', 'html', 'htm',
            'css', 'scss', 'sass', 'less', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
            'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'clj', 'sh',
            'bat', 'ps1', 'yml', 'yaml', 'toml', 'ini', 'conf', 'cfg', 'log'
        ];
        
        const ext = FileUtils.getFileExtension(filePath);
        return textExtensions.includes(ext);
    }

    /**
     * 获取文件的MIME类型
     * @param filePath 文件路径
     * @returns MIME类型
     */
    public static getMimeType(filePath: string): string {
        const ext = FileUtils.getFileExtension(filePath);
        const mimeTypes: Record<string, string> = {
            'txt': 'text/plain',
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'xml': 'application/xml',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'pdf': 'application/pdf',
            'zip': 'application/zip',
            'tar': 'application/x-tar',
            'gz': 'application/gzip'
        };
        
        return mimeTypes[ext] || 'application/octet-stream';
    }
}