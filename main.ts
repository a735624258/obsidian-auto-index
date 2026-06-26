import { Plugin, TFile, TFolder } from "obsidian";

const INDEX_FILE = "【知识库全量索引】.md";
const SVG_PATH = "attachments/一个月成长复利曲线.svg";

const EXCLUDED_DIRS = new Set([
    ".obsidian", "attachments", "Clippings", "模板",
    ".git", ".trash", ".workbuddy",
]);

function isExcludedDir(name: string): boolean {
    return EXCLUDED_DIRS.has(name) || name.startsWith(".");
}

const CALLOUT_PALETTE = [
    "note", "info", "tip", "example",
    "abstract", "warning", "success", "question",
];

interface SubSection {
    headerLines: string[];
    filenames: string[];
}

interface FileEntry {
    basename: string;
    desc: string;
}

export default class AutoIndexPlugin extends Plugin {
    async onload() {
        this.addRibbonIcon("lines-of-text", "重建索引", () => {
            this.fullRebuild().catch((e) => console.error("Auto-Index 失败:", e));
        });
        this.addCommand({
            id: "rebuild-index",
            name: "重建全量索引",
            callback: () => this.fullRebuild().catch((e) => console.error("Auto-Index 失败:", e)),
        });
        console.log("Auto-Index: 已加载");
    }

    async fullRebuild() {
        const indexFile = this.app.vault.getAbstractFileByPath(INDEX_FILE);
        if (!(indexFile instanceof TFile)) return;

        const root = this.app.vault.getRoot();
        const modules: { folder: string; label: string; entries: FileEntry[] }[] = [];

        for (const child of (root as any).children || []) {
            if (!(child instanceof TFolder)) continue;
            if (isExcludedDir(child.name)) continue;

            const entries: FileEntry[] = [];
            this.collectEntries(child, entries);
            entries.sort((a, b) => a.basename.localeCompare(b.basename, "zh-CN"));

            const match = child.name.match(/^(\d+)[、，,.\s]+(.+)/);
            const label = match ? `模块 ${match[1]} · ${match[2]}` : child.name;

            modules.push({ folder: child.name, label, entries });
        }

        modules.sort((a, b) => {
            const na = parseInt(a.label.match(/(\d+)/)?.[1] || "9999");
            const nb = parseInt(b.label.match(/(\d+)/)?.[1] || "9999");
            return na - nb;
        });

        let oldContent = "";
        try { oldContent = await this.app.vault.read(indexFile); } catch {}

        const listStart = oldContent.indexOf("## 📋 全量清单");
        const oldTail = listStart >= 0 ? oldContent.slice(listStart) : "";

        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        const head = this.buildHead(oldContent, modules.length, todayStr);
        const { body, total } = this.buildBody(modules, oldTail);
        const newContent = head + "\n" + body;
        await this.app.vault.modify(indexFile, newContent);

        await this.updateSVG(total);
        console.log(`Auto-Index: ${modules.length} 模块 · ${total} 篇笔记`);
    }

    // 递归收集 md 文件，从笔记自身读取描述
    collectEntries(folder: TFolder, result: FileEntry[], rootModule?: string) {
        const modName = rootModule || folder.name;
        for (const child of (folder as any).children || []) {
            if (child instanceof TFile && child.extension === "md" && child.name !== INDEX_FILE) {
                const desc = this.getDesc(child, modName);
                result.push({ basename: child.basename, desc });
            } else if (child instanceof TFolder) {
                this.collectEntries(child, result, modName);
            }
        }
    }

