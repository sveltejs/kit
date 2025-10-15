---
"@sveltejs/kit": patch
---

fix: resolve remote module syntax errors with trailing expressions

Add safe module separation in remote transform to handle files ending with expressions or comments without trailing newlines.
