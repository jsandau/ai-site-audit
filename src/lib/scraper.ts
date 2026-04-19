// src/lib/scraper.ts
// Strategy: try plain fetch first (fast), fall back to Puppeteer for JS-heavy sites.
// If both fail, return partial data so the audit can still run with whatever we got.

export interface ScrapedData {
  url: string;
  pageTitle: string;
  metaDesc: string;
  metaKeywords: string;
  h1s: string[];
  h2s: string[];
  bodyText: string;
  internalLinks: string[];
  externalLinks: string[];
  imageCount: number;
  imagesWithoutAlt: number;
  hasSSL: boolean;
  loadMethod: "fetch" | "puppeteer" | "failed";
  error?: string;
}

export async function scrapeWebsite(url: string): Promise<ScrapedData> {
  // Normalize URL
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  // Try fast fetch first
  try {
    return await scrapeWithFetch(normalizedUrl);
  } catch (fetchError) {
    console.log("Fetch scrape failed, trying Puppeteer:", fetchError);
  }

  // Fallback to Puppeteer (handles JS-rendered sites)
  try {
    return await scrapeWithPuppeteer(normalizedUrl);
  } catch (puppeteerError) {
    console.log("Puppeteer scrape also failed:", puppeteerError);
  }

  // Both failed — return minimal stub so AI can still run
  return {
    url: normalizedUrl,
    pageTitle: "",
    metaDesc: "",
    metaKeywords: "",
    h1s: [],
    h2s: [],
    bodyText: "",
    internalLinks: [],
    externalLinks: [],
    imageCount: 0,
    imagesWithoutAlt: 0,
    hasSSL: normalizedUrl.startsWith("https"),
    loadMethod: "failed",
    error: "Could not access this website. It may be blocking automated requests.",
  };
}

async function scrapeWithFetch(url: string): Promise<ScrapedData> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SiteAuditBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return parseHtml(html, url, "fetch");
}

async function scrapeWithPuppeteer(url: string): Promise<ScrapedData> {
  // Dynamic import so Puppeteer only loads when needed
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (compatible; SiteAuditBot/1.0)"
    );
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
    const html = await page.content();
    return parseHtml(html, url, "puppeteer");
  } finally {
    await browser.close();
  }
}

function parseHtml(
  html: string,
  url: string,
  loadMethod: "fetch" | "puppeteer"
): ScrapedData {
  // Use regex-based parsing (no DOM dependency in Node)
  const getTag = (tag: string) =>
    html.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"))?.[1]?.trim() ?? "";

  const getMeta = (name: string) =>
    html.match(
      new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, "i")
    )?.[1] ??
    html.match(
      new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, "i")
    )?.[1] ??
    "";

  const getAll = (tag: string) => {
    const matches = [...html.matchAll(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "gi"))];
    return matches.map((m) => m[1].trim()).filter(Boolean);
  };

  // Strip HTML tags for body text
  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000); // Cap at 5k chars to keep prompt manageable

  // Count images and missing alts
  const allImages = [...html.matchAll(/<img[^>]*/gi)];
  const imageCount = allImages.length;
  const imagesWithoutAlt = allImages.filter(
    (m) => !m[0].includes("alt=") || m[0].includes('alt=""')
  ).length;

  // Extract links
  const allLinks = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const urlObj = new URL(url);
  const internalLinks = allLinks.filter(
    (l) => l.startsWith("/") || l.includes(urlObj.hostname)
  );
  const externalLinks = allLinks.filter(
    (l) => l.startsWith("http") && !l.includes(urlObj.hostname)
  );

  return {
    url,
    pageTitle: getTag("title"),
    metaDesc: getMeta("description"),
    metaKeywords: getMeta("keywords"),
    h1s: getAll("h1"),
    h2s: getAll("h2"),
    bodyText,
    internalLinks: [...new Set(internalLinks)].slice(0, 20),
    externalLinks: [...new Set(externalLinks)].slice(0, 20),
    imageCount,
    imagesWithoutAlt,
    hasSSL: url.startsWith("https"),
    loadMethod,
  };
}
