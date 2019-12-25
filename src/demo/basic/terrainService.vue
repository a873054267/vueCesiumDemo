<template>
    <div class="wrapper">
          <div class="selectModelType">
            <!--<el-radio  label="1" @change="loadCompile">加载静态文件夹中的模型</el-radio>-->
            <el-select v-model="value" placeholder="请选择" @change="modeTypeChange">
              <el-option
                v-for="item in options"
                :key="item.value"
                :label="item.label"
                :value="item.value">
              </el-option>
            </el-select>
          </div>
        <Vcesium @loadeds="otherOperations"> </Vcesium>
      </div>
</template>

<script>
  /**
   * 工具库
   */

  //require model from './data/CesiumMan/Cesium_Man.glb'

  import  Vcesium from '../../components/cesiumViewer'
    export default {
        name: "load3Dmodel",
      data() {
        return {
          value:"simple",
          options: [{
            value: 'world',
            label: '全球地形服务'
          },{
            value: 'simple',
            label: '简单地形服务'
          }]
        }
      },
      components:{
          Vcesium
      },

      mounted(){
      },
      methods:{
        otherOperations(){
          //getInfoDataForExtent(1,2)
          var worldTerrain =Cesium.createWorldTerrain({
            requestWaterMask:true,
            requestVertexNormals:true
          });
          this.worldTerrain=worldTerrain
          var ellipsoidProvider = new Cesium.EllipsoidTerrainProvider();

          this.ellipsoidProvider=ellipsoidProvider
          viewer.terrainProvider=worldTerrain
        },

        modeTypeChange(v){
          if(v!=="world"){
            viewer.terrainProvider=this.worldTerrain
          }
          else{
            viewer.terrainProvider=this.ellipsoidProvider
          }

        }
      }
    }
</script>

<style scoped>
.selectModelType{
  position: absolute;
  margin: 20px;
  z-index: 100;
}

</style>
