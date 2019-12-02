<template>
  <div class="wrapper">

    <Vcesium @loadeds="otherOperations"> </Vcesium>
  </div>
</template>

<script>
  var facility=require('./img/facility.gif')

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
       addBillboardAndRectangle() {
    viewer.entities.add({
      position : Cesium.Cartesian3.fromDegrees(-77, 40.5),
      billboard : {
        image : facility,
        distanceDisplayCondition : new Cesium.DistanceDisplayCondition(5.5e6)
      },
      rectangle : {
        coordinates : Cesium.Rectangle.fromDegrees(-80.5, 39.7, -75.1, 42.0),
        height : 0.0,
        material : Cesium.Color.RED.withAlpha(0.5),
        outline : true,
        outlineColor : Cesium.Color.RED,
        distanceDisplayCondition : new Cesium.DistanceDisplayCondition(0.0, 5.5e6)
      }
    });
  },

      otherOperations(){
         this.addBillboardAndRectangle()



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
