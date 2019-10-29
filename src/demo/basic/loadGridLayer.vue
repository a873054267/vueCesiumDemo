<template>
    <div class="wrapper">
      <!--<el-radio  label="1" @change="ctrGridLayer" v-model="open">关闭格网图层</el-radio>-->
     <div  class="selectModelType">
       <el-checkbox  v-model="open" @change="ctrGridLayer">是否显示格网图层</el-checkbox>
     </div>

      <!--<div class="selectModelType">-->
        <!--<el-select v-model="value" placeholder="请选择" @change="modeTypeChange">-->
          <!--<el-option-->
            <!--v-for="item in options"-->
            <!--:key="item.value"-->
            <!--:label="item.label"-->
            <!--:value="item.value">-->
          <!--</el-option>-->
        <!--</el-select>-->
      <!--</div>-->
        <Vcesium @loadeds="otherOperations"> </Vcesium>
      </div>
</template>

<script>


  import  Vcesium from '../../components/cesiumViewer'
    export default {
        name: "loadMapService",
      data() {
        return {
          open:true


        }
      },
      components:{
          Vcesium
      },

      mounted(){
      },
      methods:{
        ctrGridLayer(v){

          viewer.imageryLayers._layers[1].show=v

        },

        otherOperations(){
          let layer=new Cesium.GridImageryProvider();

          var TileCoordinatesImagery = new Cesium.TileCoordinatesImageryProvider();
          viewer.imageryLayers.addImageryProvider(layer)
          viewer.imageryLayers.addImageryProvider(TileCoordinatesImagery)
        },


      }
    }
</script>

<style scoped>
.selectModelType{
  position: absolute;
  margin: 20px;
  z-index: 100;
  width: 200px;
  height: 40px;
  vertical-align: center;
  line-height: 40px;

}

</style>
