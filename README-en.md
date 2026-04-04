# QuickAI - VS Code Extension

[中文](README.md) | English

A VS Code extension designed to seamlessly connect your AI-assisted editors (such as VS Code, Cursor, Kiro, etc.) with JetBrains IDEs (such as IntelliJ IDEA, PyCharm, WebStorm, etc.). It allows users to quickly jump from a code location in VS Code to the exact same location in a JetBrains IDE editor using customizable keyboard shortcuts or modifier key + mouse click, significantly improving development efficiency when switching between different tools.

**Author**: hqzqaq  
**Current Version**: v1.0.4  
**Supported Platforms**: Windows, macOS, Linux  
**License**: MIT License

---

## ✨ Features

### 🎯 Core Features
- **Cross-Platform Support**: Perfect support for Windows, macOS, and Linux systems
- **Multi-Editor Configuration**: Support for configuring multiple external editors with one-click switching
- **Trigger Methods**: Keyboard shortcuts (Ctrl + Shift + O or Ctrl + Alt + O on Windows, Cmd + Shift + O or Cmd + Alt + O on macOS)
- **No Window Flicker**: Optimized command execution to avoid unnecessary terminal window display

### 🔧 Advanced Features
- **Smart Project Context**: Automatically recognizes project root directory, maintaining workspace continuity
- **Configuration Management**: Support for adding, deleting, and setting default editors
- **High-Performance Optimization**: Multi-level caching, debouncing, and asynchronous execution
- **Smart Caching**: Settings cache (1s), project path cache, editor state cache (5s)
- **Fast Response**: 150ms debouncing mechanism, 40-60% faster jump speed

### 📊 Supported Editors
- **IntelliJ IDEA** (Community/Ultimate) - Professional Java development IDE
- **PyCharm** (Community/Professional) - Professional Python development IDE
- **WebStorm** - Professional JavaScript development IDE
- **Other JetBrains IDEs** - PhpStorm, RubyMine, CLion, etc.
- **Other Editors** - Any editor supporting `--line` command line parameter

---

## 📦 Installation Guide

### Method 1: Install via VS Code Interface (Recommended)

1. **Open VS Code**
2. **Go to Extensions Management**:
   - Click the Extensions icon in the sidebar (Ctrl+Shift+X / Cmd+Shift+X)
   - Or use menu: View → Extensions
3. **Install VSIX File**:
   - Click the "..." more options button in the top-right corner of the Extensions view
   - Select "Install from VSIX..."
   - Browse and select the `quickai-1.0.4.vsix` file
   - Click Install

### Method 2: Install via Command Line

```bash
# Install using VS Code command line tool
code --install-extension quickai-1.0.4.vsix
```

### Method 3: Install via VS Code Command Palette

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) to open the Command Palette
2. Type "Extensions: Install from VSIX..."
3. Select the `quickai-1.0.4.vsix` file

### Verify Installation

After installation, you should see:

1. **Success Notification**: VS Code will display "QuickAI extension installed successfully"
2. **Status Bar Icon**: The "🚀 QuickAI" icon will appear in the bottom-right status bar
3. **Extensions List**: QuickAI can be found in the installed extensions list

---

## 🎯 Usage Instructions

### Basic Usage

#### Keyboard Shortcut Trigger
1. Open any code file in VS Code
2. Position the cursor on the line you want to jump to
3. Press the keyboard shortcut:
   - **Windows/Linux**: `Ctrl+Shift+O` or `Ctrl+Alt+O`
   - **macOS**: `Cmd+Shift+O` or `Cmd+Alt+O`
4. The plugin will automatically open the same file in the JetBrains IDE and jump to the corresponding line

### Available Commands

You can use the following commands through the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `QuickAI: Manage External Editors` - Open the editor configuration interface
- `QuickAI: Jump to External Editor` - Manually trigger the jump
- `QuickAI: Keyboard Shortcut Trigger` - Trigger via keyboard shortcut command

### Workflow

1. **Plugin Startup** → Register keyboard shortcuts
2. **User Trigger** → Capture keyboard shortcut event
3. **Key Check** → Verify modifier key combination
4. **Information Collection** → Get file path and line number
5. **Command Building** → Build execution command based on platform
6. **External Call** → Launch target editor

