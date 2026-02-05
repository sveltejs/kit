---
'@sveltejs/kit': minor
---

feat: add `scroll` property to `NavigationTarget` in navigation callbacks

Navigation callbacks (`beforeNavigate`, `onNavigate`, and `afterNavigate`) now include scroll position information via the `scroll` property on `from` and `to` targets:

- `from.scroll`: The scroll position at the moment navigation was triggered
- `to.scroll`: In `beforeNavigate` and `onNavigate`, this is populated for `popstate` navigations (back/forward) with the scroll position that will be restored, and `null` for other navigation types. In `afterNavigate`, this is always the final scroll position after navigation completed.

This enables use cases like animating transitions based on the target scroll position when using browser back/forward navigation.
