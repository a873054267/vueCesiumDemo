class HadObjClass{
  constructor(pbfdata){
   this.pbfdata=pbfdata


  }

  getGeometryInstance (lineStringArray) {
    return new Cesium.GeometryInstance({
      geometry : new Cesium.PolylineGeometry({
        positions : Cesium.Cartesian3.fromDegreesArrayHeights(lineStringArray),
        width : this.style.width,// 线宽
        vertexFormat : Cesium.PolylineColorAppearance.POSITION_ONLY
      })


    });
  }

}
export {HadObjClass}
