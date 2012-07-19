/*
 * Dan Armendariz
 * danallan@mit.edu
 * 
 * Place the below snippet above all other JS code to hijack a browser's
 * getCurrentPosition() method with something a bit more predictable.
 *
 */

navigator.geolocation.getCurrentPosition = function (callback, error_handler, options) {

    // retrieve date info for position.timestamp
    var d = new Date();
    
    // position object, to pass to callback
    var position = { 
        coords: { 
            latitude:"42.377334",
            longitude:"-71.118228", 
            accuracy: "100",
        },
        timestamp: d.getTime()
    };

    // error object, to pass to error_handler
    var error = { 
        PERMISSION_DENIED:1,
        POSITION_UNAVAILABLE:2,
        TIMEOUT:3,
        code: Math.floor(Math.random()*3)+1,
        message: "Dummy message from hijacked getCurrentPosition method"
    };
    
    // run callback 95% of the time
    if (Math.random() < 0.95)
        callback(position);
    else
        error_handler(error);
};