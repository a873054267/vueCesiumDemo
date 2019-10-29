<template>
    <div class="wrapper">
      <div class="selectModelType">
        <el-select v-model="value" placeholder="请选择" @change="modeTypeChange">
          <el-option
            v-for="item in options"
            :key="item.value"
            :label="item.label"
            :value="item.value">
          </el-option>
        </el-select>
      </div>
        <Vcesium @loadeds="otherOperations"> </Vcesium>
      </div>
</template>

<script>


  import  Vcesium from '../../components/cesiumViewer'
    export default {
        name: "loadMapService",
      data() {
        return {
          value:"MAPBOX",
          options: [{
            value: 'countryTDT',
            label: '国家天地图'
          },{
            value: 'localTDT',
            label: '地方天地图'
          },{
            value: 'ArcGisMapServer',
            label: 'ARCGIS地图服务'
          },{
            value: 'OSM',
            label: 'OSM地图服务'
          },{
            value: 'MAPBOX',
            label: 'MAPBOX地图服务'
          },{
            value: 'google',
            label: '谷歌'
          },{
            value: 'amap',
            label: '高德'
          }
            ,{
              value: 'tencent',
              label: '腾讯地图'
            } ,{
              value: 'bmap',
              label: '百度地图'
            }]


        }
      },
      components:{
          Vcesium
      },

      mounted(){
      },
      methods:{
         computeCircle(radius) {
           var positions = [];
          for (var i = 0; i < 360; i++) {
            var radians = Cesium.Math.toRadians(i);
            positions.push(new Cesium.Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)));
          }
          return positions;
          },
          loadFeature(type){
            viewer.entities.removeAll();
            let entity
            let layer
            console.log(Cesium)
        switch (type) {
          case "countryTDT":
             layer= new Cesium.WebMapTileServiceImageryProvider({
              //url:'http://localhost:8080/geoserver/gwc/service/wmts?layer=cite%3Aclassifer_line_viewdata&style=&tilematrixset=EPSG%3A4326&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix=EPSG%3A4326%3A{TileMatrix}&TileCol={TileCol}&TileRow={TileRow}',
              url: "tdt/vec_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=vec&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=ebf64362215c081f8317203220f133eb",
              layer: "vec",
              style: "default",
              format: "image/jpeg",
              tileMatrixSetID: "GoogleMapsCompatible",
              show: true})
            break
          case "localTDT":
            layer= new Cesium.WebMapTileServiceImageryProvider({
              //url:'http://localhost:8080/geoserver/gwc/service/wmts?layer=cite%3Aclassifer_line_viewdata&style=&tilematrixset=EPSG%3A4326&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix=EPSG%3A4326%3A{TileMatrix}&TileCol={TileCol}&TileRow={TileRow}',
              url: "local/arcgis/rest/services/wzmap/map/MapServer/WMTS?service=WMTS&request=GetTile&layer=wzmap&style=default&tilematriX={TileMatrix}&tilerow={TileRow}&tilecoL={TileCol}",
              layer: "wzmap",
              style: "default",
              format: "image/jpeg",
              tileMatrixSetID: "GoogleMapsCompatible",
              show: true})
            //viewer.zoomTo([120.31137134938626,27.78476915035384,500])

            break
          case "ArcGisMapServer":
            layer= new Cesium.ArcGisMapServerImageryProvider({
            url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
            enablePickFeatures: false

          });
            break
          case "OSM":
            layer = Cesium.createOpenStreetMapImageryProvider({
              url: 'https://a.tile.openstreetmap.org/'
            });
            break
          case "MAPBOX":
            layer= new Cesium.MapboxImageryProvider({
              mapId: 'mapbox.dark'
            });
            break
          case "google":
            layer=new Cesium.UrlTemplateImageryProvider({
            url:"http://mt1.google.cn/vt/lyrs=s&hl=zh-CN&x={x}&y={y}&z={z}&s=Gali"
          })
            break
          case "amap":
            layer=new Cesium.UrlTemplateImageryProvider({
              url: "https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
            })
            break
          case "tencent":
           layer=new Cesium.UrlTemplateImageryProvider({
             url : 'https://p2.map.gtimg.com/sateTiles/{z}/{sx}/{sy}/{x}_{reverseY}.jpg?version=229',
             customTags : {
               sx: function(imageryProvider, x, y, level) {
                 return x>>4;
               },
               sy:function(imageryProvider, x, y, level) {
                 return ((1<<level)-y)>>4;
               }
             }
           })
            break
          case "bmap":
           layer=new Cesium.UrlTemplateImageryProvider({
             url : 'https://ss1.bdstatic.com/8bo_dTSlR1gBo1vgoIiO_jowehsv/pvd/?qt=vtile&x={x}&y={y}&z={z}&styles=pl&udt=20180810&scaler=1&showtext=1'
           })
            break


        }
        //追踪到矢量所在处
            //console.log(entity)
           // console.log(layer)
            viewer.imageryLayers.addImageryProvider(layer)


        },
        otherOperations(){
          this.loadFeature("MAPBOX")
        },
        modeTypeChange(v){
            this.loadFeature(v)

        }

      }
    }
</script>

<style scoped>
.selectModelType{
  position: absolute;
  margin: 20px;
  z-index: 100;
}

</style>
