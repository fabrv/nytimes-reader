import { run } from "./index";
import { paginateArticle, renderArticlesList, renderArticlePage } from "./prerender";
import type { ArticleWithContent } from "./index";

const date = new Date().toISOString().split("T")[0];
const dataPath = `./articles/${date}/data.json`;
const dataFile = Bun.file(dataPath);

if (!(await dataFile.exists())) {
  console.log(`No data file found at ${dataPath}. Running fetcher...`);
  await run();
}

const articles: ArticleWithContent[] = await dataFile.json();

function html(body: string): Response {
  return new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

const server = Bun.serve({
  port: 4321,
  routes: {
    "/styles.css": new Response(Bun.file("./src/ui/styles.css"), {
      headers: { "Content-Type": "text/css" },
    }),

    "/": () => html(renderArticlesList(articles)),

    // Cover page
    "/article/:index": (req) => {
      const index = Number(req.params.index);
      const article = articles[index];
      if (!article) return notFound();
      const pages = paginateArticle(article);
      return html(renderArticlePage(article, pages, 0, index));
    },

    // Subsequent pages
    "/article/:index/page/:page": (req) => {
      const index = Number(req.params.index);
      const pageIndex = Number(req.params.page);
      const article = articles[index];
      if (!article) return notFound();
      const pages = paginateArticle(article);
      if (pageIndex < 0 || pageIndex >= pages.length) return notFound();
      return html(renderArticlePage(article, pages, pageIndex, index));
    },
  },
});

console.log(`Server running at http://localhost:${server.port}`);
