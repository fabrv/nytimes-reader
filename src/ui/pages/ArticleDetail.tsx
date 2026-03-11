import { useEffect, useState, useRef, useCallback } from "preact/hooks";
import type { ArticleWithContent } from "../../index";
import type { ImageBlock } from "../../mappers/article";

interface Props {
  path: string;
  index?: string;
  articles: ArticleWithContent[];
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
      if (value.src) {
        items.push({ type: "image", image: value });
      }
    } else {
      for (const text of value) {
        items.push({ type: "paragraph", text });
      }
    }
  }
  return items;
}

const FONT_SIZES = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0];
const DEFAULT_FONT_SIZE = 1.2;

function getStoredFontSize(): number {
  if (typeof localStorage === "undefined") return DEFAULT_FONT_SIZE;
  const stored = localStorage.getItem("fontSize");
  return stored ? parseFloat(stored) : DEFAULT_FONT_SIZE;
}

export function ArticleDetail({ index, articles }: Props) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [itemsPerPage, setItemsPerPage] = useState(1);
  const [fontSize, setFontSize] = useState(getStoredFontSize);
  const [showControls, setShowControls] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const historyStack = useRef<number[]>([]);

  const article = index ? articles[Number(index)] : undefined;
  const contentItems = article ? getContentItems(article.content) : [];
  const heroImage = article?.multimedia?.[0];

  const calculateItemsPerPage = useCallback(() => {
    if (!contentRef.current || currentIndex < 0) return;

    const availableHeight = window.innerHeight * 0.8;
    let totalHeight = 0;
    let count = 0;

    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = "position:absolute;visibility:hidden;width:" + contentRef.current.clientWidth + "px";
    document.body.appendChild(tempDiv);

    for (let i = currentIndex; i < contentItems.length; i++) {
      const item = contentItems[i];
      if (!item || item.type === "image") break;

      const p = document.createElement("p");
      p.textContent = item.text;
      p.style.cssText = `font-size:${fontSize}rem;line-height:1.6;margin-bottom:1em`;
      tempDiv.appendChild(p);

      const height = p.offsetHeight;
      if (totalHeight + height > availableHeight && count > 0) break;

      totalHeight += height;
      count++;
    }

    document.body.removeChild(tempDiv);
    setItemsPerPage(Math.max(1, count));
  }, [currentIndex, contentItems, fontSize]);

  useEffect(() => {
    calculateItemsPerPage();
    window.addEventListener("resize", calculateItemsPerPage);
    return () => window.removeEventListener("resize", calculateItemsPerPage);
  }, [calculateItemsPerPage]);

  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".text-controls")) return;

    const x = e.clientX;
    const width = window.innerWidth;

    if (x < width * 0.3) {
      setShowControls(false);
      navigatePrev();
    } else if (x > width * 0.7) {
      setShowControls(false);
      navigateNext();
    } else {
      setShowControls(!showControls);
    }
  };

  const changeFontSize = (delta: number) => {
    const currentIdx = FONT_SIZES.indexOf(fontSize);
    const newIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, currentIdx + delta));
    const newSize = FONT_SIZES[newIdx];
    setFontSize(newSize);
    localStorage.setItem("fontSize", String(newSize));
  };

  const navigatePrev = () => {
    const prevIndex = historyStack.current.pop();
    if (prevIndex === undefined) {
      window.location.href = "/";
      return;
    }
    setCurrentIndex(prevIndex);
  };

  const navigateNext = () => {
    historyStack.current.push(currentIndex);

    if (currentIndex === -1) {
      setCurrentIndex(0);
      return;
    }

    const currentItem = contentItems[currentIndex];

    if (currentItem?.type === "image") {
      const next = currentIndex + 1;
      if (next >= contentItems.length) {
        window.location.href = "/";
        return;
      }
      setCurrentIndex(next);
      return;
    }

    // Skip past current paragraphs
    let nextIndex = currentIndex;
    let itemsShown = 0;

    while (nextIndex < contentItems.length && itemsShown < itemsPerPage) {
      const item = contentItems[nextIndex];
      if (item?.type === "image") break;
      if (item?.type === "paragraph") itemsShown++;
      nextIndex++;
    }

    if (nextIndex >= contentItems.length) {
      window.location.href = "/";
      return;
    }

    setCurrentIndex(nextIndex);
  };

  if (!article) {
    return <p>Article not found</p>;
  }

  // Cover page
  if (currentIndex === -1) {
    return (
      <div class="reader-page" onClick={handleClick}>
        <div class="cover-page">
          <h1>{article.title}</h1>
          <p class="byline">{article.byline}</p>
          <p class="abstract">{article.abstract}</p>
          {heroImage && (
            <figure class="hero-image">
              <img src={heroImage.url} alt={article.title} />
            </figure>
          )}
        </div>
        <div class="nav-hint">Tap right to continue</div>
      </div>
    );
  }

  const currentItem = contentItems[currentIndex];

  // Image page
  if (currentItem?.type === "image") {
    return (
      <div class="reader-page" onClick={handleClick}>
        <figure class="full-image">
          <img src={currentItem.image.src} alt={currentItem.image.alt} />
          {currentItem.image.caption && <figcaption>{currentItem.image.caption}</figcaption>}
          {currentItem.image.credit && <span class="credit">{currentItem.image.credit}</span>}
        </figure>
      </div>
    );
  }

  // Text page - show paragraphs that fit
  const paragraphsToShow: string[] = [];
  let idx = currentIndex;
  while (idx < contentItems.length && paragraphsToShow.length < itemsPerPage) {
    const item = contentItems[idx];
    if (item?.type === "image") break;
    if (item?.type === "paragraph") paragraphsToShow.push(item.text);
    idx++;
  }

  return (
    <div class="reader-page" onClick={handleClick} ref={contentRef}>
      {showControls && (
        <div class="text-controls">
          <button onClick={() => changeFontSize(-1)} disabled={fontSize === FONT_SIZES[0]}>
            A-
          </button>
          <span>{Math.round(fontSize * 100)}%</span>
          <button onClick={() => changeFontSize(1)} disabled={fontSize === FONT_SIZES[FONT_SIZES.length - 1]}>
            A+
          </button>
        </div>
      )}
      <div class="text-page" style={{ fontSize: `${fontSize}rem` }}>
        {paragraphsToShow.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </div>
    </div>
  );
}
