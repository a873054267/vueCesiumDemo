<template>
  <div>
    <header class="head-nav" id="header_container">
      <el-row style="margin:0 10px;">
        <el-col :span="10" class="logo-container">
          <img src="../assets/svg/navinfo_logo.svg" class="logo" alt />
          <span class="title">Information Management</span>
        </el-col>
        <div class="userinfo">
          <div class="welcome">
            <span class="name comename">欢迎</span>
            <span class="name avatarname">{{username}}</span>
            <span class="name comename">登录</span>
          </div>
          <i class="fa fa-sign-out logout" @click="logout"></i>
        </div>
      </el-row>
    </header>
  </div>
</template>

<script>

//import axios from "axios";
export default {
  name: "head-nav",
  data() {
    return {
      messageCount: 0,
      username: "" //初始化
    };
  },
  created() {
    // 调用校验
    //this.validateUser();
  },
  methods: {

  }
};
</script>

<style scoped lang='less'>
.logo-container {
  line-height: 60px;
  min-width: 400px;
  text-align: left;
  .logo {
    height: 42.51px;
    width: 188px;
    margin-right: 5px;
    vertical-align: middle;
    display: inline-block;
  }
  .title {
    vertical-align: middle;
    font-size: 22px;
    font-family: SimSun;
    letter-spacing: 3px;
  }
}
.fa-user {
  position: relative;
  top: -2px;
  margin-right: 4px;
}
.head-nav {
  width: 100%;
  height: 63px;
  min-width: 600px; // padding: 5px;
  background: #324057;
  position: fixed;
  top: 0px;
  left: 0px;
  z-index: 100;
  color: #fff;
  border-bottom: 1px solid #1f2d3d;
  .logout {
    vertical-align: middle;
    cursor: pointer;
  }
}
.userinfo {
  line-height: 60px;
  text-align: right;
  float: right;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  vertical-align: middle;
  display: inline-block;
}
.welcome {
  display: inline-block;
  width: auto;
  vertical-align: middle;
  padding: 0 5px;
  .name {
    line-height: 20px;
    text-align: center;
    font-size: 14px;
  }
  .comename {
    font-size: 12px;
  }
  .avatarname {
    color: #64a6da;
    font-weight: bolder;
  }
}
.username {
  cursor: pointer;
  margin-right: 5px;
  .el-dropdown {
    color: #fff;
  }
}
.border {
  border: 1px solid;
}
.notify-row {
  line-height: 35px;
  float: right;
  margin-right: 20px;
  margin-top: 5px;
  ul {
    list-style: none;
  }
}
ul.top-menu > li {
  float: left;
  margin-right: 20px;
}
ul.top-menu > li > a {
  color: #3bc5ff;
  font-size: 16px;
  border-radius: 4px;
  -webkit-border-radius: 4px;
  border: 1px solid #f0f0f8 !important;
  padding: 2px 6px 4px 6px;
}
.message {
  height: 60px !important;
  display: inline-block;
  width: auto;
  vertical-align: middle;
  padding: 0 5px;
  .comename {
    font-size: 12px;
  }
}
.welcome {
  display: inline-block;
  width: auto;
  vertical-align: middle;
  padding: 0 5px;
  .name {
    line-height: 20px;
    text-align: center;
    font-size: 14px;
  }
  .comename {
    font-size: 12px;
  }
  .avatarname {
    color: #64a6da;
    font-weight: bolder;
  }
}
</style>
