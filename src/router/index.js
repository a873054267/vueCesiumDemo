import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      component: resolve => require(['../App.vue'], resolve), //Home
    },
    {
      path:"/basic/hello",
      name:"/basic/hello",
      component: resolve => require(['../demo/basic/hello.vue'], resolve), //Home
    },
    {
      path:"/basic/planeGround",
      name:"/basic//planeGround",
      component: resolve => require(['../demo/basic//planeGround.vue'], resolve), //Home
    },
    {
      path:"/basic/load3DModel",
      name:"/basic/load3DModel",
      component: resolve => require(['../demo/basic/load3Dmodel.vue'], resolve), //Home
    },
    {
      path:"/basic/loadPtLinePoly",
      name:"/basic/loadPtLinePoly",
      component: resolve => require(['../demo/basic/addPoint_line_polygon.vue'], resolve), //Home
    },
    {
      path:"/basic/loadMapService",
      name:"/basic/loadMapService",
      component: resolve => require(['../demo/basic/loadMapService'], resolve), //Home
    },
    {
      path:"/basic/loadGridLayer",
      name:"/basic/loadGridLayer",
      component: resolve => require(['../demo/basic/loadGridLayer'], resolve), //Home
    },
    {
      path:"/basic/baseLayerPick",
      name:"/basic/baseLayerPick",
      component: resolve => require(['../demo/basic/baseLayerPick'], resolve), //Home
    },
    {
      path:"/basic/cameraView",
      name:"/basic/cameraView",
      component: resolve => require(['../demo/basic/cameraView'], resolve), //Home
    },
    {
      path:"/basic/replaceBaseLayerPick",
      name:"/basic/replaceBaseLayerPick",
      component: resolve => require(['../demo/basic/replaceBaseLayerPick'], resolve), //Home
    },
    {
      path:"/basic/terrainService",
      name:"/basic/terrainService",
      component: resolve => require(['../demo/basic/terrainService'], resolve), //Home
    },{
      path:"/basic/mouseEvent",
      name:"/basic/mouseEvent",
      component: resolve => require(['../demo/basic/mouseEvent'], resolve), //Home
    },
    {
      path:"/basic/pickEntity",
      name:"/basic/pickEntity",
      component: resolve => require(['../demo/basic/pickEntity'], resolve), //Home
    },{
      path:"/basic/primitive",
      name:"/basic/primitive",
      component: resolve => require(['../demo/basic/primitive'], resolve), //Home
    },
    {
      path:"/basic/primitiveApp",
      name:"/basic/primitiveApp",
      component: resolve => require(['../demo/basic/primitiveApp'], resolve), //Home
    },
    {
      path:"/basic/primitiveManager",
      name:"/basic/primitiveManager",
      component: resolve => require(['../demo/basic/primitiveManager'], resolve), //Home
    },
    {
      path:"/basic/primitiveManagerApp",
      name:"/basic/primitiveManagerApp",
      component: resolve => require(['../demo/basic/primitiveManagerApp'], resolve), //Home
    },
    {
      path:"/basic/tooltip",
      name:"/basic/tooltip",
      component: resolve => require(['../demo/basic/tooltip'], resolve), //Home
    },
    {
      path:"/basic/tooltipDiv",
      name:"/basic/tooltipDiv",
      component: resolve => require(['../demo/basic/tooltipDiv'], resolve), //Home
    },
    {
      path:"/basic/layerParams",
      name:"/basic/layerParams",
      component: resolve => require(['../demo/basic/layerParams'], resolve), //Home
    },

    {
      path:"/medium/drawOnline",
      name:"/medium/drawOnline",
      component: resolve => require(['../demo/medium/draw.vue'], resolve), //Home
    },
    {
      path:"/medium/divideMap",
      name:"/medium/divideMap",
      component: resolve => require(['../demo/medium/divideMap'], resolve), //Home
    },
    {
      path:"/medium/clock",
      name:"/medium/clock",
      component: resolve => require(['../demo/medium/clock'], resolve), //Home
    },
    {
      path:"/medium/loadCtrbyDis",
      name:"/medium/loadCtrbyDis",
      component: resolve => require(['../demo/medium/loadCtrbyDis'], resolve), //Home
    },
    {
      path:"/medium/shadow",
      name:"/medium/shadow",
      component: resolve => require(['../demo/medium/shadow'], resolve), //Home
    },
    {
      path:"/medium/czml",
      name:"/medium/czml",
      component: resolve => require(['../demo/medium/czml'], resolve), //Home
    },





  ]
})
