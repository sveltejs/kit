---
'@sveltejs/kit': patch
---

fix: rethrow errors that are not devalue errors unchanged when serializing load data, instead of masking them as `Cannot read properties of undefined (reading 'slice')`
