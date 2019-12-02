<template>
    <div class="wrapper">
      <div class="selectModelType">
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

  import BaiDuImageryProvider from './js/BaiDuImageryProvider'
  import  Vcesium from '../../components/cesiumViewer'
    export default {
        name: "loadMapService",
      data() {
        return {
          value:"coor",
          options: [{
            value: 'fly',
            label: '飞行'
          },{
            value: 'flyFromViaTo',
            label: '经过某个地方飞行至'
          },{
            value: 'rectangle',
            label: '矩形视图定位'
          },{
            value: 'coor',
            label: '坐标系视图'
          },{
            value: 'ICRF',
            label: '地球视图'
          },{
            value: 'google',
            label: '谷歌'
          },{
            value: 'amap',
            label: '高德'
          }
            ,{
              value: 'tencent',
              label: '腾讯地图'
            } ,{
              value: 'bmap',
              label: '百度地图'
            }]


        }
      },
      components:{
          Vcesium
      },

      mounted(){
      },
      methods:{
         viewInICRF() {
        viewer.camera.flyHome(0);
        },
        losAngelesToTokyo(adjustPitch) {
     var camera = viewer.scene.camera;

       var tokyoOptions = {
      destination : Cesium.Cartesian3.fromDegrees(139.8148, 35.7142, 20000.0),
      orientation: {
        heading : Cesium.Math.toRadians(15.0),
        pitch : Cesium.Math.toRadians(-60),
        roll : 0.0
      },
      duration: 20,
      flyOverLongitude: Cesium.Math.toRadians(60.0)
    };

    var laOptions = {
      destination : Cesium.Cartesian3.fromDegrees(-117.729, 34.457, 10000.0),
      duration: 5,
      orientation: {
        heading : Cesium.Math.toRadians(-15.0),
        pitch : -Cesium.Math.PI_OVER_FOUR,
        roll : 0.0
      }
    };
    console.log(laOptions)

    laOptions.complete = function() {
      setTimeout(function() {
        camera.flyTo(tokyoOptions);
      }, 1000);
    };
    if (adjustPitch) {
      tokyoOptions.pitchAdjustHeight = 1000;
      laOptions.pitchAdjustHeight = 1000;
    }

    camera.flyTo(laOptions);
  },
        setReferenceFrame() {

    var center = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
    var transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);

    // View in east-north-up frame
    var camera = viewer.camera;
    camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z;
    camera.lookAtTransform(transform, new Cesium.Cartesian3(-120000.0, -120000.0, 120000.0));

    // Show reference frame.  Not required.
    referenceFramePrimitive = viewer.scene.primitives.add(new Cesium.DebugModelMatrixPrimitive({
            modelMatrix : transform,
            length : 100000.0
          }));
  },
        otherOperations(){
         // this.setReferenceFrame()
          //this.viewInICRF()
          this.losAngelesToTokyo()

        },
        modeTypeChange(v){


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
