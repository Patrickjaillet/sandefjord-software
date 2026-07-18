// Phase 13: fetches like (👍 reaction) and comment counts per software from
// the GitHub Discussion giscus creates for it, and stores them in
// data/software.json as `entry.engagement`. giscus is configured with
// `data-mapping="specific"` and `data-term="<software id>"`, so the
// discussion title matches the software id exactly once it's been created
// (the first time someone opens the comments and posts).
//
// Requires GITHUB_TOKEN (or GH_TOKEN) with access to read Discussions on
// this public repo — the default GITHUB_TOKEN in GitHub Actions is enough.

import { readFile, writeFile } from "node:fs/promises";

const OWNER = "Patrickjaillet";
const REPO = "sandefjord-software";
const DATA_FILE = "data/software.json";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const GRAPHQL_API = "https://api.github.com/graphql";

const SEARCH_QUERY = `
  query FindDiscussion($searchQuery: String!) {
    search(query: $searchQuery, type: DISCUSSION, first: 5) {
      nodes {
        ... on Discussion {
          title
          comments { totalCount }
          reactions(content: THUMBS_UP) { totalCount }
        }
      }
    }
  }
`;

async function graphql(query, variables) {
  const response = await fetch(GRAPHQL_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`GitHub GraphQL API failed: ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  if (json.errors) {
    throw new Error(json.errors.map((error) => error.message).join("; "));
  }
  return json.data;
}

async function fetchEngagement(softwareId) {
  const searchQuery = `repo:${OWNER}/${REPO} in:title "${softwareId}"`;
  const data = await graphql(SEARCH_QUERY, { searchQuery });
  const discussion = data.search.nodes.find((node) => node.title === softwareId);
  if (!discussion) return { likes: 0, comments: 0 };
  return {
    likes: discussion.reactions.totalCount,
    comments: discussion.comments.totalCount,
  };
}

async function sync() {
  if (!TOKEN) {
    console.warn("No GITHUB_TOKEN available; skipping engagement sync.");
    return;
  }

  const catalog = JSON.parse(await readFile(DATA_FILE, "utf8"));

  for (const item of catalog.software) {
    try {
      item.engagement = await fetchEngagement(item.id);
    } catch (error) {
      console.error(`Failed to sync engagement for ${item.id}: ${error.message}`);
    }
  }

  await writeFile(DATA_FILE, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log("Engagement sync complete.");
}

sync().catch((error) => {
  console.error(error);
  process.exit(1);
});
