Similaire à [`$env/dynamic/private`](https://kit.sveltefr.dev/docs/modules#$env-dynamic-private), mais inclut uniquement les variables dont le nom commence par [`config.kit.env.publicPrefix`](https://kit.sveltefr.dev/docs/configuration#env) (qui vaut par défaut `PUBLIC_`), et peuvent donc être exposées dans le code client en toute sécurité.

Notez que les variables d'environnement dynamiques doivent toutes être envoyées depuis le serveur vers le client, impliquant des requêtes plus conséquentes – lorsque c'est possible, utilisez plutôt `$env/static/public`.

Dynamic environment variables cannot be used during prerendering.

```ts
import { env } from '$env/dynamic/public';
console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
```
