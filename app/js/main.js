import QRReader from './vendor/qrscan.js';
import { snackbar } from './snackbar.js';
import styles from '../css/styles.css';
import isURL from 'is-url';
import copy from 'copy-to-clipboard';

//If service worker is installed, show offline usage notification
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(reg => {
        console.log('SW registered: ', reg);
        if (!localStorage.getItem('offline')) {
          localStorage.setItem('offline', true);
          snackbar.show('Prêt pour un usage hors-ligne.', 5000);
        }
      })
      .catch(regError => {
        console.log('SW registration failed: ', regError);
      });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  //To check the device and add iOS support
  window.iOS = ['iPad', 'iPhone', 'iPod'].indexOf(navigator.platform) >= 0;
  window.isMediaStreamAPISupported = navigator && navigator.mediaDevices && 'enumerateDevices' in navigator.mediaDevices;
  window.noCameraPermission = false;

  var copiedText = null;
  var frame = null;
  var addPhotoBtn = document.querySelector('.app__add-photo');
  var remPhotoBtn = document.querySelector('.app__remove-photo');
  var flipCameraBtn = document.querySelector('.app__flip-camera');
  var dialogElement = document.querySelector('.app__dialog');
  var dialogOverlayElement = document.querySelector('.app__dialog-overlay');
  var dialogOpenBtnElement = document.querySelector('.app__dialog-open');
  var dialogCopyBtnElement = document.querySelector('.app__dialog-copy');
  var dialogCloseBtnElement = document.querySelector('.app__dialog-close');
  var scanningEle = document.querySelector('.custom-scanner');
  var textBoxEle = document.querySelector('#result');
  var helpTextEle = document.querySelector('.app__help-text');
  var infoSvg = document.querySelector('.app__header-icon svg');
  var videoElement = document.querySelector('video');
  window.appOverlay = document.querySelector('.app__overlay');
  var selectedCamera = null;
  var typeCamera = 'environment';
  
  
  
  //Initializing qr scanner
  window.addEventListener('load', event => {
    QRReader.init(); //To initialize QR Scanner
    updateCamera();
    // Set camera overlay size
    setTimeout(() => {
      if (window.isMediaStreamAPISupported) {
        scan();
      }
    }, 1000);
	
	// To allow camera flipping
	initFlipCamera();
	
    // To support other browsers who dont have mediaStreamAPI
    initPhoto();
  });

  function createFrame() {
    frame = document.createElement('img');
    frame.src = '';
    frame.id = 'frame';
  }
  

  //Dialog close btn event
  dialogCloseBtnElement.addEventListener('click', hideDialog, false);
  dialogOpenBtnElement.addEventListener('click', openInBrowser, false);
  dialogCopyBtnElement.addEventListener('click', copyToClipBoard, false);

  //To open result in browser
  function openInBrowser() {
    console.log('Result: ', copiedText);
    window.location.href = copiedText;
    copiedText = null;
    hideDialog();
  }
  
  //To copy result to clipboard
  function copyToClipBoard() {
    console.log('Result: ', copiedText);
    copy(copiedText);
    copiedText = null;
    hideDialog();
  }

  //Scan
  function scan(addingPhoto = false) {
    scanningEle.style.display = 'none';
    if (window.isMediaStreamAPISupported && !window.noCameraPermission) {
      scanningEle.style.display = 'block';
    }

    if (addingPhoto) {
      scanningEle.style.display = 'block';
    }

    QRReader.scan(result => {
      copiedText = result;
      textBoxEle.value = result;
      textBoxEle.select();
      scanningEle.style.display = 'none';
      if (isURL(result)) {
        dialogOpenBtnElement.style.display = 'inline-block';
        dialogCopyBtnElement.style.display = 'none';
      } else {
        dialogCopyBtnElement.style.display = 'inline-block';
        dialogOpenBtnElement.style.display = 'none';
      }
      dialogElement.classList.remove('app__dialog--hide');
      dialogOverlayElement.classList.remove('app__dialog--hide');
      const frame = document.querySelector('#frame');
      //if (addingPhoto && frame) frame.remove();
    }, addingPhoto);
  }

  //Hide dialog
  function hideDialog() {
    copiedText = null;
    textBoxEle.value = '';

    remPhotoBtn.click();

    dialogElement.classList.add('app__dialog--hide');
    dialogOverlayElement.classList.add('app__dialog--hide');
    scan();
  }
  
  function updateCamera(){
    if (window.isMediaStreamAPISupported) {
      navigator.mediaDevices.enumerateDevices().then(function(devices) {
        var device = devices.filter(function(device) {
          if (device.kind == 'videoinput') {
            return device;
          }
        });
                
        if(selectedCamera == null){
          selectedCamera = 0;
          for(var i=0; i < device.length; i++){
            if((device[i].facingMode == "environment")||(device[i].label.indexOf('back') >= 0)){
              selectedCamera = i;
            }
          }
        } else if(selectedCamera < device.length - 1){
          selectedCamera++;
        } else {
          selectedCamera = 0;
        }
        
        if(typeCamera == 'environment'){
      	  typeCamera = 'user';
        } else {
      	  typeCamera = 'environment';
        }
                
        var constraints;
        
        if(window.iOS) {
  	      constraints = {video: { facingMode: typeCamera }, audio: false};
  	    } else if (device.length > 1) {
          constraints = {video: { deviceId: device[selectedCamera].deviceId }, audio: false};
        } else {
          flipCameraBtn.style.display = 'none';
          constraints = {video: true, audio: false};
        }  
        QRReader.camera(constraints);
      });
    } else {
      flipCameraBtn.style.display = 'none';
    }
  }

  function initFlipCamera() {
    //Click of camera flip icon
    flipCameraBtn.addEventListener('click', () => {
      updateCamera();
    });
  }

  function initPhoto() {
    //Hiding removePhotoBtn
    remPhotoBtn.style.display = 'none';
    addPhotoBtn.style.display = 'block';
  
    //Creating the camera element
    var camera = document.createElement('input');
    camera.setAttribute('type', 'file');
    camera.setAttribute('accept', 'image/*');
    camera.id = 'camera';
    addPhotoBtn.style.display = 'block';
    createFrame();

    //Add the camera and img element to DOM
    var pageContentElement = document.querySelector('.app__layout-content');
    pageContentElement.appendChild(camera);
    pageContentElement.appendChild(frame);

    //Click on addPhotoBtn
    addPhotoBtn.addEventListener('click', () => {
      document.querySelector('#camera').click();
    });
    
    //Click on removePhotoBtn
    remPhotoBtn.addEventListener('click', () => {
      camera.value = '';
      frame.src = '';
      frame.className = '';
      remPhotoBtn.style.display = 'none';
      addPhotoBtn.style.display = 'block';
      scan();
    });

    //On camera change
    camera.addEventListener('change', event => {
      if (event.target && event.target.files.length > 0) {
        frame.className = 'app__overlay';
        frame.src = URL.createObjectURL(event.target.files[0]);
        remPhotoBtn.style.display = 'block';
        addPhotoBtn.style.display = 'none';
        scan(true);
      }
    });
  }
});
