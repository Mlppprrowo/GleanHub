const https = require("https");
const fs = require("fs");

function fetchTrending() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "github.com",
      path: "/trending",
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    };

    https.get(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function parse(html) {
  const repos = [];
  const regex = /href="\/([^"]+\/[^"]+)" data-hydro-click/g;
  const descRegex = /<p class="col-9[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/p>/g;
  const starsRegex = /aria-label="([0-9,]+) users starred this repository"/g;

  let match;
  const seen = new Set();

  while ((match = regex.exec(html)) !== null) {
    const fullName = match[1];
    if (!seen.has(fullName) && !fullName.includes("/pulse") && repos.length < 10) {
      seen.add(fullName);
      const [author, name] = fullName.split("/");
      repos.push({
        author,
        name,
        url: `https://github.com/${fullName}`,
        description: "",
        stars: ""
      });
    }
  }

  return repos;
}

async function main() {
  const html = await fetchTrending();
  const repos = parse(html);
  fs.writeFileSync("trending.json", JSON.stringify(repos, null, 2));
  console.log("Done, wrote", repos.length, "repos");
}

main();
