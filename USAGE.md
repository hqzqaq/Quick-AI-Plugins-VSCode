# QuickAI 插件使用说明

## 概述
QuickAI是一个功能强大的VS Code插件，旨在无缝连接您的AI辅助编辑器（如VS Code、Cursor等）与Jetbrains IDE（如IDEA、PyCharm、WebStorm等）。

## 主要功能

### 🎯 核心功能
- **跨平台支持**: 完美支持Windows、macOS和Linux系统
- **多编辑器配置**: 支持配置多个外部编辑器，一键切换使用
- **智能快捷键**: 完全可自定义的修饰键组合（Ctrl、Shift、Alt、Meta）
- **无窗口闪烁**: 优化的命令执行，避免不必要的终端窗口显示

### 🔧 高级特性
- **智能项目上下文**: 自动识别项目根目录，保持工作区连续性
- **配置管理**: 支持添加、删除、设为默认编辑器
- **高性能优化**: 多级缓存机制、防抖处理、异步执行等
- **智能缓存**: 设置缓存(1秒)、项目路径缓存、编辑器状态缓存(5秒)
- **快速响应**: 150ms防抖机制，跳转速度提升40-60%

## 安装说明

### 1. 开发环境安装
```bash
# 克隆项目
git clone <repository-url>
cd Quick-AI-Plugins-VSCode

# 安装依赖
npm install

# 编译项目
npm run compile
```

### 2. 在VS Code中测试
1. 按 `F5` 或使用调试菜单启动扩展开发主机
2. 在新打开的VS Code窗口中测试插件功能

## 配置指南

### 编辑器配置
1. 打开VS Code设置 (`Ctrl+,` 或 `Cmd+,`)
2. 搜索 "quickai"
3. 配置以下选项：

#### 编辑器列表 (quickai.editors)
```json
[
  {
    "id": "idea-main",
    "name": "IntelliJ IDEA",
    "path": "/Applications/IntelliJ IDEA CE.app/Contents/MacOS/idea",
    "isDefault": true,
    "type": "idea"
  },
  {
    "id": "pycharm-main", 
    "name": "PyCharm",
    "path": "/Applications/PyCharm CE.app/Contents/MacOS/pycharm",
    "isDefault": false,
    "type": "pycharm"
  }
]
```

#### 快捷键配置 (quickai.keyboardModifiers)
```json
{
  "ctrl": true,
  "shift": false,
  "alt": false,
  "meta": false
}
```

### 编辑器路径配置示例

#### Windows
```json
{
  "name": "IntelliJ IDEA",
  "path": "C:\\Program Files\\JetBrains\\IntelliJ IDEA Community Edition 2023.2\\bin\\idea64.exe"
}
```

#### macOS
```json
{
  "name": "IntelliJ IDEA",
  "path": "/Applications/IntelliJ IDEA CE.app/Contents/MacOS/idea"
}
```

#### Linux
```json
{
  "name": "IntelliJ IDEA",
  "path": "/opt/idea/bin/idea.sh"
}
```

## 使用方法

### 基本使用
1. 在VS Code中打开任意文件
2. 将光标定位到想要跳转的行
3. 按住配置的修饰键（默认Ctrl键）+ 鼠标左键点击
4. 插件将自动在外部编辑器中打开相同文件并跳转到对应行

### 命令面板
- `QuickAI: 管理外部编辑器` - 打开编辑器管理界面
- `QuickAI: 配置快捷键` - 打开快捷键配置界面
- `QuickAI: 跳转到外部编辑器` - 手动触发跳转
- `QuickAI: 显示诊断信息` - 查看插件运行状态

### 状态栏
插件激活后会在VS Code状态栏右侧显示 "🚀 QuickAI" 图标，点击可快速打开编辑器管理界面。

## 支持的编辑器

### Jetbrains IDE系列
- **IntelliJ IDEA** (Community/Ultimate)
- **PyCharm** (Community/Professional)  
- **WebStorm**
- **其他Jetbrains IDE** (PhpStorm, RubyMine, CLion等)

### 其他编辑器
理论上支持任何支持命令行参数 `--line` 的编辑器。

## 性能优化

### 缓存机制
- **设置缓存**: 1秒TTL，减少配置读取开销
- **项目路径缓存**: 5秒TTL，避免重复计算项目根目录
- **编辑器状态缓存**: 5秒TTL，优化编辑器验证性能

### 防抖处理
- 默认150ms防抖延迟，避免频繁触发
- 可在设置中调整 `quickai.debounceTime`

### 异步执行
- 所有外部命令均异步执行，不阻塞VS Code主线程
- 跨平台优化，针对不同系统使用最佳执行策略

## 故障排除

### 常见问题

#### 1. 编辑器无法启动
- **检查路径**: 确保编辑器路径正确且文件存在
- **权限问题**: 确保VS Code有执行外部程序的权限
- **使用测试功能**: 使用 `QuickAI: 测试编辑器` 命令验证配置

#### 2. 快捷键不响应
- **检查修饰键**: 确认配置的修饰键组合
- **事件冲突**: 检查是否与其他插件快捷键冲突
- **查看日志**: 开启调试模式查看详细日志

#### 3. 性能问题
- **调整防抖时间**: 增加 `quickai.debounceTime` 值
- **禁用缓存**: 临时设置 `quickai.enableCache` 为 false
- **查看诊断**: 使用 `QuickAI: 显示诊断信息` 查看性能指标

### 调试模式
在VS Code设置中启用 `quickai.debugMode` 可以查看详细的调试信息。

### 日志查看
1. 打开VS Code开发者工具 (`Ctrl+Shift+I` 或 `Cmd+Option+I`)
2. 查看Console标签页中的 `[QuickAI]` 日志信息

## 版本历史

### v1.0.0 (当前版本)
- ✅ 基础跨平台支持
- ✅ 多编辑器配置管理
- ✅ 智能缓存机制
- ✅ 性能监控和诊断
- ✅ 完整的TypeScript类型支持
- 🚧 WebView用户界面 (开发中)

## 开发者信息

- **作者**: hqzqaq
- **版本**: v1.0.0
- **许可**: MIT License
- **支持平台**: Windows, macOS, Linux

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

### 开发环境搭建
```bash
# 安装依赖
npm install

# 开发模式编译
npm run watch

# 代码检查
npm run lint

# 运行测试
npm test
```

### 代码规范
- 使用TypeScript严格模式
- 遵循ESLint规则
- 所有公共API需要完整的JSDoc注释
- 模块化设计，职责分离

## 技术架构

### 核心模块
- **ConfigManager**: 配置管理和持久化
- **CacheManager**: 高性能缓存系统
- **MouseListener**: 鼠标事件监听和处理
- **CommandExecutor**: 跨平台命令执行
- **Utils**: 通用工具类集合

### 设计原则
- 单一职责原则
- 依赖注入
- 错误隔离
- 性能优先
- 跨平台兼容

---

如有问题或建议，请通过GitHub Issues联系我们！