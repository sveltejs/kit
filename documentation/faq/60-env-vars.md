---
title: How do I use environment variables?
---

Environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` during dev and build. These are available to your app via the [`$app/env/private`](/docs/modules#$app-env-private) and [`$app/env/public`](/docs/modules#$app-env-public) modules. Public variables — i.e. those that are safe to expose to users — must use a [prefix](/docs/configuration#kit-env-publicprefix) that defaults to `PUBLIC_`. Private variables cannot be imported into client-side code.

For environment variables that are not known at build time, you can use [`$app/env/platform`](/docs/modules#$app-env-platform).
