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
              label: '无体积管道线/走廊'
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
         console.log(viewer.scene.primitives)
          this.loadFeature(v)

        },
        loadFeature(type){
          //viewer.scene.primitives.removeAll();
          let pr
          let instance

          switch (type) {
            case "box":
              //已成功
               instance = new Cesium.BoxGeometry({
                maximum : new Cesium.Cartesian3(250000.0, 250000.0, 250000.0),
                minimum : new Cesium.Cartesian3(-250000.0, -250000.0, -250000.0)
              });
              pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
                  geometry: instance,
                  modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
                    Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883)), new Cesium.Cartesian3(0.0, 0.0, 1000000.0), new Cesium.Matrix4()),
                }),
                appearance: new Cesium.EllipsoidSurfaceAppearance({
                  material:Cesium.Material.fromType('Color',{
                    color:new Cesium.Color(1.0, 0.0, 0.0, 1.0)
                  })
                })

              })

              break
            case "Ellipse":
                //已成功
              instance=  new Cesium.EllipseGeometry({
                  center : Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
                  semiMajorAxis : 500000.0,
                  semiMinorAxis : 300000.0,
                  rotation : Cesium.Math.toRadians(60.0)
                })
              ;
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
              //已成功
               instance = new Cesium.CorridorGeometry({
                 vertexFormat : Cesium.VertexFormat.POSITION_ONLY,

                 positions : Cesium.Cartesian3.fromDegreesArray([0, 5, 5, 3]),
                width : 100000
              });

               pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
                  geometry: instance,
                }),
                appearance: new Cesium.EllipsoidSurfaceAppearance({
                  material:Cesium.Material.fromType('Color',{
                    color:new Cesium.Color(0.0, 1.0, 0.0, 1.0)
                  })
                })
              })
              break
            case "Cylinder":
              //已成功
              instance = new Cesium.CylinderGeometry({
                length: 200000,
                topRadius: 80000,
                bottomRadius: 200000
              });
               pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
                  geometry: instance,
                  modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
                    Cesium.Cartesian3.fromDegrees(0,5)), new Cesium.Cartesian3(0.0, 0.0, 1000000.0), new Cesium.Matrix4()),
                }),
                 appearance: new Cesium.EllipsoidSurfaceAppearance({
                   material:Cesium.Material.fromType('Stripe')
                 })
              })
              break
            case "cone":
              //已成功
              instance = new Cesium.CylinderGeometry({
                length: 200000,
                topRadius: 0,
                bottomRadius: 200000
              });
              pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
                  geometry: instance,
                  modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
                    Cesium.Cartesian3.fromDegrees(0,5)), new Cesium.Cartesian3(0.0, 0.0, 1000000.0), new Cesium.Matrix4()),
                }),
                appearance: new Cesium.EllipsoidSurfaceAppearance({
                  material:Cesium.Material.fromType('Stripe')
                })
              })

              break

            case "polylineVolume":
              //已成功

              instance = new Cesium.PolylineVolumeGeometry({
                polylinePositions : Cesium.Cartesian3.fromDegreesArray([
                  0, 5,
                  5, 10
                ]),
                shapePositions : this.computeCircle(100000.0)
              });
              pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
                  geometry: instance,
                }),
                appearance: new Cesium.EllipsoidSurfaceAppearance({
                  material:Cesium.Material.fromType('Stripe')
                })
              })
              viewer.scene.primitives.add(pr);

              instance = new Cesium.PolylineGeometry({
                positions : Cesium.Cartesian3.fromDegreesArray([
                  0.0, 5.0,
                  5.0, 10.0
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
            case "wall":
              //已成功
               instance = new Cesium.WallGeometry({
                positions : Cesium.Cartesian3.fromDegreesArrayHeights([0, 5, 100000.0,
                  10, 5, 100000.0,
                  20, 15, 100000.0,
                  20, 5, 100000.0,
                  0,5.0, 100000.0])
              });
              pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
                  geometry: instance,
                }),
                appearance: new Cesium.EllipsoidSurfaceAppearance({
                  material:Cesium.Material.fromType('Stripe')
                })
              })
              break
            case "ellipsoid":
              //已成功
              instance= new Cesium.EllipsoidGeometry({
                radii : new Cesium.Cartesian3(1000000.0, 500000.0, 500000.0)
              });
              pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
                  geometry: instance,
                  modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
                    Cesium.Cartesian3.fromDegrees(0,5)), new Cesium.Cartesian3(0.0, 0.0, 1000000.0), new Cesium.Matrix4()),
                }),
                appearance: new Cesium.EllipsoidSurfaceAppearance({
                  material:Cesium.Material.fromType('Stripe')
                })
              })
              break
            case "sphere":
              //已成功
              instance= new Cesium.SphereGeometry({
                radius : 10000.0,
              });
              pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
                  geometry: instance,
                  modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
                    Cesium.Cartesian3.fromDegrees(0,5)), new Cesium.Cartesian3(0.0, 0.0, 0.0), new Cesium.Matrix4()),
                }),
                appearance: new Cesium.EllipsoidSurfaceAppearance({
                  material:Cesium.Material.fromType('Stripe')
                })
              })
              break
            case "rectangle":
              //已成功
              instance = new Cesium.RectangleGeometry({
                rectangle: Cesium.Rectangle.fromDegrees(0, 0, 5, 5),
                vertexFormat:Cesium.EllipsoidSurfaceAppearance.VERTEXT_FORMAT
              })
              pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
                  geometry : instance
                }),
                appearance: new Cesium.EllipsoidSurfaceAppearance({
                  material:Cesium.Material.fromType('Stripe')
                })
              })
              break
            case "point":
               instance= new Cesium.CircleGeometry({
                center : Cesium.Cartesian3.fromDegrees(0, 5),
                radius : 1000.0
              })

               pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
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
             instance = new Cesium.CircleOutlineGeometry({
               center : Cesium.Cartesian3.fromDegrees(0, 5),
                radius : 100000.0
              });
              pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
                  geometry : instance,
                  attributes : {
                    color : Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(1.0, 0, 0, 1.0))
                  }
                }),
                // appearance : new Cesium.MaterialAppearance({
                //   material : Cesium.Material.fromType('Color'),
                //   faceForward : true
                // })
                appearance : new Cesium.PerInstanceColorAppearance({
                  flat : true,
                  translucent : false
                })
                // appearance: new Cesium.EllipsoidSurfaceAppearance({
                //   material:Cesium.Material.fromType('Color',{
                //     color:new Cesium.Color(1.0, 0.0, 0.0, 1.0)
                //   })
                // })
                // appearance : new Cesium.PolylineMaterialAppearance({
                //   material : Cesium.Material.fromType('Color')
                // })


              })

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
              instance = new Cesium.PolygonGeometry({
                polygonHierarchy : new Cesium.PolygonHierarchy(
                  Cesium.Cartesian3.fromDegreesArray([
                    -109.0, 30.0,
                    -95.0, 30.0,
                    -95.0, 40.0,
                    -109.0, 40.0
                  ]),
                  [new Cesium.PolygonHierarchy(
                    Cesium.Cartesian3.fromDegreesArray([
                      -107.0, 31.0,
                      -107.0, 39.0,
                      -97.0, 39.0,
                      -97.0, 31.0
                    ]),
                    [new Cesium.PolygonHierarchy(
                      Cesium.Cartesian3.fromDegreesArray([
                        -105.0, 33.0,
                        -99.0, 33.0,
                        -99.0, 37.0,
                        -105.0, 37.0
                      ]),
                      [new Cesium.PolygonHierarchy(
                        Cesium.Cartesian3.fromDegreesArray([
                          -103.0, 34.0,
                          -101.0, 34.0,
                          -101.0, 36.0,
                          -103.0, 36.0
                        ])
                      )]
                    )]
                  )]
                ),
                extrudedHeight: 300000
              });
              pr=new Cesium.Primitive({
                geometryInstances : new Cesium.GeometryInstance({
                  geometry: instance,
                }),
                appearance: new Cesium.EllipsoidSurfaceAppearance({
                  material:Cesium.Material.fromType('Stripe')
                })
              })

              break

          }
          viewer.scene.primitives.add(pr);
          // console.log(instance)
          viewer.camera.setView({
            destination : Cesium.Cartesian3.fromDegrees(-109.0, 30.0,5000000)
          });


        },
        otherOperations(){
          this.loadFeature("circle")
        },
         computeCircle(radius) {
          var positions = [];
          for (var i = 0; i < 360; i++) {
            var radians = Cesium.Math.toRadians(i);
            positions.push(new Cesium.Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)));
          }
          return positions;
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
