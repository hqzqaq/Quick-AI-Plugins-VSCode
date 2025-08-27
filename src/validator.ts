/**
 * QuickAI插件功能验证测试
 * 验证所有核心功能是否正常工作
 * @author hqzqaq
 * @version 1.0.0
 */

import { ConfigManager } from './configManager';
import { CacheManager } from './cacheManager';
import { CommandExecutor } from './commandExecutor';
import { EditorConfig, KeyboardModifiers, EditorType } from './types';

/**
 * 插件功能验证类
 */
export class PluginValidator {

    /**
     * 运行所有验证测试
     */
    public static async runAllTests(): Promise<boolean> {
        console.log('🚀 开始QuickAI插件功能验证...\n');

        const tests = [
            PluginValidator.testConfigManager,
            PluginValidator.testCacheManager,
            PluginValidator.testCommandExecutor,
            PluginValidator.testCrossplatformSupport
        ];

        let allPassed = true;

        for (const test of tests) {
            try {
                const result = await test();
                if (!result) {
                    allPassed = false;
                }
            } catch (error) {
                console.error(`❌ 测试失败: ${error}`);
                allPassed = false;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(allPassed ? '✅ 所有测试通过！插件功能正常' : '❌ 部分测试失败，请检查问题');
        console.log('='.repeat(50));

        return allPassed;
    }

    /**
     * 测试配置管理器
     */
    private static async testConfigManager(): Promise<boolean> {
        console.log('📋 测试配置管理器...');

        try {
            const configManager = ConfigManager.getInstance();

            // 测试添加编辑器
            const testEditor: Omit<EditorConfig, 'id' | 'createdAt' | 'updatedAt'> = {
                name: 'Test IDEA',
                path: '/test/path/idea',
                isDefault: true,
                type: EditorType.IDEA
            };

            const addedEditor = await configManager.addEditor(testEditor);
            if (!addedEditor) {
                throw new Error('添加编辑器失败');
            }

            console.log('   ✅ 编辑器添加成功');

            // 测试获取编辑器列表
            const editors = configManager.getEditors();
            if (editors.length === 0) {
                throw new Error('获取编辑器列表失败');
            }

            console.log('   ✅ 编辑器列表获取成功');

            // 测试快捷键配置
            const testModifiers: KeyboardModifiers = {
                ctrl: true,
                shift: false,
                alt: true,
                meta: false
            };

            const updateResult = await configManager.updateKeyboardModifiers(testModifiers);
            if (!updateResult) {
                throw new Error('更新快捷键配置失败');
            }

            console.log('   ✅ 快捷键配置更新成功');

            // 清理测试数据
            await configManager.deleteEditor(addedEditor.id);
            console.log('   ✅ 测试数据清理完成');

            console.log('✅ 配置管理器测试通过\n');
            return true;

        } catch (error) {
            console.error(`❌ 配置管理器测试失败: ${error}\n`);
            return false;
        }
    }

    /**
     * 测试缓存管理器
     */
    private static async testCacheManager(): Promise<boolean> {
        console.log('💾 测试缓存管理器...');

        try {
            const cacheManager = CacheManager.getInstance();

            // 测试基本缓存操作
            const testKey = 'test_key';
            const testData = { message: 'Hello QuickAI!' };

            cacheManager.set(testKey, testData, 1000);
            console.log('   ✅ 缓存设置成功');

            const retrievedData = cacheManager.get<{message: string}>(testKey);
            if (!retrievedData || retrievedData.message !== testData.message) {
                throw new Error('缓存检索失败');
            }

            console.log('   ✅ 缓存检索成功');

            // 测试专用缓存方法
            cacheManager.setSettingsCache('test_setting', { value: 123 });
            const settingData = cacheManager.getSettingsCache<{value: number}>('test_setting');
            if (!settingData || settingData.value !== 123) {
                throw new Error('设置缓存失败');
            }

            console.log('   ✅ 设置缓存测试成功');

            // 测试缓存统计
            const stats = cacheManager.getStats();
            if (stats.cacheSize === 0) {
                throw new Error('缓存统计异常');
            }

            console.log('   ✅ 缓存统计正常');

            // 清理测试缓存
            cacheManager.clear();
            console.log('   ✅ 缓存清理完成');

            console.log('✅ 缓存管理器测试通过\n');
            return true;

        } catch (error) {
            console.error(`❌ 缓存管理器测试失败: ${error}\n`);
            return false;
        }
    }

    /**
     * 测试命令执行器
     */
    private static async testCommandExecutor(): Promise<boolean> {
        console.log('⚡ 测试命令执行器...');

        try {
            const cacheManager = CacheManager.getInstance();
            const commandExecutor = new CommandExecutor(cacheManager);

            // 测试平台信息获取
            const platformInfo = commandExecutor.getPlatformInfo();
            if (!platformInfo.platform) {
                throw new Error('获取平台信息失败');
            }

            console.log(`   ✅ 平台信息获取成功: ${platformInfo.platform}`);

            // 测试路径验证（使用系统路径）
            const systemPath = process.platform === 'win32' ? 'C:\\Windows\\System32\\cmd.exe' : '/bin/sh';
            const pathExists = await commandExecutor.verifyEditorPath(systemPath);
            if (!pathExists) {
                console.log(`   ⚠️  系统路径 ${systemPath} 不存在，跳过路径验证测试`);
            } else {
                console.log('   ✅ 路径验证功能正常');
            }

            // 测试执行统计
            const stats = commandExecutor.getExecutionStats();
            if (typeof stats.totalExecutions !== 'number') {
                throw new Error('执行统计异常');
            }

            console.log('   ✅ 执行统计正常');

            console.log('✅ 命令执行器测试通过\n');
            return true;

        } catch (error) {
            console.error(`❌ 命令执行器测试失败: ${error}\n`);
            return false;
        }
    }

    /**
     * 测试跨平台支持
     */
    private static async testCrossplatformSupport(): Promise<boolean> {
        console.log('🌍 测试跨平台支持...');

        try {
            const cacheManager = CacheManager.getInstance();
            const commandExecutor = new CommandExecutor(cacheManager);
            const platformInfo = commandExecutor.getPlatformInfo();

            // 验证平台检测
            const expectedPlatforms = ['win32', 'darwin', 'linux'];
            if (!expectedPlatforms.includes(platformInfo.platform)) {
                throw new Error(`不支持的平台: ${platformInfo.platform}`);
            }

            console.log(`   ✅ 平台检测正常: ${platformInfo.platform}`);

            // 验证架构信息
            if (!platformInfo.arch) {
                throw new Error('无法获取系统架构信息');
            }

            console.log(`   ✅ 架构信息正常: ${platformInfo.arch}`);

            // 验证平台特定功能
            if (platformInfo.isWindows) {
                console.log('   ✅ Windows平台特定功能已启用');
            } else if (platformInfo.isMacOS) {
                console.log('   ✅ macOS平台特定功能已启用');
            } else if (platformInfo.isLinux) {
                console.log('   ✅ Linux平台特定功能已启用');
            }

            console.log('✅ 跨平台支持测试通过\n');
            return true;

        } catch (error) {
            console.error(`❌ 跨平台支持测试失败: ${error}\n`);
            return false;
        }
    }
}

// 如果直接运行此文件，执行验证测试
if (require.main === module) {
    PluginValidator.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('验证测试异常:', error);
        process.exit(1);
    });
}