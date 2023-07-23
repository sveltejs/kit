### Please don't delete this checklist! Before submitting the PR, please make sure you do the following:
- [ ] It's really useful if your PR references an issue where it is discussed ahead of time. In many cases, features are absent for a reason. For large changes, please create an RFC: https://github.com/sveltejs/rfcs
- [ ] This message body should clearly illustrate what problems it solves.
- [ ] Ideally, include a test that fails without this PR but passes with it.

### Tests
- [ ] Run the tests with `pnpm test` and lint the project with `pnpm lint` and `pnpm check`

### Changesets
- [ ] Run `pnpm changeset` for user-visible changes and follow the prompts. Changeset messages should generally be prefixed with `feat:` or `fix:`. PRs can also be prefixed with `chore:` or `docs:`, which typically won't require a changeset as they're not user-visible.
