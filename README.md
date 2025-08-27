# QuickAI - VS Code 插件

这是一个 VS Code 插件，旨在无缝连接您的AI 辅助编辑器（如 VS Code、Cursor、VS Code、Kiro 等）与Jetbrains IDE （如 Idea、Pycharm、WebStorm等）。它允许用户通过一个可完全自定义的快捷键，从 VS Code 的代码位置快速跳转到Jetbrains IDE编辑器中的完全相同的位置，从而极大地提升在不同工具间切换的开发效率。

**作者**: hqzqaq  
**当前版本**: v1.0.0  
**支持平台**: Windows, macOS, Linux

---

## ✨ 功能特性

### 🎯 核心功能
- **跨平台支持**: 完美支持 Windows、macOS 和 Linux 系统
- **多编辑器配置**: 支持配置多个外部编辑器，一键切换使用
- **智能快捷键**: 完全可自定义的修饰键组合（Ctrl、Shift、Alt、Meta）
- **无窗口闪烁**: 优化的命令执行，避免不必要的终端窗口显示

### 🔧 高级特性
- **智能项目上下文**: 自动识别项目根目录，保持工作区连续性
- **文件选择器**: 可视化的编辑器路径选择界面
- **配置管理**: 支持添加、删除、设为默认编辑器
- **向后兼容**: 保持与旧版本配置的兼容性
- **高性能优化**: 多级缓存机制、防抖处理、异步执行等性能优化
- **智能缓存**: 设置缓存(1秒)、项目路径缓存、编辑器状态缓存(5秒)
- **快速响应**: 150ms防抖机制，DIRECT调用模式，跳转速度提升40-60%

### 📊 支持的编辑器
- **Idea** - 专业的java开发IDE
- **Pycharm** - 专业的Python开发IDE
- **Webstorm** - 专业的JS开发IDE
- **其他** - 任何支持命令行参数的编辑器

---

## 🚀 快速开始

### 工作流程

1. **插件启动** → 注册鼠标监听器
2. **用户点击** → 捕获鼠标事件
3. **按键检查** → 验证修饰键组合
4. **信息收集** → 获取文件路径和行号
5. **命令构建** → 根据平台构建执行命令
6. **外部调用** → 启动目标编辑器

### 跨平台实现

- **Windows**: `cmd.exe /c "<editor>" --line <lineNum> "<file>"`
示例：
```sh
./idea --line 10 "D:\Program Files\JaveWorkPlace\QuickAI\QuickAI\gradlew.bat"
```
- **macOS/Linux**: `nohup '<editor>' --line  <lineNum> "<file>" > /dev/null 2>&1 &`
示例：
```sh
nohup '/Applications/IntelliJ IDEA CE.app/Contents/MacOS/idea' --line 176 "/Users/hqzqaq/project/java/QuickAI/src/main/kotlin/com/yaya/quickai/JumpToExternalEditorMouseListener.kt" > /dev/null 2>&1 &
```
---

## ⚙️ 配置说明

### 快捷键配置

| 修饰键 | Windows/Linux | macOS |
|--------|---------------|-------|
| Ctrl   | Ctrl          | Ctrl  |
| Shift  | Shift         | Shift |
| Alt    | Alt           | Option |
| Meta   | Win           | Cmd   |

## 项目界面
1. 编辑器管理界面
    - 可以添加多个Jetbrains IDE的绝对路径，通过打开系统文件夹的方式进行添加
    - 可以选择默认激活的IDE，比如在VS Code中，选择激活配置的IDEA IDE，则后续的跳转是跳转到IDEA IDE中，打开指定的文件，跳转到指定的行
    - 可对编辑器进行增删改
2. 快捷键配置界面
    - 可以灵活对快捷键进行配置，包括ctrl shift alt meta

## 🎉 开发状态

✅ **项目已完成** - 所有核心功能已实现并通过测试

### 已实现功能
- ✅ 跨平台支持（Windows、macOS、Linux）
- ✅ 多编辑器配置管理
- ✅ 智能快捷键配置
- ✅ WebView用户界面
- ✅ 高性能缓存机制
- ✅ 防抖处理和性能优化
- ✅ 完整的TypeScript类型支持
- ✅ 详细的代码注释和文档

### 技术特性
- 🚀 **高性能**: 多级缓存、防抖处理、异步执行
- 🛡️ **类型安全**: 完整的TypeScript类型定义
- 📝 **代码规范**: 遵循TypeScript开发规范，包含详细注释
- 🔧 **模块化**: 职责分离的模块化架构
- 🌍 **跨平台**: 完美支持三大主流操作系统