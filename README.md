# XF浏览器 (XFBrowser)

"Where simple browsing shines!"

一个简洁、快速、多标签页的Electron浏览器。

## 功能特性

- 🚀 快速浏览体验
- 📑 多标签页管理
- 🔒 安全可靠
- ⚙️ 个性化设置
- 🎨 现代化UI设计

## 开发

### 安装依赖

```bash
npm install
```

### 运行开发版本

```bash
npm start
```

### 打包应用

```bash
# 打包所有平台
npm run dist

# 只打包Windows
npm run build:win

# 只打包macOS
npm run build:mac

# 只打包Linux
npm run build:linux
```

## GitHub Actions 自动打包

本项目配置了GitHub Actions自动打包工作流：

- **触发条件**：
  - 推送标签 (v*) 时自动创建Release
  - Pull Request到main/master分支时进行构建测试
  - 手动触发 (workflow_dispatch)

- **支持平台**：
  - Windows (NSIS安装包)
  - macOS (DMG镜像)
  - Linux (AppImage)

- **构建产物**：
  - 自动上传到GitHub Actions artifacts
  - 标签推送时自动创建GitHub Release

## 项目结构

```
XFBrowser/
├── .github/workflows/     # GitHub Actions配置
├── index.html            # 主界面
├── main.js              # Electron主进程
├── settings.html        # 设置页面
├── welcome.html         # 欢迎页面
├── package.json         # 项目配置
└── .npmignore          # 打包忽略文件
```

## 许可证

Apache-2.0 License

## 作者

ZhouyiStudio