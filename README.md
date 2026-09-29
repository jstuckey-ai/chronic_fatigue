# chronicfatigue.support

A static website with plain-language information about ME/CFS, current research, and the clinical trials and conferences happening around the world.

Built with [Eleventy](https://www.11ty.dev/). Site search uses [Pagefind](https://pagefind.app/).

## Run it locally

```bash
npm install
npm start          # dev server with live reload at http://localhost:8080 (search won't work in this mode)
npm run preview    # full build including the search index, served at http://localhost:8080
```

`npm run build` writes the finished site to `_site/`.

## Where things live

| What | File |
|---|---|
| Content pages (Markdown) | `src/understanding/`, `src/living/`, `src/treatment/`, `src/research/`, `src/support/` |
| Home page | `src/index.njk` |
| **Clinical trials list** | `src/_data/trials.json` |
| **Conferences & events** | `src/_data/conferences.json` |
| Glossary terms | `src/_data/glossary.json` |
| Navigation menu | `src/_data/nav.json` |
| Site name, "last reviewed" date, contact email | `src/_data/site.json` |
| Styles / colours | `src/assets/css/style.css` |

### Updating trials

Each entry in `trials.json` becomes a card on `/research/trials/`. `status` must be one of `recruiting`, `not-yet`, `active`, `invite` or `unknown`. Set `verified` to `false` to show a "not yet confirmed" note. The country and type filters build themselves from the data.

### Updating conferences

Events move from "Upcoming" to "Past" automatically, based on `today` in `site.json`. Update that date whenever you review content. Set `date_precise: false` for events without a confirmed date.

### Page features (Markdown)

- `brief:` in a page's front matter adds the "In brief" summary box.
- `{% ev "rct" %}` adds an evidence label. The options are `rct`, `controlled`, `open`, `observational`, `lab`, `adjacent` and `hypothesis`.
- `{% callout "tip", "Title" %}...{% endcallout %}` adds a callout box. The kinds are `note`, `tip`, `warn`, `stop`, `key` and `brief`.

## Deploying (Cloudflare)

The site deploys as a Cloudflare Worker with static assets. The config is in `wrangler.jsonc`.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Node version: 22 (set in `.nvmrc`)

Once the GitHub repo is connected in Cloudflare, every push to `main` rebuilds and redeploys the site. The custom domain `chronicfatigue.support` is attached under the Worker's **Settings → Domains & Routes**.

The source research files in `/files` are git-ignored and never published.
