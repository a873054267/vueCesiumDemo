<template>
    <div class="wrapper">
          <div class="selectModelType">
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
          //getInfoDataForExtent(1,2)
        let  url='static/data//CesiumMan/Cesium_Man.glb'
          this.addModel(url,5000)

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
          });viewer.trackedEntity = entity;

        },
        modeTypeChange(v){
          let url='static/data/CesiumMan/Cesium_Man.'
          url=url+v
          console.log(url)
          this.addModel(url,5000)
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
