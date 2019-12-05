<template>
  <div class="wrapper">
    <div class="selectModelType">
      <!--<el-radio  label="1" @change="loadCompile">加载静态文件夹中的模型</el-radio>-->
      <el-select    placeholder="请选择" @change="modeTypeChange">
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
import  drawVec from './js/drawOnline'
  import  Vcesium from '../../components/cesiumViewer'

var activeShapePoints = [];
var activeShape;
var floatingPoint;
  export default {
    name: "load3Dmodel",
    data() {
      return {
        typeValue:"polygon",
        options: [{
          value: 'clear',
          label: '清空'
        },{
          value: 'point',
          label: '点'
        },{
          value: 'line',
          label: '线'
        },{
          value: 'polygon',
          label: '面'
        },{
          value: 'circle',
          label: '圆'
        },{
          value: 'rectangle',
          label: '矩形'
        },{
          value: 'sphere',
          label: '球体'
        },{
          value: 'ellipsoid',
          label: '椭球'
        }
          ,{
            value: 'wall',
            label: '墙'
          } ,{
            value: 'polylineVolume',
            label: '管道(体积线)'
          },{
            value: 'cone',
            label: '圆锥'
          },{
            value: 'Cylinder',
            label: '圆柱'
          },{
            value: 'Corridor',
            label: '无体积管道线'
          }
          ,{
            value: 'Ellipse',
            label: '椭圆'
          }
          ,{
            value: 'box',
            label: '长方体'
          }]


      }
    },
    components:{
      Vcesium
    },

    mounted(){
    },
    methods:{
      terminateShape() {
        let dataObjLine={}
        activeShapePoints.pop();
        dataObjLine.type=this.typeValue
        dataObjLine.positions=activeShapePoints
        drawVec(dataObjLine)
         viewer.entities.remove(floatingPoint);
        viewer.entities.remove(activeShape);
        floatingPoint = undefined;
        activeShape = undefined;
        activeShapePoints = [];
        },
      otherOperations(){
        let _this=this
        viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
        let dataObjPt={}
        let dataObjLine={}
        handler.setInputAction(function(event) {

          var ray=viewer.camera.getPickRay(event.position);
          var earthPosition = viewer.scene.globe.pick(ray, viewer.scene);
          if (Cesium.defined(earthPosition)) {
            if (activeShapePoints.length === 0) {
              dataObjPt.type="point"
              dataObjPt.positions=earthPosition
              floatingPoint = drawVec(dataObjPt);
              //floatingPoint = drawVec("point",earthPosition);

              activeShapePoints.push(earthPosition);

              //类似于vue的响应式机制，可动态改变生成的线,该数据存于内存之中
              var dynamicPositions = new Cesium.CallbackProperty(function () {
                if (_this.typeValue === 'polygon') {
                  return new Cesium.PolygonHierarchy(activeShapePoints);
                }
                return activeShapePoints;
              }, false);
              dataObjLine.type=_this.typeValue
              dataObjLine.positions=dynamicPositions
              activeShape =  drawVec(dataObjLine)
            }
            activeShapePoints.push(earthPosition);
            dataObjPt.type="point"
            dataObjPt.positions=earthPosition
            floatingPoint = drawVec(dataObjPt);
            // floatingPoint = drawVec("point",earthPosition);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.setInputAction(function(event) {
          if (Cesium.defined(floatingPoint)) {
            var ray=viewer.camera.getPickRay(event.endPosition);
            var newPosition = viewer.scene.globe.pick(ray, viewer.scene);
            if (Cesium.defined(newPosition)) {
              floatingPoint.position.setValue(newPosition);
              activeShapePoints.pop();
              activeShapePoints.push(newPosition);
            }
          }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.setInputAction(function(event) {
          _this.terminateShape()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
      },
      modeTypeChange(v){

        //this.terminateShape()
        debugger
        this.typeValue=v
        // let _this=this
        // viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        // var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
        // let dataObjPt={}
        // let dataObjLine={}
        // switch (v){
        //   case "clear":
        //     viewer.entities.removeAll()
        //     break
        //   case "line":
        //     handler.setInputAction(function(event) {
        //
        //       var ray=viewer.camera.getPickRay(event.position);
        //       var earthPosition = viewer.scene.globe.pick(ray, viewer.scene);
        //
        //       if (Cesium.defined(earthPosition)) {
        //         if (activeShapePoints.length === 0) {
        //
        //           dataObjPt.type="point"
        //           dataObjPt.positions=earthPosition
        //           floatingPoint = drawVec(dataObjPt);
        //           //floatingPoint = drawVec("point",earthPosition);
        //           activeShapePoints.push(earthPosition);
        //
        //           //类似于vue的响应式机制，可动态改变生成的线
        //           var dynamicPositions = new Cesium.CallbackProperty(function () {
        //             return activeShapePoints;
        //           }, false);
        //           dataObjLine.type="line"
        //           dataObjLine.positions=dynamicPositions
        //           activeShape =  drawVec(dataObjLine)
        //           // activeShape =  _this.drawShape(dynamicPositions);
        //         }
        //         activeShapePoints.push(earthPosition);
        //         dataObjPt.type="point"
        //         dataObjPt.positions=earthPosition
        //         floatingPoint = drawVec(dataObjPt);
        //         // floatingPoint = drawVec("point",earthPosition);
        //       }
        //     }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        //     handler.setInputAction(function(event) {
        //       if (Cesium.defined(floatingPoint)) {
        //         var ray=viewer.camera.getPickRay(event.endPosition);
        //         var newPosition = viewer.scene.globe.pick(ray, viewer.scene);
        //         if (Cesium.defined(newPosition)) {
        //           floatingPoint.position.setValue(newPosition);
        //           activeShapePoints.pop();
        //           activeShapePoints.push(newPosition);
        //         }
        //       }
        //     }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        //     handler.setInputAction(function(event) {
        //       _this.terminateShape()
        //     }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        //     break
        //   case "polygon":
        //
        // }


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
