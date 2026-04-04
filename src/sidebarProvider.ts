/**
 * QuickAI 侧边栏提供器
 * 负责在VS Code侧边栏直接显示编辑器管理界面
 * @author huquanzhi
 * @since 2026-04-04
 * @version 1.0
 */

import * as vscode from 'vscode';
import { ConfigManager } from './configManager';
import { CommandExecutor } from './commandExecutor';
import { getQuickAILogger } from './utils';

/**
 * 侧边栏树节点类型
 */
export enum QuickAITreeItemType {
    ADD_EDITOR = 'addEditor',
    EDITOR_ITEM = 'editorItem',
    DEFAULT_EDITOR = 'defaultEditor',
    JUMP_TO_EDITOR = 'jumpToEditor',
    REFRESH = 'refresh',
    SECTION_HEADER = 'sectionHeader'
}

/**
 * QuickAI侧边栏树节点
 */
export class QuickAITreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: QuickAITreeItemType,
        public readonly editorId?: string,
        public readonly command?: vscode.Command,
        options?: {
            description?: string;
            tooltip?: string;
            iconPath?: vscode.ThemeIcon;
        }
    ) {
        super(label, collapsibleState);

        // 根据类型设置图标和样式
        switch (itemType) {
            case QuickAITreeItemType.ADD_EDITOR:
                this.iconPath = new vscode.ThemeIcon('add');
                this.tooltip = '点击添加新的外部编辑器';
                this.contextValue = 'quickai-add-editor';
                this.description = '新增';
                break;
            case QuickAITreeItemType.DEFAULT_EDITOR:
                // 使用勾选图标表示默认/当前选中
                this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('terminal.ansiGreen'));
                this.tooltip = options?.tooltip || '当前默认编辑器 (点击其他可切换)';
                this.contextValue = 'quickai-default-editor';
                break;
            case QuickAITreeItemType.EDITOR_ITEM:
                // 使用窗口/应用图标表示普通编辑器
                this.iconPath = new vscode.ThemeIcon('window');
                this.tooltip = options?.tooltip || '点击设为默认编辑器';
                this.contextValue = 'quickai-editor-item';
                break;
            case QuickAITreeItemType.JUMP_TO_EDITOR:
                this.iconPath = new vscode.ThemeIcon('rocket', new vscode.ThemeColor('terminal.ansiGreen'));
                this.tooltip = '快速跳转到默认的外部编辑器';
                this.contextValue = 'quickai-jump';
                this.description = '执行跳转';
                break;
            case QuickAITreeItemType.SECTION_HEADER:
                this.iconPath = undefined;
                this.tooltip = '';
                this.contextValue = 'quickai-separator';
                break;
        }

        if (options?.description && itemType !== QuickAITreeItemType.ADD_EDITOR && itemType !== QuickAITreeItemType.JUMP_TO_EDITOR) {
            this.description = options.description;
        }

        if (options?.iconPath) {
            this.iconPath = options.iconPath;
        }

        if (command) {
            this.command = command;
        }
    }
}

/**
 * QuickAI侧边栏数据提供器
 */
