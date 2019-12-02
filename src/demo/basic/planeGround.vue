<template>
    <div class="wrapper">
          <div class="selectModelType" v-show="false">
            <!--<el-radio  label="1" @change="loadCompile">加载静态文件夹中的模型</el-radio>-->
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
          },{
            value:"lc",
            label:"轮船模型glb"
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
        let  url='static/data//CesiumMan/Cesium_Man.glb'
          var worldTerrain =Cesium.createWorldTerrain();
          viewer.terrainProvider=worldTerrain

          var globe = viewer.scene.globe;

          var clippingPlanesEnabled = true;
          var edgeStylingEnabled = true;



          var position = Cesium.Cartesian3.fromRadians(-2.0862979473351286, 0.6586620013036164, 1400.0);

          var entity = viewer.entities.add({
            position : position,
            box : {
              dimensions : new Cesium.Cartesian3(1400.0, 1400.0, 2800.0),
              material : Cesium.Color.WHITE.withAlpha(0.3),
              outline : true,
              outlineColor : Cesium.Color.WHITE
            }
          });
          // viewer.entities.add({
          //   position : position,
          //   model : {
          //     uri : url,
          //     minimumPixelSize : 128,
          //     maximumScale : 800
          //   }
          // });

          globe.depthTestAgainstTerrain = true;
          globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
            modelMatrix : entity.computeModelMatrix(Cesium.JulianDate.now()),
            planes : [
              new Cesium.ClippingPlane(new Cesium.Cartesian3( 1.0,  0.0, 0.0), -700.0),
              new Cesium.ClippingPlane(new Cesium.Cartesian3(-1.0,  0.0, 0.0), -700.0),
              new Cesium.ClippingPlane(new Cesium.Cartesian3( 0.0,  1.0, 0.0), -700.0),
              new Cesium.ClippingPlane(new Cesium.Cartesian3( 0.0, -1.0, 0.0), -700.0)
            ],
            edgeWidth: edgeStylingEnabled ? 1.0 : 0.0,
            edgeColor: Cesium.Color.WHITE,
            enabled : clippingPlanesEnabled
          });
          viewer.trackedEntity = entity;





        },
        //加载在编译目录下的三维模型
        loadCompile(){

          add(url,200)
        },
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
              maximumScale : 20000
            },
            description:"\<div>与infobox关联的提示信息在description属性中设置</div>\<div>可添加html标签，斜杠开头</div>"
          });
          viewer.trackedEntity = entity;
          return entity

        },
        modeTypeChange(v){
          let url='static/data/CesiumMan/Cesium_Man.'
          url=url+v
          if(v=="lc"){
            url='static/data/CesiumMan/test.glb'
          }
          console.log(url)
          this.addModel(url,5)
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
