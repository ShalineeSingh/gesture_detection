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

                window.setTimeout(callback, 1000 / 100);

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

videoContext.translate(320, 0);
videoContext.scale(-1, 1);

var lastImageData;
var frame_number = 0;
var max_row_each_frame = [];
var valid_stand_difference = videoCanvas.height / 4;

// background color if no video present
videoContext.fillStyle = '#eaeaea';
videoContext.fillRect(0, 0, videoCanvas.width, videoCanvas.height);

function animate() {
    requestAnimationFrame(animate);
    render();
    blend();
}

function render() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // mirror video
        videoContext.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);
    }
}

function blend() {
    var width = videoCanvas.width;
    var height = videoCanvas.height;
    // get current webcam image data
    var sourceData = videoContext.getImageData(0, 0, width, height);
    // create an image if the previous image doesnot exist
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
    if (Object.keys(max_row_each_frame).length === 25) {
        findMotion();
        max_row_each_frame = [];
    }
    blendContext.putImageData(blendedData, 0, 0);
    // store the current webcam image
    lastImageData = sourceData;
}

function checkDiff(currentImage, lastImage, output) {
    var i = 0;
    var col_array = [];
    var row_array = [];
    var ones_count = 0;
    var change_in_image = false;
    /*console.log('frame : '  + frame_number);*/
    while (i < (currentImage.length / 4)) {
        var average1 = (currentImage[4 * i] + currentImage[4 * i + 1] + currentImage[4 * i + 2]) / 3;
        var average2 = (lastImage[4 * i] + lastImage[4 * i + 1] + lastImage[4 * i + 2]) / 3;
        var diff = threshold((average1 - average2));
        if (diff !== 0) {
            change_in_image = true;
        }
        row_array.push(diff);
        if ((i + 1) % videoCanvas.width === 0) {
            var current_ones = numberOfOnes(row_array);
            if (current_ones > ones_count) {
                ones_count = current_ones;
            }
            col_array.push(row_array);
            row_array = [];
        }
        output[4 * i] = diff;
        output[4 * i + 1] = diff;
        output[4 * i + 2] = diff;
        output[4 * i + 3] = 0xff;
        ++i;
    }
    if (change_in_image === true) {
        // console.log('--------FRAME -----' + frame_number + ' ones : ' + ones_count);
        max_row_each_frame.push(ones_count);
        // for (var x = 0; x < col_array.length; x++) {
        //     console.log(col_array[x]);
        // }
        // console.log(max_row_each_frame);
    }
}

function findMotion() {
    var stands = generateStands();
    var valid_stands = getValidStands(stands);
    var longest_stand = getLongestStand(valid_stands);
    var prominent_motion = getProminentMotion(longest_stand); // var stand_motion = getValidStandsMotion(longest_stand);
    console.log(prominent_motion);
}

function getProminentMotion(longest_stand) {
    if (longest_stand) {
        if (longest_stand[0] > longest_stand[1]) {
            return 'up';
        } else if (longest_stand[0] < longest_stand[1]) {
            return 'down';
        } else {
            return 'equal';
        }
    } else {
        return 'no motion detected';
    }
}

function getLongestStand(valid_stands) {
    var longest_stand = valid_stands[0];
    for (var i = 0; i < valid_stands.length; i++) {
        if (longest_stand.length >= valid_stands[i].length) {
            longest_stand = valid_stands[i];
        }
    }
    // console.log(longest_stand);
    return longest_stand;
}

function getValidStandsMotion(valid_stands) {
    var motions = [];
    console.log(valid_stands);
    for (var i = 0; i < valid_stands.length; i++) {
        if (valid_stands[i][0] > valid_stands[i][1]) {
            motions.push('up');
        } else {
            motions.push('down');
        }
    }
    return motions;
}

function getValidStands(stands) {
    var valid_stands_array = [];
    for (var i = 0; i < stands.length; i++) {
        var each_stand = stands[i];
        if (Math.max.apply(null, each_stand) - Math.min.apply(null, each_stand) >= valid_stand_difference) {
            valid_stands_array.push(each_stand);
        }
    }
    return valid_stands_array;
}

function generateStands() {
    var stands = [];
    var temp_array = [];
    var isGreater = true;
    var isLesser = true;
    for (var i = 0; i < max_row_each_frame.length - 1; i++) {
        var currentFrameOnesCount = max_row_each_frame[i];
        var nextFrameOnesCount = max_row_each_frame[i + 1];
        if (currentFrameOnesCount > nextFrameOnesCount) {
            isLesser = true;
            if (isGreater) {
                if (temp_array.length > 0) {
                    temp_array.push(max_row_each_frame[i]);
                    stands.push(temp_array);
                }
                temp_array = [];
                isGreater = false;
            }
            temp_array.push(max_row_each_frame[i]);
        } else if (currentFrameOnesCount < nextFrameOnesCount) {
            isGreater = true;
            if (isLesser) {
                if (temp_array.length > 0) {
                    temp_array.push(max_row_each_frame[i]);
                    stands.push(temp_array);
                }
                temp_array = [];
                isLesser = false;
            }
            temp_array.push(max_row_each_frame[i]);
        } else {
            isLesser = true;
            isGreater = true;
            temp_array.push(max_row_each_frame[i + 1]);
        }
    }
    if (temp_array.length > 0) {
        temp_array.push(max_row_each_frame[i]);
        stands.push(temp_array);
    }
    return stands;
}

function numberOfOnes(array) {
    var count = 0;
    for (var i = 0; i < array.length; i++) {
        if (array[i] === 255) {
            count++;
        }
    }
    return count;
}

function fastAbs(value) {
    return (value ^ (value >> 31)) - (value >> 31);
}

function threshold(value) {
    return (value > 0x15) ? 0xFF : 0;
}
// start the loop               
animate();