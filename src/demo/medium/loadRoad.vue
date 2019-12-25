<template>
    <div class="wrapper">
      <div class="selectModelType" >
        <div class="tip"><p>默认控件的显示与隐藏</p></div>

        <template v-for="(item,index) in attr">
          <div style="text-align: left">
          <el-checkbox   @change="ctrAttrVis(index)" class="chb"
                         v-model="item.value"
                          >{{item.lable}}</el-checkbox>
          </div>
        </template>
      </div>
        <Vcesium @loadeds="otherOperations"></Vcesium>
      </div>
</template>

<script>
  import  Vcesium from '../../components/cesiumViewer'
  import {getMeshList,getRect} from '../../commonJS/utils'
  import axios from 'axios'
    export default {
        name: "hello",
      data(){
          return{
            attr:[{
              lable:"link",
              value:true,
              key:"link"
            },{
              lable:"arrow",
              value:true,
              key:"arrow"
            },{
              lable:"laneLink",
              value:true,
              key:"laneLink",
            },{
              lable:"linePole",
              value:true,
              key:"linePole",
            },{
              lable:"pole",
              value:true,
              key:"pole"
            },{
              lable:"curb",
              value:true,
              key:"curb"
            },{
              lable:"trafficSign",
              value:true,
              key:"trafficSign"
            },{
              lable:"wall",
              value:true,
              key:"wall"
            },{
              lable:"overheadCrossing",
              value:true,
              key:"overheadCrossing"
            }
            ]
          }
      },
      components:{
          Vcesium
      },
      methods:{
        queryMeshDataByID(meshID,type,callfunc){
          //除去link和lanelink外，其他数据均为had_type
          let url="tileset/IDViewer/data/had_"
          if(type=="link" || type=="laneLink"){
            url+=type+"/"
          }else{
            url+=type+"object"
          }
          url+=meshID
          //let url="tileset/IDViewer/data/had_link/"+meshID
          axios.get(url,{
            responseType: 'blob',//arraybuffer/blob//加上格式，二进制
          }).then(res => {


            var reader = new FileReader();
            reader.readAsArrayBuffer(res.data);
            reader.onload = function(e) {
              var bytes = new Uint8Array(reader.result);
              var trafficLightsMessage = proto.com.navinfo.had.model.HadLinkList
                .deserializeBinary(bytes);
              callfunc(trafficLightsMessage.toObject())

            };

            // callback(trafficLightsMessage.toObject().objectList)
          }).catch( res => {
            console.log("图幅不存在")
          })

        },
        otherOperations(){
          let _this=this



          viewer.camera.flyTo({
            destination : Cesium.Cartesian3.fromDegrees(116.24638127872265, 40.0676722018202, 20000),
            complete : function() {
              var rect =getRect(viewer);
              var meshList=getMeshList(rect.northeast.lng,
                rect.southwest.lng, rect.northeast.lat, rect.southwest.lat)
              meshList.map(v => {
                _this.queryMeshDataByID(v,"link",_this.render)
              })
            }
          });


        },
        getGeometryInstance (lineStringArray) {

          return new Cesium.GeometryInstance({
            geometry : new Cesium.PolylineGeometry({
              positions : Cesium.Cartesian3.fromDegreesArrayHeights(lineStringArray),
              width : 5,// 线宽
              vertexFormat : Cesium.PolylineColorAppearance.POSITION_ONLY
            })
          });
        },
        render(data){// 获得绘制对象
          let _this=this
          var geometryInstanceArray = new Array();
          var lineStringArray

          //遍历获取图幅中的所有link数量
          data.linkList.map(v =>{
            lineStringArray = new Array();
            //遍历取出每条link的坐标，并添加高程
            v.geometry.linestringList.map(v2 => {
              lineStringArray.push(v2.longitude);
              lineStringArray.push(v2.latitude);
              lineStringArray.push(0);

            })
           geometryInstanceArray.push(_this.getGeometryInstance(lineStringArray))

          })

            viewer.scene.primitives.add(new Cesium.Primitive({
              geometryInstances : geometryInstanceArray,
              appearance : new Cesium.PolylineMaterialAppearance({
                material : new Cesium.Material.fromType("PolylineArrow", {
                  color : Cesium.Color.BLUE,
                })
              })
            }))

        },
        ctrAttrVis(v){


        }
      }
    }
</script>

<style scoped>
  .selectModelType{
    position: absolute;
    width: 220px;
    margin: 20px;
    z-index: 100;
    padding: 10px;

  }
  .chb{

    margin: 3px;
  }
</style>
