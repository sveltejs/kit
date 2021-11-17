---
question: How do I use environment variables?
---

Vite uses [dotenv](https://github.com/motdotla/dotenv) to load environment variables from a file named `.env` or similar. Only environment variables prefixed with `VITE_` are exposed ([you can set `envPrefix` to change this](https://vitejs.dev/config/#envprefix)). For now, you would need to instantiate dotenv yourself if you want all environment variables exposed in `process.env['YOUR_ENV_VAR']`. [Vite 2.7 will expose all environment variables on the server-side](https://github.com/vitejs/vite/pull/5404).

Please see [the Vite documentation](https://vitejs.dev/guide/env-and-mode.html#env-files) for more info about environment variables.
