'use strict';
const { createBluetooth } = require( 'node-ble' );
var util = require('util')
var firebase = require('firebase/app');
var nodeimu = require('@trbll/nodeimu');
var IMU = new nodeimu.IMU();
var sense = require('@trbll/sense-hat-led');
// TODO: Replace this with your Arduino's Bluetooth address
// as found by running the 'scan on' command in bluetoothctl
const{ getDatabase, ref, onValue, set, update, get, child } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyBztVXxwlyi3wIHRHXmW38SbrHtxfofVVI",
  authDomain: "iotlab-2.firebaseapp.com",  
  databaseURL: "https://iotlab-2-default-rtdb.firebaseio.com",
  projectId: "iotlab-2",
  storageBucket: "iotlab-2.appspot.com",
  messagingSenderId: "241128345524",
  appId: "1:241128345524:web:fa85cd9bb2e246bb0aece1",
  measurementId: "G-5118YW1RJN"
};

firebase.initializeApp(firebaseConfig);

const database = getDatabase();

sense.clear(0,0,0);
const ARDUINO_BLUETOOTH_ADDR = '2A:99:83:76:9A:CD';

const UART_SERVICE_UUID      = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const TX_CHARACTERISTIC_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
const RX_CHARACTERISTIC_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';

const EES_SERVICE_UUID       = '0000181a-0000-1000-8000-00805f9b34fb';
const TEMP_CHAR_UUID         = '00002a6e-0000-1000-8000-00805f9b34fb';

var callb = function (e, data) {
	var str2 = "";
	if (data.humidity){
	  const updates = {}
	  updates['/humidity'] = data.humidity.toFixed(4);
	  update(ref(database),updates);
	  var str2 = util.format('humidity:  %s',data.humidity.toFixed(4));
	  
	};
console.log(str2);
};
var myVar;
let go= true;

function myFunction(interval){
  myVar = setInterval(everyInterval,(interval*1000));
  console.log("the new interval is: " + interval*1000);
}
function everyInterval(){
  IMU.getValue(callb);
}
var light_row = 0;
var light_col = 0;
var light_r = 0;
var light_g = 0;
var light_b = 0;
function changePixel(){
  if (go){
    sense.setPixel(light_row, light_col,[light_r, light_g, light_b]);
  }
}

//code to get updates to the update_light variable
const update_lightRef = ref(database,'/update_light');
onValue(update_lightRef,(snapshot) =>{
  const data = snapshot.val();
    if(data == "False"){
    }
    else{
      console.log("light data received");
      const dbRef = ref(getDatabase());
      get(child(dbRef,'/')).then((snapshot) => {
	if (snapshot.exists()){
	  light_row = snapshot.val().light_row;
	  if (light_row > 7 || light_row < 0){
	    go = false
	  }
	  console.log('light row: ' + light_row);
	  console.log(go);
	
	  light_col = snapshot.val().light_col;
	  if (light_col > 7 || light_col < 0){
	    go = false;
	  }
	  console.log('light col: ' + light_col);
	  console.log(go);
		
	  light_r = snapshot.val().light_r;
	  if (light_r > 255 || light_r < 0){
	    go = false;
	  }
	  console.log('light r: ' + light_r);
	  console.log(go);
	  
	  light_g = snapshot.val().light_g;
	  if (light_g > 255 || light_g < 0){
	    go = false;
	  }
	  console.log('light g: ' + light_g);
	  	console.log(go);
		
	  light_b = snapshot.val().light_b;
	  if (light_b > 255 || light_b < 0){
	    go = false;
	  }
	  console.log('light b: ' + light_b);
	  console.log(go);
	  
	  changePixel();
	  go=true;
	}

	
	else{
	  console.log("No data available");
	}
      }).catch((error) => {
	console.error(error);
	go = false;
      });
      
      
    
      
    }
  });    

async function main( )
{

    // Reference the BLE adapter and begin device discovery...
    const { bluetooth, destroy } = createBluetooth();
    const adapter = await bluetooth.defaultAdapter();
    const discovery =  await adapter.startDiscovery();
    console.log( 'discovering...' );

    // Attempt to connect to the device with specified BT address
    const device = await adapter.waitDevice( ARDUINO_BLUETOOTH_ADDR.toUpperCase() );
    console.log( 'found device. attempting connection...' );
    await device.connect();
    console.log( 'connected to device!' );

    // Get references to the desired UART service and its characteristics
    const gattServer = await device.gatt();
    const uartService = await gattServer.getPrimaryService( UART_SERVICE_UUID.toLowerCase() );
    const essService = await gattServer.getPrimaryService( EES_SERVICE_UUID.toLowerCase() );
    const txChar = await uartService.getCharacteristic( TX_CHARACTERISTIC_UUID.toLowerCase() );
    const rxChar = await uartService.getCharacteristic( RX_CHARACTERISTIC_UUID.toLowerCase() );

    // Get references to the desired ESS service and its temparature characteristic.
    // TODO
    const temp = await essService.getCharacteristic(TEMP_CHAR_UUID.toLowerCase());
    

    // Register for notifications on the RX characteristic
    await rxChar.startNotifications( );

    // Callback for when data is received on RX characteristic
    rxChar.on( 'valuechanged', buffer =>
    {
        console.log('Received: ' + buffer.toString());
    });

    // Register for notifications on the temperature characteristic
    //TODO
    await temp.startNotifications( );

    // Callback for when data is received on the temp characteristic
    // TODO
    temp.on( 'valuechanged', buffer =>
    {
        var temp = Number(buffer.readUInt16LE(0)/100).toFixed(2)
        console.log('Temperature: ' + temp);
        const updates = {};
        updates['/temperature'] = temp;
        update(ref(database),updates);
    });
    const intervalRef = ref(database,'/interval');
    onValue(intervalRef,(snapshot) =>{
    const data = snapshot.val();
    myFunction(parseInt(data));
    txChar.writeValue(Buffer.from(data.toString()));
    
    });
    
    // Set up listener for console input.
    // When console input is received, write it to TX characteristic
    const stdin = process.openStdin( );
    stdin.addListener( 'data', async function( d )
    {
        let inStr = d.toString( ).trim( );

        // Disconnect and exit if user types 'exit'
        if (inStr === 'exit')
        {
            console.log( 'disconnecting...' );
            await device.disconnect();
            console.log( 'disconnected.' );
            destroy();
            process.exit();
        }

        // Specification limits packets to 20 bytes; truncate string if too long.
        inStr = (inStr.length > 20) ? inStr.slice(0,20) : inStr;

        // Attempt to write/send value to TX characteristic
        await txChar.writeValue(Buffer.from(inStr)).then(() =>
        {
            console.log('Sent: ' + inStr);
        });
    });

}

main().then((ret) =>
{
    if (ret) console.log( ret );
}).catch((err) =>
{
    if (err) console.error( err );
});
