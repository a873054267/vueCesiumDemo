 function drawVector(allAttr) {

   let {entity,type,positions,width,clampToGround}=allAttr
   if(!clampToGround){
     clampToGround=false
   }
   switch (type) {
     case "point":
       entity = viewer.entities.add({
         position: positions,
         point: {
           color: Cesium.Color.WHITE,
           pixelSize: 5,
           heightReference: clampToGround?Cesium.HeightReference.CLAMP_TO_GROUND:Cesium.HeightReference.CLAMP_TO_GROUND
         }
       });
       break
     case "line":
       entity = viewer.entities.add({
         polyline: {
           positions: positions,
           clampToGround: clampToGround?clampToGround:true,
           width: width?width:5,
         }
       });
       break
     case "polygon":
       entity = viewer.entities.add({
         polygon: {
           hierarchy: positions,
           material: new Cesium.ColorMaterialProperty(Cesium.Color.WHITE.withAlpha(0.7))
         }
       });
       break


   }
   return entity
 }
export default drawVector
