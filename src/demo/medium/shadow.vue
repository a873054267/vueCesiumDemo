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

      addModel(url,height){
        viewer.entities.removeAll();
        var position = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, height);
        var heading = Cesium.Math.toRadians(135);
        var pitch = 0;
        var roll = 0;
        var hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
        var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
//orientation为模型的方向，由三个参数决定pitch为绕x轴旋转的角度，通常称为俯仰角
//roll为绕z轴旋转，通常称为翻滚角，heading为绕y轴旋转的角度，通常称为横滚角
//这三个参数决定了我们初始看到模型时的角度
//摄影测量里又称为航向倾角，旁向倾角，相片旋角
        var entity = viewer.entities.add({
          name : url,
          position : position,
          orientation : orientation,
          model : {
            uri : url,
            minimumPixelSize : 128,
            maximumScale : 20000 //随地图等级放大缩小
          },
          description:"\<div>与infobox关联的提示信息在description属性中设置</div>\<div>可添加html标签，斜杠开头</div>"
        });viewer.trackedEntity = entity;

      },
      otherOperations(){
        let  url='static/data//CesiumMan/Cesium_Man.glb'
        this.addModel(url,0)
        viewer.shadows=true
        viewer.clock.currentTime = new Cesium.JulianDate(2457522.154792);



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
