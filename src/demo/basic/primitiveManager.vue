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
          var circleInstance = new Cesium.GeometryInstance({
            geometry:new Cesium.CircleGeometry({
              center:Cesium.Cartesian3.fromDegrees(107.20, 30.55),
              radius:250000.0,
              vertexFormat:Cesium.PerInstanceColorAppearance.VERTEX_FORMAT
            }),
            attributes:{
              color:Cesium.ColorGeometryInstanceAttribute.fromColor(
                new Cesium.Color(1.0, 0.0, 0.0, 0.5)),
              show:new Cesium.ShowGeometryInstanceAttribute(true) //显示或者隐藏
            },
            id:'circle'
          });
          var primitive = new Cesium.Primitive({
            geometryInstances:circleInstance,
            appearance:new Cesium.PerInstanceColorAppearance({
              translucent:false,
              closed:true
            })
          });
          viewer.scene.primitives.add(primitive);
          //定期修改颜色
          setInterval(function() {
            //获取某个实例的属性集
            var attributes = primitive.getGeometryInstanceAttributes('circle');
            attributes.color= Cesium.ColorGeometryInstanceAttribute.toValue(
              Cesium.Color.fromRandom({
                alpha:1.0
              }));
          },2000);
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
