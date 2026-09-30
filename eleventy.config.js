import markdownIt from "markdown-it";
import fs from "node:fs";

const readData = (name) => JSON.parse(fs.readFileSync(`src/_data/${name}.json`, "utf8"));

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

  const isoDate = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d || "").slice(0, 10));
  eleventyConfig.addFilter("isoDate", isoDate);

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


  // ---------- Structured data (JSON-LD) for search engines and AI assistants ----------
  const CONDITION = {
    "@type": "MedicalCondition",
    name: "Myalgic encephalomyelitis/chronic fatigue syndrome",
    alternateName: ["ME/CFS", "ME", "CFS", "Chronic fatigue syndrome", "Myalgic encephalomyelitis", "Systemic exertion intolerance disease"],
    code: [
      { "@type": "MedicalCode", code: "G93.3", codingSystem: "ICD-10" },
      { "@type": "MedicalCode", code: "8E49", codingSystem: "ICD-11" },
    ],
    sameAs: "https://en.wikipedia.org/wiki/Myalgic_encephalomyelitis/chronic_fatigue_syndrome",
  };
  const STATUS = {
    recruiting: "https://schema.org/Recruiting",
    "not-yet": "https://schema.org/NotYetRecruiting",
    active: "https://schema.org/ActiveNotRecruiting",
    invite: "https://schema.org/EnrollingByInvitation",
  };
  const plain = (s) => String(s || "").replace(/\*\*|__|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  eleventyConfig.addShortcode("structuredData", function (url, title, seoTitle, description, reviewed, schemaType) {
    const site = readData("site");
    const nav = readData("nav");
    const abs = site.url + url;
    const website = { "@type": "WebSite", "@id": `${site.url}/#website`, url: `${site.url}/`, name: site.name, description: site.tagline, inLanguage: site.lang };
    const graph = [];

    const pageNode = {
      "@type": schemaType === "FAQPage" ? ["FAQPage", "MedicalWebPage"] : "MedicalWebPage",
      "@id": `${abs}#webpage`,
      url: abs,
      name: seoTitle || title || site.name,
      headline: title || site.name,
      description: description || site.tagline,
      inLanguage: site.lang,
      isPartOf: { "@id": `${site.url}/#website` },
      about: CONDITION,
      audience: [{ "@type": "Patient" }, { "@type": "PeopleAudience", audienceType: "Carers and family" }],
      lastReviewed: isoDate(reviewed || site.lastReviewed),
      dateModified: isoDate(reviewed || site.lastReviewed),
    };

    if (url === "/") {
      website.potentialAction = { "@type": "SearchAction", target: `${site.url}/search/?q={search_term_string}`, "query-input": "required name=search_term_string" };
      graph.push(website);
    }

    // Breadcrumbs
    const crumbs = [{ name: "Home", url: "/" }];
    for (const sec of nav) {
      if (url !== "/" && url.startsWith(sec.url)) {
        if (sec.url !== url) crumbs.push({ name: sec.title, url: sec.url });
        const item = sec.items.find((i) => i.url === url);
        crumbs.push({ name: item ? item.title : title, url });
        break;
      }
    }
    if (crumbs.length > 1) {
      graph.push({
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: site.url + c.url })),
      });
    }

    if (schemaType === "FAQPage") {
      pageNode.mainEntity = readData("faq").map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a, url: site.url + f.link },
      }));
    }

    if (url === "/research/trials/") {
      pageNode.mainEntity = {
        "@type": "ItemList",
        name: "ME/CFS and related clinical trials and studies",
        itemListElement: readData("trials").map((t, i) => {
          const trial = {
            "@type": t.typeList.some((x) => /observational|registry|genetics/i.test(x)) ? "MedicalObservationalStudy" : "MedicalTrial",
            name: t.name,
            description: plain(t.summary),
            url: `${abs}#${t.id}`,
            healthCondition: { "@type": "MedicalCondition", name: t.condition },
          };
          if (STATUS[t.status]) trial.status = STATUS[t.status];
          if (t.sponsor) trial.sponsor = { "@type": "Organization", name: t.sponsor };
          if (t.locations) trial.studyLocation = { "@type": "AdministrativeArea", name: `${t.locations} (${t.countries.join(", ")})` };
          if (t.registry_id) trial.identifier = t.registry_id;
          if (t.registry_url) trial.sameAs = t.registry_url;
          return { "@type": "ListItem", position: i + 1, item: trial };
        }),
      };
    }

    if (url === "/support/glossary/") {
      pageNode.mainEntity = {
        "@type": "DefinedTermSet",
        name: "ME/CFS glossary",
        hasDefinedTerm: readData("glossary").map((g) => ({ "@type": "DefinedTerm", name: g.term, description: plain(g.meaning) })),
      };
    }

    graph.push(pageNode);
    const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
    return `<script type="application/ld+json">${json}</script>`;
  });

  // Plain text version of rendered HTML, for llms-full.txt
  eleventyConfig.addFilter("toPlainText", (html) => {
    return String(html || "")
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "")
      .replace(/<select[\s\S]*?<\/select>|<label[\s\S]*?<\/label>|<button[\s\S]*?<\/button>|<input[^>]*>/g, "")
      .replace(/<p class="filter-count"[^>]*><\/p>/g, "")
      .replace(/<span class="chip[^"]*">([^<]*)<\/span>\s*/g, "[$1] ")
      .replace(/<span class="ev[^>]*>([^<]*)<\/span>/g, "[$1]")
      .replace(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/g, (m, l, t) => `\n\n${"#".repeat(Number(l))} ${t.replace(/<[^>]+>/g, "").trim()}\n`)
      .replace(/<li[^>]*>/g, "\n- ")
      .replace(/<\/(p|div|ul|ol|table|aside|section|article|dl)>/g, "\n")
      .replace(/<tr[^>]*>/g, "\n")
      .replace(/<\/t[dh]>/g, " | ")
      .replace(/<(dt)[^>]*>/g, "\n")
      .replace(/<\/dt>/g, ": ")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (m, href, t) => {
        const text = t.replace(/<[^>]+>/g, "").trim();
        const link = href.startsWith("/") ? readData("site").url + href : href;
        return href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") ? text : `${text} (${link})`;
      })
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&nbsp;/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  });


  // ---------- Citations ----------
  // {% ref "decodeme-2025" %} renders a numbered superscript link and collects the
  // reference for a per-page list rendered by {% refList %} in the page layout.
  const refStore = new Map(); // inputPath -> [ids]
  eleventyConfig.on("eleventy.before", () => refStore.clear());
  eleventyConfig.addShortcode("ref", function (...ids) {
    const refs = readData("references");
    const key = this.page.inputPath;
    if (!refStore.has(key)) refStore.set(key, []);
    const list = refStore.get(key);
    const out = ids.map((id) => {
      const r = refs[id];
      if (!r) throw new Error(`Unknown reference id "${id}" in ${key}`);
      let n = list.indexOf(id);
      if (n === -1) { list.push(id); n = list.length - 1; }
      const label = [r.author, r.year].filter(Boolean).join(" ");
      return `<a href="#ref-${n + 1}" id="cite-${n + 1}-${Math.random().toString(36).slice(2, 6)}" class="cite" title="${(label + ": " + r.title).replace(/"/g, "&quot;")}">${n + 1}</a>`;
    });
    return `<sup class="cites">${out.join(",")}</sup>`;
  });
  eleventyConfig.addShortcode("refList", function () {
    const refs = readData("references");
    const list = refStore.get(this.page.inputPath) || [];
    if (!list.length) return "";
    const items = list.map((id, i) => {
      const r = refs[id];
      const meta = [r.author, r.journal ? `<i>${r.journal}</i>` : "", r.year].filter(Boolean).join(", ");
      const kind = r.type ? ` <span class="ev ev-${r.type}">${{ rct: "RCT", controlled: "Controlled", open: "Open-label", observational: "Observational", lab: "Lab study", adjacent: "Adjacent field", hypothesis: "Hypothesis", guideline: "Guideline", report: "Report", registry: "Registry", news: "News" }[r.type] || r.type}</span>` : "";
      return `<li id="ref-${i + 1}"><a href="${r.url}" rel="noopener">${r.title}</a>${kind}<br><span class="ref-meta">${meta}${r.note ? `. ${r.note}` : ""}</span></li>`;
    });
    return `<section class="references" aria-labelledby="references-heading"><h2 id="references-heading">References</h2><ol class="ref-list">${items.join("")}</ol></section>`;
  });

  // Plain-text outputs (llms.txt) shouldn't contain HTML entities.
  eleventyConfig.addTransform("decodeTxt", (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".txt")) return content;
    return content
      .replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
      .replace(/\n- ([^\n]*)\n\n(?=- )/g, "\n- $1\n");
  });

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
