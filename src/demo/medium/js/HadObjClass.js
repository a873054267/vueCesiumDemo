class HadObjClass{
  constructor(pbfdata){
   this.pbfdata=pbfdata

  }
  getGeom(data){

  }
  getAttr(data){

  }
  generateInstace(){

  }
  getGeometryInstance (lineStringArray) {
    return new Cesium.GeometryInstance({
      geometry : new Cesium.PolylineGeometry({
        positions : Cesium.Cartesian3.fromDegreesArrayHeights(lineStringArray),
        width : 5,// 线宽
        vertexFormat : Cesium.PolylineColorAppearance.POSITION_ONLY
      })


    });
  }

}
export {HadObjClass}
