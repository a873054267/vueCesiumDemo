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
        modeTypeChange(v){
          this.loadFeature(v)

        },
        loadFeature(type){
          viewer.scene.primitives.removeAll();
          let pr
          let instance

          switch (type) {
            case "box":
              instance= new Cesium.GeometryInstance({
                geometry: new Cesium.BoxGeometry({
                  vertexFormat : Cesium.VertexFormat.POSITION_ONLY,
                  maximum : new Cesium.Cartesian3(25.0, 25.0, 63780000),
                  minimum : new Cesium.Cartesian3(-25.0, -25.0, 6378000)
                })
              });
              pr=new Cesium.Primitive({
                geometryInstances:new Cesium.GeometryInstance({
                  geometry : instance
                }),
                appearance: new Cesium.EllipsoidSurfaceAppearance({
                  material:Cesium.Material.fromType('Color',{
                    color:new Cesium.Color(1.0, 0.0, 0.0, 1.0)
                  })
                })
              })

              break
            case "Ellipse":
              instance= new Cesium.GeometryInstance({
                geometry: new Cesium.EllipseGeometry({
                  center : Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
                  semiMajorAxis : 500000.0,
                  semiMinorAxis : 300000.0,
                  rotation : Cesium.Math.toRadians(60.0)
                })
              });
              pr=new Cesium.Primitive({
                geometryInstances:new Cesium.GeometryInstance({
                  geometry : instance
                }),
                appearance: new Cesium.EllipsoidSurfaceAppearance({
                  material:Cesium.Material.fromType('Color',{
                    color:new Cesium.Color(1.0, 0.0, 0.0, 1.0)
                  })
                })
              })

              break
            case "Corridor":
              break
            case "Cylinder":
              break
            case "cone":
              break

            case "polylineVolume":
              break
            case "wall":
              break
            case "ellipsoid":
              break
            case "sphere":
              break
            case "rectangle":
              instance = new Cesium.RectangleGeometry({
                rectangle: Cesium.Rectangle.fromDegrees(0, 0, 5, 5),
                vertexFormat:Cesium.EllipsoidSurfaceAppearance.VERTEXT_FORMAT
              })
               pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
                  geometry : instance
                }),
                appearance : new Cesium.PolylineMaterialAppearance({
                  material : Cesium.Material.fromType('Color')
                })
              })
              break

            case "point":
              instance= new Cesium.GeometryInstance({
                geometry:new Cesium.CircleGeometry({
                  center : Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
                  radius : 1.0
                })
              });
              pr=new Cesium.Primitive({
                geometryInstances:new Cesium.GeometryInstance({
                  geometry : instance
                }),
                appearance: new Cesium.EllipsoidSurfaceAppearance({
                  material:Cesium.Material.fromType('Color',{
                    color:new Cesium.Color(1.0, 0.0, 0.0, 1.0)
                  })
                })
              })
              break
            case "circle":

              break
            case "line":
               instance = new Cesium.PolylineGeometry({
                positions : Cesium.Cartesian3.fromDegreesArray([
                  0.0, 0.0,
                  5.0, 0.0
                ]),
                width : 10.0,
                vertexFormat : Cesium.PolylineMaterialAppearance.VERTEX_FORMAT
              })

              pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
                  geometry: instance,
                }),
                appearance : new Cesium.PolylineMaterialAppearance({
                  material : Cesium.Material.fromType('Color')
                })
              })
              break
            case "polygon":

              break

          }

          viewer.scene.primitives.add(pr);
          console.log(instance)
          // viewer.camera.setView({
          //   destination : Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883,5000)
          // });


        },
        otherOperations(){
          //primitive方式

          // console.log(instance)
          //viewer.camera.viewBoundingSphere(instance.geometry.boundingSphere)


          // viewer.zoomTo(sss)
          //this.loadFeature("box")
        },


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
