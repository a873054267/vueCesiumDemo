function getInfoDataForExtent(num1,num2){
  console.log(num1+num2)
}
function getXYByLngLat(lng, lat) {
  var xpan = 360.0 / (Math.pow(2, (13 + 1)));
  var ypan = 180.0 / (Math.pow(2, 13));
  var x = Math.floor((lng) / xpan);
  var y = Math.floor((lat) / ypan);
  return [ x, y ];
}
//根据行列号获取图幅号
function getMeshIdByXY (xy) {

  //行列号转二进制编码
  var binaryStrX = xy[0].toString(2);
  var binaryStrY = xy[1].toString(2);
  var binaryStr = new Array();
  //i小于x或者y的行列号
  for (var i = 0; i < binaryStrX.length || i < binaryStrY.length; i++) {
    //如果i大于x的长度时，则y的值大于x值，x只添加0，
    // 否则逆序存储二进制值，最后在反转，等价于将高位置为0
    if (i >= binaryStrX.length) {
      binaryStr.push("0");
    } else {
      binaryStr.push(binaryStrX.substring(binaryStrX.length - i - 1,
        binaryStrX.length - i));
    }
    //y坐标做类似处理
    if (i >= binaryStrY.length) {
      binaryStr.push("0");
    } else {
      binaryStr.push(binaryStrY.substring(binaryStrY.length - i - 1,
        binaryStrY.length - i));
    }
  }
  //parseint 以2为基数来解析
  return parseInt(binaryStr.reverse().join(""), 2);
}
function getMeshList(maxLng, minLng, maxLat, minLat) {

  var offset =0.01;//扩展范围
  var mashidList = new Array();
  //获取经纬度所在的起始行列号
  var minXY = getXYByLngLat(parseFloat(minLng)-offset, parseFloat(minLat)-offset);
  //终止行列号
  var maxXY = getXYByLngLat(parseFloat(maxLng)+offset, parseFloat(maxLat)+offset);
  if (Math.abs(maxXY[0] - minXY[0]) > 300
    || Math.abs(maxXY[1] - minXY[1]) > 300) {
    return mashidList;
  }

  for (var x = minXY[0]; x < (maxXY[0] + 1); x++) {
    for (var y = minXY[1]; y < (maxXY[1] + 1); y++) {
      mashidList.push(getMeshIdByXY([ x, y ]));
    }
  }
  return mashidList;
}

function getRect(viewer) {
  var rectangle = viewer.camera.computeViewRectangle();
  if (rectangle) {
    // 弧度转为经纬度，west为左（西）侧边界的经度，以下类推
    var west = rectangle.west / Math.PI * 180;
    var north = rectangle.north / Math.PI * 180;
    var east = rectangle.east / Math.PI * 180;
    var south = rectangle.south / Math.PI * 180;
    // 鉴于高德、leaflet获取的边界都是southwest和northeast字段来表示，本例保持一致性
    return {
      southwest : {
        lng : west,
        lat : south
      },
      northeast : {
        lng : east,
        lat : north
      }
    }
  }
}


export {getMeshList,getRect}

