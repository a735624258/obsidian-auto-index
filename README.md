# Obsidian Auto-Index

点一下按钮，全库扫描，自动重建知识库索引。

## 功能

- 扫描 vault 根目录所有文件夹（自动排除隐藏目录和 `.obsidian`、`attachments` 等）
- 自动识别 `数字、名称` 格式的文件夹为模块，生成 callout 折叠卡片索引
- **说明列智能生成**：
  - 视频总结模块：拆文件名 `-` 分隔为关键词（`费曼学习法 · 四步闭环 · AI赋能`）
  - 其他模块：优先 frontmatter `tags` → 首标题 → 文件名关键词，自动过滤噪音标签（clippings/bilibili/douyin）和泛用标题（简介/AI总结）
- 同步更新 SVG 成长曲线图表（笔记数、曲线、图例）
- 时间戳（含时分秒）显示在顶部数据面板
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
