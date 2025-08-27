# QuickAI 插件安装和使用指南

## 📦 插件打包完成

恭喜！你的 QuickAI VS Code 插件已经成功打包完成！

**生成的安装包**: `quickai-1.0.0.vsix` (71.33 KB)

### ✅ 修复内容
- **命令注册问题**: 修复了 `command 'quickai.openEditorManager' not found` 错误
- **依赖导入**: 优化了工具类的导入和初始化
- **资源管理**: 确保所有命令和资源正确注册到VS Code订阅中
- **错误处理**: 增强了错误处理和日志记录

## 🚀 安装方法

### 方法一：通过 VS Code 界面安装（推荐）

1. **打开 VS Code**
2. **进入扩展管理**：
   - 点击侧边栏的扩展图标 (Ctrl+Shift+X / Cmd+Shift+X)
   - 或使用菜单：查看 → 扩展
3. **安装 VSIX 文件**：
   - 点击扩展视图右上角的 "..." 更多选项按钮
   - 选择 "从 VSIX 安装..."
   - 浏览并选择 `quickai-1.0.0.vsix` 文件
   - 点击安装

### 方法二：通过命令行安装

```bash
# 进入插件目录
cd /Users/hqzqaq/project/js/Quick-AI-Plugins-VSCode

# 使用 VS Code 命令行工具安装
code --install-extension quickai-1.0.0.vsix
```

### 方法三：通过 VS Code 命令面板安装

1. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (macOS) 打开命令面板
2. 输入 "Extensions: Install from VSIX..."
3. 选择 `quickai-1.0.0.vsix` 文件

## ✅ 验证安装

安装完成后，你应该看到：

1. **成功提示**：VS Code 会显示 "QuickAI 扩展已成功安装"
2. **状态栏图标**：右下角状态栏会显示 "🚀 QuickAI"
3. **扩展列表**：在已安装扩展列表中可以找到 QuickAI

## ⚙️ 初始配置

### 1. 配置外部编辑器

**通过命令面板**：
- 按 `Ctrl+Shift+P` / `Cmd+Shift+P`
- 输入 "QuickAI: 管理外部编辑器"
- 添加你的 Jetbrains IDE 路径

**通过设置界面**：
```json
{
  "quickai.editors": [
    {
      "id": "idea-main",
      "name": "IntelliJ IDEA",
      "path": "/Applications/IntelliJ IDEA CE.app/Contents/MacOS/idea",
      "isDefault": true,
      "type": "idea"
    }
  ]
}
```

### 2. 配置快捷键

**默认配置**：Ctrl + 鼠标左键点击

**自定义配置**：
```json
{
  "quickai.keyboardModifiers": {
    "ctrl": true,
    "shift": false,
    "alt": false,
    "meta": false
  }
}
```

## 🎯 使用方法

### 基本使用
1. 在 VS Code 中打开任意代码文件
2. 将光标定位到想要跳转的行
3. 按住 Ctrl 键 + 鼠标左键点击
4. 插件会自动在 Jetbrains IDE 中打开相同文件并跳转到对应行

### 可用命令
- `QuickAI: 管理外部编辑器` - 打开编辑器管理界面
- `QuickAI: 配置快捷键` - 配置快捷键组合
- `QuickAI: 跳转到外部编辑器` - 手动触发跳转

## 🛠️ 支持的编辑器

### 已测试编辑器
- **IntelliJ IDEA** (Community/Ultimate)
- **PyCharm** (Community/Professional)
- **WebStorm**
- **PhpStorm**
- **RubyMine**
- **CLion**

### 编辑器路径示例

**macOS**:
```
/Applications/IntelliJ IDEA CE.app/Contents/MacOS/idea
/Applications/PyCharm CE.app/Contents/MacOS/pycharm
/Applications/WebStorm.app/Contents/MacOS/webstorm
```

**Windows**:
```
C:\\Program Files\\JetBrains\\IntelliJ IDEA Community Edition 2023.2\\bin\\idea64.exe
C:\\Program Files\\JetBrains\\PyCharm Community Edition 2023.2\\bin\\pycharm64.exe
```

**Linux**:
```
/opt/idea/bin/idea.sh
/opt/pycharm/bin/pycharm.sh
/snap/intellij-idea-community/current/bin/idea.sh
```

## 🔧 高级配置

### 性能优化设置
```json
{
  "quickai.enableCache": true,        // 启用缓存
  "quickai.debounceTime": 150,        // 防抖延迟(ms)
}
```

### 调试模式
```json
{
  "quickai.debugMode": true           // 启用调试日志
}
```

## 🐛 故障排除

### 常见问题

#### 1. 插件无响应
- **检查修饰键配置**：确认配置的修饰键组合
- **查看开发者工具**：按 F12 查看控制台错误
- **重启 VS Code**：有时需要重启才能生效

#### 2. 外部编辑器无法启动
- **验证路径**：确保编辑器路径正确且文件存在
- **权限问题**：确保 VS Code 有执行外部程序的权限
- **使用测试功能**：通过命令面板测试编辑器配置

#### 3. 跳转到错误位置
- **检查项目根目录**：确保文件路径正确
- **相对路径问题**：检查工作区配置

### 日志查看
1. 打开 VS Code 开发者工具 (F12)
2. 查看 Console 标签页
3. 搜索 "[QuickAI]" 查看相关日志

## 📈 性能特性

- ⚡ **快速响应**：150ms 防抖机制
- 🗄️ **智能缓存**：多级缓存系统提升性能
- 🔄 **异步执行**：不阻塞 VS Code 主线程
- 📊 **性能监控**：实时监控执行效率

## 🔄 卸载插件

如果需要卸载插件：

1. **通过 VS Code 界面**：
   - 进入扩展管理
   - 找到 QuickAI 插件
   - 点击卸载按钮

2. **通过命令行**：
   ```bash
   code --uninstall-extension quickai
   ```

## 📞 技术支持

如有问题或建议：
- **作者**：hqzqaq
- **版本**：v1.0.0
- **许可**：MIT License
- **GitHub**：https://github.com/hqzqaq/Quick-AI-Plugins-VSCode

---

## 🎉 恭喜！

你已经成功完成了 QuickAI VS Code 插件的开发、打包和部署！这个插件具备了以下完整功能：

✅ **跨平台支持** (Windows, macOS, Linux)  
✅ **多编辑器配置管理**  
✅ **智能快捷键系统**  
✅ **高性能缓存机制**  
✅ **完整的 TypeScript 类型支持**  
✅ **模块化架构设计**  
✅ **错误处理和日志系统**  
✅ **性能监控和诊断**  

现在你可以开始使用这个强大的插件来提升你在不同 IDE 之间的工作效率了！