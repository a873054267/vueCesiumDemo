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
        viewer.scene.globe.enableLighting = true;
        var clock = new Cesium.Clock({
          startTime : Cesium.JulianDate.fromIso8601('2013-12-25'),
          currentTime : Cesium.JulianDate.fromIso8601('2013-12-25'),
          stopTime : Cesium.JulianDate.fromIso8601('2013-12-26'),
          clockRange : Cesium.ClockRange.LOOP_STOP, // loop when we hit the end time
          clockStep : Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER,
          multiplier : 4000, // how much time to advance each tick
          shouldAnimate : true // Animation on by default
        });
        viewer.clock=true
       // viewer.clockViewModel=new Cesium.ClockViewModel(clock)





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
