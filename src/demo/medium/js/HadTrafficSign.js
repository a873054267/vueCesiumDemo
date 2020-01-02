import {HadObjClass} from "./HadObjClass";
class HadTrafficSign extends HadObjClass{
  constructor(pbfdata){
    super(pbfdata)
    this.type="had_object_traffic_sign"
    this.style={
      color:[Cesium.Color.BROWN,Cesium.Color.WHITE,Cesium.Color.YELLOW,Cesium.Color.RED,Cesium.Color.BROWN,Cesium.Color.BLUE,Cesium.Color.NAVAJOWHITE,
        Cesium.Color.BLACK,Cesium.Color.NAVAJOWHITE ,Cesium.Color.NAVAJOWHITE],
      width:5,
      alpha:1
    }
  }
  generateInstance(lineStringArray,color){
    var polygon = new Cesium.PolygonGeometry({// 直接使用这个会生成贴地面
      polygonHierarchy : new Cesium.PolygonHierarchy(
      Cesium.Cartesian3.fromDegreesArrayHeights(lineStringArray))
    });
    // 返回实例
    return new Cesium.GeometryInstance({
      geometry : Cesium.CoplanarPolygonGeometry.createGeometry(polygon),
      attributes : {
        color : Cesium.ColorGeometryInstanceAttribute.fromColor(color)
      }
    });


  }
  getGeom(){
    console.log(this.pbfdata)
    let colorIndex
      var geometryInstanceArray=[]
      var lineStringArray
    let color
    let pr
      //遍历获取图幅中的所有link数量
      this.pbfdata.objectList.map(v =>{

        colorIndex=parseInt(v.color)

        lineStringArray = new Array();
        //遍历取出每条link的坐标，并添加高程
        v.geometry.linestringList.map(v2 => {
         v2.linestringList.map(v3 => {
           lineStringArray.push(v3.longitude);
           lineStringArray.push(v3.latitude);
           lineStringArray.push(v3.elevation);
         })

        })
        if(colorIndex>8 || colorIndex<0){
          colorIndex=0
        }
        color=this.style.color[colorIndex]
       pr= this.generateInstance(lineStringArray,color)
        geometryInstanceArray.push(pr)
      })
      return geometryInstanceArray



  }
  render(){
    var primitive= viewer.scene.primitives.add(new Cesium.Primitive({
      geometryInstances : this.getGeom(),
      appearance : new Cesium.PerInstanceColorAppearance({
        flat : true,
        translucent : false
      }),
      asynchronous:false
    }))
    primitive.layerType="had_object_traffic_sign"
  }


}
export {HadTrafficSign}
