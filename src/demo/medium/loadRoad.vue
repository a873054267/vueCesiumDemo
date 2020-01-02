<template>
  <div class="wrapper">
    
    <div class="selectModelType" >
      <div class="tip">默认控件的显示与隐藏</div>
      <span class="el-checkbox" style="font-weight: bold">General</span>
      <el-checkbox-group v-model="checkfactorList" @change="ctrObjVis">

        <el-checkbox  v-for="(item,index) in attr" :key="item.lable" :label="index">{{item.lable}}</el-checkbox>
      </el-checkbox-group>
      <!--<template v-for="(item,index) in attr">-->
      <!--<div class="checkbox-style">-->
      <!--<el-checkbox   @change="ctrObjVis(index)" class="chb"-->
      <!--v-model="item.checked"-->
      <!--&gt;{{item.lable}}</el-checkbox>-->
      <!--</div>-->
      <!--</template>-->
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
  import {HadPole} from "./js/HadPole";
  import {HadArrow} from "./js/HadArrow";
  import {HadCurb} from "./js/HadCurb";
  import {HadTrafficSign} from "./js/HadTrafficSign";

  //import * from "./js/importIndex";
  import axios from 'axios'
  export default {
    name: "hello",
    data(){
      return{
        attr:[
          //道路
          {
            lable:"link",
            value:"had_link",
            checked:true
          },
          //箭头
          {
            lable:"arrow",
            value:"had_object_arrow",
          },
          //车道
          {
            lable:"laneLink",
            value:"had_lane_link",
          },
          //车道杆
          {
            lable:"linePole",
            value:"had_object_line_pole",
          },
          //杆
          {
            lable:"pole",
            value:"had_object_pole"
          },
          //路牙
          {
            lable:"curb",
            value:"had_object_curb"
          },
          //交通牌
          {
            lable:"trafficSign",
            value:"had_object_traffic_sign"
          },
          //墙
          {
            lable:"wall",
            value:'had_object_wall',
          },
          //上方障碍物
          {
            lable:"overheadCrossing",
            value:'had_object_overhead_crossing',
          },
          //公交站牌
          {
            lable:"busStop",
            value:'had_object_bus_stop',
          },
          //电话亭
          {
            lable:"callBox",
            value:'had_object_call_box',
          },
          //人行横道
          {
            lable:"crossWalk",
            value:'had_object_cross_walk',
          },
          //导流区
          {
            lable:"fillArea",
            value:'had_object_fill_area',
          },
          //可变交通信息牌
          {
            lable:"messageSign",
            value:'had_object_message_sign',
          },
          //可变交通信息牌
          {
            lable:"overheadStructure",
            value:'had_object_overhead_structure',
          },
          //桥墩
          {
            lable:"pillar",
            value:'had_object_pillar',
          },
          //桥墩
          {
            lable:"text",
            value:'had_object_text',
          },
          //减速带
          {
            lable:"speedBump",
            value:'had_object_speed_bump',
          },
          //轮廓标
          {
            lable:"delineator",
            value:'had_object_delineator',
          },
          //沟
          {
            lable:"ditch",
            value:'had_object_ditch',
          },
          //停止位置
          {
            lable:"stopLocation",
            value:'had_object_stop_location',
          },
          //符号
          {
            lable:"symbol",
            value:'had_object_symbol',
          },
          //垂直墙
          {
            lable:"wallPerpendicular",
            value:'had_object_wall_perpendicular',
          },
          //收费站
          {
            lable:"tollBooth",
            value:'had_object_toll_booth',
          },
          //隧道
          {
            lable:"tunnel",
            value:'had_object_tunnel',
          },
          //交通灯
          {
            lable:"trafficLights",
            value:'had_object_traffic_lights',
          },
          //护栏
          {
            lable:"trafficBarrier",
            value:'had_object_traffic_barrier',
          },
          //警示区
          {
            lable:"warningArea",
            value:'had_object_warning_area',
          },
        ],
        //选中的数据
        checkfactorList:[],
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
            obj3.render()
            obj2.render()
            break
          case "had_object_pole":
            obj=new HadPole(data)
            break;
          case "had_object_arrow":
            obj=new HadArrow(data)
                break
          case "had_object_curb":
            obj=new HadCurb(data)
                break
          case "had_object_traffic_sign":
            obj=new HadTrafficSign(data)
            break
        }
        obj.render()
      },
      //根据图幅列表查询数据
      queryDataByMeshList(meshList){
        let _this=this
        //要查询的数据种类
        let typeList=["had_link","had_lane_link","had_object_pole","had_object_curb","had_object_traffic_sign"]
        //typeList=["had_object_traffic_sign"]
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
            break
          case "had_object_pole":
            data=proto.com.navinfo.had.model.HadObjectPoleList.deserializeBinary(bytes).toObject();
            break
          case "had_object_arrow":
            data=proto.com.navinfo.had.model.HadObjectArrowList.deserializeBinary(bytes).toObject();
            break
          case "had_object_curb":
            data=proto.com.navinfo.had.model.HadObjectCurbList.deserializeBinary(bytes).toObject();
            break
          case "had_object_traffic_sign":
            data=proto.com.navinfo.had.model.HadObjectTrafficSignList.deserializeBinary(bytes).toObject();
            break

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
        console.log(Cesium.Color.BLUE)
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
      ctrObjVis(indexArray){
        let checkedLabelArray = [];
        indexArray.forEach((item,index)=>{
          checkedLabelArray.push(this.attr[item].lable); //存储选中数据的label;
        });
        viewer.scene.primitives._primitives.forEach((item,array)=>{
          //全部设置为false
          item.show= false
          //选中的设为true
          if(checkedLabelArray.indexOf(item.layerType)!=-1){
            item.show=true;
          }
        });
        // var showLayer=viewer.scene.primitives._primitives.filter(v =>{
        //   return checkedLabelArray.indexOf(v.layerType)!=-1;
        // })
        // // console.log(laneLink)
        // showLayer.map(v => {
        //
        //   v.show=true;
        // })
        // viewer.scene.primitives._primitives.appearance.show=false
      }
    }
  }
</script>

<style scoped>
  .el-checkbox {
    display: table;
    color: #EDFFFF!important;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    margin-right: 30px;
  }
  .checkbox-style{
    text-align: left;
  }
  .selectModelType{
    color:#EDFFFF;
    transition: width ease-in-out 0.25s;
    background: rgba(48,51,54,0.8);
    border: 1px solid #444;
    /*background-color: #4C4C4B;*/
    /*opacity:0.2;*/
    position: absolute;
    width: 220px;
    margin: 20px;
    z-index: 100;
    padding: 10px;
  }
  .tip {
    padding-bottom:3px;
    border-bottom: 1px solid rgba(255,255,255,0.5);
    margin-bottom:10px;
  }
  .chb{
    margin: 3px;
  }
</style>
