# Self-hosted fonts

Both families are licensed under the **SIL Open Font License 1.1**, which
permits self-hosting and redistribution but requires the licence and copyright
notice to travel with the files. Those are in `licenses/`:

| Family | Licence file | Copyright |
| --- | --- | --- |
| Fraunces | `licenses/Fraunces-OFL.txt` | Copyright 2018 The Fraunces Project Authors |
| Source Sans 3 | `licenses/SourceSans3-LICENSE.md` | Copyright 2010-2024 Adobe, with Reserved Font Name 'Source' |

Neither family is renamed or modified here, so no Reserved Font Name applies to
what we serve.

## Where these binaries came from

Fetched on **2026-09-04** from the Google Fonts CSS API v2, which is a
redistributor of the upstream OFL projects. The version segment in each
`fonts.gstatic.com` path is Google's own family revision, not an upstream
release tag.

| Family | Google family revision | Upstream project |
| --- | --- | --- |
| Fraunces | `v38` | https://github.com/undercasetype/Fraunces |
| Source Sans 3 | `v19` | https://github.com/adobe-fonts/source-sans |

The two CSS requests used:

```
https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,100..900,0..100,0..1;1,9..144,100..900,0..100,0..1&display=swap
https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@200..900&display=swap
```

Both were requested with a current-Chrome User-Agent so the API returns woff2.
Only the `latin` and `latin-ext` subsets are kept; the `unicode-range` values in
`css/styles.css` are copied verbatim from that CSS so subsetting behaves exactly
as it did when Google served the files.

## Why the variable files

`css/styles.css` drives Fraunces through its `opsz`, `SOFT` and `WONK` axes
(`font-variation-settings` on the headings). Static per-weight files do not
carry those axes, so swapping them in would silently change how every heading
renders. Keep these variable builds.

Axes present, confirmed with fontTools:

- Fraunces (upright and italic): `opsz` 9–144, `wght` 100–900, `SOFT` 0–100, `WONK` 0–1
- Source Sans 3: `wght` 200–900

Source Sans 3 italic is deliberately absent: nothing in the CSS asks for it.

## Checksums

```
356dfdbe2d7f1edde716c37ca63df364afeb058e7e180fc819214293a50a74f0  fraunces-italic-latin-ext.woff2
04a14ea380db53a35a3ec651934b21061234685bb604d30aac82663b5d9e539b  fraunces-italic-latin.woff2
e9521563d0935c9bda4277e242cc88c75993a77878f5f7eed537989e94f976c9  fraunces-normal-latin-ext.woff2
7e744849028e2219e2aa1bc467dc4032980dc4487c9c3da3010081cd72d3b103  fraunces-normal-latin.woff2
a85a7459bdb3cdc1136751e151a506bae653fc29ada3ca86237477df6f1b59e6  source-sans-3-normal-latin-ext.woff2
7a19a7027e125257d310c6dbd78ae3a30b5ea1e3794d60b12bb28227a003bfda  source-sans-3-normal-latin.woff2
```

## Updating

Re-run the two CSS requests above, keep `latin` and `latin-ext`, refresh the
`unicode-range` blocks at the top of `css/styles.css` if they changed, and
update the revisions and checksums here. Re-check the Fraunces axes before
committing — a build without `SOFT`/`WONK` will change the headings.
