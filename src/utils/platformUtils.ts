/**
 * 平台检测工具类
 * 提供跨平台的系统信息检测和平台特定功能
 * @author hqzqaq
 * @version 1.0.0
 */

import * as os from 'os';
import { PlatformInfo } from '../types';

/**
 * 平台工具类
 */
export class PlatformUtils {
    
    /** 缓存的平台信息 */
    private static cachedPlatformInfo: PlatformInfo | undefined;

    /**
     * 获取平台信息
     * @returns 平台信息对象
     */
    public static getPlatformInfo(): PlatformInfo {
        if (!PlatformUtils.cachedPlatformInfo) {
            const platform = process.platform;
            
            PlatformUtils.cachedPlatformInfo = {
                platform,
                isWindows: platform === 'win32',
                isMacOS: platform === 'darwin',
                isLinux: platform === 'linux',
                arch: process.arch,
                version: os.release()
            };
        }
        
        return PlatformUtils.cachedPlatformInfo;
    }

    /**
     * 检查是否为Windows系统
     * @returns Windows系统返回true
     */
    public static isWindows(): boolean {
        return PlatformUtils.getPlatformInfo().isWindows;
    }

    /**
     * 检查是否为macOS系统
     * @returns macOS系统返回true
     */
    public static isMacOS(): boolean {
        return PlatformUtils.getPlatformInfo().isMacOS;
    }

    /**
     * 检查是否为Linux系统
     * @returns Linux系统返回true
     */
    public static isLinux(): boolean {
        return PlatformUtils.getPlatformInfo().isLinux;
    }

    /**
     * 检查是否为Unix系统（macOS或Linux）
     * @returns Unix系统返回true
     */
    public static isUnix(): boolean {
        const info = PlatformUtils.getPlatformInfo();
        return info.isMacOS || info.isLinux;
    }

    /**
     * 获取系统架构
     * @returns 系统架构字符串
     */
    public static getArchitecture(): string {
        return PlatformUtils.getPlatformInfo().arch;
    }

    /**
     * 检查是否为64位系统
     * @returns 64位系统返回true
     */
    public static is64Bit(): boolean {
        return process.arch.includes('64');
    }

    /**
     * 获取系统版本
     * @returns 系统版本字符串
     */
    public static getSystemVersion(): string {
        return PlatformUtils.getPlatformInfo().version;
    }

    /**
     * 获取系统平台字符串
     * @returns 平台字符串
     */
    public static getPlatform(): NodeJS.Platform {
        return PlatformUtils.getPlatformInfo().platform;
    }

    /**
     * 获取系统临时目录
     * @returns 临时目录路径
     */
    public static getTempDirectory(): string {
        return os.tmpdir();
    }

    /**
     * 获取用户主目录
     * @returns 用户主目录路径
     */
    public static getHomeDirectory(): string {
        return os.homedir();
    }

    /**
     * 获取系统主机名
     * @returns 主机名
     */
    public static getHostname(): string {
        return os.hostname();
    }

    /**
     * 获取CPU信息
     * @returns CPU信息数组
     */
    public static getCpuInfo(): os.CpuInfo[] {
        return os.cpus();
    }

    /**
     * 获取CPU核心数
     * @returns CPU核心数
     */
    public static getCpuCount(): number {
        return os.cpus().length;
    }

    /**
     * 获取系统总内存（字节）
     * @returns 总内存字节数
     */
    public static getTotalMemory(): number {
        return os.totalmem();
    }

    /**
     * 获取系统可用内存（字节）
     * @returns 可用内存字节数
     */
    public static getFreeMemory(): number {
        return os.freemem();
    }

    /**
     * 获取系统负载平均值（仅Unix系统）
     * @returns 负载平均值数组 [1分钟, 5分钟, 15分钟]
     */
    public static getLoadAverage(): number[] {
        return os.loadavg();
    }

    /**
     * 获取系统网络接口信息
     * @returns 网络接口信息对象
     */
    public static getNetworkInterfaces(): NodeJS.Dict<os.NetworkInterfaceInfo[]> {
        return os.networkInterfaces();
    }

    /**
     * 获取系统运行时间（秒）
     * @returns 运行时间秒数
     */
    public static getUptime(): number {
        return os.uptime();
    }

    /**
     * 获取进程运行时间（秒）
     * @returns 进程运行时间秒数
     */
    public static getProcessUptime(): number {
        return process.uptime();
    }

    /**
     * 获取环境变量
     * @param name 环境变量名
     * @param defaultValue 默认值
     * @returns 环境变量值
     */
    public static getEnvironmentVariable(name: string, defaultValue?: string): string | undefined {
        return process.env[name] || defaultValue;
    }

    /**
     * 设置环境变量
     * @param name 环境变量名
     * @param value 环境变量值
     */
    public static setEnvironmentVariable(name: string, value: string): void {
        process.env[name] = value;
    }

    /**
     * 获取PATH环境变量数组
     * @returns PATH目录数组
     */
    public static getPathDirectories(): string[] {
        const pathSeparator = PlatformUtils.isWindows() ? ';' : ':';
        const pathEnv = process.env.PATH || '';
        return pathEnv.split(pathSeparator).filter(dir => dir.trim() !== '');
    }

