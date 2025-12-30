/**
 * WebView管理器
 * 负责管理VS Code WebView面板
 * @author hqzqaq
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../configManager';
import { CommandExecutor } from '../commandExecutor';
import { getQuickAILogger } from '../utils';

export class WebViewManager {
    private readonly configManager: ConfigManager;
    private readonly commandExecutor: CommandExecutor;
    private readonly logger = getQuickAILogger();
    private editorManagerPanel: vscode.WebviewPanel | undefined;

    constructor(
        _context: vscode.ExtensionContext,
        configManager: ConfigManager,
        commandExecutor: CommandExecutor
    ) {
        this.configManager = configManager;
        this.commandExecutor = commandExecutor;
    }

    public async openEditorManager(): Promise<void> {
        try {
            if (this.editorManagerPanel) {
                this.editorManagerPanel.reveal();
                return;
            }

            this.editorManagerPanel = vscode.window.createWebviewPanel(
                'quickai-editor-manager',
                'QuickAI - 编辑器管理',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            this.editorManagerPanel.webview.html = await this.getEditorManagerHtml();
            this.setupEditorManagerMessageHandling();

            this.editorManagerPanel.onDidDispose(() => {
                this.editorManagerPanel = undefined;
            });

            this.logger.info('编辑器管理界面已打开');
        } catch (error) {
            this.logger.error('打开编辑器管理界面失败', error as Error);
            throw error;
        }
    }

    private setupEditorManagerMessageHandling(): void {
        if (!this.editorManagerPanel) return;

        this.editorManagerPanel.webview.onDidReceiveMessage(async (message) => {
            try {
                let result;
                
                switch (message.type) {
                    case 'getEditors':
                        result = this.configManager.getEditors();
                        break;
                    case 'addEditor':
                        result = await this.configManager.addEditor(message.data);
                        break;
                    case 'updateEditor':
                        result = await this.configManager.updateEditor(message.data.editorId, message.data.updates);
                        break;
                    case 'deleteEditor':
                        await this.configManager.deleteEditor(message.data.editorId);
                        this.logger.info(`编辑器配置已删除: ${message.data.editorId}`);
                        result = { success: true };
                        break;
                    case 'setDefaultEditor':
                        result = await this.configManager.setDefaultEditor(message.data.editorId);
                        break;
                    case 'testEditor':
                        const editors = this.configManager.getEditors();
                        const editor = editors.find(e => e.id === message.data.editorId);
                        if (editor) {
                            result = await this.commandExecutor.testEditor(editor);
                        }
                        break;
                    case 'selectEditorPath':
                        const platform = process.platform;
                        
                        // 根据不同操作系统设置默认文件类型和过滤器
                        let openDialogOptions: vscode.OpenDialogOptions = {
                            canSelectFiles: true,
                            canSelectFolders: false,
                            canSelectMany: false,
                            openLabel: '选择编辑器'
                        };
                        
                        // 动态设置过滤器，优先显示当前平台的可执行文件
                        if (platform === 'win32') {
                            openDialogOptions.filters = {
                                'Windows可执行文件': ['exe'],
                                '所有文件': ['*']
                            };
                        } else if (platform === 'darwin') {
                            openDialogOptions.filters = {
                                'macOS应用程序': ['app'],
                                '所有文件': ['*']
                            };
                        } else {
                            openDialogOptions.filters = {
                                'Unix可执行文件': ['sh'],
                                '所有文件': ['*']
                            };
                        }
                        
                        const fileResult = await vscode.window.showOpenDialog(openDialogOptions);
                        
                        if (fileResult && fileResult[0]) {
                            let selectedPath = fileResult[0].fsPath;
                            
                            this.logger.info('用户选择文件路径', { originalPath: selectedPath });
                            
                            // 如果选择的是 .app 文件（macOS应用），尝试找到可执行文件
                            if (selectedPath.endsWith('.app')) {
                                const processedPath = await this.processMacOSAppPath(selectedPath);
                                if (processedPath) {
                                    selectedPath = processedPath;
                                    this.logger.info('macOS .app路径处理成功', { 
                                        originalPath: fileResult[0].fsPath,
                                        processedPath: selectedPath 
                                    });
                                }
                            }
                            
                            result = {
                                success: true,
                                path: selectedPath
                            };
                            
                            this.logger.info('准备发送路径选择结果到前端', { 
                                success: result.success, 
                                path: result.path,
                                messageId: message.messageId 
                            });
                        } else {
                            result = {
                                success: false,
                                path: null
                            };
                            
                            this.logger.info('用户取消了路径选择', { messageId: message.messageId });
                        }
                        break;
                }

                await this.editorManagerPanel?.webview.postMessage({
                    type: 'response',
                    messageId: message.messageId,
                    data: result
                });

            } catch (error) {
                await this.editorManagerPanel?.webview.postMessage({
                    type: 'error',
                    messageId: message.messageId,
                    data: { error: (error as Error).message }
                });
            }
        });
    }

    /**
     * 处理macOS应用包路径，找到内部可执行文件
     * @param appPath .app文件路径
     * @returns 处理后的可执行文件路径，如果找不到则返回原路径
     */
    private async processMacOSAppPath(appPath: string): Promise<string | null> {
        try {
            if (!appPath.endsWith('.app')) {
                return appPath;
            }

            const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
            // Contents/Resources/app/bin/code
            const parentPath = path.join(appPath, 'Contents', 'Resources', 'app', 'bin');

            const macOSExecutable = path.join(appPath, 'Contents', 'Resources', 'app', 'bin', 'code');

            if (!fs.existsSync(infoPlistPath) || !fs.existsSync(macOSExecutable)) {
                this.logger.warn('应用包结构不完整，找不到Info.plist或可执行文件', { appPath });
                // 使用 parentPath 下找到的第一个文件
                if (fs.existsSync(parentPath)) {
                    const files = fs.readdirSync(parentPath);
                    const firstFile = files[0];
                    if (firstFile) {
                        return path.join(parentPath, firstFile);
                    }
                }
                return null; // Return null if not found
            }

            return macOSExecutable; // Return executable path if found
        } catch (error) {
            this.logger.error('处理macOS应用包路径失败', error as Error, { appPath });
            return null; // On error, return null
        }
    }

    private async getEditorManagerHtml(): Promise<string> {
        try {
            // 为打包和开发环境提供多种路径选择
            // 在VS Code扩展中，__dirname指向编译后的out目录
            let htmlContent = '';
            let jsContent = '';
            
            // 获取扩展根目录的多种可能路径
            const extensionRootPath = path.resolve(__dirname, '../..');
            
            // 尝试多个可能的文件位置，包括打包后的结构
            const possibleHtmlPaths = [
                path.join(extensionRootPath, 'src', 'webview', 'editor-manager.html'), // 打包后的src路径
                path.join(extensionRootPath, '..', 'src', 'webview', 'editor-manager.html'), // 开发环境相对路径
                path.join(extensionRootPath, 'webview', 'editor-manager.html') // 备用路径
            ];
            
            const possibleJsPaths = [
                path.join(extensionRootPath, 'src', 'webview', 'editor-manager.js'), // 打包后的src路径
                path.join(extensionRootPath, '..', 'src', 'webview', 'editor-manager.js'), // 开发环境相对路径
                path.join(extensionRootPath, 'webview', 'editor-manager.js') // 备用路径
            ];
            
            // 尝试读取HTML文件
            for (const htmlFilePath of possibleHtmlPaths) {
                try {
                    htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
                    this.logger.info(`成功读取editor-manager.html: ${htmlFilePath}`);
                    break;
                } catch (error) {
                    // 继续尝试下一个路径
                }
            }
            
            if (!htmlContent) {
                this.logger.warn('无法读取editor-manager.html，使用备用HTML');
                htmlContent = this.getFallbackHtml();
            }
            
            // 尝试读取JS文件
            for (const jsFilePath of possibleJsPaths) {
                try {
                    jsContent = fs.readFileSync(jsFilePath, 'utf8');
                    this.logger.info(`成功读取editor-manager.js: ${jsFilePath}`);
                    break;
                } catch (error) {
                    // 继续尝试下一个路径
                }
            }
            
            if (!jsContent) {
                this.logger.warn('无法读取editor-manager.js，将使用内嵌JavaScript');
            }

            // 将JS内容注入到HTML中
            if (jsContent) {
                const scriptTag = `<script>${jsContent}</script>`;
                htmlContent = htmlContent.replace('</body>', `${scriptTag}\n</body>`);
            }

            return htmlContent;
        } catch (error) {
            this.logger.error('读取HTML模板失败，使用备用方案', error as Error);
            return this.getFallbackHtml();
        }
    }

    private getFallbackHtml(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>编辑器管理</title>
    <style>
        body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); margin: 20px; }
        .btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin: 4px; }
        .btn:hover { background: var(--vscode-button-hoverBackground); }
        .btn-danger { background: var(--vscode-errorForeground); color: white; }
        .btn-danger:hover { background: var(--vscode-errorForeground); opacity: 0.8; }
        .error { color: var(--vscode-errorForeground); padding: 10px; margin: 10px 0; border-radius: 4px; }
        .info { color: var(--vscode-textPreformat-foreground); padding: 10px; margin: 10px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>📝 编辑器管理</h1>
    <div class="error">
        <p><strong>模板文件加载失败</strong></p>
        <p>无法读取独立的HTML模板文件，使用简化版本。</p>
        <p>请确保以下文件存在：</p>
        <ul>
            <li>src/webview/editor-manager.html</li>
            <li>src/webview/editor-manager.js</li>
        </ul>
    </div>
    <div class="info">
        <p>这是一个备用界面。完整的编辑器管理功能需要单独的HTML模板文件。</p>
    </div>
</body>
</html>`;
    }

}