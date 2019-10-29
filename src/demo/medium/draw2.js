export function draw(cesiumWidget,cesium) {
  this._scene = cesiumWidget.scene;

  this._tooltip = createTooltip(cesiumWidget.container);
  this._surfaces = [];
  this.cesiumX=cesium
  this.ellipsoid=cesium.Ellipsoid.WGS84

  let handler
  let scene=viewer.scene

  handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
  handler.setInputAction(function(pos) {
    var cartesian = viewer.camera.pickEllipsoid(pos.position, scene.globe.ellipsoid);
    if (cartesian) {
      var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      var longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
      var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);
      console.log(longitudeString)
      drawStroke()

    } else {

    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);


  //console.log(this.cesiumX.Ellipsoid.WGS84)

}
function createTooltip(frameDiv) {

  var tooltip = function(frameDiv) {

    var div = document.createElement('DIV');
    div.className = "twipsy right";//类名

    var arrow = document.createElement('DIV');
    arrow.className = "twipsy-arrow";
    div.appendChild(arrow);

    var title = document.createElement('DIV');
    title.className = "twipsy-inner";
    div.appendChild(title);
    this._div = div;
    this._title = title;
    // add to frame div and display coordinates
    frameDiv.appendChild(div);
  }
  tooltip.prototype.setVisible = function(visible) {
    this._div.style.display = visible ? 'block' : 'none';
  }

  tooltip.prototype.showAt = function(position, message) {
    if(position && message) {
      this.setVisible(true);
      this._title.innerHTML = message;
      this._div.style.left = position.x + 10 + "px";
      this._div.style.top = (position.y - this._div.clientHeight / 2) + "px";
    }
  }

  return new tooltip(frameDiv);
}

draw.prototype.initialiseHandlers=function() {

  var scene = this._scene;
  var _self = this;
  // scene events
  var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

  function callPrimitiveCallback(name, position) {
    debugger
    if(_self._handlersMuted == true) return;
    var pickedObject = scene.pick(position);
    if(pickedObject && pickedObject.primitive && pickedObject.primitive[name]) {
      pickedObject.primitive[name](position);
    }
  }
  handler.setInputAction(
    function (movement) {
      callPrimitiveCallback('leftClick', movement.position);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  handler.setInputAction(
    function (movement) {
      callPrimitiveCallback('leftDoubleClick', movement.position);
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  var mouseOutObject;
  handler.setInputAction(
    function (movement) {
      if(_self._handlersMuted == true) return;
      var pickedObject = scene.pick(movement.endPosition);
      if(mouseOutObject && (!pickedObject || mouseOutObject != pickedObject.primitive)) {
        !(mouseOutObject.isDestroyed && mouseOutObject.isDestroyed()) && mouseOutObject.mouseOut(movement.endPosition);
        mouseOutObject = null;
      }
      if(pickedObject && pickedObject.primitive) {
        pickedObject = pickedObject.primitive;
        if(pickedObject.mouseOut) {
          mouseOutObject = pickedObject;
        }
        if(pickedObject.mouseMove) {
          pickedObject.mouseMove(movement.endPosition);
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  handler.setInputAction(
    function (movement) {
      callPrimitiveCallback('leftUp', movement.position);
    }, Cesium.ScreenSpaceEventType.LEFT_UP);
  handler.setInputAction(
    function (movement) {
      callPrimitiveCallback('leftDown', movement.position);
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

}
function drawStroke(type,pointCoor) {
  var instance = new Cesium.GeometryInstance({
    geometry: new Cesium.RectangleGeometry({
      rectangle: Cesium.Rectangle.fromDegrees(105.20, 30.55, 106.20, 31.55),
      vertexFormat:Cesium.EllipsoidSurfaceAppearance.VERTEXT_FORMAT
    })
  });
  var pr=new Cesium.Primitive({
    geometryInstances: instance,
    appearance: new Cesium.EllipsoidSurfaceAppearance({
      material:Cesium.Material.fromType('Stripe')
    })
  })
  viewer.scene.primitives.add(pr);
  viewer.camera.setView({
    destination : Cesium.Cartesian3.fromDegrees(105.20, 30.55,5000)
  });

}
