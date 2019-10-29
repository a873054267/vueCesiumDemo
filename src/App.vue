<template>
  <div class="wrapper">
    <!--<el-header>-->
      <!--<vHeader></vHeader>-->
    <!--</el-header>-->
    <div class="left item">
      <vSidebar></vSidebar>
    </div>
    <div class="item right">
      <router-view ></router-view>
    </div>

  </div>
</template>

<script>
  import vHeader from './components/headNav'
  import vSidebar from './components/sideBar'
export default {
  name: "App",
  components:{
    vHeader,
    vSidebar
  }
};
</script>

<style>
.wrapper {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  height: 100%;
  width: 100%;
  display: flex;
}

html, body, #cesiumContainer {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.item{
  display: inline-block;
}
.left{
  width:10%;
  overflow: scroll;
}
.right{
  width: 90%;
}

</style>
