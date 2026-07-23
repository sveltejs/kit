---
title: $app/tsconfig/service-worker
---

This module contains TypeScript configuration tailored for your service worker:

```json
/// file: src/service-worker/tsconfig.json
{
	"extends": "$app/tsconfig/service-worker"
}
```

You can extend this configuration with your own `compilerOptions`, adhering to the same restrictions as [`$app/tsconfig]($app-tsconfig).
