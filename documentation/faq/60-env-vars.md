---
title: How do I use environment variables?
---

Vite uses [dotenv](https://github.com/motdotla/dotenv) to load environment variables from a file named `.env` or similar. Only environment variables prefixed with `VITE_` are exposed ([you can set `envPrefix` to change this](https://vitejs.dev/config/#envprefix)). Vite will use these and statically replace them at build-time.

To use environment variables at runtime, you would need to instantiate dotenv yourself in your server-side code so that they are exposed at `process.env.YOUR_ENV_VAR`. You may also use `$session` to pass them to the client if needed.

Please see [the Vite documentation](https://vitejs.dev/guide/env-and-mode.html#env-files) for more info about environment variables.
