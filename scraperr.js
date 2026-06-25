const https = require("https");

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { 
      headers: { 
        "User-Agent": "GleanHub",
        "Accept": "application/vnd.github+json",
        "Authorization": `token ${process.env.GITHUB_TOKEN}`
      } 
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // 用GitHub搜索API找今日最热门仓库
  const result = await get("https://api.github.com/search/repositories?q=stars:%3E1000&sort=stars&order=desc&per_page=10");
  const data = JSON.parse(result);
  console.log("API返回:", JSON.stringify(data).slice(0, 500));
  
  const repos = data.items.map(r => ({
    author: r.owner.login,
    name: r.name,
    url: r.html_url,
    description: r.description || "",
    stars: r.stargazers_count
  }));

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPOSITORY.split("/")[0];
  const repo = process.env.GITHUB_REPOSITORY.split("/")[1];
  const content = Buffer.from(JSON.stringify(repos, null, 2)).toString("base64");

  let sha;
  try {
    const existing = await get(`https://api.github.com/repos/${owner}/${repo}/contents/trending.json`);
    sha = JSON.parse(existing).sha;
  } catch (e) {}

  const body = JSON.stringify({
    message: `Update trending ${new Date().toISOString().slice(0, 10)}`,
    content,
    ...(sha ? { sha } : {})
  });

  await request({
    hostname: "api.github.com",
    path: `/repos/${owner}/${repo}/contents/trending.json`,
    method: "PUT",
    headers: {
      "Authorization": `token ${token}`,
      "User-Agent": "GleanHub",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body)
    }
  }, body);

  console.log("Done:", repos.length, "repos");
}

main();
