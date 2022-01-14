<script>
    const nav_list = [{name:'page1',link:'/page1'},{name:'page2',link:'/page2'},{name:'logout',link:'/auth/api/logout'}]
</script>

<div class="bg-sky-100 p-3 flex justify-between">
    <a href='/'>
        <header class="text-2xl font-bold">
            JWT-auth-example
        </header>
    </a>
    <div class="flex space-x-4 text-blue-500 underline capitalize">
    {#each nav_list as el}
        <a href="{el.link}"rel="{el.name=='logout'?'external':undefined}">
            <h4>{el.name}</h4>
        </a>
    {/each}
    </div>
</div>