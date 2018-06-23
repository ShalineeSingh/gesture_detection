/**
 * Provides requestAnimationFrame in a cross browser way.
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */

if (!window.requestAnimationFrame) {

    window.requestAnimationFrame = (function () {

        return window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function ( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {

                window.setTimeout(callback, 1000 / 60);

            };

    })();

}


//---- Request animation ends ---/

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
window.URL = window.URL || window.webkitURL;

var camvideo = document.getElementById('myCam');


navigator.getUserMedia({
    video: true
}, gotStream, noStream);


function gotStream(stream) {
    if (window.URL) {
        camvideo.src = window.URL.createObjectURL(stream);
    } else // Opera
    {
        camvideo.src = stream;
    }

}

function noStream(e) {

}

// Motion Detection //
// assign global variables to HTML elements
var video = document.getElementById('myCam');
var videoCanvas = document.getElementById('videoCanvas');
var videoContext = videoCanvas.getContext('2d');

var blendCanvas = document.getElementById("blendCanvas");
var blendContext = blendCanvas.getContext('2d');

var messageArea = document.getElementById("messageArea");

var frame_number = 0;
var motion_frame_gap = 7;
var frame_gap_count = 0;
var motion_array = [];
var motion_frame_array = [];
// these changes are permanent
videoContext.translate(320, 0);
videoContext.scale(-1, 1);

// background color if no video present
videoContext.fillStyle = '#eaeaea';
videoContext.fillRect(0, 0, videoCanvas.width, videoCanvas.height);



// start the loop               
animate();

function animate() {
    requestAnimationFrame(animate);

    render();
    blend();
    checkHotspots();
}

function render() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // mirror video
        videoContext.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);

    }
}

var lastImageData;

function blend() {
    var width = videoCanvas.width;
    var height = videoCanvas.height;
    // get current webcam image data
    var sourceData = videoContext.getImageData(0, 0, width, height);
    // create an image if the previous image doesn�t exist
    if (!lastImageData) {
        frame_number = 0;
        lastImageData = videoContext.getImageData(0, 0, width, height);
    } else {
        frame_number++;
    }
    // create a ImageData instance to receive the blended result
    var blendedData = videoContext.createImageData(width, height);
    // blend the 2 images
    checkDiff(sourceData.data, lastImageData.data, blendedData.data);
    // draw the result in a canvas
    // console.log(blendedData.data);
    blendContext.putImageData(blendedData, 0, 0);

    if (motion_array.length >= 7) {
        findMotion();

    }

    // store the current webcam image
    lastImageData = sourceData;
}

function findMotion() {
    console.log(motion_frame_array);
    console.log(motion_array);
    motion_array = [];
    motion_frame_array = [];
}

function checkDiff(currentImage, lastImage, output) {
    var i = 0;
    while (i < (currentImage.length / 4)) {
        var average1 = (currentImage[4 * i] + currentImage[4 * i + 1] + currentImage[4 * i + 2]) / 3;
        var average2 = (lastImage[4 * i] + lastImage[4 * i + 1] + lastImage[4 * i + 2]) / 3;
        var diff = threshold((average1 - average2));
        //var diff = average1 - average2;
        output[4 * i] = diff;
        output[4 * i + 1] = diff;
        output[4 * i + 2] = diff;
        output[4 * i + 3] = 0xff;
        ++i;
    }
}

function fastAbs(value) {
    return (value ^ (value >> 31)) - (value >> 31);
}

function threshold(value) {
    return (value > 0x15) ? 0xFF : 0;
}


function checkHotspots() {
    var blendedData0 = blendContext.getImageData(0, 0, 100, 50);
    var blendedData1 = blendContext.getImageData(100, 0, 100, 50);
    var blendedData2 = blendContext.getImageData(200, 0, 100, 50);
    var blendedData3 = blendContext.getImageData(0, 50, 100, 50);
    var blendedData4 = blendContext.getImageData(100, 50, 100, 50);
    var blendedData5 = blendContext.getImageData(200, 50, 100, 50);
    var blendedData6 = blendContext.getImageData(0, 100, 100, 50);
    var blendedData7 = blendContext.getImageData(100, 100, 100, 50);
    var blendedData8 = blendContext.getImageData(200, 100, 100, 50);

    var data1 = [blendedData0, blendedData1, blendedData2, blendedData3, blendedData4, blendedData5, blendedData6, blendedData7, blendedData8];
    // calculate the average lightness of the blended data
    /* var motion_array = []; */
    for (var x = 0; x < data1.length; x++) {
        var i = 0;
        var sum = 0;
        var countPixels;

        countPixels = data1[x].data.length * 0.25;
        while (i < countPixels) {
            sum += (data1[x].data[i * 4] + data1[x].data[i * 4 + 1] + data1[x].data[i * 4 + 2]);
            ++i;
        }
        // calculate an average between of the color values of the note area [0-255]
        var average = Math.round(sum / (3 * countPixels));
        if (average > 40) // more than 20% movement detected
        {
            motion_array.push(x);
            motion_frame_array.push(frame_number);
            /* if (frame_gap_count < motion_frame_gap) {
                motion_array.push(x);
                frame_gap_count++;
            } else {
                frame_gap_count = 0;
            }
            console.log(frame_number + ' : ' + x); */
        }
    }
    // if (motion_array.length > 0) {
    //     console.log(motion_array);
    // }
}