import {HadObjClass} from "./HadObjClass";
class HadBusStop extends HadObjClass{
  constructor(pbfdata){
    super(pbfdata)
    this.type="had_object_bus_stop"
    this.style={
      color:Cesium.Color.RED,
      width:1,
      alpha:1
    }
  }
  generateInstance(lineStringArray){
    return new Cesium.GeometryInstance({
      geometry : new Cesium.PolylineGeometry({
        positions :  Cesium.Cartesian3.fromDegreesArrayHeights(lineStringArray),
        width : this.style.width,// 线宽
        //vertexFormat : Cesium.PolylineColorAppearance.VERTEX_FORMAT
      })
    });
  }
  getGeom(){
    console.log(this.pbfdata)
      var geometryInstanceArray=[]
      var lineStringArray
      //遍历获取图幅中的所有link数量
      this.pbfdata.objectList.map(v =>{
        lineStringArray = new Array();
        //遍历取出每条link的坐标，并添加高程
        v.geometry.linestringList.map(v2 => {
          v2.linestringList.map(v3 => {
            lineStringArray.push(v3.longitude);
            lineStringArray.push(v3.latitude);
            lineStringArray.push(v3.elevation);
          })

        })
        console.log(lineStringArray)
       let geomInstance= this.generateInstance(lineStringArray)
        geometryInstanceArray.push(geomInstance)
      })
      return geometryInstanceArray


  }
  render(){
    var primitive= viewer.scene.primitives.add(new Cesium.Primitive({
      geometryInstances : this.getGeom(),
      appearance : new Cesium.PolylineMaterialAppearance({
        material : new Cesium.Material.fromType("Color", {
          color : this.style.color,
        })
      })
    }))
    primitive.layerType="had_object_bus_stop"
  }


}
export {HadBusStop}