    /**
     * 获取当前用户信息
     * @returns 用户信息对象
     */
    public static getUserInfo(): os.UserInfo<string> {
        return os.userInfo();
    }

    /**
     * 获取当前用户名
     * @returns 用户名
     */
    public static getUsername(): string {
        return PlatformUtils.getUserInfo().username;
    }

    /**
     * 检查是否为管理员权限（Windows）或root权限（Unix）
     * @returns 有管理员权限返回true
     */
    public static isAdministrator(): boolean {
        if (PlatformUtils.isWindows()) {
            // Windows下检查用户组
            try {
                const { execSync } = require('child_process');
                execSync('net session', { encoding: 'utf8', stdio: 'pipe' });
                return true;
            } catch {
                return false;
            }
        } else {
            // Unix下检查UID
            return process.getuid && process.getuid() === 0;
        }
    }

    /**
     * 获取系统位数描述
     * @returns 系统位数描述字符串
     */
    public static getSystemDescription(): string {
        const info = PlatformUtils.getPlatformInfo();
        const bitness = PlatformUtils.is64Bit() ? '64位' : '32位';
        
        let platformName = '未知系统';
        if (info.isWindows) {
            platformName = 'Windows';
        } else if (info.isMacOS) {
            platformName = 'macOS';
        } else if (info.isLinux) {
            platformName = 'Linux';
        }
        
        return `${platformName} ${bitness} (${info.arch})`;
    }

    /**
     * 检查特定命令是否在系统PATH中可用
     * @param command 命令名
     * @returns 命令可用返回true
     */
    public static isCommandAvailable(command: string): boolean {
        try {
            const { execSync } = require('child_process');
            const checkCommand = PlatformUtils.isWindows() ? 'where' : 'which';
            execSync(`${checkCommand} ${command}`, { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 获取系统shell路径
     * @returns shell路径
     */
    public static getShell(): string {
        if (PlatformUtils.isWindows()) {
            return process.env.COMSPEC || 'cmd.exe';
        } else {
            return process.env.SHELL || '/bin/sh';
        }
    }

    /**
     * 获取默认的编辑器命令
     * @returns 编辑器命令
     */
    public static getDefaultEditor(): string {
        return process.env.EDITOR || process.env.VISUAL || (PlatformUtils.isWindows() ? 'notepad' : 'vi');
    }

    /**
     * 获取系统区域设置
     * @returns 区域设置字符串
     */
    public static getLocale(): string {
        return process.env.LANG || process.env.LC_ALL || 'en_US.UTF-8';
    }

    /**
     * 检查是否在容器环境中运行
     * @returns 在容器中返回true
     */
    public static isInContainer(): boolean {
        // 检查Docker环境
        if (process.env.DOCKER_CONTAINER || 
            require('fs').existsSync('/.dockerenv')) {
            return true;
        }
        
        // 检查其他容器环境标识
        const containerEnvs = [
            'KUBERNETES_SERVICE_HOST',
            'MESOS_TASK_ID',
            'container'
        ];
        
        return containerEnvs.some(env => process.env[env]);
    }

    /**
     * 获取Node.js版本信息
     * @returns Node.js版本对象
     */
    public static getNodeVersion(): {
        node: string;
        v8: string;
        uv: string;
        zlib: string;
        openssl: string;
    } {
        return {
            node: process.version,
            v8: process.versions.v8,
            uv: process.versions.uv,
            zlib: process.versions.zlib,
            openssl: process.versions.openssl
        };
    }

    /**
     * 格式化内存大小
     * @param bytes 字节数
     * @returns 格式化后的内存大小字符串
     */
    public static formatMemorySize(bytes: number): string {
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
     * 获取系统性能摘要
     * @returns 系统性能摘要对象
     */
    public static getSystemSummary() {
        const totalMem = PlatformUtils.getTotalMemory();
        const freeMem = PlatformUtils.getFreeMemory();
        const usedMem = totalMem - freeMem;
        
        return {
            platform: PlatformUtils.getSystemDescription(),
            hostname: PlatformUtils.getHostname(),
            uptime: PlatformUtils.getUptime(),
            processUptime: PlatformUtils.getProcessUptime(),
            cpuCount: PlatformUtils.getCpuCount(),
            totalMemory: PlatformUtils.formatMemorySize(totalMem),
            usedMemory: PlatformUtils.formatMemorySize(usedMem),
            freeMemory: PlatformUtils.formatMemorySize(freeMem),
            memoryUsage: ((usedMem / totalMem) * 100).toFixed(2) + '%',
            loadAverage: PlatformUtils.isUnix() ? PlatformUtils.getLoadAverage() : null,
            nodeVersion: PlatformUtils.getNodeVersion().node,
            isContainer: PlatformUtils.isInContainer(),
            isAdmin: PlatformUtils.isAdministrator()
        };
    }

    /**
     * 重置缓存的平台信息
     */
    public static resetCache(): void {
        PlatformUtils.cachedPlatformInfo = undefined;
    }
}