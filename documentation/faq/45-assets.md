---
question: How do I hash asset file names for caching?
---

You can have Vite process your assets by importing them as shown below:

```
<script>
  import imageSrc from '$lib/assets/image.png';
</script>
<img src={imageSrc} />
```
