# Capcon Engineering: brand notes

Gathered 2026-10-05.

## Status: brand colours NOT VERIFIED
Every route to the site's real assets was blocked by the egress proxy:
- `capconeng.com`: blocked (per caller)
- `web.archive.org` (WebFetch and curl): blocked (`CONNECT tunnel failed, 403`; WebFetch says "unable to fetch from web.archive.org")
- Third-party pages (buildingirelandmagazine.com, directory.enterprise-ireland.com): blocked
- Web search for brand colours / logo returned nothing relevant (only unrelated "Cap*" companies).

So **no hex codes could be verified**. I have not guessed any. No Elementor `--e-global-color-*` variables, theme CSS or font declarations could be read.

## Palette
| Role | Hex | Evidence | Confidence |
|---|---|---|---|
| (all) | none verified | none obtainable | n/a |

Weak indirect hints only, not colour evidence: the logo file is named `CapCon-Engineering-Colour-White-Text-Logo-1.svg`. That suggests (a) the primary logo has a **coloured mark plus white wordmark text**, meant for a **dark header/background**, and (b) the brand styles itself "CapCon" in the logo. Exact colours are unknown.

## Fonts
Not verified. The site is WordPress with Elementor (inferred from the `/wp-content/uploads/` paths and the caller's note). Font families could not be read.

## Logo files
- `public/brand/capcon-logo-white.svg`: **NOT saved** (download blocked)
- `public/brand/capcon-square.png`: **NOT saved** (download blocked)
- `public/brand/capcon-logo-dark.svg`: **NOT created** (no source SVG to recolour)

Known asset URLs, for when access is available:
- https://capconeng.com/wp-content/uploads/CapCon-Engineering-Colour-White-Text-Logo-1.svg
- https://capconeng.com/wp-content/uploads/cropped-Capcon_sq-300x300.png (site icon)
- Raw archive form: `https://web.archive.org/web/2025id_/<url>`

## How to verify (needs a machine with normal internet)
1. `curl -sL https://capconeng.com/ | grep -oE -- '--e-global-color-[a-z0-9]+:#[0-9A-Fa-f]{3,8}'`
2. `curl -sL https://capconeng.com/ | grep -oE 'post-[0-9]+\.css'`, then fetch `/wp-content/uploads/elementor/css/post-<id>.css` (the kit CSS) for colours and `--e-global-typography-*-font-family`.
3. Download the SVG above and read its `fill=` values. These are the authoritative logo colours.
4. Or ask Capcon (Heidi Jermyn, Marketing & Communications) for brand guidelines.

## Recommendation for the demo
Use a clearly neutral placeholder palette defined as CSS tokens so the real values can be swapped in once verified. Don't present any colour as "Capcon's brand" until one of the checks above is done.
