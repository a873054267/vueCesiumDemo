<template>
    <div class="wrapper">

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
            value: 'glb',
            label: 'glb模型'
          },{
            value: 'gltf',
            label: 'gltf模型'
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
        var  labelEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(0, 0),
          label: {
            name:"lable",
            text: '提示',
            font: '15px sans-serif',
            pixelOffset: new Cesium.Cartesian2(8, 8),//y大小根据行数和字体大小改变
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            showBackground: true,
            position: Cesium.Cartesian3.fromDegrees(105.20, 30.55,5000),
            backgroundColor: new Cesium.Color(0.165, 0.165, 0.165, 1.0),
          },
          show:false
        });
        let handler
          var scene=viewer.scene
          console.log(viewer.entities)
          handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
          handler.setInputAction(function(movement) {
            var cartesian = viewer.camera.pickEllipsoid(movement.endPosition, scene.globe.ellipsoid);
            if (cartesian) {
              labelEntity.show=true
              labelEntity.position = cartesian;
              //labelEntity.label.text = message;
              var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
              var longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
              var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);
              labelEntity.label.text=longitudeString+","+latitudeString

            } else {
              labelEntity.show=false
            }
          }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);


        },
        //加载在编译目录下的三维模型


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
