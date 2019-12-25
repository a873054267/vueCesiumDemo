//设置第14级切片数量，x切片级别多于y，第一次为中间一分为二
const xpan = 360.0 / (Math.pow(2, (13 + 1)));
const ypan = 180.0 / (Math.pow(2, 13));

/**********
 * 根据经纬度返回图幅行列号
 * @param lng
 * @param lat
 * @returns {*[]}
 */

//计算经纬度在的行列号
function getXYByLngLat(lng, lat) {
  //cesium经度范围为-180-180，因此所有角度要+180，变为0-360范围
  var x = Math.floor((lng+180) / xpan);
  //纬度范围做同理变换
  var y = Math.floor((lat+90) / ypan);
  return [ x, y ];
}
function getMeshIdByXY (xy) {
  var binaryStrX = xy[0].toString(2);
  var binaryStrY = xy[1].toString(2);
  var binaryStr = new Array();
  for (var i = 0; i < binaryStrX.length || i < binaryStrY.length; i++) {
    if (i >= binaryStrX.length) {
      binaryStr.push("0");
    } else {
      binaryStr.push(binaryStrX.substring(binaryStrX.length - i - 1,
        binaryStrX.length - i));
    }
    if (i >= binaryStrY.length) {
      binaryStr.push("0");
    } else {
      binaryStr.push(binaryStrY.substring(binaryStrY.length - i - 1,
        binaryStrY.length - i));
    }
  }
  return parseInt(binaryStr.reverse().join(""), 2);
}
function getMeshList(maxLng, minLng, maxLat, minLat) {

  var offset =0.01;//扩展范围
  var mashidList = new Array();
  //计算起始行列号
  var minXY = getXYByLngLat(parseFloat(minLng)-offset, parseFloat(minLat)-offset);
  //计算终止行列号
  var maxXY = getXYByLngLat(parseFloat(maxLng)+offset, parseFloat(maxLat)+offset);
  //如果行列数超过300，则直接返回，不加载
  if (Math.abs(maxXY[0] - minXY[0]) > 300
    || Math.abs(maxXY[1] - minXY[1]) > 300) {
    return mashidList;
  }
  //否则依次加入行列号
  for (var x = minXY[0]; x < (maxXY[0] + 1); x++) {
    for (var y = minXY[1]; y < (maxXY[1] + 1); y++) {
      mashidList.push(([ x, y ]));
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
// export {getMeshList,getRect}

var cs=new Array()
cs.push(1)
console.log(cs)
