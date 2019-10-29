<template>
    <div class="wrapper">

        <Vcesium @loadeds="otherOperations"> </Vcesium>
      </div>
</template>

<script>
  /**
   * 工具库
   */
  import {
   getInfoDataForExtent
  } from "../../../static/js/utils.js";
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
          var div = document.createElement('DIV');
          div.className= "tooltipdiv";//
          viewer.container.appendChild(div)
          //一鼠标MOUSE_MOVE
           let handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
          var scene=viewer.scene
          handler.setInputAction(function(movement) {
            var cartesian = viewer.camera.pickEllipsoid(movement.endPosition, scene.globe.ellipsoid);
            if(cartesian) {
              var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
              var longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
              var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);
              div.innerText=longitudeString+","+latitudeString
              div.style.left=movement.endPosition.x+10+"px"
              div.style.top = (movement.endPosition.y - div.clientHeight / 2) + "px";
              //TooltipDiv.showAt(movement.endPosition,'MOUSE_MOVE');
            }else {

            }
          },Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        },
        //加载在编译目录下的三维模型


      }
    }
</script>

<style >
  .tooltipdiv {
    display: block;
    position: absolute;
    visibility: visible;
    max-width: 200px;
    min-width: 100px;
    padding: 1px 1px 1px 25px;
    font-size: 11px;
    z-index: 1000;
    width: 200px;
    height: 100px;
    bottom: 500px;
    border: 1px red solid;

  }

</style>
