<template>
    <div class="wrapper">
          <div class="selectModelType" v-show="false">
            <!--<el-radio  label="1" @change="loadCompile">加载静态文件夹中的模型</el-radio>-->
            <el-select v-model="value" placeholder="使用BasePickLayer中的第几个图层" @change="modeTypeChange">
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
  import {
   getInfoDataForExtent
  } from "../../../static/js/utils.js";
  //require model from './data/CesiumMan/Cesium_Man.glb'

  import  Vcesium from '../../components/cesiumViewer'
    export default {
        name: "load3Dmodel",
      data() {
        return {
          value:"",
          options: []
        }
      },
      components:{
          Vcesium
      },

      mounted(){
      },
      methods:{
        modeTypeChange(v){
          viewer.baseLayerPicker.viewModel.selectedImagery=viewer.baseLayerPicker.viewModel.imageryProviderViewModels[v]

        },
        otherOperations(){
          var providerViewModels = [];
         var osmMap= Cesium.createOpenStreetMapImageryProvider({
           url: 'https://a.tile.openstreetmap.org/'
         });
          var osmMapModel = new Cesium.ProviderViewModel({
            name:'自定义的osm服务',
            iconUrl:Cesium.buildModuleUrl('./Widgets/Images/ImageryProviders/openStreetMap.png'),
            tooltip:'openstreetmap 地图服务 \nhttps://a.tile.openstreetmap.org/',
            creationFunction:function () {
              return osmMap;

            }

          });
          providerViewModels.push(osmMapModel);
          viewer.baseLayerPicker.viewModel.imageryProviderViewModels = providerViewModels;

          // viewer.imageryProvider=osmMap
          //   viewer.imageryProviderViewModels=providerViewModels
          //console.log(viewer.baseLayerPicker.viewModel)
          //viewer.baseLayerPicker.viewModel.selectedImagery=viewer.baseLayerPicker.viewModel.imageryProviderViewModels[5]
        },

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
