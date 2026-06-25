const https = require("https");

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "GleanHub" } }, (res) => {
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
  const html = await get("https://github.com/trending");
  const matches = [...html.matchAll(/href="\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)" data-hydro-click/g)];
  const seen = new Set();
  const repos = [];
  for (const m of matches) {
    const full = m[1];
    if (!seen.has(full) && repos.length < 10) {
      seen.add(full);
      const [author, name] = full.split("/");
      repos.push({ author, name, url: `https://github.com/${full}` });
    }
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPOSITORY.split("/")[0];
  const repo = process.env.GITHUB_REPOSITORY.split("/")[1];
  const content = Buffer.from(JSON.stringify(repos, null, 2)).toString("base64");

  // 先获取现有文件的sha
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
