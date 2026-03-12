import { run } from "./index";

const date = new Date().toISOString().split("T")[0];
const dir = `./articles/${date}`;

if (!(await Bun.file(`${dir}/index.html`).exists())) {
  console.log(`No data found for ${date}. Running fetcher...`);
  await run();
}

const server = Bun.serve({
  port: 4321,
  routes: {
    "/styles.css": new Response(Bun.file("./src/ui/styles.css"), {
      headers: { "Content-Type": "text/css" },
    }),
  },
  fetch(req) {
    const segments = new URL(req.url).pathname.split("/").filter(Boolean);
    // /                        → index.html
    // /article/N               → article/N/index.html
    // /article/N/page/P        → article/N/page/P.html
    const filePath = segments.length === 0
      ? `${dir}/index.html`
      : segments.length <= 2
        ? `${dir}/${segments.join("/")}/index.html`
        : `${dir}/${segments.join("/")}.html`;

    return new Response(Bun.file(filePath), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`Server running at http://localhost:${server.port}`);
