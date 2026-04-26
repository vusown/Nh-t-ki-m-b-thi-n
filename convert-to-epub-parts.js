const fs = require("fs");
const path = require("path");
const Epub = require("epub-gen");

const INPUT_DIR = "./novels/Nhất Kiếm Bá Thiên";
const OUTPUT_DIR = "./epub_parts";
const CHAPTERS_PER_EPUB = 20;

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function extractChapterNo(name) {
    const match = name.match(/Chương\s*(\d+)/i);
    return match ? Number(match[1]) : 0;
}

function safeName(name) {
    return name.replace(/[\\/:*?"<>|]/g, "_").trim();
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function textToHtml(text) {
    return escapeHtml(text)
        .split(/\n{2,}/)
        .map(p => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
        .join("\n");
}

function getLastConvertedChapter() {
    ensureDir(OUTPUT_DIR);

    const epubFiles = fs
        .readdirSync(OUTPUT_DIR)
        .filter(file => file.toLowerCase().endsWith(".epub"));

    if (epubFiles.length === 0) return 0;

    const lastChapter = epubFiles
        .map(file => {
            const match = file.match(/Chương\s*\d+\s*-\s*(\d+)/i);
            return match ? Number(match[1]) : 0;
        })
        .sort((a, b) => b - a)[0];

    return lastChapter || 0;
}

async function createEpub(group) {
    const firstNo = extractChapterNo(group[0]);
    const lastNo = extractChapterNo(group[group.length - 1]);

    const chapters = group.map(file => {
        const fullPath = path.join(INPUT_DIR, file);
        const rawText = fs.readFileSync(fullPath, "utf8").trim();

        const firstLine = rawText.split(/\r?\n/)[0]?.trim();
        const chapterTitle = firstLine || file.replace(/\.txt$/i, "");

        return {
            title: chapterTitle,
            data: textToHtml(rawText)
        };
    });

    const outputFileName = safeName(
        `Nhất Kiếm Bá Thiên - Chương ${firstNo}-${lastNo}.epub`
    );

    const outputPath = path.join(OUTPUT_DIR, outputFileName);

    if (fs.existsSync(outputPath)) {
        console.log(`Skip existing: ${outputPath}`);
        return;
    }

    console.log(`Creating EPUB: ${outputPath}`);

    await new Epub({
        title: `Nhất Kiếm Bá Thiên - Chương ${firstNo}-${lastNo}`,
        author: "Unknown",
        publisher: "Local",
        content: chapters,
        output: outputPath,
        verbose: false
    }).promise;

    console.log(`Created: ${outputPath}`);
}

async function main() {
    ensureDir(OUTPUT_DIR);

    const lastConvertedChapter = getLastConvertedChapter();

    console.log("Last converted chapter:", lastConvertedChapter || "none");

    const files = fs
        .readdirSync(INPUT_DIR)
        .filter(file => file.toLowerCase().endsWith(".txt"))
        .filter(file => extractChapterNo(file) > lastConvertedChapter)
        .sort((a, b) => extractChapterNo(a) - extractChapterNo(b));

    if (files.length === 0) {
        console.log("Không có chương mới cần convert.");
        return;
    }

    for (let i = 0; i < files.length; i += CHAPTERS_PER_EPUB) {
        const group = files.slice(i, i + CHAPTERS_PER_EPUB);
        await createEpub(group);
    }

    console.log("Done.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});