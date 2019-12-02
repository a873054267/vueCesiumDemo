<template>
  <div class="wrapper">
    <!--<el-radio  label="1" @change="ctrGridLayer" v-model="open">关闭格网图层</el-radio>-->

    <Vcesium @loadeds="otherOperations"> </Vcesium>
  </div>
</template>

<script>

  import geojson2h3 from 'geojson2h3'
  import  Vcesium from '../../components/cesiumViewer'
  export default {
    name: "draw",
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
    computed:{

    },
    methods:{


      otherOperations(){
        // Tropics of Cancer and Capricorn
        viewer.scene.skyAtmosphere.show = false; //不显示大气层，即地球外层的一圈白色
        var coffeeBeltRectangle = Cesium.Rectangle.fromDegrees(-180.0, -23.43687, 180.0, 23.43687);
        viewer.scene.globe.cartographicLimitRectangle = coffeeBeltRectangle;

        var rectangles = [];

        for (var i = 0; i < 10; i++) {
          rectangles.push(viewer.entities.add({
            rectangle : {
              coordinates : coffeeBeltRectangle,
              material : Cesium.Color.WHITE.withAlpha(0.0),
              height : i * 5000.0,
              outline : true,
              outlineWidth : 4.0,
              outlineColor : Cesium.Color.WHITE
            }
          }));
        }






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
