<template>
  <div id="cesiumContainer"></div>
</template>

<script>
export default {
  name: "cesiumViewer",
  data() {
    return {};
  },
  mounted(){
    Cesium.Ion.defaultAccessToken='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0Zjc1MjIzZi0wMWJhLTRmMDMtYTk4YS1mYTkzMzdkNzMyNDUiLCJpZCI6NDM5NCwic2NvcGVzIjpbImFzciIsImdjIl0sImlhdCI6MTU2NDk4NTk4MH0.-nPn7Oi0pfFW1zu9F--Qm0ImjsZkAK69o6p95JqyqFU';
    // let layer= new Cesium.WebMapTileServiceImageryProvider({
    //   //url:'http://localhost:8080/geoserver/gwc/service/wmts?layer=cite%3Aclassifer_line_viewdata&style=&tilematrixset=EPSG%3A4326&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix=EPSG%3A4326%3A{TileMatrix}&TileCol={TileCol}&TileRow={TileRow}',
    //   url: "tdt/vec_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=vec&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=ebf64362215c081f8317203220f133eb",
    //   layer: "vec",
    //   style: "default",
    //   format: "image/jpeg",
    //   tileMatrixSetID: "GoogleMapsCompatible",
    //   show: true})
    let viewer = new Cesium.Viewer('cesiumContainer',{
      //imageryProvider:layer,
      shouldAnimate : true
    });
    window.viewer=viewer //全局注册viewer
    console.log("派发加载完成事件")
    this.$emit("loadeds")
  },
};
</script>

<style>
</style>
