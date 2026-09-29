---
hideReadTime: true
title: Glossary
description: Plain-English explanations of the terms, abbreviations and test names you'll come across with ME/CFS.
---

<div data-filterable>
<div class="filters" style="grid-template-columns:1fr">
<div>
<label for="g-q">Find a term</label>
<input id="g-q" type="search" data-filter="text" placeholder="e.g. PEM, LDN, HRV">
</div>
</div>
<p class="filter-count" data-count data-noun="terms" aria-live="polite"></p>
<div class="listing">
{%- for g in glossary %}
<div class="item-card" data-item>
<h3 style="margin:0 0 .2rem">{{ g.term }}</h3>
<p style="margin:0">{{ g.meaning | md | safe }}</p>
</div>
{%- endfor %}
</div>
<div class="callout callout-note" data-empty hidden><p>No matching terms. <button class="btn btn-sm btn-soft" type="button" data-reset>Clear</button></p></div>
</div>
