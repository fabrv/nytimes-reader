import index from "./ui/index.html";

const date = new Date().toISOString().split("T")[0];
const dataPath = `./articles/${date}/data.json`;
const dataFile = Bun.file(dataPath);

if (!(await dataFile.exists())) {
  console.error(`No data file found at ${dataPath}. Run the fetcher first.`);
  process.exit(1);
}

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": index,
    "/article/*": index,
    "/data.json": new Response(dataFile, {
      headers: { "Content-Type": "application/json" },
    }),
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at http://localhost:${server.port}`);
