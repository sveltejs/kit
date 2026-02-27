<script>
import { fn } from './functions';
</script>

<ul>
  <li>{fn()} - static, called on initial render</li>
  <li>{fn(a, b)} - dynamic, called whenever a or b change</li>
</ul>
