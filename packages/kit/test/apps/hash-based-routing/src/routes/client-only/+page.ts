// Referencing the browser-only API in the universal node helps us test if the
// app can be built without errors although SSR is not explicitly set to false
indexedDB.open('toDoList');
