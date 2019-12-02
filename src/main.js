// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import Cesium from 'cesium/Cesium';
import 'cesium/Widgets/widgets.css';
import ElementUI from 'element-ui';//引入element-ui
import 'element-ui/lib/theme-chalk/index.css';//引入element-ui样式
Vue.use(ElementUI, {size: 'small'});//注入ElementUI

window.Cesium = Cesium;
Vue.config.productionTip = false


/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>',
  mounted(){

  }
})
