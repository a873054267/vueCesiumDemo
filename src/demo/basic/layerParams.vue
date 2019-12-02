<template>
    <div class="wrapper">

      <div class="selectModelType" >

        <template >
          <div class="block"  v-for="(item,index) in attr" :key="index" >
            <el-row>
              <el-col :span="4">
            <span  style="line-height: 35px"  class="demonstration">{{item.lable}}</span>
              </el-col>
              <el-col :span="20">
            <el-slider  v-model="item.value"  style="padding-bottom:10px" :show-input="true" :show-input-controls="false" @change="paramsChange(index)"></el-slider>
              </el-col>
            </el-row>
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
              lable:"brightness",
              value:20,
              key:"animation"
            },{
              lable:"contrast",
              value:35,
              key:"layersel"
            },{
              lable:"hue",
              value:43,
              key:"find",
            },{
              lable:"saturation",
              value:45,
              key:"timeline",
            },{
              lable:"gamma",
              value:12,
              key:"two2three"
            },{
              lable:"alpha",
              value:23,
              key:"help"
            }
            ]
          }
      },
      components:{
          Vcesium
      },
      methods:{
        otherOperations(){

          this.mLayer = viewer.imageryLayers.get(0);

        },

        paramsChange(index){

          let name=this.attr[index].lable
          this.mLayer[name]=  this.attr[index].value


        }

      }
    }
</script>

<style scoped>
  .selectModelType{
    position: fixed;
    margin: 20px;
    z-index: 100;
    padding: 10px;
    width: 500px;

  }



</style>
