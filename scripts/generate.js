const https = require("https");
const fs = require("fs");

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`)); }
            });
            res.on("error", reject);
        }).on("error", reject);
    });
}

function extractGithubPath(url) {
    if (!url) return null;
    const match = url.match(/github\.com\/([^/]+\/[^/?#]+)/);
    return match ? match[1].replace(/\.git$/, "") : null;
}

function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function generateReadme(resources, siteUrl) {
    const byCategory = {};
    for (const r of resources) {
        const cat = r.category || "Uncategorized";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(r);
    }

    const categories = Object.keys(byCategory).sort();
    const count = resources.length;
    const date = new Date().toISOString().split("T")[0];

    let md = `<div align="center">\n`;
    md += `<img src="${siteUrl}/api/logo" width="72" height="72" alt="ToolIndex" />\n\n`;
    md += `# ToolIndex — AI Resources\n\n`;
    md += `**${count} curated AI resources** (MCP servers, models, datasets, prompts), automatically synced nightly from [ToolIndex](${siteUrl}).\n\n`;
    md += `[![Submit a Resource](https://img.shields.io/badge/Submit%20a%20Resource-%236366f1?style=for-the-badge&logo=github)](${siteUrl}/ai/submit)`;
    md += ` [![Visit ToolIndex](https://img.shields.io/badge/Visit%20ToolIndex-black?style=for-the-badge)](${siteUrl})\n\n`;
    md += `![Last Synced](https://img.shields.io/badge/last%20synced-${date}-brightgreen?style=flat-square)\n`;
    md += `</div>\n\n---\n\n`;

    md += `## Categories\n\n`;
    for (const cat of categories) {
        md += `- [${cat}](#${slugify(cat)}) (${byCategory[cat].length})\n`;
    }
    md += `\n---\n\n`;

    for (const cat of categories) {
        md += `## ${cat}\n\n`;
        const sorted = byCategory[cat].sort((a, b) => a.name.localeCompare(b.name));
        for (const r of sorted) {
            const githubPath = extractGithubPath(r.github_url);
            const stars = githubPath
                ? ` ![stars](https://img.shields.io/github/stars/${githubPath}?style=flat-square&label=★&color=gold)`
                : "";
            const links = [];
            if (r.github_url) links.push(`[GitHub](${r.github_url})`);
            if (r.website_url && r.website_url !== r.github_url) links.push(`[Website](${r.website_url})`);
            const linkStr = links.length ? `  \n  ${links.join(" · ")}` : "";
            md += `### ${r.name}${stars}\n\n${r.description}${linkStr}\n\n`;
        }
    }

    md += `---\n\n<div align="center"><sub>Last synced: ${date} · Powered by <a href="${siteUrl}">ToolIndex</a></sub></div>\n`;
    return md;
}

async function main() {
    const siteUrl = (process.env.TOOLINDEX_API_URL || "").replace(/\/+$/, "");
    if (!siteUrl) throw new Error("TOOLINDEX_API_URL environment variable is required");

    console.log(`Fetching from ${siteUrl}/api/export/ai-resources ...`);
    const resources = await fetchJSON(`${siteUrl}/api/export/ai-resources`);
    console.log(`Got ${resources.length} AI resources`);

    fs.writeFileSync("ai-resources.json", JSON.stringify(resources, null, 2) + "\n");
    fs.writeFileSync("README.md", generateReadme(resources, siteUrl));

    console.log("Generated README.md and ai-resources.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