### Cross-Platform Implementation

- **Windows**: `cmd.exe /c "<editor>" --line <lineNum> "<file>"`

Example:
```cmd
"C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2023.2\bin\idea64.exe" --line 10 "D:\Projects\MyProject\src\main.java"
```

- **macOS/Linux**: `nohup '<editor>' --line <lineNum> "<file>" > /dev/null 2>&1 &`

Example:
```bash
nohup '/Applications/IntelliJ IDEA CE.app/Contents/MacOS/idea' --line 176 "/Users/username/project/src/main.java" > /dev/null 2>&1 &
```

---

## ⚙️ Configuration Options

### Initial Configuration

#### 1. Configure External Editor

**Via Command Palette**:
- Press `Ctrl+Shift+P` / `Cmd+Shift+P`
- Type "QuickAI: Manage External Editors"
- Add your JetBrains IDE path

**Via Settings Interface**:
1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "quickai"
3. Configure the following options

#### 2. Editor List Configuration (quickai.editors)

```json
{
  "quickai.editors": [
    {
      "id": "idea-main",
      "name": "IntelliJ IDEA",
      "path": "/Applications/IntelliJ IDEA CE.app/Contents/MacOS/idea",
      "isDefault": true
    },
    {
      "id": "pycharm-main", 
      "name": "PyCharm",
      "path": "/Applications/PyCharm CE.app/Contents/MacOS/pycharm",
      "isDefault": false
    }
  ]
}
```

### Editor Path Configuration Examples

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

### Keyboard Shortcut Configuration

#### Default Shortcuts
- **Windows/Linux**: `Ctrl+Shift+O` or `Ctrl+Alt+O`
- **macOS**: `Cmd+Shift+O` or `Cmd+Alt+O`

### Performance Optimization Configuration

#### Cache Configuration (quickai.enableCache)
```json
{
  "quickai.enableCache": true  // Enable caching mechanism to improve performance
}
```

#### Debounce Configuration (quickai.debounceTime)
```json
{
  "quickai.debounceTime": 150  // Debounce delay time (milliseconds)
}
```

### Complete Configuration Example

```json
{
  "quickai.editors": [
    {
      "id": "idea-main",
      "name": "IntelliJ IDEA",
      "path": "/Applications/IntelliJ IDEA CE.app/Contents/MacOS/idea",
      "isDefault": true
    },
    {
      "id": "pycharm-main",
      "name": "PyCharm",
      "path": "/Applications/PyCharm CE.app/Contents/MacOS/pycharm",
      "isDefault": false
    },
    {
      "id": "webstorm-main",
      "name": "WebStorm",
      "path": "/Applications/WebStorm.app/Contents/MacOS/webstorm",
      "isDefault": false
    }
  ],
  "quickai.keyboardModifiers": {
    "ctrl": true,
    "shift": false,
    "alt": false,
    "meta": false
  },
  "quickai.enableCache": true,
  "quickai.debounceTime": 150
}
```

---

## 🔍 FAQ

### Installation and Configuration Issues

#### Q: What should I do if the plugin doesn't work after installation?
A: 
1. Restart VS Code
2. Check if the plugin is in the extensions list and enabled
3. Check if "🚀 QuickAI" is displayed in the bottom-right status bar

