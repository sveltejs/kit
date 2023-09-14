Similaire à [`$env/static/private`](https://kit.sveltefr.dev/docs/modules#$env-static-private), mais inclut uniquement les variables d'environnement qui commencent par [`config.kit.env.publicPrefix`](https://kit.sveltefr.dev/docs/configuration#env) (qui vaut par défaut `PUBLIC_`), et peuvent donc être exposées dans le code client en toute sécurité.

Les valeurs sont remplacées de manière statique au moment de la compilation.

```ts
import { PUBLIC_BASE_URL } from '$env/static/public';
```
