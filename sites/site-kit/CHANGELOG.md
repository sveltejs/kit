# @sveltejs/site-kit changelog

## 2.1.4

- Decouple from SvelteKit ([#390](https://github.com/sveltejs/sites/pull/390))

## 2.1.3

- Remove `<Hero>` component
- Improve image caching
- Update dependencies

## 2.1.2

- Fix `<Hero>` component

## 2.1.1

- Update `<Hero>` component
- Remove `sveltekit:prefetch`

## 2.1.0

- Tweak sidebar styles

## 2.0.3

- Revert CSS logical properties change, which breaks in some browsers ([#303](https://github.com/sveltejs/sites/pull/303))

## 2.0.2

- Add `id` attributes to `<h2>` elements, instead of using offset anchors

## 2.0.1

- Remove `z-index` from `<ul>` in nav component

## 2.0.0

- New `latest` version

## 2.0.0-next.7

- Rebuilt using SvelteKit
- Shipped with declaration files
- Added `<SkipLink>`
- Various

## 2.0.0-next.6

- Remove some problematic CSS

## 2.0.0-next.5

- Tweak docs `h1` styles

## 2.0.0-next.4

- Fix home link
- Centralise more styles and icons
- Allow headings to have their own `id` attributes
- Add permalinks dynamically
- Support more flexible doc data sources

## 2.0.0-next.3

- Move nav styles out of app into `<Nav>` component
- add some common icons

## 2.0.0-next.2

- Fix exports

## 2.0.0-next.1

- Various

## 2.0.0-next.0

### Major Changes

- Change slug generation logic, tweak some styles

## 1.2.5

- Fix menu scrolling behaviour ([#29](https://github.com/sveltejs/site-kit/pull/29))

## 1.2.4

- Fix anchor placements ([#28](https://github.com/sveltejs/site-kit/pull/28))

## 1.2.3

- Fix iOS input styles ([#23](https://github.com/sveltejs/site-kit/pull/23))

## 1.2.2

- Use `dir` prop to `<Docs>` component in constructing nav links

## 1.2.1

- Add `diff` language

## 1.2.0

- Add `noopener noreferrer` to links ([#6](https://github.com/sveltejs/site-kit/pull/6))
- Fix blurb layout bug ([#9](https://github.com/sveltejs/site-kit/pull/9))
- Fix REPL toggle CSS ([#14](https://github.com/sveltejs/site-kit/pull/14))
- Preserve outlines on focus ([#15](https://github.com/sveltejs/site-kit/pull/15))
- Fix size of arrow in blurb ([#18](https://github.com/sveltejs/site-kit/pull/18))
- Expose `title` prop on `<NavItem>` ([#17](https://github.com/sveltejs/site-kit/pull/17))

## 1.1.5

- Allow Svelte syntax highlighting in code blocks ([#12](https://github.com/sveltejs/site-kit/pull/12))

## 1.1.4

- i18n changes

## 1.1.3

- Fix iOS styles

## 1.1.2

- Squelch a11y warning

## 1.1.1

- Add `dir` prop to Docs

## 1.1.0

- Add `project` prop to Docs component
- Use HTML tags for doc titles

## 1.0.4

- Prevent `<pre>` in homepage blurb breaking grid layout

## 1.0.3

- Missing sidebar text

## 1.0.2

- Various CSS tweaks

## 1.0.1

- Add `base.css` to `pkg.files`

## 1.0.0

- First release
