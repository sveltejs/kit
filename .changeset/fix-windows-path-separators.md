---
"@sveltejs/kit": patch
---

fix: normalize path separators before `path.relative` in Vite plugin on Windows

On Windows, `kit.files.routes` uses native backslashes (from `path.resolve`) while
internal kit asset paths may use forward slashes, causing `path.relative` to return
an incorrect result. This produced invalid Rollup entry keys like
`entries/pages/D_/path/to/project/...` and an `Invalid substitution for placeholder
"[name]"` error during build. Wrapping both arguments with `path.normalize` ensures
consistent separators on all platforms.
