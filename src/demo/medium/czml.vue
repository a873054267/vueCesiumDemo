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
      dddd:function sfd() {
        console.log(geojson2h3)
        return "1111"
      }
    },
    methods:{
      ctrGridLayer(v){

        viewer.imageryLayers._layers[1].show=v

      },

      otherOperations(){
        var czml = [{
          "id" : "document",
          "name" : "box",
          "version" : "1.0"
        }, {
          "id" : "shape1",
          "name" : "Blue box",
          "position" : {
            "cartographicDegrees" : [-114.0, 40.0, 300000.0]
          },
          "box" : {
            "dimensions" : {
              "cartesian": [400000.0, 300000.0, 500000.0]
            },
            "material" : {
              "solidColor" : {
                "color" : {
                  "rgba" : [0, 0, 255, 255]
                }
              }
            }
          }
        }, {
          "id" : "shape2",
          "name" : "Red box with black outline",
          "position" : {
            "cartographicDegrees" : [-107.0, 40.0, 300000.0]
          },
          "box" : {
            "dimensions" : {
              "cartesian": [400000.0, 300000.0, 500000.0]
            },
            "material" : {
              "solidColor" : {
                "color" : {
                  "rgba" : [255, 0, 0, 128]
                }
              }
            },
            "outline" : true,
            "outlineColor" : {
              "rgba" : [0, 0, 0, 255]
            }
          }
        }, {
          "id" : "shape3",
          "name" : "Yellow box outline",
          "position" : {
            "cartographicDegrees" : [-100.0, 40.0, 300000.0]
          },
          "box" : {
            "dimensions" : {
              "cartesian": [400000.0, 300000.0, 500000.0]
            },
            "fill" : false,
            "outline" : true,
            "outlineColor" : {
              "rgba" : [255, 255, 0, 255]
            }
          }
        }];
        var dataSourcePromise = Cesium.CzmlDataSource.load(czml);
        viewer.dataSources.add(dataSourcePromise);
        viewer.zoomTo(dataSourcePromise);
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
