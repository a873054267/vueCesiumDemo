import {HadObjClass} from "./HadObjClass";
class HadLanePolygon extends HadObjClass{
  constructor(pbfdata){
    super(pbfdata)
    this.type="HadLanePolygon"
    this.style={
      color:new Cesium.Color(0,0,1,0.3),
      width:1,
      alpha:1
    }
  }
  getAttr(){

  }
  getLineString(linestringList){
    var lineStringArray = new Array();
    //遍历取出每条link的坐标，并添加高程
    linestringList.map(v2 =>{
        lineStringArray.push(v2.longitude);
        lineStringArray.push(v2.latitude);
        lineStringArray.push(v2.elevation);

    })
    return lineStringArray
  }
  getGeom(){
    // 根据中心线左侧laneid和右侧laneid拼成车道面
    var polygenArray = new Array();

      let laneMarkLinkArray={}
      //遍历获取图幅中的所有link数量
      //console.log(this.pbfdata)
    //先获取mark的坐标，以lanemarklinkpid为key值来存储，lanelink中对应存储了geometry
      this.pbfdata.hadlanemarklinklist.linkList.map(v =>{
        // 获得ID
        var lanemarklinkpid = v.lanemarklinkpid;
        // 获得线段
        laneMarkLinkArray["mlp_" + lanemarklinkpid] = this.getLineString(v.geometry.linestringList);

      })

    var lineStringArray
    //遍历中心线
    this.pbfdata.hadlanelinklist.linkList.map(v =>{
      lineStringArray = new Array();
      // 左侧边界
      var leftLaneMarkLinkPid = v.leftlanemarklinkpid;
      // 右侧边界
      var rightLaneMarkLinkPid = v.rightlanemarklinkpid;
      // 取左侧坐标
      lineStringArray = lineStringArray
        .concat(laneMarkLinkArray["mlp_"
        + leftLaneMarkLinkPid]);// 把左边的坐标存储上
      var rightLength = laneMarkLinkArray["mlp_" + rightLaneMarkLinkPid].length;
      var rightArray = laneMarkLinkArray["mlp_" + rightLaneMarkLinkPid];

      for (var i = 0; i < rightLength;) {// 反向存储右侧坐标

        {
          var offset3 = rightLength - 3 - i;
          lineStringArray = lineStringArray.concat([
            rightArray[offset3],
            rightArray[offset3 + 1],
            rightArray[offset3 + 2] ]);
          i = i + 3;
        }
      }
      // 加入第一个坐标
      polygenArray.push(lineStringArray);

    })
      return polygenArray
   }
   generateGemetryInstance() {
     // 获得绘制对象
     var geometryInstanceArray = new Array();
     let instance
     this.getGeom().map(v => {
       var polygon = new Cesium.PolygonGeometry({// 直接使用这个会生成贴地面
         polygonHierarchy : new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArrayHeights(v))
       });
      instance= new Cesium.GeometryInstance({
         geometry : Cesium.CoplanarPolygonGeometry.createGeometry(polygon)
       });
      geometryInstanceArray.push(instance)

     })

     return geometryInstanceArray
   }

  render(){
    var pr=  viewer.scene.primitives.add(
      new Cesium.Primitive({
      geometryInstances : this.generateGemetryInstance(),
      appearance : new Cesium.MaterialAppearance({
        material : Cesium.Material.fromType("Color", {
          color : this.style.color
        }),
        faceForward : true,
        classificationType : Cesium.ClassificationType.BOTH

      }),
   asynchronous:false
    }))
    pr.layerType="HadLanePolygon"
  }


}
export {HadLanePolygon}
