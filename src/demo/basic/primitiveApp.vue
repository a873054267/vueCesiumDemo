<template>
    <div class="wrapper">

        <Vcesium @loadeds="otherOperations"> </Vcesium>
      </div>
</template>

<script>


  import  Vcesium from '../../components/cesiumViewer'
    export default {
        name: "load3Dmodel",
      data() {
        return {


        }
      },
      components:{
          Vcesium
      },

      mounted(){
      },
      methods:{

        otherOperations(){
          var instances = [];
          for(var lon = -180.0; lon < 180.0; lon += 5.0) {
            for(var lat = -90.0; lat < 90.0; lat += 5.0) {
              instances.push(new Cesium.GeometryInstance({
                geometry:new Cesium.RectangleGeometry({
                  rectangle:Cesium.Rectangle.fromDegrees(lon, lat, lon + 5.0, lat +5.0)
                }),
                attributes:{
                  color:Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromRandom({
                    alpha:0.5
                  }))
                }
              }));
            }
          }
          viewer.scene.primitives.add(new Cesium.Primitive({
            geometryInstances:instances, //合并
            //某些外观允许每个几何图形实例分别指定某个属性，例如：
            appearance:new Cesium.PerInstanceColorAppearance()
          }));
          viewer.camera.setView({
            destination : Cesium.Cartesian3.fromDegrees(105.20, 30.55,5000000)
          });

          //viewer.zoomTo([105.20, 30.55,5000])
          //this.loadFeature("point")
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
