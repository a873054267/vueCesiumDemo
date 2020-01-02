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


  import  Vcesium from '../../components/cesiumViewer'
    export default {
        name: "load3Dmodel",
      data() {
        return {
          value:"point",
          options: [{
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
         computeCircle(radius) {
           var positions = [];
          for (var i = 0; i < 360; i++) {
            var radians = Cesium.Math.toRadians(i);
            positions.push(new Cesium.Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)));
          }
          return positions;
          },
          loadFeature(type){
            viewer.entities.removeAll();
            let entity

        switch (type) {
          case "box":
            entity=viewer.entities.add({
              name: 'Blue box',
              position: Cesium.Cartesian3.fromDegrees(103.0, 40.0),
              box: {
                dimensions: new Cesium.Cartesian3(400000.0, 300000.0, 500000.0),
                material: Cesium.Color.BLUE
              }
            });
            break
          case "Ellipse":
            entity= viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(103.0, 40.0),
              name: 'Red ellipse on surface with outline',
              ellipse: {
                semiMinorAxis: 250000.0,
                semiMajorAxis: 400000.0,
                material: Cesium.Color.RED.withAlpha(0.5),
                outlineColor: Cesium.Color.RED
              }

            });
            break
          case "Corridor":
            entity=   viewer.entities.add({
              name: 'Red corridor on surface with rounded corners and outline',
              corridor: {
                positions: Cesium.Cartesian3.fromDegreesArray([
                  100.0, 40.0,
                  105.0, 40.0,
                  105.0, 35.0
                ]),
                width: 200000.0,
                material: Cesium.Color.RED.withAlpha(0.5),
                outlineColor: Cesium.Color.RED
              }
            });
            break
          case "Cylinder":
            entity= viewer.entities.add({

              name: 'Green cylinder with black outline',

              position: Cesium.Cartesian3.fromDegrees(100.0, 40.0, 200000.0),
              cylinder: {
                length: 400000.0,
                topRadius: 200000.0,
                bottomRadius: 200000.0,
                material: Cesium.Color.GREEN.withAlpha(0.5),
               // outline: true,
                outlineColor: Cesium.Color.DARK_GREEN
              }
            });
            break
          case "cone":
            entity= viewer.entities.add({
              name: 'Red cone',
              position: Cesium.Cartesian3.fromDegrees(105.0, 40.0, 200000.0),
              cylinder: {
                length: 400000.0,
                topRadius: 0.0,
                bottomRadius: 200000.0,
                material: Cesium.Color.RED
              }
            });
            break

          case "polylineVolume":
            entity=viewer.entities.add({
              name: 'Red tube with rounded corners',
              polylineVolume: {
                positions: Cesium.Cartesian3.fromDegreesArray([85.0, 32.0, 85.0, 36.0, 89.0, 36.0]),
                shape: this.computeCircle(60000.0),
                material: Cesium.Color.RED
              }
            });
            break
          case "wall":
            entity= viewer.entities.add({
              name: 'Green wall from surface with outline',
              wall: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights([107.0, 43.0, 100000.0,
                  97.0, 43.0, 100000.0,
                  97.0, 40.0, 100000.0,
                  107.0, 40.0, 100000.0,
                  107.0, 43.0, 100000.0]),
                material: Cesium.Color.GREEN
              }
            });
            break
          case "ellipsoid":
            entity=  viewer.entities.add({
              name: 'Blue ellipsoid',
              position: Cesium.Cartesian3.fromDegrees(114.0, 40.0, 300000.0),
              ellipsoid: {
                radii: new Cesium.Cartesian3(200000.0, 200000.0, 300000.0),
                material: Cesium.Color.BLUE
              }
            });
            break
          case "sphere":
            entity=  viewer.entities.add({
              name: 'Red sphere with black outline',
              position: Cesium.Cartesian3.fromDegrees(107.0, 40.0, 300000.0),
              ellipsoid: {
                radii: new Cesium.Cartesian3(300000.0, 300000.0, 300000.0),
                material: Cesium.Color.RED.withAlpha(0.5),
                outlineColor: Cesium.Color.BLACK
              }
            });
            break
          case "rectangle":
           entity= viewer.entities.add({
              name: 'Red translucent rectangle with outline',
              rectangle: {
                coordinates: Cesium.Rectangle.fromDegrees(80.0, 20.0, 110.0, 25.0),
                material: Cesium.Color.RED.withAlpha(0.5),
                //outline: true,
                outlineColor: Cesium.Color.RED
              }
            });
            break


          case "point":
            entity =viewer.entities.add({
              id:"point",
              position : Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
              point : {
                pixelSize : 10,
                color : Cesium.Color.YELLOW
              }});

            //viewer.trackedEntity=entity
            break
          case "circle":
            entity= viewer.entities.add({
              id:"circle",
              position: Cesium.Cartesian3.fromDegrees(111.0, 40.0, 150000.0),
              name: 'Green circle at height',
              ellipse: {
                semiMinorAxis: 300000.0,
                semiMajorAxis: 300000.0,
                height: 200000.0,
                material: Cesium.Color.GREEN
              }
            });
           // viewer.trackedEntity=entity
            break
          case "line":
            entity=  viewer.entities.add({
              id:"line",
              name: 'Red line on the surface',
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray([75, 35, 125, 35]),
                width: 5,
                material: Cesium.Color.RED
              }
            });
           // viewer.trackedEntity=entity
            break
          case "polygon":
            entity= viewer.entities.add({
              id:"polygon",
              name: 'Red polygon on surface',
              polygon: {
                hierarchy: Cesium.Cartesian3.fromDegreesArray([115.0, 37.0, 115.0, 32.0, 107.0, 33.0, 102.0, 31.0, 102.0, 35.0]),
                material: Cesium.Color.RED
              }
            });
           // viewer.trackedEntity=entity
            break

        }
        //追踪到矢量所在处
            //console.log(entity)
            viewer.zoomTo(entity);

        },
        otherOperations(){
          this.loadFeature("point")

          var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
          handler.setInputAction(function(movement) {
            var pick = viewer.scene.pick(movement.position);
            console.log(pick)
            pick.primitive.color=new Cesium.Color(1.0, 0.0, 0.0, 1.0);

            //   console.log(pick)
            // console.log(viewer.entities.getById(pick.id._id))
            // pick.id.point.color=new Cesium.Color(1.0, 0.0, 0.0, 1);
            // console.log(pick.primitive.color)
            // pick.primitive.color=new Cesium.Color(1.0, 0.0, 0.0, 0);
            // console.log(pick.primitive.color)

          },Cesium.ScreenSpaceEventType.LEFT_CLICK);
        },
        modeTypeChange(v){
            this.loadFeature(v)

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
