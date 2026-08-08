---
'@sveltejs/kit': major
---

breaking: move navigation, form and page types out of `@sveltejs/kit` and into the modules they concern. `BeforeNavigate`, `OnNavigate`, `AfterNavigate`, `Navigation`, `NavigationTarget`, `NavigationType`, `GotoOptions` and the `Navigation*` variant types are now exported from `$app/navigation`; `Page`, `ReadonlyURL` and `ReadonlyURLSearchParams` from `$app/state`; `ActionResult` and `SubmitFunction` from `$app/forms`. Update imports accordingly, e.g. `import type { Page } from '@sveltejs/kit'` becomes `import type { Page } from '$app/state'`. Types without a runtime module (`Load`, `Actions`, `RequestEvent`, `Snapshot`, `NavigationEvent`, `ActionFailure` etc.) remain in `@sveltejs/kit`.
