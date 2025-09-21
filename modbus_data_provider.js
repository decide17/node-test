// Simulate Modbus data acquisition
// setInterval(() => {
//     const voltage = (Math.random() * (250 - 220) + 220).toFixed(2); // Simulate voltage between 220V and 250V
//     const forwardCurrent = (Math.random() * (10 - 0) + 0).toFixed(2); // Simulate current between 0A and 10A
//     const reflectedCurrent = (Math.random() * (2 - 0) + 0).toFixed(2); // Simulate reflected current between 0A and 2A
//     const forwardPower = (voltage * forwardCurrent / 1000).toFixed(2); // Simulate power in kW
//     const reflectedPower = (voltage * reflectedCurrent / 1000).toFixed(2); // Simulate power in kW

//     const simulatedData = {
//         voltage: parseFloat(voltage),
//         forwardCurrent: parseFloat(forwardCurrent),
//         reflectedCurrent: parseFloat(reflectedCurrent),
//         forwardPower: parseFloat(forwardPower),
//         reflectedPower: parseFloat(reflectedPower)
//     };

//     console.log("Simulated Data:", simulatedData);

//     // updateOscilloscope(simulatedData); // This line is commented out as it's not used with oscilloscope_simulator.js
// }, 500); // Update every 500ms


// create an empty modbus client
const ModbusRTU = require("modbus-serial");
// const { version } = require("react");
const client = new ModbusRTU();

let readInterval = null; // Variable to hold the interval ID

function send_start(port) {
    if (client.isOpen) {
        console.log("Already connected.");
        return;
    }

    console.log(`send_start: Connecting to ${port}...`);
    client.connectRTUBuffered(port, { baudRate: 115200 }, (err) => {
        if (err) {
            return console.error("Connection failed:", err.message);
        }
        console.log("Connected successfully.");
        client.setID(1);

        // Clear any existing interval before starting a new one
        if (readInterval) {
            clearInterval(readInterval);
        }

        readInterval = setInterval(() => {
            // console.log("setInterval");
            client.readHoldingRegisters(0, 16, (err, modbusdata) => {
                if (err) {
                    console.error("Error reading registers:", err.message);
                    // Stop trying to read if there's an error and close connection
                    send_stop();
                    return;
                }

                if (modbusdata && modbusdata.data) {
                    console.log(modbusdata.data);

                    const version1 = modbusdata.data[0];
                    const version2 = modbusdata.data[1];
                    const version3 = modbusdata.data[2];
                    const forwardCurrent = modbusdata.data[3] / 100; // Convert to current
                    const forwardVolt = modbusdata.data[4] / 100; // Convert to current
                    const forwardWatt = modbusdata.data[5] / 100; // Convert to current

                    const VI_PHASE_DIFFERENCE_A = modbusdata.data[6] / 100; // Convert to current
                    const RF_2S_VOLTAGE = modbusdata.data[7] / 100;
                    const VOLT_V12_ = modbusdata.data[8] / 100;
                    const VOLT_V12 = modbusdata.data[9] / 100;
                    const VOLT_V5 = modbusdata.data[10] / 100;
                    const VOLT_V5_ = modbusdata.data[11] / 100;
                    const CURR_VRF = modbusdata.data[12] / 100;
                    const NTC_RF = modbusdata.data[13] / 10;
                    const PWM = modbusdata.data[14];
                    const Hz = modbusdata.data[15];

                    window.dispatchEvent(new CustomEvent('modbusData', { 
                        detail: { 
                            forwardCurrent, 
                            forwardVolt, 
                            forwardWatt, 
                            VI_PHASE_DIFFERENCE_A, 
                            RF_2S_VOLTAGE, 
                            VOLT_V12_, 
                            VOLT_V12, 
                            VOLT_V5, 
                            VOLT_V5_,
                            CURR_VRF, 
                            NTC_RF,
                            PWM,
                            Hz
                        }
                    }));
                }
            });
        }, 500);
    });
}

function send_stop() {
    console.log("send_stop");
    if (readInterval) {
        clearInterval(readInterval);
        readInterval = null;
        console.log("Data reading stopped.");
    }

    if (client.isOpen) {
        client.close((err) => {
            if (err) {
                return console.error("Error closing port:", err.message);
            }
            console.log("Connection closed successfully.");
        });
    } else {
        console.log("Connection is already closed.");
    }
}

function sendPwmOn() {
    if (client.isOpen) {
        client.writeRegisters(83, [0, 0xffff])
            .then(() => {
                console.log("Successfully wrote registers for Function 1.");
            })
            .catch((err) => {
                console.error("Error writing registers for Function 1:", err.message);
            });
    } else {
        console.log("Modbus client is not open. Cannot send Function 1 command.");
    }
}

function sendPwmOff() {
    if (client.isOpen) {
        client.writeRegisters(83, [0, 0])
            .then(() => {
                console.log("Successfully wrote registers for Function 1.");
            })
            .catch((err) => {
                console.error("Error writing registers for Function 1:", err.message);
            });
    } else {
        console.log("Modbus client is not open. Cannot send Function 1 command.");
    }
}

const relayStates = {
  1: false, // 67
  2: false, // 69
  3: false, // 71
  4: false, // 73
  5: false, // 75
  6: false, // 77
  7: false, // 79
  8: false // 81
};

function toggleRelay(relayNumber) {
  relayStates[relayNumber] = !relayStates[relayNumber];
  const button = document.getElementById(`relay${relayNumber}Btn`);
  if (relayStates[relayNumber]) {
    button.classList.remove('btn-secondary');
    button.classList.add('btn-success');
    console.log(`RELAY ${relayNumber} ON command sent`);
  } else {
    button.classList.remove('btn-success');
    button.classList.add('btn-secondary');
    console.log(`RELAY ${relayNumber} OFF command sent`);
  }

    if (client.isOpen) {
        const register = 67 + (relayNumber-1) * 2; // Calculate the register address based on relay number
        client.writeRegisters(register, [0, relayStates[relayNumber] ? 0xffff : 0])
        // const register = 68 + relayNumber; // Adjusted register address for relay control
        // console.log(`register!!!! ${register}. relayStates[relayNumber]: ${relayStates[relayNumber]}`);
        // client.writeRegister(register, relayStates[relayNumber] ? 0xffff : 0)
            .then(() => {
                console.log(`Successfully wrote registers for RELAY ${relayNumber}.`);
            })
            .catch((err) => {
                console.error(`Error writing registers for RELAY ${relayNumber}:`, err.message);
            });
    } else {
        console.log(`Modbus client is not open. Cannot send RELAY ${relayNumber} command.`);
    }
}

function sendPwmModbus(value) {
    if (client.isOpen) {
        client.writeRegisters(85, [0, value])
            // .then(() => {
            //     console.log(`Successfully wrote PWM value: ${value}`);
            //     // also turn on PWM
            //     return client.writeRegisters(75, [0, 0xffff]);
            // })
            // .then(() => {
            //     console.log("Successfully turned PWM ON.");
            // })
            // .catch((err) => {
            //     console.error(`Error writing PWM value or turning PWM ON:`, err.message);
            // });
    } else {
        console.log("Modbus client is not open. Cannot send PWM value.");
    }
}
