---
title: Docker
---

SvelteKit can be deployed with Docker and Docker Compose by combining [`adapter-node`](adapter-node) (or [`adapter-bun`](adapter-bun)) with a container image that runs the built server. This page covers the moving parts: what has to end up in the image, how the server learns it is behind a proxy, and how to make `docker stop` behave.

> [!NOTE]
> This page is about running the server _inside_ a container. If you are deploying to a platform that builds your app for you, check the [adapters](adapters) page first — you may not need Docker at all.

## A Dockerfile

The image needs three things from the build output, as described under [deploying with `adapter-node`](adapter-node#Deploying): the output directory, the project's `package.json`, and the production dependencies in `node_modules`.

A multi-stage build keeps the final image free of the build toolchain:

```Dockerfile
# syntax=docker/dockerfile:1

# --- build stage -----------------------------------------------------------
FROM node:24-slim AS builder

WORKDIR /app

# install dependencies first so this layer is cached across source changes
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- runtime stage ---------------------------------------------------------
FROM node:24-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

# the built server, plus only the dependencies it needs at runtime
COPY --from=builder /app/build ./build
COPY package.json package-lock.json ./
RUN npm ci --omit dev && npm cache clean --force

# adapter-node listens on 0.0.0.0:3000 by default
ENV PORT=3000
EXPOSE 3000

CMD ["node", "build"]
```

> [!NOTE]
> Packages that your code imports while serving requests must be in `dependencies`, not `devDependencies`. `adapter-node` bundles development dependencies into the output but _externalises_ anything in `dependencies`, so a runtime dependency listed as a dev dependency will be missing from the image.

Build and run it with:

```sh
docker build -t my-sveltekit-app .
docker run --rm -p 3000:3000 my-sveltekit-app
```

The example pins `node:24-slim`; pick a base image that satisfies your own support matrix. Because dependencies are installed in both stages, prefer a `.dockerignore` that keeps `node_modules`, `build`, `.svelte-kit` and `.env` out of the build context so the `COPY . .` is small and never reintroduces host-built artifacts:

```gitignore
# .dockerignore
node_modules
build
.svelte-kit
.env
.env.*
*.log
```

## Client assets

Static assets are part of the build output, so the `COPY --from=builder /app/build ./build` line is what ships them — there is no separate step. The server serves client assets and prerendered output from the file list recorded during the build, which lives inside `build` alongside the server.

By default [`adapter-node`](adapter-node#Options-precompress) generates `.br` and `.gz` variants of client and prerendered assets during the build and negotiates `Accept-Encoding` per request, so you do not need a compression layer in front of the container to serve compressed assets.

## Configuration with environment variables

In production, `.env` files are _not_ loaded automatically. Either pass environment variables into the container:

```sh
docker run --rm -p 3000:3000 -e PORT=3000 my-sveltekit-app
```

or point the server at an env file with the [`--env-file`](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs) flag. Because the file has to exist _inside_ the container, mount it in and change the entrypoint at the same time:

```sh
docker run --rm -p 3000:3000 \
  -v "$PWD/.env.production:/app/.env.production:ro" \
  my-sveltekit-app node --env-file=/app/.env.production build
```

Note that the two `--env-file` flags are different things: `docker run --env-file` reads a file on the host and injects the variables as container environment variables, while `node --env-file` reads a file inside the container and populates `process.env` from it. Only the second one makes a `.env` file part of the image's own start-up path.

See [the `adapter-node` environment variables list](adapter-node#Environment-variables) for the full set. The ones that matter most in a container are:

| Variable | Meaning in a container |
| --- | --- |
| `PORT` | Port the server listens on. Set it if your platform assigns one. |
| `HOST` | Interface to bind. The default `0.0.0.0` is required for the port to be reachable from outside the container. |
| `BODY_SIZE_LIMIT` | Maximum request body size in bytes, or with a `K`/`M`/`G` suffix. Defaults to `512K`. |
| `SHUTDOWN_TIMEOUT` | Seconds to wait after `SIGTERM` before closing remaining connections. Defaults to `30`. |

> [!WARNING]
> Do not set `HOST=127.0.0.1` in a container. The server would only accept connections from inside the container's own network namespace and would be unreachable from the mapped port, even though `docker run -p` reports a healthy mapping.

## Behind a reverse proxy

If the container sits behind a proxy or load balancer — a common arrangement inside a Compose stack with a reverse proxy in front — the server cannot see the real client address or origin from the `host` header alone. Set the relevant headers so SvelteKit can reconstruct the origin and the client address:

```sh
docker run --rm -p 3000:3000 \
  -e PROTOCOL_HEADER=x-forwarded-proto \
  -e HOST_HEADER=x-forwarded-host \
  -e ADDRESS_HEADER=x-forwarded-for \
  -e XFF_DEPTH=1 \
  my-sveltekit-app
```

`XFF_DEPTH` should be the number of trusted proxies in front of the server. If it is set too low, `event.getClientAddress()` returns a proxy's address instead of the client's. Read the notes on `PROTOCOL_HEADER`, `HOST_HEADER`, `PORT_HEADER`, `ADDRESS_HEADER` and `XFF_DEPTH` on the [`adapter-node` page](adapter-node) before enabling these — a misconfigured depth lets clients spoof their address.

## docker-compose.yml

A minimal Compose file for the app and a database it needs at runtime:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      # inside the Compose network, other services are reachable by name
      DATABASE_URL: postgres://postgres:postgres@db:5432/app
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: postgres
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  db-data:
```

The `DATABASE_URL` value is an example only — it depends on the database and driver you use.

> [!NOTE]
> `depends_on` only waits for the container to be _healthy_, not for the application inside it to accept queries. If your app fails to start because the database is not ready yet, either gate the healthcheck on the application being ready or retry the connection from a [hook](hooks#handle).

## Stopping the container cleanly

`docker stop` sends `SIGTERM`, waits, then escalates to `SIGKILL`. `adapter-node` handles `SIGTERM` and `SIGINT` gracefully: it stops accepting new requests, waits for in-flight requests to finish, and then closes remaining connections after `SHUTDOWN_TIMEOUT` seconds.

Compose's `stop_grace_period` is the grace period Compose itself waits between `SIGTERM` and `SIGKILL`. Set it a little above `SHUTDOWN_TIMEOUT` so the server is allowed to finish draining instead of being killed part-way through:

```yaml
services:
  app:
    build: .
    stop_grace_period: 35s   # SHUTDOWN_TIMEOUT is 30s by default
    # ...
```

The server also emits a `sveltekit:shutdown` event once connections are closed, which supports asynchronous work. Use it to close database connections and stop background jobs so that `docker stop` does not have to escalate to `SIGKILL`:

```js
/// file: src/hooks.server.js
process.on('sveltekit:shutdown', async () => {
	await db.close();
	await jobs.stop();
});
```

See [graceful shutdown on the `adapter-node` page](adapter-node#Graceful-shutdown) for the details of what the adapter does and when each event fires.

## Healthchecks

SvelteKit does not ship a health endpoint. If your platform needs one, add a route yourself:

```js
/// file: src/routes/health/+server.js
import { json } from '@sveltejs/kit';

export function GET() {
	return json({ status: 'ok' });
}
```

and point the image healthcheck at it:

```Dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```

This uses `fetch` from Node 18 onwards, so it needs no extra packages in the image.
