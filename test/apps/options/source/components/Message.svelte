<!-- TODO should be able to use import.meta.env.SSR here -->
<p>Hello from the {typeof window === 'undefined' ? 'server' : 'client'}!</p>