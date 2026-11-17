Fixes #17775

The published `@sveltejs/kit` package currently omits its guides, so readers
working from an installed package can end up searching implementation files
for usage guidance. Add concise form action and remote function guides and
include the `docs` directory in the package files list.

Verified with `npm pack --dry-run --json` (both guides appear in the package),
Oxfmt 0.78.0 on the changed files, and `git diff --check`.

AI assistance: OpenAI Codex.
