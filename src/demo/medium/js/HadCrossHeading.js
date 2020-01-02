/*************
 * crossheading需要贴图，后续逻辑再更改
 */
import {HadObjClass} from "./HadObjClass";
class HadCrossHeading extends HadObjClass{
  constructor(pbfdata){
    super(pbfdata)
    this.type="had_object_overhead_crossing"
    this.style={
      color:Cesium.Color.BLUE,
      width:2,
      alpha:1
    }
  }
  getAttr(){

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
       let pr= this.getGeometryInstance(lineStringArray)
        geometryInstanceArray.push(pr)
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
    primitive.layerType="had_object_overhead_crossing"
  }


}
export {HadCrossHeading}
