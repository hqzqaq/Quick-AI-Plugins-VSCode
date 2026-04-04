/**
 * QuickAI 编辑器管理前端脚本
 * @author hqzqaq
 * @version 1.0.0
 */

(function() {
    'use strict';

    // 获取VS Code API
    const vscode = acquireVsCodeApi();
    
    // 消息处理系统
    let messageId = 0;
    const pendingMessages = new Map();

    /**
     * 发送消息到扩展主机
     * @param {string} type 消息类型
     * @param {object} data 消息数据
     * @param {number} timeoutMs 超时时间（毫秒），默认60秒
     * @returns {Promise} Promise对象
     */
    function sendMessage(type, data = null, timeoutMs = 60000) {
        return new Promise((resolve, reject) => {
            const id = ++messageId;
            pendingMessages.set(id, { resolve, reject });
            
            vscode.postMessage({ 
                type, 
                data, 
                messageId: id 
            });
            
            // 使用可配置的超时时间
            setTimeout(() => {
                if (pendingMessages.has(id)) {
                    pendingMessages.delete(id);
                    
                    // 根据消息类型给出更友好的错误信息
                    let errorMessage;
                    if (type === 'selectEditorPath') {
                        errorMessage = '文件选择超时，请重试';
                    } else if (type === 'testEditor') {
                        errorMessage = '测试超时，请检查编辑器配置';
                    } else {
                        errorMessage = '操作超时，请重试';
                    }
                    
                    reject(new Error(errorMessage));
                }
            }, timeoutMs);
        });
    }

    /**
     * 处理来自扩展主机的响应
     */
    window.addEventListener('message', event => {
        const { messageId, type, data } = event.data;
        
        if (type === 'error') {
            if (pendingMessages.has(messageId)) {
                const { reject } = pendingMessages.get(messageId);
                pendingMessages.delete(messageId);
                reject(new Error(data?.error || '未知错误'));
            }
            return;
        }

        if (pendingMessages.has(messageId)) {
            const { resolve } = pendingMessages.get(messageId);
            pendingMessages.delete(messageId);
            resolve(data);
        }
    });

    /**
     * 显示消息提示
     * @param {string} message 消息内容
     * @param {string} type 消息类型：success, error, info
     * @param {number} duration 显示时长（毫秒）
     */
    function showMessage(message, type = 'info', duration = 3000) {
        const container = document.getElementById('messageContainer');
        const messageDiv = document.createElement('div');
        
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = message;
        
        container.appendChild(messageDiv);
        
        // 自动移除消息
        setTimeout(() => {
            if (container.contains(messageDiv)) {
                container.removeChild(messageDiv);
            }
        }, duration);
    }

    /**
     * 显示确认对话框
     * @param {string} message 确认消息
     * @returns {Promise<boolean>} Promise对象，返回用户选择
     */
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

    /**
     * 加载编辑器列表
     */
    async function loadEditors() {
        try {
            const editors = await sendMessage('getEditors');
            const container = document.getElementById('editorList');
            
            if (editors.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <h3>还没有配置任何编辑器</h3>
                        <p>添加你的第一个编辑器来开始使用QuickAI功能</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = editors.map(editor => `
                <div class="editor-item" data-editor-id="${editor.id}">
                    <div class="editor-header">
                        <h3 class="editor-name">
                            ${editor.name}
                            ${editor.isDefault ? '<span class="default-badge">默认</span>' : ''}
                        </h3>
                    </div>
                    <div class="editor-path">${editor.path}</div>
            <div class="jump-mode-info">
                <small style="color: var(--vscode-input-placeholderForeground);">
                    跳转模式: ${editor.jumpMode === 'vscode' ? 'VS Code模式' : 'IDEA模式'}
                </small>
            </div>
                    <div class="editor-actions">
                        <button class="btn btn-secondary" data-action="editEditor" data-editor-id="${editor.id}">编辑</button>
                        <button class="btn" data-action="testEditor" data-editor-id="${editor.id}">测试</button>
                        ${!editor.isDefault ? `<button class="btn" data-action="setDefault" data-editor-id="${editor.id}">设为默认</button>` : ''}
                        <button class="btn btn-danger" data-action="deleteEditor" data-editor-id="${editor.id}">删除</button>
                    </div>
                    
                    <!-- 编辑模式 -->
                    <div class="editor-edit-form" id="edit-form-${editor.id}" style="display: none; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--vscode-widget-border);">
                        <div class="form-group">
                            <label>编辑器名称:</label>
                            <input type="text" class="form-input" id="edit-name-${editor.id}" value="${editor.name}">
                        </div>
                        <div class="form-group">
                <label>编辑器路径:</label>
                <div class="path-group">
                    <input type="text" class="form-input" id="edit-path-${editor.id}" value="${editor.path}">
                    <button class="btn" data-action="selectEditPath" data-editor-id="${editor.id}">浏览</button>
                </div>
            </div>
            <div class="form-group">
                <label>跳转模式:</label>
                <select class="form-input" id="edit-jumpMode-${editor.id}">
                    <option value="idea" ${editor.jumpMode === 'idea' ? 'selected' : ''}>IDEA模式</option>
                    <option value="vscode" ${editor.jumpMode === 'vscode' ? 'selected' : ''}>VS Code模式</option>
                </select>
            </div>
                        <div class="editor-actions">
                            <button class="btn" data-action="saveEditor" data-editor-id="${editor.id}">保存</button>
                            <button class="btn btn-secondary" data-action="cancelEdit" data-editor-id="${editor.id}">取消</button>
                        </div>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('加载编辑器列表失败:', error);
            showMessage('加载编辑器列表失败: ' + error.message, 'error');
        }
    }

    /**
     * 添加编辑器
     */
    async function addEditor() {
        const name = document.getElementById('editorName').value.trim();
        const path = document.getElementById('editorPath').value.trim();
        const jumpMode = document.getElementById('jumpMode').value;
        const isDefault = document.getElementById('isDefault').checked;
        
        if (!name || !path) {
            showMessage('请填写编辑器名称和路径', 'error');
            return;
        }

        try {
            await sendMessage('addEditor', { name, path, jumpMode, isDefault });
            showMessage('编辑器添加成功！', 'success');
            
            // 清空表单
            document.getElementById('editorName').value = '';
            document.getElementById('editorPath').value = '';
            document.getElementById('jumpMode').value = 'idea';
            document.getElementById('isDefault').checked = false;
            
            // 重新加载编辑器列表
            await loadEditors();
            
        } catch (error) {
            showMessage('添加编辑器失败: ' + error.message, 'error');
        }
    }

    /**
     * 测试编辑器
     */
    async function testEditor(editorId) {
        try {
            showMessage('正在测试编辑器...', 'info', 1000);
            await sendMessage('testEditor', { editorId });
            showMessage('编辑器测试成功！编辑器已启动', 'success');
        } catch (error) {
            showMessage('编辑器测试失败: ' + error.message, 'error');
        }
    }

    /**
     * 删除编辑器
     */
    async function deleteEditor(editorId) {
        const confirmed = await showConfirm('确定要删除这个编辑器吗？此操作不可撤销。');
        if (!confirmed) return;

        try {
            await sendMessage('deleteEditor', { editorId });
            showMessage('编辑器已删除', 'success');
            await loadEditors();
        } catch (error) {
            showMessage('删除编辑器失败: ' + error.message, 'error');
        }
    }

    /**
     * 设为默认编辑器
     */
    async function setDefaultEditor(editorId) {
        try {
            await sendMessage('setDefaultEditor', { editorId });
            showMessage('已设为默认编辑器', 'success');
            await loadEditors();
        } catch (error) {
            showMessage('设置默认编辑器失败: ' + error.message, 'error');
        }
    }

    /**
 * 保存编辑器
 */
async function saveEditor(editorId) {
    const name = document.getElementById(`edit-name-${editorId}`).value.trim();
    const path = document.getElementById(`edit-path-${editorId}`).value.trim();
    const jumpMode = document.getElementById(`edit-jumpMode-${editorId}`).value;

    if (!name || !path) {
        showMessage('请填写完整的编辑器信息', 'error');
        return;
    }

    try {
        await sendMessage('updateEditor', {
            editorId,
            updates: { name, path, jumpMode }
        });
        showMessage('编辑器信息已保存', 'success');
        await loadEditors();
    } catch (error) {
        showMessage('保存编辑器失败: ' + error.message, 'error');
    }
}

    /**
     * 取消编辑
     */
    function cancelEdit(editorId) {
        const editForm = document.getElementById(`edit-form-${editorId}`);
        if (editForm) {
            editForm.style.display = 'none';
        }
    }

    /**
     * 显示编辑表单
     */
    function showEditForm(editorId) {
        // 隐藏所有编辑表单
        document.querySelectorAll('.editor-edit-form').forEach(form => {
            form.style.display = 'none';
        });
        
        // 显示当前编辑表单
        const editForm = document.getElementById(`edit-form-${editorId}`);
        if (editForm) {
            editForm.style.display = 'block';
        }
    }

    /**
     * 选择编辑器路径
     */
    async function selectEditorPath() {
        try {
            // 显示选择文件的进度提示
            showMessage('正在打开文件选择器...', 'info', 2000);
            
            const result = await sendMessage('selectEditorPath');
            
            if (result.success && result.path) {
                // 如果在编辑器列表中，则设置到对应的编辑框
                const activeEditorId = document.querySelector('.editor-edit-form[style*="block"]')?.id?.replace('edit-form-', '');
                if (activeEditorId) {
                    const inputEl = document.getElementById(`edit-path-${activeEditorId}`);
                    inputEl.value = result.path;
                    updatePathInputVisual(inputEl, true);
                    showMessage('编辑器路径已更新', 'success');
                } else {
                    const inputEl = document.getElementById('editorPath');
                    inputEl.value = result.path;
                    updatePathInputVisual(inputEl, true);
                    showMessage('编辑器路径已设置', 'success');
                }
            } else {
                showMessage('未选择文件', 'info');
            }
        } catch (error) {
            showMessage('选择路径失败: ' + error.message, 'error');
        }
    }

    /**
     * 更新路径输入框的视觉状态
     * @param {HTMLElement} inputEl 输入框元素
     * @param {boolean} hasPath 是否有路径
     */
    function updatePathInputVisual(inputEl, hasPath) {
        const wrapper = inputEl.closest('.path-input-wrapper');
        if (wrapper) {
            const statusIcon = wrapper.querySelector('.path-status-icon');
            if (hasPath) {
                inputEl.classList.add('has-path');
                if (statusIcon) {
                    statusIcon.classList.add('visible');
                }
            } else {
                inputEl.classList.remove('has-path');
                if (statusIcon) {
                    statusIcon.classList.remove('visible');
                }
            }
        }
    }

    // 事件监听器
    function setupEventListeners() {
        // 添加编辑器按钮
        document.addEventListener('click', async (event) => {
            const target = event.target;
            
            if (target.matches('[data-action="addEditor"]')) {
                await addEditor();
            }
            
            else if (target.matches('[data-action="selectPath"]')) {
                await selectEditorPath();
            }
            
            else if (target.matches('[data-action="testEditor"]')) {
                const editorId = target.getAttribute('data-editor-id');
                await testEditor(editorId);
            }
            
            else if (target.matches('[data-action="deleteEditor"]')) {
                const editorId = target.getAttribute('data-editor-id');
                await deleteEditor(editorId);
            }
            
            else if (target.matches('[data-action="setDefault"]')) {
                const editorId = target.getAttribute('data-editor-id');
                await setDefaultEditor(editorId);
            }
            
            else if (target.matches('[data-action="editEditor"]')) {
                const editorId = target.getAttribute('data-editor-id');
                showEditForm(editorId);
            }
            
            else if (target.matches('[data-action="saveEditor"]')) {
                const editorId = target.getAttribute('data-editor-id');
                await saveEditor(editorId);
            }
            
            else if (target.matches('[data-action="cancelEdit"]')) {
                const editorId = target.getAttribute('data-editor-id');
                cancelEdit(editorId);
            }
            
            else if (target.matches('[data-action="selectEditPath"]')) {
                await selectEditorPath();
            }
        });

        // 回车键提交
        document.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const target = event.target;
                if (target.id === 'editorName' || target.id === 'editorPath') {
                    addEditor();
                } else if (target.id.startsWith('edit-name-') || target.id.startsWith('edit-path-')) {
                    const editorId = target.id.replace('edit-name-', '').replace('edit-path-', '');
                    saveEditor(editorId);
                }
            }
        });
    }

    // 初始化
    document.addEventListener('DOMContentLoaded', async () => {
        setupEventListeners();
        await loadEditors();
        showMessage('编辑器管理界面已加载', 'success', 1000);
    });

    // 导出到全局作用域（如果需要）
    window.quickaiEditorManager = {
        loadEditors,
        addEditor,
        testEditor,
        deleteEditor,
        setDefaultEditor,
        showMessage,
        showConfirm
    };

})();