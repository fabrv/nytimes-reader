import { GlobalWindow } from "happy-dom";

export interface ImageBlock {
  src: string;
  alt: string;
  caption: string;
  credit: string;
}

export type ArticleContent = Record<string, string[] | ImageBlock>;

const window = new GlobalWindow();
const parser = new window.DOMParser();

export function parseCompanionColumn(html: string): string[] {
  const document = parser.parseFromString(html, "text/html");
  const paragraphs = document.querySelectorAll("p");
  return Array.from(paragraphs).map((p) => p.textContent ?? "");
}

export function parseImageBlock(html: string): ImageBlock {
  const document = parser.parseFromString(html, "text/html");
  const img = document.querySelector("img");
  const caption = document.querySelector('[data-testid="photoviewer-children-caption"] > span:first-child');
  const credit = document.querySelector('[data-testid="photoviewer-children-caption"] span[aria-hidden="false"]');

  return {
    src: img?.getAttribute("src") ?? "",
    alt: img?.getAttribute("alt") ?? "",
    caption: caption?.textContent ?? "",
    credit: credit?.textContent ?? "",
  };
}

export function parseArticle(html: string): ArticleContent {
  const document = parser.parseFromString(html, "text/html");
  const result: ArticleContent = {};

  const children = document.querySelectorAll('[data-testid]');

  for (const child of children) {
    const testId = child.getAttribute("data-testid");
    if (!testId) continue;

    const companionMatch = testId.match(/^companionColumn-(\d+)$/);
    if (companionMatch) {
      result[`companionColumn${companionMatch[1]}`] = parseCompanionColumn(child.outerHTML);
      continue;
    }

    const imageMatch = testId.match(/^ImageBlock-(\d+)$/);
    if (imageMatch) {
      result[`imageBlock${imageMatch[1]}`] = parseImageBlock(child.outerHTML);
    }
  }

  return result;
}
