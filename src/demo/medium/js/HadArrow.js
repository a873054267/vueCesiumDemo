import {HadObjClass} from "./HadObjClass";
class HadArrow extends HadObjClass{
  constructor(pbfdata){
    super(pbfdata)
    this.type="had_object_arrow"
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

    var polygon = new Cesium.PolygonGeometry({// 直接使用这个会生成贴地面
      polygonHierarchy : new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArrayHeights(lineStringArray))
    });
    // 返回实例
    return new Cesium.GeometryInstance({
      geometry : Cesium.CoplanarPolygonGeometry.createGeometry(polygon),
    });

  }

  getGeom(){
    console.log(this.pbfdata)
    //按箭头类型分类存储
      var geometryInstanceArray={}
      var lineStringArray
      //遍历获取图幅中的所有link数量

      this.pbfdata.objectList.map(v =>{

        lineStringArray = new Array();

        var arrowClass = v.arrowclass;
        if (!geometryInstanceArray[arrowClass]) {
          geometryInstanceArray[arrowClass] = new Array();
        }

        //遍历取出每条link的坐标，并添加高程
        v.geometry.linestringList.map(v2 => {

          v2.linestringList.map(v3 => {
            lineStringArray.push(v3.longitude);
            lineStringArray.push(v3.latitude);
            lineStringArray.push(v3.elevation);
          })
        })

       let pr= this.generateInstance(lineStringArray)
        geometryInstanceArray[arrowClass].push(pr);
      })
      return geometryInstanceArray

  }
  render(){
    let geomInstance=this.getGeom()

    for(let key in geomInstance){
      //图片目录必须在静态文件夹下，否则会被打包导致找不到，无贴图效果
      var image="../../../../static/arrow/"+key+".png"
      //var image = '../img/arrow/'+key+".png";

      // 定义线型
      var arrowMaterial = new Cesium.Material.fromType('Image', {
        image : image,
        repeat : {
          x : -1,
          y : 1
        }
      });
      var primitive = new Cesium.Primitive({
        geometryInstances : geomInstance[key],
        appearance : new Cesium.MaterialAppearance({
          material : arrowMaterial
        }),
        asynchronous:false
      });
     viewer.scene.primitives.add(primitive)

      primitive.layerType="had_object_arrow"
    }

    // var pr=  viewer.scene.primitives.add(new Cesium.Primitive({
    //   geometryInstances : this.getGeom(),
    //   appearance : new Cesium.PolylineMaterialAppearance({
    //     material : Cesium.Material.fromType("Color", {
    //       color : this.style.color
    //     })
    //   }),
    // }))
    // pr.layerType="had_object_arrow"
  }


}
export {HadArrow}
