import type { ArticleWithContent } from "./index";
import type { ImageBlock } from "./mappers/article";

// Kindle Paperwhite 11th gen: 1236×1648px at 300ppi
// Silk browser reports ~758px CSS width, ~1024px CSS height (accounting for chrome)
const VIEWPORT_WIDTH = 758;
const VIEWPORT_HEIGHT = 1024 - 250; // subtract Kindle browser header + footer chrome
const PADDING = 20;
const FONT_SIZE_REM = 1.0;
const BASE_FONT_PX = 16;
const FONT_SIZE_PX = FONT_SIZE_REM * BASE_FONT_PX; // 19.2px
const LINE_HEIGHT = 1.6;
const MARGIN_BOTTOM_PX = FONT_SIZE_PX; // 1em
const AVG_CHAR_WIDTH_PX = 9; // Georgia mixed-case average
const AVAILABLE_HEIGHT_RATIO = 0.8;

const CONTENT_WIDTH = Math.min(600, VIEWPORT_WIDTH - PADDING * 2); // 600px
const AVAILABLE_HEIGHT = VIEWPORT_HEIGHT * AVAILABLE_HEIGHT_RATIO; // 819px
const CHARS_PER_LINE = Math.floor(CONTENT_WIDTH / AVG_CHAR_WIDTH_PX); // ~66

function estimateParagraphHeight(text: string): number {
  const lines = Math.ceil(text.length / CHARS_PER_LINE);
  return lines * FONT_SIZE_PX * LINE_HEIGHT + MARGIN_BOTTOM_PX;
}

type ContentItem =
  | { type: "paragraph"; text: string }
  | { type: "image"; image: ImageBlock };

function isImageBlock(value: string[] | ImageBlock): value is ImageBlock {
  return typeof value === "object" && "src" in value;
}

function getContentItems(content: Record<string, string[] | ImageBlock>): ContentItem[] {
  const keys = Object.keys(content).sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] ?? "0");
    const numB = parseInt(b.match(/\d+/)?.[0] ?? "0");
    return numA - numB;
  });

  const items: ContentItem[] = [];
  for (const key of keys) {
    const value = content[key];
    if (isImageBlock(value)) {
      if (value.src) items.push({ type: "image", image: value });
    } else {
      for (const text of value) {
        if (text.trim()) items.push({ type: "paragraph", text });
      }
    }
  }
  return items;
}

export type Page =
  | { type: "cover" }
  | { type: "image"; image: ImageBlock }
  | { type: "text"; paragraphs: string[] };

export function paginateArticle(article: ArticleWithContent): Page[] {
  const pages: Page[] = [{ type: "cover" }];
  const items = getContentItems(article.content);

  let i = 0;
  while (i < items.length) {
    const item = items[i]!;
    if (item.type === "image") {
      pages.push({ type: "image", image: item.image });
      i++;
    } else {
      const paragraphs: string[] = [];
      let totalHeight = 0;
      while (i < items.length) {
        const cur = items[i]!;
        if (cur.type === "image") break;
        const h = estimateParagraphHeight(cur.text);
        if (totalHeight + h > AVAILABLE_HEIGHT && paragraphs.length > 0) break;
        paragraphs.push(cur.text);
        totalHeight += h;
        i++;
      }
      if (paragraphs.length > 0) pages.push({ type: "text", paragraphs });
    }
  }

  return pages;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
${body}
</body>
</html>`;
}

export function renderArticlesList(articles: ArticleWithContent[]): string {
  const items = articles
    .map(
      (a, i) => `  <article class="article-card">
    <h2><a href="/article/${i}">${esc(a.title)}</a></h2>
    <p class="byline">${esc(a.byline ?? "")}</p>
    <p class="abstract">${esc(a.abstract ?? "")}</p>
  </article>`
    )
    .join("\n");

  return layout(
    "NYT Reader",
    `<div class="container">
  <header><h1><a href="/">NYT Reader</a></h1></header>
  <div class="articles-list">
${items}
  </div>
</div>`
  );
}

export function renderArticlePage(
  article: ArticleWithContent,
  pages: Page[],
  pageIndex: number,
  articleIndex: number
): string {
  const page = pages[pageIndex]!;
  const heroImage = article.multimedia?.[0];
  const total = pages.length;

  const prevHref =
    pageIndex === 0
      ? "/"
      : pageIndex === 1
        ? `/article/${articleIndex}`
        : `/article/${articleIndex}/page/${pageIndex - 1}`;

  const nextHref =
    pageIndex >= total - 1
      ? "/"
      : pageIndex === 0
        ? `/article/${articleIndex}/page/1`
        : `/article/${articleIndex}/page/${pageIndex + 1}`;

  const nav = `  <a class="nav-prev" href="${prevHref}" aria-label="Previous"></a>
  <a class="nav-next" href="${nextHref}" aria-label="Next"></a>`;

  let content: string;

  if (page.type === "cover") {
    const heroHtml = heroImage
      ? `  <figure class="hero-image"><img src="${esc(heroImage.url)}" alt="${esc(article.title)}"></figure>`
      : "";
    content = `<div class="reader-page">
${nav}
  <div class="cover-page">
    <h1>${esc(article.title)}</h1>
    <p class="byline">${esc(article.byline ?? "")}</p>
    <p class="abstract">${esc(article.abstract ?? "")}</p>
${heroHtml}
  </div>
</div>`;
  } else if (page.type === "image") {
    const caption = page.image.caption
      ? `  <figcaption>${esc(page.image.caption)}</figcaption>`
      : "";
    const credit = page.image.credit
      ? `  <span class="credit">${esc(page.image.credit)}</span>`
      : "";
    content = `<div class="reader-page">
${nav}
  <figure class="full-image">
    <img src="${esc(page.image.src)}" alt="${esc(page.image.alt ?? "")}">
${caption}
${credit}
  </figure>
</div>`;
  } else {
    const paras = page.paragraphs.map((p) => `    <p>${esc(p)}</p>`).join("\n");
    content = `<div class="reader-page">
${nav}
  <div class="text-page" style="font-size:${FONT_SIZE_REM}rem">
${paras}
  </div>
</div>`;
  }

  return layout(article.title, content);
}
