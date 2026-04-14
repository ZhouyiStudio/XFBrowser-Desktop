> [!IMPORTANT]
> 1.2.5 Pre-Release 已发布，[#3](https://github.com/ZhouyiStudio/XFBrowser-Desktop/issues/3)问题仍未修复，敬请期待后续更新。
<p align="center">
  <img width="264" height="264" alt="XFBrowser" src="https://github.com/user-attachments/assets/474ecb61-0f86-42a5-8779-126fc4d665ce" />
</p>

<h1 align="center">XFBrowser</h1>
<p align="center">"Where simple browsing shines!"</p>
<p align="center">一款简洁、高效、支持多标签页的跨平台桌面浏览器</p>

## Star历史

> [!TIP]
> 如果喜欢请给项目点个Star⭐哦，谢谢啦！o(*￣▽￣*)ブ
> 如果能协助改进这个项目就更好啦！欢迎提交PR！

<a href="https://www.star-history.com/?repos=ZhouyiStudio%2FXFBrowser-Desktop&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=ZhouyiStudio/XFBrowser-Desktop&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=ZhouyiStudio/XFBrowser-Desktop&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=ZhouyiStudio/XFBrowser-Desktop&type=date&legend=top-left" />
 </picture>
</a>

## 功能特性
- 🚀 流畅高效的网页浏览体验
- 📑 完善的多标签页管理功能
- 🔒 安全可靠的浏览环境
- ⚙️ 灵活的个性化配置选项
- 🎨 现代化的界面设计

> [!IMPORTANT]
> 暂未支持安卓版本的隐私浏览功能，敬请期待后续更新。

## 贡献指南
本项目基于 Electron 构建，`/docs` 目录使用 VitePress 搭建文档，依赖 Vue 相关组件。

### 安装依赖
```bash
npm install

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

### 提交Pull Request
完成功能开发后，请自行完成充分测试
> [!CAUTION]
> 不能使用的PR将不会合并！
> 提交PR是请附上成功运行的功能截图以便快速的合并！

## GitHub Actions 自动打包

本项目配置了GitHub Actions自动打包工作流：

- **触发条件**：
  - 推送标签时自动创建Release
  - Pull Request到 `main/dev` 分支时进行构建测试
  - 手动触发 (workflow_dispatch)

- **支持平台**：
  - Windows (EXE)
  - macOS (DMG镜像)
  - Linux (AppImage)

- **构建产物**：
  - 自动上传到GitHub Actions artifacts
  - 标签推送时自动创建GitHub Release

## 问题反馈
有任何问题请提交Issue!
> [!NOTE]  
> 提交前请查看下面的已知问题列表，以免重复提交！

## 项目结构

```
XFBrowser/
├── .github/workflows/     # GitHub Actions配置
├── docs/                  # 文档目录
├── index.html            # 主界面
├── main.js              # Electron主进程
├── settings.html        # 设置页面
├── welcome.html         # 欢迎页面
├── package.json         # 项目配置
└── .npmignore          # 打包忽略文件
```

## 许可证
> [!WARNING]  
> Apache 2.0 许可证是由 Apache 软件基金会（ASF）在 2004 年批准的开源许可证，旨在通过协作的开源软件开发提供可靠且寿命长的软件产品。Apache 2.0 许可证允许用户自由使用、复制和分发软件，同时也对使用者提出了一些要求和限制。

Apache-2.0 License
```
Copyright 2026 ZhouyiStudio

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## 作者

ZhouyiStudio

> [!CAUTION]
> XFBrowser-Windows by [Zhouyi](https://zhouyistudio.cyou) ❤ Copyright © 2026 [Zhouyi](https://zhouyistudio.cyou) | Android version by [xuanfeng0316](http://xuanfeng0316.com)
