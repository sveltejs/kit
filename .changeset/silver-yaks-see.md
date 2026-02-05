---
'@sveltejs/kit': major
---

breaking: set `"moduleResolution": "nodenext"` in generated base `tsconfig.json`. Apps should override this to `"module": "esnext"` and `"moduleResolution": "bundler"` in their `tsconfig.json` while libraries should leave it set to the new default of `nodenext`
