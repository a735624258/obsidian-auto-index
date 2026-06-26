var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AutoIndexPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var INDEX_FILE = "\u3010\u77E5\u8BC6\u5E93\u5168\u91CF\u7D22\u5F15\u3011.md";
var SVG_PATH = "attachments/\u4E00\u4E2A\u6708\u6210\u957F\u590D\u5229\u66F2\u7EBF.svg";
var EXCLUDED_DIRS = /* @__PURE__ */ new Set([
  ".obsidian",
  "attachments",
  "Clippings",
  "\u6A21\u677F",
  ".git",
  ".trash",
  ".workbuddy"
]);
function isExcludedDir(name) {
  return EXCLUDED_DIRS.has(name) || name.startsWith(".");
}
var CALLOUT_PALETTE = [
  "note",
  "info",
  "tip",
  "example",
  "abstract",
  "warning",
  "success",
  "question"
];
var AutoIndexPlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.addRibbonIcon("lines-of-text", "\u91CD\u5EFA\u7D22\u5F15", () => {
      this.fullRebuild().catch((e) => console.error("Auto-Index \u5931\u8D25:", e));
    });
    this.addCommand({
      id: "rebuild-index",
      name: "\u91CD\u5EFA\u5168\u91CF\u7D22\u5F15",
      callback: () => this.fullRebuild().catch((e) => console.error("Auto-Index \u5931\u8D25:", e))
    });
    console.log("Auto-Index: \u5DF2\u52A0\u8F7D");
  }
  async fullRebuild() {
    const indexFile = this.app.vault.getAbstractFileByPath(INDEX_FILE);
    if (!(indexFile instanceof import_obsidian.TFile))
      return;
    const root = this.app.vault.getRoot();
    const modules = [];
    for (const child of root.children || []) {
      if (!(child instanceof import_obsidian.TFolder))
        continue;
      if (isExcludedDir(child.name))
        continue;
      const entries = [];
      this.collectEntries(child, entries);
      entries.sort((a, b) => a.basename.localeCompare(b.basename, "zh-CN"));
      const match = child.name.match(/^(\d+)[、，,.\s]+(.+)/);
      const label = match ? `\u6A21\u5757 ${match[1]} \xB7 ${match[2]}` : child.name;
      modules.push({ folder: child.name, label, entries });
    }
    modules.sort((a, b) => {
      var _a, _b;
      const na = parseInt(((_a = a.label.match(/(\d+)/)) == null ? void 0 : _a[1]) || "9999");
      const nb = parseInt(((_b = b.label.match(/(\d+)/)) == null ? void 0 : _b[1]) || "9999");
      return na - nb;
    });
    let oldContent = "";
    try {
      oldContent = await this.app.vault.read(indexFile);
    } catch (e) {
    }
    const listStart = oldContent.indexOf("## \u{1F4CB} \u5168\u91CF\u6E05\u5355");
    const oldTail = listStart >= 0 ? oldContent.slice(listStart) : "";
    const head = this.buildHead(oldContent, modules.length);
    const { body, total } = this.buildBody(modules, oldTail);
    const newContent = head + "\n" + body;
    await this.app.vault.modify(indexFile, newContent);
    await this.updateSVG(total);
    console.log(`Auto-Index: ${modules.length} \u6A21\u5757 \xB7 ${total} \u7BC7\u7B14\u8BB0`);
  }
  // 递归收集 md 文件，从笔记自身读取描述
  collectEntries(folder, result) {
    for (const child of folder.children || []) {
      if (child instanceof import_obsidian.TFile && child.extension === "md" && child.name !== INDEX_FILE) {
        const desc = this.getDesc(child);
        result.push({ basename: child.basename, desc });
      } else if (child instanceof import_obsidian.TFolder) {
        this.collectEntries(child, result);
      }
    }
  }
  // 生成说明列：tags → 首标题 → 去日期文件名
  getDesc(file) {
    var _a, _b;
    const cache = this.app.metadataCache.getFileCache(file);
    const tags = (_a = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a.tags;
    if (tags) {
      const list = Array.isArray(tags) ? tags : [tags];
      const clean = list.map((t) => String(t).replace(/^#/, ""));
      if (clean.length > 0)
        return clean.join(" \xB7 ");
    }
    if ((_b = cache == null ? void 0 : cache.headings) == null ? void 0 : _b.length) {
      return cache.headings[0].heading;
    }
    return file.basename.replace(/-\d{4}-\d{2}-\d{2}$/, "").replace(/-/g, " ");
  }
  buildHead(old, moduleCount) {
    const fm = old.match(/^---[\s\S]*?---/);
    const frontmatter = fm ? fm[0] : "---\ncssclasses:\n  - full-width-page\n---";
    const noteMatch = old.match(/> \*\*(\d+)\*\* 篇笔记/);
    const noteCount = (noteMatch == null ? void 0 : noteMatch[1]) || "0";
    const oldPanel = old.match(
      /> \*\*(\d+)\*\* 篇笔记 &emsp; \*\*(\d+)\*\* 个模块 &emsp; \*\*(\d+)\*\* skill &emsp; \*\*(\d+)\*\* 插件/
    );
    const skillCount = (oldPanel == null ? void 0 : oldPanel[3]) || "66";
    const pluginCount = (oldPanel == null ? void 0 : oldPanel[4]) || "24";
    const oldDescLines = [];
    const descStart = old.indexOf("> [!abstract] \u{1F4CA} \u6210\u957F\u6570\u636E");
    if (descStart >= 0) {
      for (const line of old.substring(descStart).split("\n")) {
        if (line.startsWith("> [!abstract]") || line.startsWith("> **"))
          continue;
        if (line.includes("![["))
          break;
        const t = line.replace(/^> /, "").trim();
        if (t && t !== ">" && !t.startsWith(">"))
          oldDescLines.push(t);
      }
    }
    const descText = oldDescLines.length > 0 ? oldDescLines.map((l) => `> ${l}`).join("\n") : "> \u6301\u7EED\u81EA\u7136\u589E\u957F\u3002";
    return `${frontmatter}

# \u601D\u60F3\u5EFA\u8BBE \xB7 \u5168\u91CF\u7D22\u5F15

> [!abstract] \u{1F4CA} \u6210\u957F\u6570\u636E
> **${noteCount}** \u7BC7\u7B14\u8BB0 &emsp; **${moduleCount}** \u4E2A\u6A21\u5757 &emsp; **${skillCount}** skill &emsp; **${pluginCount}** \u63D2\u4EF6
>
${descText}

![[\u4E00\u4E2A\u6708\u6210\u957F\u590D\u5229\u66F2\u7EBF.svg|681]]

---
`;
  }
  buildBody(modules, oldTail) {
    const oldTypes = this.extractTypes(oldTail);
    const oldSubs = this.extractAllSubStructures(oldTail);
    let body = "## \u{1F4CB} \u5168\u91CF\u6E05\u5355\n";
    let total = 0;
    for (const [i, mod] of modules.entries()) {
      total += mod.entries.length;
      const type = oldTypes[mod.label] || CALLOUT_PALETTE[i % CALLOUT_PALETTE.length];
      body += `
> [!${type}]+ ${mod.label}\uFF08${mod.entries.length} \u7BC7\uFF09
`;
      const subs = oldSubs.get(mod.label);
      if (subs) {
        body += this.rebuildWithSections(subs, mod.entries);
      } else {
        body += `> 
> | \u7B14\u8BB0 | \u8BF4\u660E |
> |------|------|
`;
        for (const e of mod.entries) {
          body += `> | [[${e.basename}]] | ${e.desc} |
`;
        }
      }
      body += "\n";
    }
    const today = /* @__PURE__ */ new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    body += `---

> **\u7EDF\u8BA1**\uFF1A\u5171 ${modules.length} \u4E2A\u6A21\u5757\uFF0C${total} \u6761\u7B14\u8BB0\uFF0C\u6700\u540E\u66F4\u65B0\uFF1A${todayStr}`;
    return { body, total };
  }
  // ---- 子分类 ----
  extractAllSubStructures(oldTail) {
    const map = /* @__PURE__ */ new Map();
    const re = /> \[!\w+\][+-] (模块 \d+ · .+?)（\d+ 篇）\n([\s\S]*?)(?=\n> \[!|\n---|\n> \*\*统计)/g;
    let m;
    while ((m = re.exec(oldTail)) !== null) {
      const secs = this.parseSections(m[2]);
      if (secs.length > 1)
        map.set(m[1], secs);
    }
    return map;
  }
  parseSections(block) {
    const sections = [];
    const lines = block.split("\n");
    let curHeader = [];
    let curFiles = [];
    let inTable = false;
    for (const line of lines) {
      if (/^> \|[-: |]+\|[-: |]*\|?$/.test(line)) {
        if (inTable && curFiles.length > 0)
          sections.push({ headerLines: [...curHeader], filenames: [...curFiles] });
        curFiles = [];
        inTable = true;
        continue;
      }
      if (/^> \| ?笔记 ?\|/.test(line))
        continue;
      const fm = line.match(/^> \| \[\[([^\]]+)\]\]/);
      if (fm && inTable) {
        curFiles.push(fm[1]);
      } else if (!fm && line.startsWith("> ") && !inTable) {
        if (line.trim() !== ">" && line.trim() !== "> ")
          curHeader.push(line);
      } else if (!line.startsWith("> |") && inTable) {
        if (curFiles.length > 0)
          sections.push({ headerLines: [...curHeader], filenames: [...curFiles] });
        curFiles = [];
        inTable = false;
        curHeader = [];
        if (line.trim() !== ">" && line.trim() !== "> ")
          curHeader.push(line);
      }
    }
    if (curFiles.length > 0)
      sections.push({ headerLines: [...curHeader], filenames: [...curFiles] });
    return sections;
  }
  rebuildWithSections(subs, entries) {
    const entrySet = new Set(entries.map((e) => e.basename));
    const descMap = new Map(entries.map((e) => [e.basename, e.desc]));
    const placed = /* @__PURE__ */ new Set();
    let out = "";
    for (const sec of subs) {
      const keep = sec.filenames.filter((f) => entrySet.has(f));
      if (keep.length === 0)
        continue;
      for (const h of sec.headerLines)
        out += h + "\n";
      out += `> | \u7B14\u8BB0 | \u8BF4\u660E |
> |------|------|
`;
      for (const f of keep.sort((a, b) => a.localeCompare(b, "zh-CN"))) {
        out += `> | [[${f}]] | ${descMap.get(f) || ""} |
`;
        placed.add(f);
      }
      out += "\n";
    }
    const orphan = entries.filter((e) => !placed.has(e.basename));
    if (orphan.length > 0) {
      out += `> 
> | \u7B14\u8BB0 | \u8BF4\u660E |
> |------|------|
`;
      for (const e of orphan) {
        out += `> | [[${e.basename}]] | ${e.desc} |
`;
      }
    }
    return out;
  }
  extractTypes(oldTail) {
    const map = {};
    const re = /> \[!(\w+)\][+-] (模块 \d+ · .+?)（\d+ 篇）/g;
    let m;
    while ((m = re.exec(oldTail)) !== null)
      map[m[2]] = m[1];
    return map;
  }
  // ---- SVG ----
  async updateSVG(total) {
    const svgAbs = this.app.vault.getAbstractFileByPath(SVG_PATH);
    if (!(svgAbs instanceof import_obsidian.TFile))
      return;
    let svg = await this.app.vault.read(svgAbs);
    svg = svg.replace(/(<text x="107" y="84"[^>]*>)(\d+)(<\/text>)/, (_, p, _n, s) => `${p}${total}${s}`);
    svg = svg.replace(/笔记(\d+)篇/, `\u7B14\u8BB0${total}\u7BC7`);
    svg = svg.replace(/(<text x="650" y="138"[^>]*>)(\d+)(<\/text>)/g, (_, p, _n, s) => `${p}${total}${s}`);
    const scale = Math.max(400, total);
    const newY = Math.round(410 - total / scale * 280);
    svg = svg.replace(/(L574 \d+ L650 )\d+/, `$1${newY}`);
    const lm = svg.match(/5\/16导入220篇后，(\d+)天自然新增(\d+)篇/);
    if (lm) {
      svg = svg.replace(/5\/16导入220篇后，\d+天自然新增\d+篇/, `5/16\u5BFC\u5165220\u7BC7\u540E\uFF0C${lm[1]}\u5929\u81EA\u7136\u65B0\u589E${total - 220}\u7BC7`);
    }
    await this.app.vault.modify(svgAbs, svg);
  }
};
