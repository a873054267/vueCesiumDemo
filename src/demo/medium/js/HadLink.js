import {HadObjClass} from "./HadObjClass";
class HadLink extends HadObjClass{
  constructor(pbfdata){
    super(pbfdata)
    this.type="had_link"
    this.style={
      color:Cesium.Color.BLUE,
      width:5,
      alpha:1
    }
  }
  getAttr(){

  }
  getGeom(){
      var geometryInstanceArray=[]
      var lineStringArray
      //遍历获取图幅中的所有link数量
      this.pbfdata.linkList.map(v =>{
        lineStringArray = new Array();
        //遍历取出每条link的坐标，并添加高程
        v.geometry.linestringList.map(v2 => {
          lineStringArray.push(v2.longitude);
          lineStringArray.push(v2.latitude);
          lineStringArray.push(v2.elevation);

        })
       let pr= this.getGeometryInstance(lineStringArray)
        geometryInstanceArray.push(pr)
      })
      return geometryInstanceArray



  }
  render(){
    var primitive= viewer.scene.primitives.add(new Cesium.Primitive({
      geometryInstances : this.getGeom(),
      appearance : new Cesium.PolylineMaterialAppearance({
        material : new Cesium.Material.fromType("PolylineArrow", {
          color : this.style.color,
        })
      })
    }))
    primitive.layerType="had_link"
  }


}
export {HadLink}