export class QuickAISidebarProvider implements vscode.TreeDataProvider<QuickAITreeItem> {
    private readonly _logger = getQuickAILogger();
    private readonly _configManager: ConfigManager;
    private readonly _commandExecutor: CommandExecutor;
    private _onDidChangeTreeData: vscode.EventEmitter<QuickAITreeItem | undefined | null | void> = new vscode.EventEmitter<QuickAITreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<QuickAITreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        _context: vscode.ExtensionContext,
        configManager: ConfigManager,
        commandExecutor: CommandExecutor
    ) {
        this._configManager = configManager;
        this._commandExecutor = commandExecutor;
        this._logger.info('QuickAI侧边栏提供器已初始化');

        // 监听配置变化，自动刷新侧边栏
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('quickai.editors')) {
                this.refresh();
            }
        });
    }

    /**
     * 获取树节点
     * @param element 树节点元素
     * @returns 树节点
     */
    getTreeItem(element: QuickAITreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * 获取子节点
     * @param element 父节点元素
     * @returns 子节点数组
     */
    getChildren(element?: QuickAITreeItem): Thenable<QuickAITreeItem[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(this._getRootItems());
        }
    }

    /**
     * 刷新侧边栏
     */
    refresh(): void {
        this._logger.info('刷新QuickAI侧边栏');
        this._onDidChangeTreeData.fire();
    }

    /**
     * 添加编辑器
     */
    async addEditor(): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: '请输入编辑器名称',
            placeHolder: '例如: IntelliJ IDEA',
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return '编辑器名称不能为空';
                }
                return null;
            },
            title: 'QuickAI - 添加新编辑器'
        });

        if (!name) return;

        const fileResult = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: '选择编辑器',
            title: '选择编辑器可执行文件',
            filters: this._getFileFilters()
        });

        if (!fileResult || fileResult.length === 0) return;

        const path = fileResult[0].fsPath;

        // 处理 macOS .app 文件
        const processedPath = await this._processPath(path);

        const isDefaultResult = await vscode.window.showQuickPick([
            { label: '$(star-full) 是，设为默认编辑器', value: true, description: '作为主要使用的编辑器' },
            { label: '$(circle-outline) 否', value: false, description: '仅添加到列表中' }
        ], {
            placeHolder: '是否将此编辑器设为默认？',
            title: 'QuickAI - 默认设置'
        });
        const isDefault = isDefaultResult?.value ?? false;

        const jumpMode = await vscode.window.showQuickPick([
            { label: '$(gear) IDEA模式', description: '传统IDE跳转方式（推荐JetBrains IDE）', value: 'idea' },
            { label: '$(code) VS Code模式', description: 'VS Code专用命令格式', value: 'vscode' }
        ], {
            placeHolder: '选择跳转模式',
            title: 'QuickAI - 跳转模式'
        });

        const result = await this._configManager.addEditor({
            name: name.trim(),
            path: processedPath,
            isDefault,
            jumpMode: (jumpMode?.value === 'vscode' ? 'vscode' : 'idea') as import('./types').JumpMode
        });

        if (result) {
            vscode.window.showInformationMessage(
                `✅ 编辑器 "${name}" 添加成功！${isDefault ? ' 已设为默认。' : ''}`,
                '打开管理界面'
            ).then(action => {
                if (action === '打开管理界面') {
                    vscode.commands.executeCommand('quickai.openEditorManager');
                }
            });
            this.refresh();
        } else {
            vscode.window.showErrorMessage('❌ 添加编辑器失败');
        }
    }

    /**
     * 删除编辑器
     */
    async deleteEditor(editorId: string): Promise<void> {
        const editors = this._configManager.getEditors();
        const editor = editors.find(e => e.id === editorId);
        if (!editor) return;

        const confirmed = await vscode.window.showWarningMessage(
            `确定要删除编辑器 "${editor.name}" 吗？`,
            { modal: true, detail: `路径: ${editor.path}` },
            '删除',
            '取消'
        );

        if (confirmed === '删除') {
            const result = await this._configManager.deleteEditor(editorId);
            if (result) {
                vscode.window.showInformationMessage(`✅ 编辑器 "${editor.name}" 已删除`);
                this.refresh();
            } else {
                vscode.window.showErrorMessage('❌ 删除编辑器失败');
            }
        }
    }

    /**
     * 设置默认编辑器
     */
    async setDefaultEditor(editorId: string): Promise<void> {
        const result = await this._configManager.setDefaultEditor(editorId);
        if (result) {
            const editor = this._configManager.getEditors().find(e => e.id === editorId);
            vscode.window.showInformationMessage(`✅ "${editor?.name}" 已设为默认编辑器`);
            this.refresh();
        } else {
            vscode.window.showErrorMessage('❌ 设置默认编辑器失败');
        }
    }

    /**
     * 测试编辑器
     */
    async testEditor(editorId: string): Promise<void> {
        const editors = this._configManager.getEditors();
        const editor = editors.find(e => e.id === editorId);
        if (!editor) return;

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `正在测试 ${editor.name}...`,
            cancellable: false
        }, async () => {
            const result = await this._commandExecutor.testEditor(editor);

            if (result.success) {
                vscode.window.showInformationMessage(`✅ 编辑器 "${editor.name}" 测试成功！`);
            } else {
                vscode.window.showErrorMessage(`❌ 编辑器 "${editor.name}" 测试失败: ${result.error}`);
            }
        });
    }

    /**
     * 编辑编辑器
     */
    async editEditor(editorId: string): Promise<void> {
        const editors = this._configManager.getEditors();
        const editor = editors.find(e => e.id === editorId);
        if (!editor) return;

        const name = await vscode.window.showInputBox({
            prompt: '修改编辑器名称',
            value: editor.name,
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return '编辑器名称不能为空';
                }
                return null;
            },
            title: 'QuickAI - 编辑配置'
        });

        if (name === undefined) return;

        const changePath = await vscode.window.showQuickPick([
            { label: '$(check) 保持当前路径', value: 'keep', description: editor.path },
            { label: '$(folder-opened) 重新选择路径', value: 'change', description: '浏览选择新的路径' }
        ], {
            placeHolder: '是否修改编辑器路径？',
            title: 'QuickAI - 路径设置'
        });

        let newPath = editor.path;
        if (changePath?.value === 'change') {
            const fileResult = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: '选择编辑器',
                defaultUri: vscode.Uri.file(editor.path),
                filters: this._getFileFilters()
            });

            if (fileResult && fileResult.length > 0) {
                newPath = await this._processPath(fileResult[0].fsPath);
            }
        }

        const jumpMode = await vscode.window.showQuickPick([
            { label: '$(gear) IDEA模式', description: '传统IDE跳转方式', value: 'idea', picked: editor.jumpMode === 'idea' },
            { label: '$(code) VS Code模式', description: 'VS Code专用命令格式', value: 'vscode', picked: editor.jumpMode === 'vscode' }
        ], {
            placeHolder: '选择跳转模式',
            title: 'QuickAI - 跳转模式'
        });

        const result = await this._configManager.updateEditor(editorId, {
            name: name.trim(),
            path: newPath,
            jumpMode: (jumpMode?.value === 'vscode' ? 'vscode' : 'idea') as import('./types').JumpMode
        });

        if (result) {
            vscode.window.showInformationMessage(`✅ 编辑器 "${name}" 更新成功！`);
            this.refresh();
        } else {
            vscode.window.showErrorMessage('❌ 更新编辑器失败');
        }
    }

    /**
     * 获取根节点列表
     */
    private _getRootItems(): QuickAITreeItem[] {
        const items: QuickAITreeItem[] = [];
        const editors = this._configManager.getEditors();

        // ========== 操作区 ==========
        
        // 添加"添加编辑器"按钮 - 最醒目的位置
        items.push(new QuickAITreeItem(
            '添加编辑器',
            vscode.TreeItemCollapsibleState.None,
            QuickAITreeItemType.ADD_EDITOR,
            undefined,
            {
                command: 'quickai.sidebar.addEditor',
                title: '添加编辑器',
                arguments: []
            }
        ));

        // ========== 编辑器列表区 ==========
        
        if (editors.length > 0) {
            // 分节标题：已配置的编辑器
            items.push(new QuickAITreeItem(
                '━━ 已配置的编辑器 ━━',
                vscode.TreeItemCollapsibleState.None,
                QuickAITreeItemType.SECTION_HEADER
            ));

            // 添加编辑器列表
            editors.forEach((editor) => {
                const isDefault = editor.isDefault;
                const itemType = isDefault ? QuickAITreeItemType.DEFAULT_EDITOR : QuickAITreeItemType.EDITOR_ITEM;
                
                // 构建标签
                let label = editor.name;

                // 构建描述信息：只显示模式文字，不加图标
                const modeText = editor.jumpMode === 'vscode' ? 'VS Code' : 'IDEA';
                const description = modeText;

                // 构建 Tooltip：简洁的文字说明
                const lines = [
                    `${editor.name}${isDefault ? '  (默认编辑器)' : ''}`,
                    ``,
                    `路径: ${editor.path}`,
                    `跳转模式: ${editor.jumpMode === 'vscode' ? 'VS Code 模式' : 'IDEA 模式'}`,
                    ``,
                    isDefault ? '这是当前默认的编辑器' : '点击可设为默认编辑器'
                ].filter(Boolean).join('\n');

                const item = new QuickAITreeItem(
                    label,
                    vscode.TreeItemCollapsibleState.None,
                    itemType,
                    editor.id,
                    {
                        command: 'quickai.sidebar.setDefaultEditor',
                        title: '设为默认',
                        arguments: [editor.id]
                    },
                    {
                        description,
                        tooltip: lines
                    }
                );

                items.push(item);
            });
        } else {
            // 空状态提示
            items.push(new QuickAITreeItem(
                '(暂无配置的编辑器)',
                vscode.TreeItemCollapsibleState.None,
                QuickAITreeItemType.SECTION_HEADER
            ));
        }

        // ========== 快捷操作区 ==========
        
        if (editors.length > 0) {
            // 分隔
            items.push(new QuickAITreeItem(
                '',
                vscode.TreeItemCollapsibleState.None,
                QuickAITreeItemType.SECTION_HEADER
            ));

            // 跳转按钮
            items.push(new QuickAITreeItem(
                '跳转到外部编辑器',
                vscode.TreeItemCollapsibleState.None,
                QuickAITreeItemType.JUMP_TO_EDITOR,
                undefined,
                {
                    command: 'quickai.jumpToExternalEditor',
                    title: '跳转',
                    arguments: []
                }
            ));
        }

        return items;
    }

    /**
     * 获取文件过滤器
     */
    private _getFileFilters(): { [name: string]: string[] } {
        const platform = process.platform;
        if (platform === 'win32') {
            return {
                'Windows 可执行文件': ['exe'],
                '所有文件': ['*']
            };
        } else if (platform === 'darwin') {
            return {
                'macOS 应用程序': ['app'],
                '所有文件': ['*']
            };
        } else {
            return {
                'Unix 可执行文件': [''],
                '所有文件': ['*']
            };
        }
    }

    /**
     * 处理路径（特别是 macOS .app）
     */
    private async _processPath(filePath: string): Promise<string> {
        if (!filePath.endsWith('.app')) {
            return filePath;
        }

        const fs = await import('fs');
        const path = await import('path');

        const macOSExecutable = path.join(filePath, 'Contents', 'Resources', 'app', 'bin', 'code');
        if (fs.existsSync(macOSExecutable)) {
            return macOSExecutable;
        }

        return filePath;
    }
}
