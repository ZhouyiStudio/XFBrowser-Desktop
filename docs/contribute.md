# 贡献指南

感谢您对 XFBrowser 项目的兴趣！我们欢迎任何形式的贡献，包括报告问题、提出建议、提交代码等，贡献者将会被加入贡献者名单。本指南将帮助您了解如何参与项目开发。

## 维护者



## 快速开始

### 环境要求

在开始贡献之前，请确保您的系统满足以下要求：

- Node.js (版本 16 或更高)
- npm 或 yarn
- Git

### 克隆仓库

```bash
git clone https://github.com/ZhouyiStudio/XFBrowser-Desktop.git
cd XFBrowser-Desktop
```

### 安装依赖

```bash
npm install
```

### 运行项目

```bash
npm start
```

这将启动 Electron 应用。

### 构建项目

```bash
npm run build
```

## 开发指南

### 代码风格

- 使用 ESLint 和 Prettier 保持代码风格一致
- 遵循现有的代码结构和命名约定
- 为新功能添加适当的注释

### 分支管理

- `main` 分支是稳定的主分支
- 为新功能创建 feature 分支
- 为修复创建 fix 分支

### 提交规范

提交消息应遵循以下格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型包括：
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档更新
- `style`: 代码风格调整
- `refactor`: 重构
- `test`: 测试
- `chore`: 杂项

## 报告问题

如果您发现问题或有建议，请：

1. 检查 [Issues](https://github.com/ZhouyiStudio/XFBrowser-Desktop/issues) 是否已存在类似问题
2. 如果没有，创建一个新的 Issue
3. 提供详细的描述，包括：
   - 问题描述
   - 重现步骤
   - 预期行为
   - 实际行为
   - 系统信息

## 提交 Pull Request

1. Fork 本仓库
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 文档贡献

项目文档使用 VitePress 构建。要本地预览文档：

```bash
npm run docs:dev
```

构建文档：

```bash
npm run docs:build
```

## 许可证

通过贡献代码，您同意您的贡献将根据项目的 [Apache-2.0 许可证](https://github.com/ZhouyiStudio/XFBrowser-Desktop/blob/main/LICENSE) 进行许可。

## 联系我们

如果您有任何问题，请通过 [Issues](https://github.com/ZhouyiStudio/XFBrowser-Desktop/issues) 或 [Discussions](https://github.com/ZhouyiStudio/XFBrowser-Desktop/discussions) 与我们联系。

再次感谢您的贡献！