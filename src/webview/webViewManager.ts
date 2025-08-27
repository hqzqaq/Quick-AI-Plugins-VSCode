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
    private keyboardSettingsPanel: vscode.WebviewPanel | undefined;

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

    public async openKeyboardSettings(): Promise<void> {
        try {
            if (this.keyboardSettingsPanel) {
                this.keyboardSettingsPanel.reveal();
                return;
            }

            this.keyboardSettingsPanel = vscode.window.createWebviewPanel(
                'quickai-keyboard-settings',
                'QuickAI - 快捷键配置',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            this.keyboardSettingsPanel.webview.html = this.getKeyboardSettingsHtml();
            this.setupKeyboardSettingsMessageHandling();

            this.keyboardSettingsPanel.onDidDispose(() => {
                this.keyboardSettingsPanel = undefined;
            });

            this.logger.info('快捷键配置界面已打开');
        } catch (error) {
            this.logger.error('打开快捷键配置界面失败', error as Error);
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
                        result = await this.configManager.deleteEditor(message.data.editorId);
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
                        } else {
                            result = {
                                success: false,
                                path: null
                            };
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

    private setupKeyboardSettingsMessageHandling(): void {
        if (!this.keyboardSettingsPanel) return;

        this.keyboardSettingsPanel.webview.onDidReceiveMessage(async (message) => {
            try {
                let result;
                
                switch (message.type) {
                    case 'getKeyboardConfig':
                        result = this.configManager.getKeyboardModifiers();
                        break;
                    case 'updateKeyboardConfig':
                        result = await this.configManager.updateKeyboardModifiers(message.data);
                        break;
                }

                await this.keyboardSettingsPanel?.webview.postMessage({
                    type: 'response',
                    messageId: message.messageId,
                    data: result
                });

            } catch (error) {
                await this.keyboardSettingsPanel?.webview.postMessage({
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

            const appName = path.basename(appPath, '.app');
            const macOSDir = path.join(appPath, 'Contents', 'MacOS');
            
            // 检查 MacOS 目录是否存在
            if (!fs.existsSync(macOSDir)) {
                this.logger.warn('找不到 MacOS 目录', { appPath, macOSDir });
                return appPath; // 返回原路径
            }

            // 获取所有可能的可执行文件名
            const possibleNames = [
                appName,
                appName.toLowerCase(),
                appName.replace(/\s+/g, ''),  // 去除空格
                appName.replace(/\s+/g, '').toLowerCase(),
                // 常见的 JetBrains IDE 名称
                'idea',
                'webstorm', 
                'pycharm',
                'phpstorm',
                'clion',
                'datagrip',
                'goland',
                'rubymine',
                'rider',
                'appcode'
            ];

            // 尝试找到可执行文件
            for (const name of possibleNames) {
                const executablePath = path.join(macOSDir, name);
                
                if (fs.existsSync(executablePath)) {
                    // 检查是否为可执行文件
                    const stats = fs.statSync(executablePath);
                    if (stats.isFile() && (stats.mode & parseInt('111', 8))) { // 检查执行权限
                        this.logger.info('找到可执行文件', { 
                            appName, 
                            executableName: name, 
                            executablePath 
                        });
                        return executablePath;
                    }
                }
            }

            // 如果找不到任何可执行文件，列出所有文件并选择第一个可执行文件
            const files = fs.readdirSync(macOSDir);
            for (const file of files) {
                const filePath = path.join(macOSDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.isFile() && (stats.mode & parseInt('111', 8))) {
                    this.logger.info('使用默认可执行文件', { 
                        appName,
                        fileName: file,
                        filePath 
                    });
                    return filePath;
                }
            }

            this.logger.warn('未找到任何可执行文件', { appPath, macOSDir, files });
            return appPath; // 返回原 .app 路径
            
        } catch (error) {
            this.logger.error('处理macOS应用包路径失败', error as Error, { appPath });
            return appPath; // 出错时返回原路径
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
    
    <div class="add-editor-form">
        <h2>添加新编辑器</h2>
        <div class="form-group">
            <label>编辑器名称:</label>
            <input type="text" id="editorName" class="form-input" placeholder="例如: IntelliJ IDEA">
        </div>
        <div class="form-group">
            <label>编辑器路径:</label>
            <div class="path-group">
                <input type="text" id="editorPath" class="form-input" placeholder="编辑器可执行文件路径">
                <button class="btn" onclick="selectPath()">浏览</button>
            </div>
        </div>
        <div class="form-group">
            <label><input type="checkbox" id="isDefault"> 设为默认编辑器</label>
        </div>
        <button class="btn" onclick="addEditor()">添加编辑器</button>
    </div>

    <div id="editorList">
        <h2>已配置的编辑器</h2>
        <div id="editorContainer">加载中...</div>
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
                }, 5000);
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

        async function loadEditors() {
            try {
                const editors = await sendMessage('getEditors');
                const container = document.getElementById('editorContainer');
                
                if (editors.length === 0) {
                    container.innerHTML = '<p>还没有配置任何编辑器</p>';
                    return;
                }

                container.innerHTML = editors.map(editor => \`
                    <div class="editor-item" id="editor-\${editor.id}">
                        <div class="editor-display" id="display-\${editor.id}">
                            <h3>\${editor.name} \${editor.isDefault ? '(默认)' : ''}</h3>
                            <p>路径: \${editor.path}</p>
                            <div class="button-group">
                                <button class="btn" onclick="editEditor('\${editor.id}')">编辑</button>
                                <button class="btn" onclick="testEditor('\${editor.id}')">测试</button>
                                \${!editor.isDefault ? \`<button class="btn" onclick="setDefault('\${editor.id}')">设为默认</button>\` : ''}
                                <button class="btn btn-danger" onclick="deleteEditor('\${editor.id}')">删除</button>
                            </div>
                        </div>
                        <div class="editor-edit" id="edit-\${editor.id}" style="display: none;">
                            <div class="form-group">
                                <label>编辑器名称:</label>
                                <input type="text" id="editName-\${editor.id}" class="form-input" value="\${editor.name}">
                            </div>
                            <div class="form-group">
                                <label>编辑器路径:</label>
                                <div class="path-group">
                                    <input type="text" id="editPath-\${editor.id}" class="form-input" value="\${editor.path}">
                                    <button class="btn" onclick="selectEditPath('\${editor.id}')">浏览</button>
                                </div>
                            </div>
                            <div class="button-group">
                                <button class="btn" onclick="saveEditor('\${editor.id}')">保存</button>
                                <button class="btn" onclick="cancelEdit('\${editor.id}')">取消</button>
                            </div>
                        </div>
                    </div>
                \`).join('');
            } catch (error) {
                alert('加载编辑器列表失败: ' + error.message);
            }
        }

        async function addEditor() {
            const name = document.getElementById('editorName').value;
            const path = document.getElementById('editorPath').value;
            const isDefault = document.getElementById('isDefault').checked;
            
            if (!name || !path) {
                alert('请填写编辑器名称和路径');
                return;
            }

            try {
                await sendMessage('addEditor', { name, path, isDefault });
                document.getElementById('editorName').value = '';
                document.getElementById('editorPath').value = '';
                document.getElementById('isDefault').checked = false;
                await loadEditors();
                alert('编辑器添加成功');
            } catch (error) {
                alert('添加编辑器失败: ' + error.message);
            }
        }

        async function selectPath() {
            try {
                const result = await sendMessage('selectEditorPath');
                if (result && result.success && result.path) {
                    document.getElementById('editorPath').value = result.path;
                    console.log('路径选择成功:', result.path);
                } else if (result && !result.success) {
                    console.log('用户取消了路径选择');
                }
            } catch (error) {
                console.error('选择路径失败:', error);
                alert('选择路径失败: ' + error.message);
            }
        }

        async function testEditor(editorId) {
            try {
                const result = await sendMessage('testEditor', { editorId });
                alert(result.success ? '测试成功' : '测试失败: ' + result.error);
            } catch (error) {
                alert('测试失败: ' + error.message);
            }
        }

        async function setDefault(editorId) {
            try {
                await sendMessage('setDefaultEditor', { editorId });
                await loadEditors();
                alert('设置成功');
            } catch (error) {
                alert('设置失败: ' + error.message);
            }
        }

        async function deleteEditor(editorId) {
            if (confirm('确定要删除这个编辑器吗？')) {
                try {
                    await sendMessage('deleteEditor', { editorId });
                    await loadEditors();
                    alert('删除成功');
                } catch (error) {
                    alert('删除失败: ' + error.message);
                }
            }
        }

        // 新增的编辑功能函数
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
                alert('请填写编辑器名称和路径');
                return;
            }

            try {
                await sendMessage('updateEditor', { 
                    editorId, 
                    updates: { name, path } 
                });
                await loadEditors();
                alert('更新成功');
            } catch (error) {
                alert('更新失败: ' + error.message);
            }
        }

        async function selectEditPath(editorId) {
            try {
                const result = await sendMessage('selectEditorPath');
                if (result && result.success && result.path) {
                    document.getElementById('editPath-' + editorId).value = result.path;
                    console.log('路径选择成功:', result.path);
                }
            } catch (error) {
                console.error('选择路径失败:', error);
                alert('选择路径失败: ' + error.message);
            }
        }

        loadEditors();
    </script>
</body>
</html>`;
    }

    private getKeyboardSettingsHtml(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>快捷键配置</title>
    <style>
        body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); margin: 20px; }
        .btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin: 4px; }
        .modifier-key { display: flex; justify-content: space-between; align-items: center; padding: 12px; margin: 8px 0; border: 1px solid var(--vscode-widget-border); border-radius: 6px; }
        .preview { background: var(--vscode-editor-background); padding: 16px; margin: 16px 0; border: 1px solid var(--vscode-widget-border); border-radius: 6px; font-family: monospace; }
    </style>
</head>
<body>
    <h1>⌨️ 快捷键配置</h1>
    
    <div id="modifierKeys">
        <div class="modifier-key">
            <span>Ctrl 键</span>
            <label><input type="checkbox" id="ctrl"> 启用</label>
        </div>
        <div class="modifier-key">
            <span>Shift 键</span>
            <label><input type="checkbox" id="shift"> 启用</label>
        </div>
        <div class="modifier-key">
            <span>Alt 键 (Option)</span>
            <label><input type="checkbox" id="alt"> 启用</label>
        </div>
        <div class="modifier-key">
            <span>Meta 键 (Cmd/Win)</span>
            <label><input type="checkbox" id="meta"> 启用</label>
        </div>
    </div>
    
    <div class="preview" id="preview">当前快捷键: 加载中...</div>
    
    <button class="btn" onclick="saveConfig()">保存配置</button>
    <button class="btn" onclick="resetConfig()">重置为默认</button>

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
                }, 5000);
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

        function updatePreview() {
            const ctrl = document.getElementById('ctrl').checked;
            const shift = document.getElementById('shift').checked;
            const alt = document.getElementById('alt').checked;
            const meta = document.getElementById('meta').checked;
            
            const keys = [];
            if (ctrl) keys.push('Ctrl');
            if (shift) keys.push('Shift');
            if (alt) keys.push('Alt');
            if (meta) keys.push(navigator.platform.includes('Mac') ? 'Cmd' : 'Win');
            
            const preview = keys.length > 0 ? keys.join(' + ') + ' + 鼠标点击' : '未配置快捷键';
            document.getElementById('preview').textContent = '当前快捷键: ' + preview;
        }

        async function loadConfig() {
            try {
                const config = await sendMessage('getKeyboardConfig');
                document.getElementById('ctrl').checked = config.ctrl;
                document.getElementById('shift').checked = config.shift;
                document.getElementById('alt').checked = config.alt;
                document.getElementById('meta').checked = config.meta;
                updatePreview();
            } catch (error) {
                alert('加载配置失败: ' + error.message);
            }
        }

        async function saveConfig() {
            const config = {
                ctrl: document.getElementById('ctrl').checked,
                shift: document.getElementById('shift').checked,
                alt: document.getElementById('alt').checked,
                meta: document.getElementById('meta').checked
            };
            
            try {
                await sendMessage('updateKeyboardConfig', config);
                alert('配置保存成功');
            } catch (error) {
                alert('保存配置失败: ' + error.message);
            }
        }

        function resetConfig() {
            document.getElementById('ctrl').checked = true;
            document.getElementById('shift').checked = false;
            document.getElementById('alt').checked = false;
            document.getElementById('meta').checked = false;
            updatePreview();
        }

        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', updatePreview);
        });

        loadConfig();
    </script>
</body>
</html>`;
    }
}