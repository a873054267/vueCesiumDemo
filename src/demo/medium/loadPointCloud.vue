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
        // viewer.scene.globe.enableLighting = true;
        // var clock = new Cesium.Clock({
        //   startTime : Cesium.JulianDate.fromIso8601('2013-12-25'),
        //   currentTime : Cesium.JulianDate.fromIso8601('2013-12-25'),
        //   stopTime : Cesium.JulianDate.fromIso8601('2013-12-26'),
        //   clockRange : Cesium.ClockRange.LOOP_STOP, // loop when we hit the end time
        //   clockStep : Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER,
        //   multiplier : 4000, // how much time to advance each tick
        //   shouldAnimate : true // Animation on by default
        // });
        // viewer.clock=true
       // viewer.clockViewModel=new Cesium.ClockViewModel(clock)
        //var tileset = new Cesium.Cesium3DTileset({   url:'tileset/4545/tileset.json'});
        var tileset = new Cesium.Cesium3DTileset({   url:'tileset/csarr/tileset.json'});

        // var tileset = new Cesium.Cesium3DTileset({ url: Cesium.IonResource.fromAssetId(5714) });

        var city = viewer.scene.primitives.add(tileset);
        // Adjust the tileset height so its not floating above terrain
        var heightOffset = 7;
        city.readyPromise.then(function(tileset) {
          // Position tileset
          var boundingSphere = tileset.boundingSphere;
          var cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
          var surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0);
          var offset = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, heightOffset);
          var translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
          tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);

          // tileset.style = new Cesium.Cesium3DTileStyle({
          //   color: {
          //     conditions: [
          //       ['${classification} > 3', 'rgb(102, 71, 151)'],
          //       ['${classification} <3', 'rgb(170, 162, 204)'],
          //     ]
          //   }
          // });

        });
        viewer.zoomTo(tileset);


        // Silhouette a feature on selection and show metadata in the InfoBox.
        viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(movement) {

          // Pick a new feature
          var pickedFeature = viewer.scene.pick(movement.position);

        console.log(pickedFeature)
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);





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
