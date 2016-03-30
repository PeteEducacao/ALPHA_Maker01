(function(ext) {
    var device = null;
    var rawData = null;
    
     ext.resetAll = function(){};
     
    // Configure serial baudrate = 9600, parity=none, stopbits=1, databits=8
    
    function appendBuffer( buffer1, buffer2 ) {
        var tmp = new Uint8Array( buffer1.byteLength + buffer2.byteLength );
        tmp.set( new Uint8Array( buffer1 ), 0 );
        tmp.set( new Uint8Array( buffer2 ), buffer1.byteLength );
        return tmp.buffer;
    }
    
    //************************************************************
    //   BLOCOS
    
    ext.MakerConectada = function() {
       
           return true;
     };
    
    
    ext.wait_random = function(callback) {
        wait = Math.random();
        console.log('Waiting for ' + wait + ' seconds');
        window.setTimeout(function() {
            callback();
        }, wait*1000);
    };
    
    //*************************************************************
    
    var potentialDevices = [];
    ext._deviceConnected = function(dev) {
        potentialDevices.push(dev);
        console.log('Aqui 1. ');
        if (!device) {
            console.log('Aqui 2. ');
            tryNextDevice();
        }
    }

    var inputArray = [];
    function processData() {
        var bytes = new Uint8Array(rawData);

        console.log('Aqui 8. ');
        console.log('bytes[0] ' + bytes[0]);
        

        if (watchdog && (bytes[0] == 77)) {
            // Reconhece como sendo uma Maker
            clearTimeout(watchdog);
            watchdog = null;
            clearInterval(poller);
            poller = null;
            console.log('bingo!');
        }

 
        rawData = null;
    }


    var poller = null;
    var watchdog = null;
    function tryNextDevice() {
        // If potentialDevices is empty, device will be undefined.
        // That will get us back here next time a device is connected.
        device = potentialDevices.shift();
        console.log('Aqui 3. ');
        if (!device) return;
        console.log('Aqui 4. ');
        device.open({ stopBits: 0, bitRate: 9600, ctsFlowControl: 0 });
        
        device.set_receive_handler(function(data) {
            console.log('Aqui: 5');
            console.log('Recebi: ' + data.byteLength);
            if(!rawData || rawData.byteLength == 2) rawData = new Uint8Array(data);
            else rawData = appendBuffer(rawData, data);

            if(rawData.byteLength >= 2) {
                console.log('rawData '+ rawData);
                processData();
                //device.send(pingCmd.buffer);
            }
        });

        // Tell the PicoBoard to send a input data every 50ms
        var pingCmd = new Uint8Array(1);
        pingCmd[0] = 1;
        poller = setInterval(function() {
            console.log('Aqui: 6');
            device.send(pingCmd.buffer);
        }, 50);
        
        watchdog = setTimeout(function() {
            console.log('Aqui: 7');
            // This device didn't get good data in time, so give up on it. Clean up and then move on.
            // If we get good data then we'll terminate this watchdog.
            clearInterval(poller);
            poller = null;
            device.set_receive_handler(null);
            device.close();
            device = null;
            tryNextDevice();
        }, 250);
    };

    //*************************************************************
    ext._deviceRemoved = function(dev) {
        console.log('_deviceRemoved');
        if(device != dev) return;
        if(poller) poller = clearInterval(poller);
        device = null;
    };

    ext._shutdown = function() {
        if(device) device.close();
        if(poller) poller = clearInterval(poller);
        device = null;
    };

    ext._getStatus = function() {
        console.log('_getStatus');
        if(!device) return {status: 0, msg: 'Maker desconectado'};
        if(watchdog) return {status: 1, msg: 'Procurando pela Maker'};
        return {status: 2, msg: 'Maker conectada'};
    }

    //************************************************************
    // Block and block menu descriptions
    var descriptor = {
        blocks: [
                ['h', 'when ALPHA Maker is connected', 'MakerConectada'],
                ['w', 'wait for random time', 'wait_random'],
        ],
        menus: {
            booleanSensor: ['button pressed', 'A connected', 'B connected', 'C connected', 'D connected'],
            sensor: ['slider', 'light', 'sound', 'resistance-A', 'resistance-B', 'resistance-C', 'resistance-D'],
            lessMore: ['>', '<']
        },
    };
    console.log('TESTE ');
    ScratchExtensions.register('ALPHA Maker', descriptor, ext, {type: 'serial'});
})({});
