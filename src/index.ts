import { mkdir } from "node:fs/promises";
import { Result } from "neverthrow";
import { fetchTopStories, fetchArticle, type Article, type FetchError, type Section } from "./services/nyt";
import { parseArticle, type ArticleContent } from "./mappers/article";

export interface ArticleWithContent extends Article {
  content: ArticleContent;
}

async function saveArticles(articles: ArticleWithContent[]): Promise<void> {
  const date = new Date().toISOString().split("T")[0];
  const dir = `./articles/${date}`;
  await mkdir(dir, { recursive: true });
  const path = `${dir}/data.json`;
  await Bun.write(path, JSON.stringify(articles, null, 2));
  console.log(`Saved ${articles.length} articles to ${path}`);
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
