<template>
    <div class="wrapper">
      <div class="selectModelType" >
        <div class="tip"><p>默认控件的显示与隐藏</p></div>

        <template v-for="(item,index) in attr">
          <div style="text-align: left">
          <el-checkbox   @change="ctrAttrVis(index)" class="chb"
                         v-model="item.value"
                          >{{item.lable}}</el-checkbox>
          </div>
        </template>
      </div>
        <Vcesium @loadeds="otherOperations"></Vcesium>
      </div>
</template>

<script>
  import  Vcesium from '../../components/cesiumViewer'
    export default {
        name: "hello",
      data(){
          return{
            attr:[{
              lable:"动画",
              value:true,
              key:"animation"
            },{
              lable:"图层选择控件",
              value:true,
              key:"layersel"
            },{
              lable:"地名查找",
              value:true,
              key:"find",
            },{
              lable:"时间线",
              value:true,
              key:"timeline",
            },{
              lable:"二三维切换",
              value:true,
              key:"two2three"
            },{
              lable:"帮助信息",
              value:true,
              key:"help"
            },{
              lable:"信息框",
              value:true,
              key:"info"
            },{
              lable:"主页",
              value:true,
              key:"home"
            },{
              lable:"版权Logo信息",
              value:true,
              key:"logo"
            }
            ]
          }
      },
      components:{
          Vcesium
      },
      methods:{
        otherOperations(){
        // viewer.imageryLayers.get(0).show = false;
          // let select = document.getElementsByClassName(".cesium-baseLayerPicker-selected");
           console.log(viewer)
         // console.log(viewer.baseLayerPicker._container.style.display="none")
        },
        ctrAttrVis(v){
          let key=this.attr[v].key
          switch (key){
            case "animation":
              viewer._animation.container.style.display=this.attr[v].value?"block":"none"
              break
            case "info":
              viewer._infoBox.container.style.display=this.attr[v].value?"block":"none"
              break
            case "help":
              viewer.baseLayerPicker.container.children[5].style.display=this.attr[v].value?"inline":"none"
              break
            case "timeline":
              viewer._timeline.container.style.display=this.attr[v].value?"block":"none"
              break
            case "logo":
              viewer.cesiumWidget.creditContainer.style.display = this.attr[v].value?"block":"none";
              break
            case "two2three":
              viewer.baseLayerPicker.container.children[2].style.display=this.attr[v].value?"inline":"none"

              break
            case "home":
              viewer.baseLayerPicker.container.children[1].style.display=this.attr[v].value?"inline":"none"
              break
            case "find":
              viewer.baseLayerPicker.container.children[0].style.display=this.attr[v].value?"inline":"none"

              break
            case "layersel":
              viewer.baseLayerPicker.container.children[3].style.display=this.attr[v].value?"inline":"none"

              break
          }

        }
      }
    }
</script>

<style scoped>
  .selectModelType{
    position: absolute;
    width: 220px;
    margin: 20px;
    z-index: 100;
    padding: 10px;

  }
  .chb{

    margin: 3px;
  }
</style>
