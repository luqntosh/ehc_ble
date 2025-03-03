// UI
const stateTable = [['-', '↑', '↓', '⇈', '⇊', '⇈', '⇊'], ['N', 'Ś', 'W', 'Z', 'A']]


// State
let bluetoothDevice;
let bleServer;
let bleServiceConnection;
let infoCharacteristicConnection;
let allowConnection = true;
let interval;
let buffer = [];

const bleService = '88a27234-28dd-4fb4-8983-6d3e392d038e';
const infoCharacteristic = 'b061cb48-d310-489b-bb30-f23ab5cebf7d'
const stateCharacteristic = '15f366ef-6925-4da3-af6f-7de2c1b82794'
const options = {
    filters: [{ namePrefix: "EHC_" }],
    optionalServices: [bleService]
}

async function startConnection() {
    bluetoothDevice = null;
    try {
        console.log('Requesting any Bluetooth Device...');
        bluetoothDevice = await navigator.bluetooth.requestDevice(options);
        bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);
        connect();
        allowConnection = true
    } catch (error) {
        console.log('Ble: ' + error);
    }
}

async function connect() {
    try {
        if (allowConnection) {
            console.log('Connecting to Bluetooth Device... ');
            bleServer = await bluetoothDevice.gatt.connect();
            console.log(bluetoothDevice)
            bleServiceConnection = await bleServer.getPrimaryService(bleService);
            console.log(bleServer);
            infoCharacteristicConnection = await bleServiceConnection.getCharacteristic(infoCharacteristic);
            console.log(infoCharacteristicConnection)
            infoCharacteristicConnection.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
            infoCharacteristicConnection.startNotifications();
            Alpine.store('statusIcon', '🟢');
            interval = setInterval(() => {
                if (buffer.length !== 0 ) {
                    let set = new Set(buffer)
                    buffer = [...set];
                    writeOnCharacteristic(buffer.join(';'))
                    buffer = []
                }
              }, 150);
              

        }

    }
    catch (error) {
        Alpine.store('statusIcon', '🔴');
        console.log(error)
    }
}

function onDisconnected() {
    console.log('> Bluetooth Device disconnected');
    Alpine.store('statusIcon', '🟡');
    clearInterval(interval);
    connect();
}

function closeConnection() {
    allowConnection = false
    if (!bluetoothDevice) {
        return;
    }
    console.log('Disconnecting from Bluetooth Device...');
    if (bluetoothDevice.gatt.connected) {
        bluetoothDevice.gatt.disconnect();
    } else {
        console.log('> Bluetooth Device is already disconnected');
    }
    Alpine.store('statusIcon', '🔴');
    clearInterval(interval);
}

function handleCharacteristicChange(event) {
    const data = new TextDecoder().decode(event.target.value);
    state = data.split(';').map((e) => { return Number(e) });
    const hi = stateTable[0][state[0]];
    const h1 = stateTable[0][state[1]];
    const etc = stateTable[1][state[4]];
    const c = state[3].toString().padStart(2);
    const p = state[2] ? '-W' : ' ';
    let obj = {
        hitch: hi,
        hydr: h1,
        counter: c,
        timeoff: p,
        etc: etc
    }
    Alpine.store('status', obj)
}
function writeOnCharacteristic(value) {
    if (bleServer && bleServer.connected) {
        bleServiceConnection.getCharacteristic(stateCharacteristic)
            .then(characteristic => {
                console.log("Found characteristic: ", characteristic.uuid);
                const encoder = new TextEncoder('utf-8')
                const data = encoder.encode(value)
                return characteristic.writeValue(data);
            })
            // .then(() => {
            //     console.log("Value written to characteristic:", value);
            // })
            .catch(error => {
                console.error("Error writing to characteristic: ", error);
            });
    } else {
        console.error("Bluetooth is not connected. Cannot write to characteristic.");
    }
}

document.addEventListener('alpine:init', () => {
    Alpine.store('status', {
        hitch: ' ',
        hydr: ' ',
        counter: 0,
        timeoff: ' ',
        etc: 'Z'
    })
    Alpine.store('statusIcon', '🔴');
})

// const keysMap = new Map([
//     ['7', 1],
//     ['8', 2],
//     ['9', 3],
//     ['+', 4],
//     ['4', '15;3'],
//     ['5', '15;4'],
//     ['0', 9],
//     ['.', 10],
//     ['6', 13],
//     ['Backspace', 14],
//     ['*', 12],
//     ['-', 16],
//     ['/', 11],
//     ['Enter', '15;16']
// ]);

// const unbouncedKeys = ['4', '5'];
// let lastKeyTimestanp = Date.now();

// document.addEventListener("keydown", (e) => {
//     // if (unbouncedKeys.includes(e.key)) {
//     //     const now = Date.now()
//     //     const diff = now - lastKeyTimestanp;
//     //     if (diff > 150) {
//     //         console.log(diff);
//     //         console.log(e.key);
//     //         lastKeyTimestanp = now
//     //     }

//     // }
//     if (!e.repeat) {
//         if (v = keysMap.get(e.key)) {
//             writeOnCharacteristic(v);
//         }
//     }
// })