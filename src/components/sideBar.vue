<template>
  <div class="wrapper" >
      <el-menu  :default-openeds="['medium']" router>
        <el-submenu v-for="(item,index) in sideBarList" :key="index" :index="item.index">
          <template slot="title"><i :class=item.className></i>{{item.title}}</template>
          <el-menu-item
            v-for="(itemChild,index2) in item.content"
            @click="selItem"
            :value="itemChild.title"
            :index="itemChild.index"
            :key="index2">{{itemChild.title}}</el-menu-item>
        </el-submenu>
      </el-menu>

  </div>
</template>

<script>

  export default {
    name: 'hello',
    methods:{
      selItem(v){

      }
    },
    mounted(){

     // this.$router.push("/basic/hello");
    },
    data() {
      return {
        selItemName:"111",
        sideBarList:[{
          index:"basic",
          title:"基础功能",
          className:"el-icon-picture-outline-round",//图标样式
          content:[
            {title:"Hello Cesium",index:"/basic/hello"},
            {title:"加载三维模型",index:"/basic/load3DModel"},
            {title:"加载各类矢量数据",index:"/basic/loadPtLinePoly"},
            {title:"加载常见地图服务",index:"/basic/loadMapService"},
            {title:"图层控制/格网图层",index:"/basic/loadGridLayer"},
            {title:"BaseLayerPick的使用",index:"/basic/baseLayerPick"},
            {title:"替换basePickLayer",index:"/basic/replaceBaseLayerPick"},
            {title:"地形服务",index:"/basic/terrainService"},
            {title:"鼠标事件",index:"/basic/mouseEvent"},
            {title:"选择模型",index:"/basic/pickEntity"},
            {title:"primitive方式绘制图形",index:"/basic/primitive"},
            {title:"Geoms合并为primitive",index:"/basic/primitiveApp"},
            {title:"修改primitive中属性",index:"/basic/primitiveManager"},
            {title:"修改primitive中外观",index:"/basic/primitiveManagerApp"},
            {title:"提示框",index:"/basic/tooltip"},
            {title:"提示框DIV形式",index:"/basic/tooltipDiv"},

            {title:"挖地形",index:"/basic/planeGround"},
            {title:"图层参数调整",index:"/basic/layerParams"},
            {title:"相机视角",index:"/basic/cameraView"},
        ]
        },{
          index:"medium",
          title:"中级工具篇",
          className:"el-icon-camera-solid",//图标样式
          content:[
            {title:"在线绘制图形",index:"/medium/drawOnline"},
            {title:"切分地图",index:"/medium/divideMap"},
            {title:"clock/光照控制",index:"/medium/clock"},
            {title:"模型根据距离条件显隐",index:"/medium/loadCtrbyDis"},
            {title:"模型阴影",index:"/medium/shadow"},
            {title:"czml加载模型",index:"/medium/czml"},
            {title:"加载点云模型",index:"/medium/loadPointCloud"},
            {title:"动态调整模型",index:"/medium/modifyModel"},
            {title:"作业库模型渲染",index:"/medium/loadRoad"},
            {title:"可视域分析",index:"ksh"}]
        },{
          index:"advance",
          title:"高级功能",
          className:"el-icon-s-opportunity",//图标样式
          content:[{title:"Hello Cesium"},{title:"加载三维模型"}]
        }],

      }
    },


  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.wrapper{
  text-align: left;
}
</style>
