<template>
  <div id="app">
    <Component1 />
    <Component2 />
    <Component3 />
  </div>
</template>

<script>
import Component1 from './components/Component1.vue'
import Component2 from './components/Component2.vue'
import Component3 from './components/Component3.vue'

export default {
  name: 'App',
  components: {
    Component1,
    Component2,
    Component3
  }
}
</script>

<style scoped>
@import './assets/css/style.css';
</style>