/**
 * WebView管理器
 * 负责管理VS Code WebView面板
 * @author hqzqaq
 * @version 1.0.0
 */

import * as vscode from 'vscode';
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

            this.editorManagerPanel.webview.html = this.getEditorManagerHtml();
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
                        const fileResult = await vscode.window.showOpenDialog({
                            canSelectFiles: true,
                            canSelectFolders: false,
                            canSelectMany: false,
                            openLabel: '选择编辑器',
                            filters: {
                                '所有文件': ['*'],
                                '应用程序': ['app'],
                                '可执行文件': ['exe', 'cmd', 'bat', 'sh']
                            }
                        });
                        
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
            const fs = require('fs');
            const path = require('path');
            
            if (!appPath.endsWith('.app')) {
                return appPath;
            }

            const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
            const macOSDir = path.join(appPath, 'Contents', 'MacOS');

            if (!fs.existsSync(infoPlistPath) || !fs.existsSync(macOSDir)) {
                this.logger.warn('应用包结构不完整，找不到Info.plist或MacOS目录', { appPath });
                return appPath; // Return original path
            }

            // 1. Read Info.plist to find the executable name
            try {
                const plistContent = fs.readFileSync(infoPlistPath, 'utf8');
                const match = /<key>CFBundleExecutable<\/key>\s*<string>([^<]+)<\/string>/.exec(plistContent);
                
                if (match && match[1]) {
                    const executableName = match[1];
                    const executablePath = path.join(macOSDir, executableName);
                    
                    if (fs.existsSync(executablePath)) {
                        const stats = fs.statSync(executablePath);
                        if (stats.isFile() && (stats.mode & parseInt('111', 8))) { // Check execute permission
                            this.logger.info('通过Info.plist找到可执行文件', { appPath, executablePath });
                            return executablePath;
                        }
                    }
                }
            } catch (plistError) {
                this.logger.error('读取或解析Info.plist失败', plistError as Error, { appPath });
                // Fallback to old method if plist parsing fails
            }

            // 2. Fallback: if Info.plist fails, scan the MacOS directory
            this.logger.info('Info.plist解析失败或未找到可执行文件，回退到扫描MacOS目录', { appPath });
            const files = fs.readdirSync(macOSDir);
            for (const file of files) {
                const filePath = path.join(macOSDir, file);
                try {
                    const stats = fs.statSync(filePath);
                    // Pick the first file that is executable and not a directory
                    if (stats.isFile() && (stats.mode & parseInt('111', 8))) {
                        this.logger.info('在MacOS目录中找到一个可执行文件作为回退选项', { filePath });
                        return filePath;
                    }
                } catch(statError) {
                    this.logger.warn('无法获取文件状态', { filePath, error: statError });
                }
            }

            this.logger.warn('在macOS应用包中未找到任何可执行文件', { appPath, macOSDir, files });
            return appPath; // Return original .app path if nothing found
            
        } catch (error) {
            this.logger.error('处理macOS应用包路径失败', error as Error, { appPath });
            return appPath; // On error, return original path
        }
    }

    private getEditorManagerHtml(): string {
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
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); }
        .modal-content { background-color: var(--vscode-editor-background); margin: 15% auto; padding: 20px; border: 1px solid var(--vscode-widget-border); border-radius: 6px; width: 300px; text-align: center; }
        .modal-buttons { margin-top: 20px; display: flex; gap: 10px; justify-content: center; }
        .editor-item { border: 1px solid var(--vscode-widget-border); padding: 16px; margin: 12px 0; border-radius: 6px; }
        .editor-edit { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--vscode-widget-border); }
        .form-group { margin: 12px 0; }
        .form-input { width: 100%; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); color: var(--vscode-input-foreground); padding: 8px; border-radius: 4px; }
        .path-group { display: flex; gap: 8px; }
        .path-group .form-input { flex: 1; }
        .button-group { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; }
        .button-group .btn { margin: 0; }
    </style>
