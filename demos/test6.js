/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
/*
 * Examples taken from coffeescript.org

 converted from coffeescript. original version by @neilnand:
 https://github.com/neilnand/JSARToolKit/blob/master/demos/neilnand/demo3/script.coffee

 converted with decaffeinate to javascript by @kalwalt
 https://github.com/kalwalt
 */

// Properties
const WIDTH = 640;
const HEIGHT = 480;
const USE_STATIC_VIDEO = true;

// Shim
navigator.getUserMedia =
navigator.getUserMedia ||
navigator.webkitGetUserMedia ||
navigator.mozGetUserMedia ||
navigator.msGetUserMedia;

window.requestAnimFrame = (() =>
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  (callback => window.setTimeout(callback, 1000 / 60))
)();

// Classes
class Error {
  constructor(msg, e) {
    console.log("ERROR:", msg, e);
  }
}

class JSAR {
  constructor(canvasDom, canvasGLDom, videoDom) {
    this.update = this.update.bind(this);
    this.canvasDom = canvasDom;
    this.canvasGLDom = canvasGLDom;
    this.videoDom = videoDom;
    this.context = this.canvasDom.getContext("2d");
    this.raster = new NyARRgbRaster_Canvas2D(this.canvasDom);
    this.param = new FLARParam(WIDTH, HEIGHT);

    this.resultMat = new NyARTransMatResult();
    this.display = new Magi.Scene(this.canvasGLDom);

    this.param.copyCameraMatrix(this.display.camera.perspectiveMatrix, 100, 10000);
    this.display.camera.useProjectionMatrix = true;

    this.videoTex = new Magi.FlipFilterQuad();
    this.videoTex.material.textures.Texture0 = new Magi.Texture();
    this.videoTex.material.textures.Texture0.image = this.canvasDom;
    this.videoTex.material.textures.Texture0.generateMipmaps = false;
    this.display.scene.appendChild(this.videoTex);

    this.marker = {};
    this.overlay = this.createOverlay();
  }

  init() {

    return $.get("pattern/custom.pat", data => {

      this.mpattern = new FLARCode(64, 64);
      this.mpattern.loadARPatt(data);

      this.detector = new FLARSingleMarkerDetector(this.param, this.mpattern, 100);
      this.detector.setContinueMode(true);

      return this.update();
    });
  }

  update() {

    try {
      this.processVisuals();
      this.processDetection();
      this.renderOverlay();
    } catch (error) {}

    return window.requestAnimFrame(() => {
      return this.update();
    });
  }
  processVisuals() {

    // Update Canvas that is fed into AR
    this.context.drawImage(this.videoDom, 0, 0, WIDTH, HEIGHT);
    this.canvasDom.changed = true;

    // Update Material that is AR super-imposed on GL
    this.videoTex.material.textures.Texture0.changed = true;
    return this.videoTex.material.textures.Texture0.upload();
  }

  processDetection() {

    // Detect and update transformations of markers
    this.detected = this.detector.detectMarkerLite(this.raster, 170) && (this.detector.getConfidence() > .4);

    if (!this.detected) { return; }

    this.detector.getTransformMatrix(this.resultMat);
    return this.marker.transform = Object.asCopy(this.resultMat);
  }

  renderOverlay() {

    if (!this.detected) {
      // Remove Overlays if Marker not detected
      if (this.overlay.display) {
        this.overlay.display = false;
      }
      return;
    }

    // Display and update overlays
    this.overlay.display = true;

    const arMat = this.marker.transform;
    const glMat = this.overlay.transform;

    glMat[0] = arMat.m00;
    glMat[1] = -arMat.m10;
    glMat[2] = arMat.m20;
    glMat[3] = 0;
    glMat[4] = arMat.m01;
    glMat[5] = -arMat.m11;
    glMat[6] = arMat.m21;
    glMat[7] = 0;
    glMat[8] = -arMat.m02;
    glMat[9] = arMat.m12;
    glMat[10] = -arMat.m22;
    glMat[11] = 0;
    glMat[12] = arMat.m03;
    glMat[13] = -arMat.m13;
    glMat[14] = arMat.m23;
    return glMat[15] = 1;
  }

  createOverlay() {
    const pivot = new Magi.Node();
    pivot.transform = mat4.identity();
    pivot.setScale(100);

    const overlay = new Magi.Cube();
    overlay.setZ(-0.125);
    overlay.scaling[2] = 0.25;
    pivot.appendChild(overlay);

    const txt = new Magi.Text("NN");
    txt.setColor("red");
    txt.setFontSize(80);
    txt.setAlign(txt.centerAlign, txt.bottomAlign);
    txt.setZ(-0.6);
    txt.setY(-0.34);
    txt.setScale(1/80);
    overlay.appendChild(txt);

    pivot.overlay = overlay;
    pivot.txt = txt;

    this.display.scene.appendChild(pivot);
    return pivot;
  }
}


// Setup Elements
const video = $("video");
video[0].width = WIDTH;
video[0].height = HEIGHT;
video[0].controls = false;
video[0].onloadedmetadata = evt => console.log("video.onloadedmetadata", evt);

const canvas = $("canvas.output");
canvas[0].width = WIDTH;
canvas[0].height = HEIGHT;

const canvasGL = $("canvas.gl");
canvasGL[0].width = WIDTH;
canvasGL[0].height = HEIGHT;

const jsar = new JSAR(canvas[0], canvasGL[0], video[0]);

if (navigator.getUserMedia && !USE_STATIC_VIDEO) {
  console.log("Camera Available");

  // Get Camera Feed
  navigator.getUserMedia({
      video: {
        mandatory: {
          minWidth: WIDTH,
          minHeight: HEIGHT
        }
      }
    }, function(stream) {

    // Set Camera Feeds
    video.attr("src", window.URL.createObjectURL(stream));
    return jsar.init();
  }

  , evt => new Error("Could not get Camera Stream", evt));

} else {
  console.log("Camera Not Available");

  const videoToggle = function() {
    if (video[0].paused) {
      return video[0].play();
    } else {
      return video[0].pause();
    }
  };

  // Use Looping Video
  video.attr("src", "video_test_custom_marker.mp4");
  video[0].loop = true;
  canvasGL.click(videoToggle);
  canvas.click(videoToggle);
  video.click(videoToggle);
  jsar.init();
}
