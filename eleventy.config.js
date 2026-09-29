import markdownIt from "markdown-it";

const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/<span class="ev[^>]*>[^<]*<\/span>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const EVIDENCE = {
  rct: { label: "RCT", title: "Randomised, placebo-controlled trial" },
  controlled: { label: "Controlled", title: "Has a comparison group but not fully randomised or blinded" },
  open: { label: "Open-label", title: "No placebo group; patients and doctors know what is given" },
  lab: { label: "Lab study", title: "Cells in a dish. Not a clinical outcome" },
  adjacent: { label: "Adjacent field", title: "Evidence from Long COVID, POTS, fibromyalgia etc., not ME/CFS directly" },
  hypothesis: { label: "Hypothesis", title: "Proposed mechanism, not yet tested" },
  observational: { label: "Observational", title: "Watches patients without assigning a treatment" },
};

export default function (eleventyConfig) {
  const md = markdownIt({ html: true, linkify: true, typographer: true });

  // Give every h2/h3 an id so pages can be deep-linked and get an "On this page" list.
  md.core.ruler.push("heading_ids", (state) => {
    const seen = {};
    state.tokens.forEach((tok, i) => {
      if (tok.type !== "heading_open" || !["h2", "h3"].includes(tok.tag)) return;
      let id = slug(state.tokens[i + 1].content);
      seen[id] = (seen[id] || 0) + 1;
      if (seen[id] > 1) id += `-${seen[id]}`;
      tok.attrSet("id", id);
    });
  });

  // Open external links in the same tab (accessibility) but mark them.
  const defaultLinkOpen =
    md.renderer.rules.link_open || ((tokens, idx, opts, env, self) => self.renderToken(tokens, idx, opts));
  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    const href = tokens[idx].attrGet("href") || "";
    if (/^https?:\/\//.test(href)) {
      tokens[idx].attrSet("rel", "noopener");
      tokens[idx].attrJoin("class", "ext");
    }
    return defaultLinkOpen(tokens, idx, opts, env, self);
  };

  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/static": "/" });

  // {% callout "brief", "Optional title" %}markdown{% endcallout %}
  eleventyConfig.addPairedShortcode("callout", (content, kind = "note", title = "") => {
    const heading = title ? `<p class="callout-title">${title}</p>` : "";
    return `<aside class="callout callout-${kind}">${heading}${md.render(content.trim())}</aside>`;
  });

  // Markdown block inside .njk templates
  eleventyConfig.addPairedShortcode("markdown", (content) => md.render(content.replace(/^[ \t]+/gm, "")));

  // {% ev "rct" %}
  eleventyConfig.addShortcode("ev", (key) => {
    const e = EVIDENCE[key];
    if (!e) throw new Error(`Unknown evidence label: ${key}`);
    return `<span class="ev ev-${key}" title="${e.title}">${e.label}</span>`;
  });

  eleventyConfig.addFilter("md", (s) => (s ? md.renderInline(String(s)) : ""));
  eleventyConfig.addFilter("slug", slug);

  eleventyConfig.addFilter("readableDate", (d) => {
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  });

  // Build an "On this page" list from the rendered h2s.
  eleventyConfig.addFilter("toc", (html) => {
    const items = [];
    const re = /<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g;
    let m;
    while ((m = re.exec(html || ""))) items.push({ id: m[1], text: m[2].replace(/<[^>]+>/g, "") });
    return items;
  });

  eleventyConfig.addFilter("readingTime", (html) => {
    const words = String(html || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.round(words / 200))} min`;
  });

  eleventyConfig.addFilter("unique", (arr) => [...new Set(arr)].sort());
  eleventyConfig.addFilter("flatMap", (arr, key) => arr.flatMap((x) => x[key] || []));

  eleventyConfig.addFilter("upcoming", (list, today) =>
    list.filter((c) => (c.end_date || c.start_date) >= today).sort((a, b) => a.start_date.localeCompare(b.start_date))
  );
  eleventyConfig.addFilter("past", (list, today) =>
    list.filter((c) => (c.end_date || c.start_date) < today).sort((a, b) => b.start_date.localeCompare(a.start_date))
  );

  // Wrap tables so they scroll sideways on phones instead of breaking the page.
  eleventyConfig.addTransform("wrapTables", (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    return content
      .replace(/<table>/g, '<div class="table-wrap" tabindex="0"><table>')
      .replace(/<\/table>/g, "</table></div>");
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
