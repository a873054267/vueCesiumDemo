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
          value:"glb",
          options: [{
            value: 'singleClick',
            label: '单击事件'
          },{
            value: 'gltf',
            label: '其他事件'
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
        let handler
          let scene=viewer.scene

          handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
          handler.setInputAction(function(pos) {

            var cartesian = viewer.camera.pickEllipsoid(pos.position, scene.globe.ellipsoid);
            if (cartesian) {
              var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
              var longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
              var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);
              console.log(longitudeString)

            } else {

            }
          }, Cesium.ScreenSpaceEventType.LEFT_CLICK);


          // handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
          // handler.setInputAction(function(movement) {
          //   var cartesian = viewer.camera.pickEllipsoid(movement.endPosition, scene.globe.ellipsoid);
          //   if (cartesian) {
          //     var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          //     var longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
          //     var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);
          //   console.log(longitudeString)
          //
          //   } else {
          //
          //   }
          // }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
          //

        },

        modeTypeChange(v){
          let url='static/data/CesiumMan/Cesium_Man.'
          url=url+v
          console.log(url)
          this.addModel(url,5000)
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