    // 生成说明列：tags（过滤来源标签）→ 首标题 → 文件名关键词
    getDesc(file: TFile, moduleFolder: string): string {
        // 视频总结模块：只用文件名关键词
        if (moduleFolder === "3、视频总结") {
            return this.toKeywords(file.basename);
        }

        const cache = this.app.metadataCache.getFileCache(file);

        // 优先 frontmatter tags，但过滤掉来源类标签
        const noiseTags = new Set(["clippings", "bilibili", "douyin", "youtube", "抖音", "B站"]);
        const tags = cache?.frontmatter?.tags;
        if (tags) {
            const list = Array.isArray(tags) ? tags : [tags];
            const clean = list
                .map((t: string) => String(t).replace(/^#/, ""))
                .filter((t: string) => !noiseTags.has(t));
            if (clean.length > 0) return clean.join(" · ");
        }

        // 其次第一个 heading（跳过太泛的），但文件名含多个 - 的优先用文件名
        const hasHypens = file.basename.split("-").filter(p => p.length > 0).length >= 3;
        if (!hasHypens && cache?.headings?.length) {
            const h = cache.headings[0].heading;
            const skipHeadings = new Set(["简介", "总结", "概述", "前言"]);
            if (!skipHeadings.has(h) && !h.startsWith("AI总结")) {
                return this.toKeywords(h);
            }
        }

        // 最后文件名
        return this.toKeywords(file.basename);
    }

    toKeywords(s: string): string {
        return s
            .replace(/-\d{4}-\d{2}-\d{2}$/, "")
            .split("-")
            .filter(p => p.length > 0 && !/^\d+$/.test(p))
            .join(" · ");
    }

    buildHead(old: string, moduleCount: number, todayStr: string): string {
        const fm = old.match(/^---[\s\S]*?---/);
        const frontmatter = fm ? fm[0] : "---\ncssclasses:\n  - full-width-page\n---";
        const noteMatch = old.match(/> \*\*(\d+)\*\* 篇笔记/);
        const noteCount = noteMatch?.[1] || "0";
        const oldPanel = old.match(
            /> \*\*(\d+)\*\* 篇笔记 &emsp; \*\*(\d+)\*\* 个模块 &emsp; \*\*(\d+)\*\* skill &emsp; \*\*(\d+)\*\* 插件/
        );
        const skillCount = oldPanel?.[3] || "66";
        const pluginCount = oldPanel?.[4] || "24";

        const oldDescLines: string[] = [];
        const descStart = old.indexOf("> [!abstract] 📊 成长数据");
        if (descStart >= 0) {
            for (const line of old.substring(descStart).split("\n")) {
                if (line.startsWith("> [!abstract]") || line.startsWith("> **")) continue;
                if (line.includes("![[")) break;
                // 去掉 callout 前缀，跳过空行和纯 > 行
                const t = line.replace(/^> /, "").trim();
                if (t && t !== ">" && !t.startsWith(">") && !t.startsWith("最后更新")) oldDescLines.push(t);
            }
        }
        const descText = oldDescLines.length > 0
            ? oldDescLines.map(l => `> ${l}`).join("\n")
            : "> 持续自然增长。";

        return `${frontmatter}

# 思想建设 · 全量索引

> [!abstract] 📊 成长数据
> **${noteCount}** 篇笔记 &emsp; **${moduleCount}** 个模块 &emsp; **${skillCount}** skill &emsp; **${pluginCount}** 插件
>
${descText}
>
> 最后更新：${todayStr}

![[一个月成长复利曲线.svg|681]]

---
`;
    }

    buildBody(
        modules: { folder: string; label: string; entries: FileEntry[] }[],
        oldTail: string
    ): { body: string; total: number } {
        const oldTypes = this.extractTypes(oldTail);
        const oldSubs = this.extractAllSubStructures(oldTail);

        let body = "## 📋 全量清单\n";
        let total = 0;

        for (const [i, mod] of modules.entries()) {
            total += mod.entries.length;
            const type = oldTypes[mod.label] || CALLOUT_PALETTE[i % CALLOUT_PALETTE.length];
            body += `\n> [!${type}]+ ${mod.label}（${mod.entries.length} 篇）\n`;

            const subs = oldSubs.get(mod.label);
            if (subs) {
                body += this.rebuildWithSections(subs, mod.entries);
            } else {
                body += `> \n> | 笔记 | 说明 |\n> |------|------|\n`;
                for (const e of mod.entries) {
                    body += `> | [[${e.basename}]] | ${e.desc} |\n`;
                }
            }
            body += "\n";
        }

        body += `\n---\n`;
        return { body, total };
    }

    // ---- 子分类 ----

    extractAllSubStructures(oldTail: string): Map<string, SubSection[]> {
        const map = new Map<string, SubSection[]>();
        const re = /> \[!\w+\][+-] (模块 \d+ · .+?)（\d+ 篇）\n([\s\S]*?)(?=\n> \[!|\n---|\n> \*\*统计)/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(oldTail)) !== null) {
            const secs = this.parseSections(m[2]);
            if (secs.length > 1) map.set(m[1], secs);
        }
        return map;
    }

    parseSections(block: string): SubSection[] {
        const sections: SubSection[] = [];
        const lines = block.split("\n");
        let curHeader: string[] = [];
        let curFiles: string[] = [];
        let inTable = false;

        for (const line of lines) {
            if (/^> \|[-: |]+\|[-: |]*\|?$/.test(line)) {
                if (inTable && curFiles.length > 0) sections.push({ headerLines: [...curHeader], filenames: [...curFiles] });
                curFiles = []; inTable = true;
                continue;
            }
            if (/^> \| ?笔记 ?\|/.test(line)) continue;
            const fm = line.match(/^> \| \[\[([^\]]+)\]\]/);
            if (fm && inTable) {
                curFiles.push(fm[1]);
            } else if (!fm && line.startsWith("> ") && !inTable) {
                if (line.trim() !== ">" && line.trim() !== "> ") curHeader.push(line);
            } else if (!line.startsWith("> |") && inTable) {
                if (curFiles.length > 0) sections.push({ headerLines: [...curHeader], filenames: [...curFiles] });
                curFiles = []; inTable = false; curHeader = [];
                if (line.trim() !== ">" && line.trim() !== "> ") curHeader.push(line);
            }
        }
        if (curFiles.length > 0) sections.push({ headerLines: [...curHeader], filenames: [...curFiles] });
        return sections;
    }

