# HEADS UP!

We're about to embark on a [significant redesign](https://github.com/sveltejs/kit/discussions/5748) that will touch many parts of the codebase. Until that work is finished, PRs are very likely to result in merge conflicts, and will likely be ignored until the redesign work is complete (by which time they will likely be stale). Please consider delaying your PR until then.

Thank you for understanding!

---

### Please don't delete this checklist! Before submitting the PR, please make sure you do the following:
- [ ] It's really useful if your PR references an issue where it is discussed ahead of time. In many cases, features are absent for a reason. For large changes, please create an RFC: https://github.com/sveltejs/rfcs
- [ ] This message body should clearly illustrate what problems it solves.
- [ ] Ideally, include a test that fails without this PR but passes with it.

### Tests
- [ ] Run the tests with `pnpm test` and lint the project with `pnpm lint` and `pnpm check`

### Changesets
- [ ] If your PR makes a change that should be noted in one or more packages' changelogs, generate a changeset by running `pnpm changeset` and following the prompts. All changesets should be `patch` until SvelteKit 1.0
