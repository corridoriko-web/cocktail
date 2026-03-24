<template>
  <div id="app">
    <nav class="nav">
      <router-link to="/" class="nav-link">首页</router-link>
    </nav>
    <router-view></router-view>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.nav {
  background: rgba(255, 255, 255, 0.95);
  padding: 1rem 2rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: flex;
  gap: 2rem;
  justify-content: center;
}

.nav-link {
  text-decoration: none;
  color: #667eea;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  transition: all 0.3s;
}

.nav-link:hover, .nav-link.router-link-active {
  background: #667eea;
  color: white;
}

.container {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
}
</style>