    rebuildWithSections(subs: SubSection[], entries: FileEntry[]): string {
        const entrySet = new Set(entries.map(e => e.basename));
        const descMap = new Map(entries.map(e => [e.basename, e.desc]));
        const placed = new Set<string>();
        let out = "";

        for (const sec of subs) {
            const keep = sec.filenames.filter(f => entrySet.has(f));
            if (keep.length === 0) continue;
            for (const h of sec.headerLines) out += h + "\n";
            out += `> | 笔记 | 说明 |\n> |------|------|\n`;
            for (const f of keep.sort((a, b) => a.localeCompare(b, "zh-CN"))) {
                out += `> | [[${f}]] | ${descMap.get(f) || ""} |\n`;
                placed.add(f);
            }
            out += "\n";
        }

        const orphan = entries.filter(e => !placed.has(e.basename));
        if (orphan.length > 0) {
            out += `> \n> | 笔记 | 说明 |\n> |------|------|\n`;
            for (const e of orphan) {
                out += `> | [[${e.basename}]] | ${e.desc} |\n`;
            }
        }
        return out;
    }

    extractTypes(oldTail: string): Record<string, string> {
        const map: Record<string, string> = {};
        const re = /> \[!(\w+)\][+-] (模块 \d+ · .+?)（\d+ 篇）/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(oldTail)) !== null) map[m[2]] = m[1];
        return map;
    }

    // ---- SVG ----

    async updateSVG(total: number) {
        const svgAbs = this.app.vault.getAbstractFileByPath(SVG_PATH);
        if (!(svgAbs instanceof TFile)) return;
        let svg = await this.app.vault.read(svgAbs);

        svg = svg.replace(/(<text x="107" y="84"[^>]*>)(\d+)(<\/text>)/, (_: string, p: string, _n: string, s: string) => `${p}${total}${s}`);
        svg = svg.replace(/笔记(\d+)篇/, `笔记${total}篇`);
        svg = svg.replace(/(<text x="650" y="138"[^>]*>)(\d+)(<\/text>)/g, (_: string, p: string, _n: string, s: string) => `${p}${total}${s}`);
        const scale = Math.max(400, total);
        const newY = Math.round(410 - (total / scale) * 280);
        svg = svg.replace(/(L574 \d+ L650 )\d+/, `$1${newY}`);

        const lm = svg.match(/5\/16导入220篇后，(\d+)天自然新增(\d+)篇/);
        if (lm) {
            svg = svg.replace(/5\/16导入220篇后，\d+天自然新增\d+篇/, `5/16导入220篇后，${lm[1]}天自然新增${total - 220}篇`);
        }
        await this.app.vault.modify(svgAbs, svg);
    }
}
