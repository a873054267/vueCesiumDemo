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
          var box = new Cesium.BoxGeometry({
            vertexFormat : Cesium.VertexFormat.POSITION_ONLY,
            maximum : new Cesium.Cartesian3(250000.0, 250000.0, 250000.0),
            minimum : new Cesium.Cartesian3(-250000.0, -250000.0, -250000.0)
          });
          var instance = new Cesium.GeometryInstance({
            geometry: Cesium.BoxGeometry.createGeometry(box),
            modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
              Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883)), new Cesium.Cartesian3(0.0, 0.0, 1000000.0), new Cesium.Matrix4()),
            id:"ccc"
          });
          var pr=new Cesium.Primitive({
            geometryInstances: instance,
            //appearance: new Cesium.PerInstanceColorAppearance()
          })
           viewer.scene.primitives.add(pr);

          viewer.camera.setView({
            destination :Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883,5000)
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