#### Q: How do I find the correct path for my JetBrains IDE?
A:
- **Windows**: Usually in `C:\Program Files\JetBrains\[IDE Name]\bin\`
- **macOS**: Usually in `/Applications/[IDE Name].app/Contents/MacOS/`
- **Linux**: Usually in `/opt/` or `/usr/local/` or `/snap/`

### Feature Usage Issues

#### Q: What should I do if keyboard shortcuts don't respond?
A:
1. **Check shortcut conflicts**: Search for "keybindings" in VS Code settings to check for conflicts with other plugins
2. **Check focus**: Ensure the cursor is in the editor (`editorTextFocus`)
3. **View logs**: Press F12 to open Developer Tools and check Console for `[QuickAI]` logs

#### Q: What should I do if the external editor fails to launch?
A:
1. **Verify path**: Ensure the editor path is correct and the file exists
2. **Permission issues**: Ensure VS Code has permission to execute external programs
3. **Test command**: Manually execute the command in the terminal to test
4. **Firewall/Security software**: Check if blocked by firewall or security software

#### Q: What should I do if it jumps to the wrong location?
A:
1. **Check project root directory**: Ensure the file path is correct
2. **Relative path issues**: Check workspace configuration
3. **Encoding issues**: Ensure the filename doesn't contain special characters

### Performance Issues

#### Q: What should I do if the plugin responds too slowly?
A:
1. **Adjust debounce time**: Increase `quickai.debounceTime` value to 200-300ms
2. **Check cache**: Ensure `quickai.enableCache` is set to true
3. **Check system resources**: Close unnecessary programs to free up memory

#### Q: How do I view detailed logs?
A:
1. Open VS Code Developer Tools (F12)
2. View the Console tab
3. Search for "[QuickAI]" to view related logs
4. Or enable debug mode in settings (if available)
5. In the Output window, select quickai to view detailed logs

### Compatibility Issues

#### Q: Which versions of VS Code are supported?
A: Supports VS Code 1.70.0 and above

#### Q: Which JetBrains IDEs are supported?
A: Supports all JetBrains IDEs that support the `--line` command line parameter, including but not limited to:
- IntelliJ IDEA (Community/Ultimate)
- PyCharm (Community/Professional)
- WebStorm
- PhpStorm
- RubyMine
- CLion
- Rider
- GoLand

---

## 📊 Performance Optimization

### Caching Mechanism
- **Settings Cache**: 1s TTL, reduces configuration reading overhead
- **Project Path Cache**: 5s TTL, avoids repeated calculation of project root directory
- **Editor State Cache**: 5s TTL, optimizes editor validation performance

### Debouncing
- Default 150ms debounce delay to avoid frequent triggers
- Can be adjusted via `quickai.debounceTime` in settings

### Asynchronous Execution
- All external commands are executed asynchronously without blocking the VS Code main thread
- Cross-platform optimization using the best execution strategy for each system

### Performance Monitoring
- Real-time monitoring of execution efficiency
- Detailed performance metrics recording
- Memory usage monitoring

---

## 🚀 Uninstallation and Reinstallation

### Uninstall Plugin

If you need to uninstall the plugin:

1. **Via VS Code Interface**:
   - Go to Extensions Management
   - Find the QuickAI plugin
   - Click the Uninstall button

2. **Via Command Line**:
   ```bash
   code --uninstall-extension quickai
   ```

### Clean Configuration

After uninstalling the plugin, configuration information will remain in VS Code settings. To completely clean up:

1. Open VS Code Settings
2. Search for "quickai"
3. Delete all related configuration items

---

## 📞 Technical Support

For issues or suggestions:
- **Author**: hqzqaq
- **Version**: v1.0.4
- **License**: MIT License
- **GitHub**: https://github.com/hqzqaq/Quick-AI-Plugins-VSCode
- **Issue Feedback**: https://github.com/hqzqaq/Quick-AI-Plugins-VSCode/issues
- **Contact Author**: 1161028135@qq.com

---

## 🎉 Development Status

✅ **Project Completed** - All core features have been implemented and tested

### Implemented Features
- ✅ Cross-platform support (Windows, macOS, Linux)
- ✅ Multi-editor configuration management
- ✅ Smart keyboard shortcut configuration
- ✅ WebView user interface
- ✅ High-performance caching mechanism
- ✅ Debouncing and performance optimization
- ✅ Complete TypeScript type support
- ✅ Detailed code comments and documentation

### Technical Features
- 🚀 **High Performance**: Multi-level caching, debouncing, asynchronous execution
- 🛡️ **Type Safety**: Complete TypeScript type definitions
- 📝 **Code Standards**: Follows TypeScript development standards with detailed comments
- 🔧 **Modular**: Modular architecture with separated responsibilities
- 🌍 **Cross-Platform**: Perfect support for three major operating systems

---

## 📝 Changelog

### v1.0.4 (2026-04-05)
- 🐛 Fixed known issues
- ⚡ Optimized performance
- 🌐 Added English documentation support
- 🔗 Added bilingual documentation cross-linking

### v1.0.0
- 🎉 Initial release
- ✨ Core cross-platform jump functionality
- 🎯 Multi-editor configuration support
- ⚡ Performance optimization with caching and debouncing
