# VSCode扩展配置界面功能优化

## Core Features

- 移除快捷键配置界面

- 为IDE配置项添加删除功能

- 修复文件选择器路径无法自动保存的问题

- 解决macOS下无法选择应用包内可执行文件的问题

## Tech Stack

{
  "description": "本次修改将基于项目现有的技术栈，使用TypeScript和VSCode Extension API。核心工作包括：1. 调用`vscode.window.showOpenDialog` API以实现可靠的跨平台文件选择。2. 通过`vscode.workspace.getConfiguration` API管理用户配置。3. 调整Webview与扩展后端的消息通信机制以支持新增的删除和文件选择功能。"
}

## Design

界面将进行简化，移除快捷键配置区域，使功能更聚焦。在IDE配置列表中，为每个条目增加一个删除图标按钮，提升管理便捷性。文件选择交互将得到优化，实现点击“浏览”后自动填充路径，无需手动输入，整体风格与VSCode保持一致。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 移除快捷键配置UI及相关后端逻辑

[X] 在Webview中为每个IDE配置项添加删除按钮和交互逻辑

[X] 在扩展后端实现接收删除消息并更新VSCode配置的功能

[X] 使用`vscode.window.showOpenDialog` API替换现有的文件选择逻辑

[X] 实现从文件选择器到Webview输入框的路径自动填充

[X] 针对macOS系统调试并确保文件选择器能穿透.app包选择内部可执行文件
