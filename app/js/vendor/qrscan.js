import { snackbar } from '../snackbar.js';

var QRReader = {};

QRReader.active = false;
QRReader.webcam = null;
QRReader.canvas = null;
QRReader.ctx = null;
QRReader.decoder = null;

QRReader.setCanvas = () => {
  QRReader.canvas = document.createElement('canvas');
  QRReader.ctx = QRReader.canvas.getContext('2d');
};

function setPhotoSourceToScan(forSelectedPhotos) {
  if (!forSelectedPhotos && window.isMediaStreamAPISupported) {
    QRReader.webcam = document.querySelector('video');
  } else {
    QRReader.webcam = document.querySelector('img');
  }
}

QRReader.init = () => {
  var baseurl = '';
  var streaming = false;

  // Init Webcam + Canvas
  setPhotoSourceToScan();

  QRReader.setCanvas();
  QRReader.decoder = new Worker(baseurl + 'decoder.js');

  if (window.isMediaStreamAPISupported) {
    // Resize webcam according to input
    QRReader.webcam.addEventListener(
      'play',
      function(ev) {
        if (!streaming) {
          setCanvasProperties();
          streaming = true;
        }
      },
      false
    );
  } else {
    setCanvasProperties();
  }

  function setCanvasProperties() {
    QRReader.canvas.width = window.innerWidth;
    QRReader.canvas.height = window.innerHeight;
  }

};

QRReader.camera = (constraints) => {

  function startCapture(constraints) {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function(stream) {
        window.stream = stream;
        QRReader.webcam.srcObject = stream;
        QRReader.webcam.setAttribute('playsinline', true);
        QRReader.webcam.setAttribute('controls', true);
        setTimeout(() => {
          document.querySelector('video').removeAttribute('controls');
        });
      })
      .catch(function(err) {
        console.log('Error occurred ', err);
        showErrorMsg();
      });
  }
  
  function stopCapture() {
    if (window.stream) {
      window.stream.getVideoTracks()[0].stop();
    }
  }

  if (window.isMediaStreamAPISupported) {
    stopCapture();
    startCapture(constraints);
  }

  function showErrorMsg() {
    window.noCameraPermission = true;
    document.querySelector('.custom-scanner').style.display = 'none';
    snackbar.show('Caméra inaccessible.', 10000);
  }
}

/**
 * \brief QRReader Scan Action
 * Call this to start scanning for QR codes.
 *
 * \param A function(scan_result)
 */
QRReader.scan = function(callback, forSelectedPhotos) {
  QRReader.active = true;
  QRReader.setCanvas();
  function onDecoderMessage(event) {
    if (event.data.length > 0) {
      var qrid = event.data[0][2];
      QRReader.active = false;
      callback(qrid);
    }
    setTimeout(newDecoderFrame, 0);
  }

  QRReader.decoder.onmessage = onDecoderMessage;

  setTimeout(() => {
    setPhotoSourceToScan(forSelectedPhotos);
  });

  // Start QR-decoder
  function newDecoderFrame() {
    if (!QRReader.active) return;
    try {
      QRReader.ctx.drawImage(QRReader.webcam, 0, 0, QRReader.canvas.width, QRReader.canvas.height);
      var imgData = QRReader.ctx.getImageData(0, 0, QRReader.canvas.width, QRReader.canvas.height);

      if (imgData.data) {
        QRReader.decoder.postMessage(imgData);
      }
    } catch (e) {
      // Try-Catch to circumvent Firefox Bug #879717
      if (e.name == 'NS_ERROR_NOT_AVAILABLE') setTimeout(newDecoderFrame, 0);
    }
  }
  newDecoderFrame();
};

export default QRReader;
