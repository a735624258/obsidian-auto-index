# Obsidian Auto-Index

点一下按钮，全库扫描，自动重建知识库索引。

## 功能

- 扫描 vault 根目录所有文件夹（排除 `.obsidian`、`attachments` 等）
- 自动识别 `数字、名称` 格式的文件夹为模块
- 生成带 callout 折叠面板的模块化索引
- 从笔记 frontmatter `tags` 或首标题自动生成说明列
- 同步更新 SVG 成长曲线图表
- 侧边栏按钮 + 命令面板，手动触发

## 安装

下载 `main.js` 和 `manifest.json`，放入 `.obsidian/plugins/auto-index/`，重启 Obsidian，在设置中启用。

## 使用

- 点击左侧边栏 📄 图标
- 或 `Ctrl+P` → 搜索「重建全量索引」

## 目录排除

默认排除：`.obsidian`、`attachments`、`Clippings`、`模板`、`.git`、`.trash`、`.workbuddy`，以及所有 `.` 开头的隐藏目录。

## License

MIT
