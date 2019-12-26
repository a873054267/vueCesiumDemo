<template>
  <div class="wrapper">
    <div class="selectModelType" >
      <div class="tip"><p>默认控件的显示与隐藏</p></div>

      <template v-for="(item,index) in attr">
        <div style="text-align: left">
          <el-checkbox   @change="ctrObjVis(index)" class="chb"
                         v-model="item.checked"
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
  import {HadLink} from "./js/HadLink";
  import {HadLaneLink} from "./js/HadLaneLink";
  import {HadLaneMarkLink} from "./js/HadLaneMarkLink";
  import {HadLanePolygon} from "./js/HadLanePolygon";
  import axios from 'axios'
  export default {
    name: "hello",
    data(){
      return{
        attr:[{
          lable:"link",
          value:"had_link",
          checked:true
        },{
          lable:"arrow",
          value:"had_object_arrow",

        },{
          lable:"laneLink",
          key:"had_lane_link",
        },{
          lable:"linePole",
          value:"had_object_line_pole",
        },{
          lable:"pole",

          value:"had_object_pole"
        },{
          lable:"curb",
          value:"had_object_curb"
        },{
          lable:"trafficSign",
          value:true,
          key:"had_object_traffic_sign"
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
      //返回的数据已经被反序列化了
      parseObjData(data,type){
        let obj;
        //分类解析返回的数据
        switch (type){
          case 'had_link':
            obj=new HadLink(data)
            break
          case "had_lane_link":
            //车道线
            obj=new HadLaneLink(data)
            //参考线
                let obj2=new HadLaneMarkLink(data)
            let obj3=new HadLanePolygon(data)
               // obj3.getGeom()
                obj3.render()
               // obj2.render()


        }
      //  obj.render()
      },
      //根据图幅列表查询数据
      queryDataByMeshList(meshList){
        let _this=this
        //要查询的数据种类
        let typeList=["had_link","had_lane_link"]
        meshList.map(v => {
          typeList.map(v2 =>{
            _this.queryMeshDataByID(v,v2,_this.parseObjData)
          })

        })
      },
      //反序列化
      parseHadData(type,bytes){

        let data
        switch (type){
          case "had_link":
            data = proto.com.navinfo.had.model.HadLinkList.deserializeBinary(bytes).toObject();
            break
          case "had_lane_link":
            data=proto.com.navinfo.had.model.HadLanes.deserializeBinary(bytes).toObject();
        }
        return data

      },
      //根据图幅号查询数据
      queryMeshDataByID(meshID,type,callback){
        let _this=this
        //除去link和lanelink外，其他数据均为had_type
        let url="tileset/IDViewer/data/"+type+"/"+meshID
        axios.get(url,{
          responseType: 'blob',//arraybuffer/blob//加上格式，二进制
        }).then(res => {
          let reader = new FileReader();
          reader.readAsArrayBuffer(res.data);
          reader.onload = function(e) {
            var bytes = new Uint8Array(reader.result);
            callback(_this.parseHadData(type,bytes),type);
          };
        }).catch( res => {
          console.log("图幅不存在")
        })

      },
      otherOperations(){

        let _this=this
        viewer.camera.flyTo({
          destination : Cesium.Cartesian3.fromDegrees(116.24638127872265, 40.0676722018202, 2000),
          complete : function() {
            let rect =getRect(viewer);
            let meshList=getMeshList(rect.northeast.lng,
              rect.southwest.lng, rect.northeast.lat, rect.southwest.lat)
            _this.queryDataByMeshList(meshList)

          }
        });


      },



      ctrObjVis(index){
        var laneLink=viewer.scene.primitives._primitives.filter(v =>{
          return v.layerType=="laneLink"
        })
        console.log(laneLink)
        laneLink.map(v => {

          v.show=!v.show
        })
        // viewer.scene.primitives._primitives.appearance.show=false

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
