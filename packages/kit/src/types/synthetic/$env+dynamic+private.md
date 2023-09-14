Ce module fournit un accès aux variables d'environnement d'exécution, tel que défini par votre plateforme d'exécution. Par exemple, si vous utilisez [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (ou si vous lancez [`vite preview`](https://kit.sveltefr.dev/docs/cli)), ceci est équivalent à `process.env`. Ce module inclut uniquement les variables dont le nom _ne commence pas_ par [`config.kit.env.publicPrefix`](https://kit.sveltefr.dev/docs/configuration#env) et _commence_ par [`config.kit.env.privatePrefix`](https://kit.sveltefr.dev/docs/configuration#env) (si configuré)

Ce module ne peut pas être importé côté client.

Dynamic environment variables cannot be used during prerendering.

```ts
import { env } from '$env/dynamic/private';
console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
```

> En mode `dev`, `$env/dynamic` inclut toujours les variables d'environnement de `.env`. En `prod`, ce comportement dépend de votre adaptateur.
