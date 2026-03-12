import { mkdir } from "node:fs/promises";
import { Result } from "neverthrow";
import { fetchTopStories, fetchArticle, type Article, type FetchError, type Section } from "./services/nyt";
import { parseArticle, type ArticleContent } from "./mappers/article";
import { paginateArticle, renderArticlesList, renderArticlePage } from "./prerender";

export interface ArticleWithContent extends Article {
  content: ArticleContent;
}

async function saveArticles(articles: ArticleWithContent[]): Promise<void> {
  const date = new Date().toISOString().split("T")[0];
  const dir = `./articles/${date}`;
  await mkdir(dir, { recursive: true });

  // Articles list
  await Bun.write(`${dir}/index.html`, renderArticlesList(articles));

  // One HTML file per article page
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i]!;
    const pages = paginateArticle(article);
    const articleDir = `${dir}/article/${i}`;

    await mkdir(`${articleDir}/page`, { recursive: true });

    for (let p = 0; p < pages.length; p++) {
      const html = renderArticlePage(article, pages, p, i);
      // Cover page lives at article/{i}/index.html, rest at article/{i}/page/{p}.html
      const path = p === 0 ? `${articleDir}/index.html` : `${articleDir}/page/${p}.html`;
      await Bun.write(path, html);
    }

    console.log(`Rendered: ${article.title} (${pages.length} pages)`);
  }

  console.log(`Saved ${articles.length} articles to ${dir}`);
}

async function fetchAllArticles(section: Section = "home"): Promise<Result<ArticleWithContent, FetchError>[]> {
  const storiesResult = await fetchTopStories(section);

  if (storiesResult.isErr()) {
    console.error("Failed to fetch top stories:", storiesResult.error);
    return [];
  }

  const stories = storiesResult.value;
  console.log(`Found ${stories.num_results} stories, fetching articles concurrently...`);

  const articlePromises = stories.results.map(async (article): Promise<Result<ArticleWithContent, FetchError>> => {
    const result = await fetchArticle(article.url);

    return result.map((html) => {
      const content = html ? parseArticle(html) : {};
      console.log(`Fetched: ${article.title}`);
      return { ...article, content };
    });
  });

  return Promise.all(articlePromises);
}


export async function run() {
  const start = Bun.nanoseconds();
  
  const results = await fetchAllArticles("home");
  
  const end = Bun.nanoseconds();
  const durationMs = (end - start) / 1_000_000;
  
  const successful = results.filter((r) => r.isOk()).length;
  const failed = results.filter((r) => r.isErr()).length;
  
  console.log(`\nCompleted in ${durationMs.toFixed(2)}ms`);
  console.log(`Success: ${successful}, Failed: ${failed}`);
  
  const articles = results
    .filter((r) => r.isOk())
    .map((r) => r.value);
  
  await saveArticles(articles);
}
