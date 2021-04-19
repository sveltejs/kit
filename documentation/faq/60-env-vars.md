---
question: How do I use environment variables?
---

Vite uses [dotenv](https://github.com/motdotla/dotenv) to load environment variables from a file named `.env` or similar. Only environment variables prefixed with `VITE_` are exposed. You would need to instantiate dotenv yourself if you want all environment variables exposed in `process.env['YOUR_ENV_VAR']`.

For example, you can create a `.env` file in your project root folder with a `VITE_*` variable:

```env
VITE_MESSAGE="World"
```

Then you can access this variable in any of your components:

```html
<h1>Hello, {import.meta.env.VITE_MESSAGE}</h1>
```

Please see [the Vite documentation](https://vitejs.dev/guide/env-and-mode.html#env-files) for more info about environment variables.
