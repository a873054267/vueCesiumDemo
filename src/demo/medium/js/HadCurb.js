import {HadObjClass} from "./HadObjClass";
class HadCurb extends HadObjClass{
  constructor(pbfdata){
    super(pbfdata)
    this.type="had_object_curb"
    this.style={
      color:Cesium.Color.CORNSILK,
      width:1,
      alpha:1
    }
  }

  /*************
   * 坐标顺序按照箭头指向左上角顺时针记录
   * 箭头是左转弯还是直行会根据arrowclass来判断
   * @param lineStringArray
   */
  generateInstance(lineStringArray){
    var geometry = new Cesium.PolylineVolumeGeometry({

      polylinePositions :  Cesium.Cartesian3.fromDegreesArrayHeights(lineStringArray),
      shapePositions :  [ new Cesium.Cartesian2(-0.08, -0.15),
        new Cesium.Cartesian2(0.08, -0.15),
        new Cesium.Cartesian2(0.08, 0.15),
        new Cesium.Cartesian2(-0.08, 0.15) ]
    });
    return new Cesium.GeometryInstance({
      geometry : geometry
    });
  }

  getGeom(){
    //console.log(this.pbfdata)
      var geometryInstanceArray=[]
      var lineStringArray
      //遍历获取图幅中的所有link数量

      this.pbfdata.objectList.map(v =>{

        lineStringArray = new Array();
        //遍历取出每条link的坐标，并添加高程
        v.geometry.linestringList.map(v2 => {
          lineStringArray.push(v2.longitude);
          lineStringArray.push(v2.latitude);
          lineStringArray.push(v2.elevation);

        })
       let pr= this.generateInstance(lineStringArray)
        geometryInstanceArray.push(pr)
      })
      return geometryInstanceArray



  }
  render(){
    console.log(this.getGeom()[0])
    var pr=  viewer.scene.primitives.add(new Cesium.Primitive({
      geometryInstances : this.getGeom(),
      appearance: new Cesium.EllipsoidSurfaceAppearance({
        material:Cesium.Material.fromType('Stripe')
      }),
      //debugShowBoundingVolume:true
    }))
    pr.layerType="had_object_curb"
  }


}
export {HadCurb}