</head>
<body>
    <h1>📝 编辑器管理</h1>
    
    <div class=\"add-editor-form\">
        <h2>添加新编辑器</h2>
        <div class=\"form-group\">
            <label>编辑器名称:</label>
            <input type=\"text\" id=\"editorName\" class=\"form-input\" placeholder=\"例如: IntelliJ IDEA\">
        </div>
        <div class=\"form-group\">
            <label>编辑器路径:</label>
            <div class=\"path-group\">
                <input type=\"text\" id=\"editorPath\" class=\"form-input\" placeholder=\"编辑器可执行文件路径\">
                <button class=\"btn\" data-action=\"selectPath\">浏览</button>
            </div>
        </div>
        <div class=\"form-group\">
            <label><input type=\"checkbox\" id=\"isDefault\"> 设为默认编辑器</label>
        </div>
        <button class=\"btn\" data-action=\"addEditor\">添加编辑器</button>
    </div>

    <div id=\"editorList\">
        <h2>已配置的编辑器</h2>
        <div id=\"editorContainer\">加载中...</div>
    </div>

    <!-- 自定义确认对话框 -->
    <div id=\"confirmModal\" class=\"modal\">
        <div class=\"modal-content\">
            <p id=\"confirmMessage\">确定要删除这个编辑器吗？</p>
            <div class=\"modal-buttons\">
                <button class=\"btn btn-danger\" id=\"confirmYes\">确定</button>
                <button class=\"btn\" id=\"confirmNo\">取消</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let messageId = 0;
        const pendingMessages = new Map();

        function sendMessage(type, data = null) {
            return new Promise((resolve, reject) => {
                const id = ++messageId;
                pendingMessages.set(id, { resolve, reject });
                vscode.postMessage({ type, data, messageId: id });
                setTimeout(() => {
                    if (pendingMessages.has(id)) {
                        pendingMessages.delete(id);
                        reject(new Error('超时'));
                    }
                }, 10000); // 增加超时时间到10秒，以防macOS .app处理时间过长
            });
        }

        window.addEventListener('message', event => {
            const { messageId, type, data } = event.data;
            if (pendingMessages.has(messageId)) {
                const { resolve, reject } = pendingMessages.get(messageId);
                pendingMessages.delete(messageId);
                type === 'error' ? reject(new Error(data?.error)) : resolve(data);
            }
        });

        // 自定义确认对话框函数
        function showConfirm(message) {
            return new Promise((resolve) => {
                const modal = document.getElementById('confirmModal');
                const messageElement = document.getElementById('confirmMessage');
                const yesButton = document.getElementById('confirmYes');
                const noButton = document.getElementById('confirmNo');
                
                messageElement.textContent = message;
                modal.style.display = 'block';
                
                function cleanup() {
                    modal.style.display = 'none';
                    yesButton.removeEventListener('click', onYes);
                    noButton.removeEventListener('click', onNo);
                    modal.removeEventListener('click', onModalClick);
                }
                
                function onYes() {
                    cleanup();
                    resolve(true);
                }
                
                function onNo() {
                    cleanup();
                    resolve(false);
                }
                
                function onModalClick(event) {
                    if (event.target === modal) {
                        cleanup();
                        resolve(false);
                    }
                }
                
                yesButton.addEventListener('click', onYes);
                noButton.addEventListener('click', onNo);
                modal.addEventListener('click', onModalClick);
            });
        }

        async function loadEditors() {
            try {
                const editors = await sendMessage('getEditors');
                const container = document.getElementById('editorContainer');
                
                if (editors.length === 0) {
                    container.innerHTML = '<p>还没有配置任何编辑器</p>';
                    return;
                }

                container.innerHTML = editors.map(editor => \`
                    <div class=\"editor-item\" id=\"editor-\${editor.id}\" data-editor-id=\"\${editor.id}\">
                        <div class=\"editor-display\" id=\"display-\${editor.id}\">
                            <h3>\${editor.name} \${editor.isDefault ? '(默认)' : ''}</h3>
                            <p>路径: \${editor.path}</p>
                            <div class=\"button-group\">
                                <button class=\"btn\" data-action=\"editEditor\">编辑</button>
                                <button class=\"btn\" data-action=\"testEditor\">测试</button>
                                \${!editor.isDefault ? \`<button class=\"btn\" data-action=\"setDefault\">设为默认</button>\` : ''}
                                <button class=\"btn btn-danger\" data-action=\"deleteEditor\">删除</button>
                            </div>
                        </div>
                        <div class=\"editor-edit\" id=\"edit-\${editor.id}\" style=\"display: none;\">
                            <div class=\"form-group\">
                                <label>编辑器名称:</label>
                                <input type=\"text\" id=\"editName-\${editor.id}\" class=\"form-input\" value=\"\${editor.name}\">
                            </div>
                            <div class=\"form-group\">
                                <label>编辑器路径:</label>
                                <div class=\"path-group\">
                                    <input type=\"text\" id=\"editPath-\${editor.id}\" class=\"form-input\" value=\"\${editor.path}\">
                                    <button class=\"btn\" data-action=\"selectEditPath\">浏览</button>
                                </div>
                            </div>
                            <div class=\"button-group\">
                                <button class=\"btn\" data-action=\"saveEditor\">保存</button>
                                <button class=\"btn\" data-action=\"cancelEdit\">取消</button>
                            </div>
                        </div>
                    </div>
                \`).join('');
            } catch (error) {
                console.error('加载编辑器列表失败:', error);
                // 使用自定义提示替代alert
                showConfirm('加载编辑器列表失败: ' + error.message);
            }
        }

        async function addEditor() {
            const name = document.getElementById('editorName').value;
            const path = document.getElementById('editorPath').value;
            const isDefault = document.getElementById('isDefault').checked;
            
            if (!name || !path) {
                await showConfirm('请填写编辑器名称和路径');
                return;
            }

            try {
                await sendMessage('addEditor', { name, path, isDefault });
                document.getElementById('editorName').value = '';
                document.getElementById('editorPath').value = '';
                document.getElementById('isDefault').checked = false;
                await loadEditors();
                await showConfirm('编辑器添加成功');
            } catch (error) {
                await showConfirm('添加编辑器失败: ' + error.message);
            }
        }

        async function selectPath() {
            console.log('开始选择路径...');
            try {
                const result = await sendMessage('selectEditorPath');
                console.log('收到路径选择结果:', result);
                
                if (result && result.success && result.path) {
                    const inputElement = document.getElementById('editorPath');
                    console.log('找到input元素:', inputElement);
                    
                    if (inputElement) {
                        inputElement.value = result.path;
                        console.log('路径设置成功:', result.path);
                        console.log('当前input值:', inputElement.value);
                    } else {
                        console.error('未找到editorPath输入框元素');
                        await showConfirm('未找到输入框元素，请刷新页面重试');
                    }
                } else if (result && !result.success) {
                    console.log('用户取消了路径选择');
                } else {
                    console.error('收到无效的结果:', result);
                }
            } catch (error) {
                console.error('选择路径失败:', error);
                await showConfirm('选择路径失败: ' + error.message);
            }
        }

        async function testEditor(editorId) {
            try {
                const result = await sendMessage('testEditor', { editorId });
                await showConfirm(result.success ? '测试成功' : '测试失败: ' + result.error);
            } catch (error) {
                await showConfirm('测试失败: ' + error.message);
            }
        }

        async function setDefault(editorId) {
            try {
                await sendMessage('setDefaultEditor', { editorId });
                await loadEditors();
                await showConfirm('设置成功');
            } catch (error) {
                await showConfirm('设置失败: ' + error.message);
            }
        }

        async function deleteEditor(editorId) {
            const confirmed = await showConfirm('确定要删除这个编辑器吗？');
            if (confirmed) {
                try {
                    await sendMessage('deleteEditor', { editorId });
                    await loadEditors();
                    await showConfirm('删除成功');
                } catch (error) {
                    await showConfirm('删除失败: ' + error.message);
                }
            }
        }

        function editEditor(editorId) {
            document.getElementById('display-' + editorId).style.display = 'none';
            document.getElementById('edit-' + editorId).style.display = 'block';
        }

        function cancelEdit(editorId) {
            document.getElementById('display-' + editorId).style.display = 'block';
            document.getElementById('edit-' + editorId).style.display = 'none';
        }

        async function saveEditor(editorId) {
            const name = document.getElementById('editName-' + editorId).value;
            const path = document.getElementById('editPath-' + editorId).value;
            
            if (!name || !path) {
                await showConfirm('请填写编辑器名称和路径');
                return;
            }

            try {
                await sendMessage('updateEditor', { 
                    editorId, 
                    updates: { name, path } 
                });
                await loadEditors();
                await showConfirm('更新成功');
            } catch (error) {
                await showConfirm('更新失败: ' + error.message);
            }
        }

        async function selectEditPath(editorId) {
            console.log('开始选择编辑路径，editorId:', editorId);
            try {
                const result = await sendMessage('selectEditorPath');
                console.log('收到编辑路径选择结果:', result);
                
                if (result && result.success && result.path) {
                    const inputElement = document.getElementById('editPath-' + editorId);
                    console.log('找到编辑input元素:', inputElement);
                    
                    if (inputElement) {
                        inputElement.value = result.path;
                        console.log('编辑路径设置成功:', result.path);
                        console.log('当前编辑input值:', inputElement.value);
                    } else {
                        console.error('未找到editPath输入框元素，editorId:', editorId);
                        await showConfirm('未找到输入框元素，请刷新页面重试');
                    }
                } else if (result && !result.success) {
                    console.log('用户取消了编辑路径选择');
                } else {
                    console.error('收到无效的编辑结果:', result);
                }
            } catch (error) {
                console.error('选择编辑路径失败:', error);
                await showConfirm('选择路径失败: ' + error.message);
            }
        }

        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const editorItem = target.closest('.editor-item');
            const editorId = editorItem ? editorItem.dataset.editorId : null;

            switch (action) {
                case 'addEditor': addEditor(); break;
                case 'selectPath': selectPath(); break;
                case 'editEditor': editEditor(editorId); break;
                case 'testEditor': testEditor(editorId); break;
                case 'setDefault': setDefault(editorId); break;
                case 'deleteEditor': deleteEditor(editorId); break;
                case 'saveEditor': saveEditor(editorId); break;
                case 'cancelEdit': cancelEdit(editorId); break;
                case 'selectEditPath': selectEditPath(editorId); break;
            }
        });

        loadEditors();
    </script>
</body>
</html>`;
    }

}