import {HadObjClass} from "./HadObjClass";
class HadLaneMarkLink extends HadObjClass{
  constructor(pbfdata){
    super(pbfdata)
    this.type="had_lane_link"
    this.style={
      color:Cesium.Color.SNOW,
      width:2,
      alpha:1,
      dashLength:20.0
    }
  }
  getAttr(){

  }
  getGeom(){
      var geometryInstanceArray=[]
      var lineStringArray
      //遍历获取图幅中的所有link数量

      this.pbfdata.hadlanelinklist.linkList.map(v =>{
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
    var pr=  viewer.scene.primitives.add(new Cesium.Primitive({
      geometryInstances : this.getGeom(),
      appearance : new Cesium.PolylineMaterialAppearance({
        material : Cesium.Material.fromType("PolylineDash", {
          color :this.style.color,
          dashLength: this.style.dashLength
        })
      }),
    }))
    pr.layerType="had_lane_link"
  }


}
export {HadLaneMarkLink}
