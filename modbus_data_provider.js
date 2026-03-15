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
        // Read Main Version (Registers 0x00-0x02)
        readMainVersion();
    });
}

// Helper to format parsed data for UI event
function formatEventData(parsed) {
    const s1 = (parsed.serial[0] || 0).toString(16).toUpperCase().padStart(8, '0');
    const s2 = (parsed.serial[1] || 0).toString(16).toUpperCase().padStart(8, '0');
    const productSerial = s1 + s2;

    return {
        Country: parsed.info.country || 0,
        Mhz: parsed.info.mhz || 0,
        Depth: parsed.info.depth || 0,
        ProductSerial: productSerial,
        TotalShot: parsed.shot[0].count || 0,
        RemShot: parsed.shot[1].count || 0,
        Power: parsed.info.power || 0,
        Power: parsed.info.power || 0,
        Version: parsed.info.version || (parsed.info.productCode ? `v.${parsed.info.productCode}` : '-')
    };
}


// Send 8-byte Info struct to Line Cartridge (registers 0x07 ~ 0x0A)
function sendLineCartridgeInfo(mhz, depth, country, power) {
    if (!client.isOpen) return console.log("Modbus not connected");

    // Struct:
    // Mhz (16)
    // Depth (8), Country (8)
    // ProductCode (8), Padding (8)
    // CRC (16)

    // Swap bytes for Endianness compatibility (Little Endian receiver vs Big Endian Modbus)
    // We want to send [Low Byte, High Byte] sequence.
    // Modbus sends [High Byte, Low Byte].
    // So we put Low Byte in High position, and High Byte in Low position.

    const mhzVal = Math.round(mhz * 1000);
    // Word0: Mhz. Original: (High << 8) | Low. Swapped: (Low << 8) | High.
    const word0 = ((mhzVal & 0xFF) << 8) | ((mhzVal >> 8) & 0xFF);

    // Word1: Depth (Low Addr), Country (High Addr).
    // Original LE Struct: Depth is Low Byte, Country is High Byte.
    // We want receiver to get Depth then Country.
    // Modbus sends High then Low.
    // So High=Depth, Low=Country.
    const word1 = ((depth & 0xFF) << 8) | (country & 0xFF);

    // Word2: ProductCode(Low), Power(High Addr / Byte sent second) -> sent as (ProductCode << 8) | Power
    // Since ProductCode is 0, we just need Power in the Low Byte position?
    // High Byte of Word -> Low Addr. Low Byte of Word -> High Addr.
    // We want ProductCode at Low Addr (Buffer[12]), Power at High Addr (Buffer[13]).
    // So High Byte = ProductCode (0), Low Byte = Power.
    const word2 = (power & 0xFF) << 8;

    // Word3: CRC
    const word3 = 0;

    // console.log(`Sending LC Info to 0x07 (Swapped): MHz=${mhzVal} (Word0=0x${word0.toString(16)}), D=${depth}, C=${country} (Word1=0x${word1.toString(16)}), P=${power} (Word2=0x${word2.toString(16)})`);

    client.writeRegisters(7, [word0, word1, word2, word3])
        .then(() => {
            // console.log("Successfully sent Line Cartridge Info.");
        })
        .catch((err) => {
            console.error("Error sending Line Cartridge Info:", err.message);
        });
}

// Send 8-byte Info struct to Pen Cartridge (Start 39 + 4 = 43)
function sendPenCartridgeInfo(mhz, depth, country, power) {
    if (!client.isOpen) return console.log("Modbus not connected");

    const mhzVal = Math.round(mhz * 1000);
    // Word0: Mhz. (Low << 8) | High.
    const word0 = ((mhzVal & 0xFF) << 8) | ((mhzVal >> 8) & 0xFF);

    // Word1: Depth (Low), Country (High).
    const word1 = ((depth & 0xFF) << 8) | (country & 0xFF);

    // Word2: ProductCode(Low), Power(High).
    const word2 = (power & 0xFF) << 8

    // Word3: CRC
    const word3 = 0;

    // console.log(`Sending PC Info to 0x2B (43) (Swapped): MHz=${mhzVal}, D=${depth}, C=${country}, P=${power}`);

    client.writeRegisters(43, [word0, word1, word2, word3])
        .then(() => console.log("Successfully sent Pen Cartridge Info."))
        .catch((err) => console.error("Error sending PC Info:", err.message));
}

// Send 8-byte Info struct to RF Tip (Start 75 + 4 = 79)
function sendRfTipInfo(mhz, depth, country, power) {
    if (!client.isOpen) return console.log("Modbus not connected");

    const mhzVal = Math.round(mhz * 1000);
    const word0 = ((mhzVal & 0xFF) << 8) | ((mhzVal >> 8) & 0xFF);
    const word1 = ((depth & 0xFF) << 8) | (country & 0xFF);
    const word2 = (power & 0xFF) << 8
    const word3 = 0;

    // console.log(`Sending RT Info to 0x4F (79) (Swapped): MHz=${mhzVal}, D=${depth}, C=${country}, P=${power}`);

    client.writeRegisters(79, [word0, word1, word2, word3])
        .then(() => console.log("Successfully sent RF Tip Info."))
        .catch((err) => console.error("Error sending RT Info:", err.message));
}

function scanLineCartridge() {
    if (!client.isOpen) return console.log("Modbus not connected");
    console.log("Scanning Line Cartridge...");
    // Start 0x100, Length 36
    client.readHoldingRegisters(0x100, 36, (err, data) => {
        if (err) {
            console.error("Error reading Line Cartridge:", err.message);
        } else {
            console.log("Line Cartridge Raw [0x100]:", data.data);
            try {
                const parsed = parseDeviceData(data.data);
                const formatted = formatEventData(parsed);
                console.log("Line Cartridge Formatted:", formatted);
                window.dispatchEvent(new CustomEvent('lineCartridgeData', { detail: formatted }));
            } catch (e) {
                console.error("Parse Error LC:", e);
            }
        }
    });
}

function scanPenCartridge() {
    if (!client.isOpen) return console.log("Modbus not connected");
    console.log("Scanning Pen Cartridge...");
    // Start 0x200, Length 36
    client.readHoldingRegisters(0x200, 36, (err, data) => {
        if (err) {
            console.error("Error reading Pen Cartridge:", err.message);
        } else {
            console.log("Pen Cartridge Raw [0x200]:", data.data);
            try {
                const parsed = parseDeviceData(data.data);
                const formatted = formatEventData(parsed);
                console.log("Pen Cartridge Formatted:", formatted);
                window.dispatchEvent(new CustomEvent('penCartridgeData', { detail: formatted }));
            } catch (e) {
                console.error("Parse Error PC:", e);
            }
        }
    });
}

function scanRfTip() {
    if (!client.isOpen) return console.log("Modbus not connected");
    console.log("Scanning Pen RF...");
    // Start 0x300, Length 36
    client.readHoldingRegisters(0x300, 36, (err, data) => {
        if (err) {
            console.error("Error reading Pen RF:", err.message);
        } else {
            console.log("Pen RF Raw [0x300]:", data.data);
            try {
                const parsed = parseDeviceData(data.data);
                const formatted = formatEventData(parsed);
                console.log("Pen RF Formatted:", formatted);
                window.dispatchEvent(new CustomEvent('rfTipData', { detail: formatted }));
            } catch (e) {
                console.error("Parse Error RF:", e);
            }
        }
    });
}

function readMainVersion() {
    if (!client.isOpen) return;
    console.log("Reading Main Version (0x00-0x02)...");
    client.readHoldingRegisters(0, 3, (err, data) => {
        if (err) {
            console.error("Error reading Main Version:", err.message);
        } else {
            console.log("Main Version Raw:", data.data);
            if (data.data.length >= 3) {
                const major = data.data[0];
                const minor = data.data[1];
                const patch = data.data[2];
                const versionStr = `v${major}.${minor}.${patch}`;
                console.log("Main Version Formatted:", versionStr);
                window.dispatchEvent(new CustomEvent('mainVersionData', { detail: { version: versionStr } }));
            }
        }
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
    8: false, // 81
    13: false,
    14: false,
    15: false,
    16: false
};

function toggleRelay(arg1, arg2) {
    let relayNumber;
    let button;

    // Handle two call signatures: toggleRelay(relayNumber) and toggleRelay(buttonElement, relayNumber)
    if (typeof arg1 === 'number') {
        relayNumber = arg1;
        button = document.getElementById(`relay${relayNumber}Btn`);
    } else {
        button = arg1;
        relayNumber = arg2;
    }

    // Initialize state if not present
    if (typeof relayStates[relayNumber] === 'undefined') {
        relayStates[relayNumber] = false;
    }

    // Toggle state
    relayStates[relayNumber] = !relayStates[relayNumber];

    // Update button appearance if button exists
    if (button) {
        if (relayStates[relayNumber]) {
            button.classList.remove('bg-gray-500', 'btn-secondary');
            button.classList.add('bg-green-500', 'btn-success');
            console.log(`RELAY ${relayNumber} ON command sent`);
        } else {
            button.classList.remove('bg-green-500', 'btn-success');
            button.classList.add('bg-gray-500', 'btn-secondary');
            console.log(`RELAY ${relayNumber} OFF command sent`);
        }
    }

    if (client.isOpen) {
        const register = 67 + (relayNumber - 1) * 2; // Calculate the register address based on relay number
        client.writeRegisters(register, [0, relayStates[relayNumber] ? 0xffff : 0])
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

function sendPwmModbus(temp, value) {
    if (client.isOpen) {
        if (temp == 0) {
            client.writeRegisters(101, [0, value])
        } else {
            client.writeRegisters(99, [0, value])
        }
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

// Helper to swap bytes of a 16-bit word
function swap16(val) {
    return ((val & 0xFF) << 8) | ((val >> 8) & 0xFF);
}

// Helper to pack 16-char Hex String (8 bytes) into 8-word Modbus Struct
// Struct: Serial(4) | Padding(2) | CRC(2) | Serial(4) | Padding(2) | CRC(2)
// Total 16 bytes (8 words)
function packSerialToStruct(hex) {
    // Input hex length 16 chars (8 bytes). Padded by UI.
    const cleanHex = hex.replace(/^0x/i, '').padEnd(16, '0').substr(0, 16);

    // Split into two 4-byte (8-char) parts
    const part1 = cleanHex.substr(0, 8);
    const part2 = cleanHex.substr(8, 8);

    function getSerialWords(partHex) {
        // Parse 32-bit int
        const val = parseInt(partHex, 16);
        // Low Word: val & 0xFFFF
        // High Word: val >> 16
        // Swap bytes for little endian transmission
        const low = swap16(val & 0xFFFF);
        const high = swap16((val >>> 16) & 0xFFFF);
        return [low, high];
    }

    const s1Words = getSerialWords(part1);
    const s2Words = getSerialWords(part2);

    const pad = 0;
    const crc = 0;

    // Construct 8 words
    // Word 0-1: Serial 1
    // Word 2: Pad
    // Word 3: CRC
    // Word 4-5: Serial 2
    // Word 6: Pad
    // Word 7: CRC
    return [
        s1Words[0], s1Words[1], pad, crc,
        s2Words[0], s2Words[1], pad, crc
    ];
}

function sendLineCartridgeSerial(value) {
    if (client.isOpen) {
        try {
            console.log(`Sending LC Serial to 0x0B: ${value}`);
            const words = packSerialToStruct(value);
            // Address 11 (0x0B) ~ 18 (0x12)
            client.writeRegisters(11, words)
                .then(() => {
                    console.log(`Successfully set Line Cartridge Serial to: ${value}`);
                })
                .catch((err) => {
                    console.error("Error setting Line Cartridge Serial:", err.message);
                });
        } catch (e) {
            console.error("Invalid Serial format:", e.message);
        }
    } else {
        console.log("Modbus client is not open. Cannot set Line Cartridge Serial.");
    }
}

function sendLineCartridgeTotalShot(value) {
    if (client.isOpen) {
        console.log(`Sending LC Total Shot to 0x13: ${value}`);
        // Structure: _SHOT_t (Shot 24bit, Flag 8bit, Padding 16bit, CRC 16bit)
        // Reg0: Shot Low Word (Swapped)
        // Reg1: (Flag << 8 | Shot High Byte) (Swapped)
        // Reg2: Padding (Swapped/0)
        // Reg3: CRC (0)

        const shot = value;
        const flag = 0;

        // Word 0: Shot[15:0]
        const w0 = swap16(shot & 0xFFFF);

        // Word 1: Flag[7:0] << 8 | Shot[23:16]
        const w1_raw = (flag << 8) | ((shot >>> 16) & 0xFF);
        const w1 = swap16(w1_raw);

        const w2 = 0;
        const w3 = 0;

        // Address 19 (0x13) ~ 22 (0x16)
        client.writeRegisters(19, [w0, w1, w2, w3])
            .then(() => {
                console.log(`Successfully set Line Cartridge Total Shot to: ${value}`);
            })
            .catch((err) => {
                console.error("Error setting Line Cartridge Total Shot:", err.message);
            });
    } else {
        console.log("Modbus client is not open. Cannot set Line Cartridge Total Shot.");
    }
}

function sendLineCartridgeRemShot(value) {
    if (client.isOpen) {
        console.log(`Sending LC Rem Shot to 0x17: ${value}`);
        // Same structure as Total Shot
        const shot = value;
        const flag = 0;

        const w0 = swap16(shot & 0xFFFF);
        const w1_raw = (flag << 8) | ((shot >>> 16) & 0xFF);
        const w1 = swap16(w1_raw);
        const w2 = 0;
        const w3 = 0;

        // Address 23 (0x17) ~ 26 (0x1A)
        client.writeRegisters(23, [w0, w1, w2, w3])
            .then(() => {
                console.log(`Successfully set Line Cartridge Remaining Shot to: ${value}`);
            })
            .catch((err) => {
                console.error("Error setting Line Cartridge Remaining Shot:", err.message);
            });
    } else {
        console.log("Modbus client is not open. Cannot set Line Cartridge Remaining Shot.");
    }
}

// Removing obsolete individual set functions for Country/MHz/Depth as they are now handled by sendLineCartridgeInfo
function sendLineCartridgeCountry(value) { console.log("Use Set button to send Info struct."); }
function sendLineCartridgeMhz(value) { console.log("Use Set button to send Info struct."); }
function sendLineCartridgeDepth(value) { console.log("Use Set button to send Info struct."); }


function sendRfMhz(frequency) {
    if (client.isOpen) {
        const value = frequency * 100;
        // Register 103 is for RF MHz.
        client.writeRegisters(103, [0, value])
            .then(() => {
                console.log(`Successfully set RF frequency to: ${frequency} MHz`);
            })
            .catch((err) => {
                console.error("Error setting RF frequency:", err.message);
            });
    } else {
        console.log("Modbus client is not open. Cannot set RF frequency.");
    }
}

function sendIrradiationTime(time) {
    if (client.isOpen) {
        // Register 104 is for Irradiation Time.
        client.writeRegisters(107, [0, time])
            .then(() => {
                console.log(`Successfully set Irradiation Time to: ${time}`);
            })
            .catch((err) => {
                console.error("Error setting Irradiation Time:", err.message);
            });
    } else {
        console.log("Modbus client is not open. Cannot set Irradiation Time.");
    }
}

function sendPenCartridgeSerial(value) {
    if (client.isOpen) {
        try {
            console.log(`Sending PC Serial to 0x2F (47): ${value}`);
            const words = packSerialToStruct(value);
            // Address 47 ~ 54
            client.writeRegisters(47, words)
                .then(() => console.log(`Successfully set Pen Cartridge Serial.`))
                .catch((err) => console.error("Error setting PC Serial:", err.message));
        } catch (e) {
            console.error("Invalid Serial format:", e.message);
        }
    } else {
        console.log("Modbus client is not open. Cannot set PC Serial.");
    }
}

function sendPenCartridgeTotalShot(value) {
    if (client.isOpen) {
        console.log(`Sending PC Total Shot to 0x37 (55): ${value}`);
        const shot = value;
        const flag = 0;
        const w0 = swap16(shot & 0xFFFF);
        const w1_raw = (flag << 8) | ((shot >>> 16) & 0xFF);
        const w1 = swap16(w1_raw);
        const w2 = 0;
        const w3 = 0;

        // Address 55 ~ 58
        client.writeRegisters(55, [w0, w1, w2, w3])
            .then(() => console.log(`Successfully set PC Total Shot.`))
            .catch((err) => console.error("Error setting PC Total Shot:", err.message));
    } else {
        console.log("Modbus client is not open. Cannot set PC Total Shot.");
    }
}

function sendPenCartridgeRemShot(value) {
    if (client.isOpen) {
        console.log(`Sending PC Rem Shot to 0x3B (59): ${value}`);
        const shot = value;
        const flag = 0;
        const w0 = swap16(shot & 0xFFFF);
        const w1_raw = (flag << 8) | ((shot >>> 16) & 0xFF);
        const w1 = swap16(w1_raw);
        const w2 = 0;
        const w3 = 0;

        // Address 59 ~ 62
        client.writeRegisters(59, [w0, w1, w2, w3])
            .then(() => console.log(`Successfully set PC Rem Shot.`))
            .catch((err) => console.error("Error setting PC Rem Shot:", err.message));
    } else {
        console.log("Modbus client is not open. Cannot set PC Rem Shot.");
    }
}

function sendRfTipSerial(value) {
    if (client.isOpen) {
        try {
            console.log(`Sending RT Serial to 0x53 (83): ${value}`);
            const words = packSerialToStruct(value);
            // Address 83 ~ 90
            client.writeRegisters(83, words)
                .then(() => console.log(`Successfully set RF Tip Serial.`))
                .catch((err) => console.error("Error setting RT Serial:", err.message));
        } catch (e) {
            console.error("Invalid Serial format:", e.message);
        }
    } else {
        console.log("Modbus client is not open. Cannot set RT Serial.");
    }
}

function sendRfTipTotalShot(value) {
    if (client.isOpen) {
        console.log(`Sending RT Total Shot to 0x5B (91): ${value}`);
        const shot = value;
        const flag = 0;
        const w0 = swap16(shot & 0xFFFF);
        const w1_raw = (flag << 8) | ((shot >>> 16) & 0xFF);
        const w1 = swap16(w1_raw);
        const w2 = 0;
        const w3 = 0;

        // Address 91 ~ 94
        client.writeRegisters(91, [w0, w1, w2, w3])
            .then(() => console.log(`Successfully set RT Total Shot.`))
            .catch((err) => console.error("Error setting RT Total Shot:", err.message));
    } else {
        console.log("Modbus client is not open. Cannot set RT Total Shot.");
    }
}

function sendRfTipRemShot(value) {
    if (client.isOpen) {
        console.log(`Sending RT Rem Shot to 0x5F (95): ${value}`);
        const shot = value;
        const flag = 0;
        const w0 = swap16(shot & 0xFFFF);
        const w1_raw = (flag << 8) | ((shot >>> 16) & 0xFF);
        const w1 = swap16(w1_raw);
        const w2 = 0;
        const w3 = 0;

        // Address 95 ~ 98
        client.writeRegisters(95, [w0, w1, w2, w3])
            .then(() => console.log(`Successfully set RT Rem Shot.`))
            .catch((err) => console.error("Error setting RT Rem Shot:", err.message));
    } else {
        console.log("Modbus client is not open. Cannot set RT Rem Shot.");
    }
}





// Helper to pack Modbus words (16-bit) into bytes (Little Endian words, Little Endian bytes mapping)
function wordsToBytes(words) {
    const buffer = new Uint8Array(words.length * 2);
    for (let i = 0; i < words.length; i++) {
        // Modbus registers are 16-bit. Assuming Little Endian payload packed into registers.
        // If the STM32 treats memory as bytes and we read WORDs via Modbus:
        // Register = (ByteH << 8) | ByteL or similar. 
        // Typically Modbus transmits High Byte first? 
        // But if modbus-serial gives us a number, we must assume how it was packed.
        // Standard Modbus is Big Endian per register. 
        // But if STM32 memory is 0x01 0x02 0x03 0x04
        // And it acts as Modbus Slave... it might send 0x0201 (Reg 0), 0x0403 (Reg 1).
        // Let's assume standard Little Endian byte reconstruction from words.
        buffer[i * 2] = words[i] & 0xFF;         // Low byte
        buffer[i * 2 + 1] = (words[i] >> 8) & 0xFF; // High byte
    }
    return buffer;
}

function parseDeviceData(words) {
    if (!words || words.length < 36) return {}; // Need at least 36 words

    const buffer = wordsToBytes(words);
    const dataView = new DataView(buffer.buffer);

    // Structure Layout (48 bytes total):
    // _SEED_t Seed_Value (8 bytes)
    // _INFO_t Info_Value (8 bytes)
    // _SERIAL_t Serial_Value[2] (16 bytes)
    // _SHOT_t Shot_Value[2] (16 bytes)

    // 1. _SEED_t
    // uint64_t seed :40;
    // uint16_t padding :8;
    // uint16_t crc16 :16;
    const seedLow = dataView.getUint32(0, true);
    const seedHigh = buffer[4];
    const seed = (BigInt(seedHigh) << 32n) | BigInt(seedLow);

    // 2. _INFO_t
    // uint16_t Mhz :16;
    // uint16_t depth :8;
    // uint16_t country :8;
    // uint16_t product_code :8;
    // uint16_t padding :8;
    // uint16_t crc16 :16;
    const mhz = dataView.getUint16(8, true);
    const depth = buffer[10];
    const country = buffer[11];
    const power = buffer[12];

    // 3. _SERIAL_t [0]
    // uint32_t Serial :32;
    // uint16_t padding :16;
    // uint16_t crc16 :16;
    const serial1 = dataView.getUint32(16, true);

    // 4. _SERIAL_t [1]
    const serial2 = dataView.getUint32(24, true);

    // 5. _SHOT_t [0]
    // uint32_t shot :24;
    // uint32_t update_flag :8;
    // uint16_t padding :16;
    // uint16_t crc16 :16;
    const shot1raw = dataView.getUint32(32, true);
    const shot1 = shot1raw & 0xFFFFFF;
    const updateFlag1 = (shot1raw >>> 24) & 0xFF;

    // 6. _SHOT_t [1]
    const shot2raw = dataView.getUint32(40, true);
    const shot2 = shot2raw & 0xFFFFFF;
    const updateFlag2 = (shot2raw >>> 24) & 0xFF;

    // 7. Version_Value (Word 32, Byte 64)
    // _INFO_V_t (8 bytes)
    // Byte 0: Major, Byte 1: Minor, Byte 2: Patch
    console.log("Version Bytes:", buffer[64], buffer[65], buffer[66]);

    const vMajor = buffer[64];
    const vMinor = buffer[65];
    const vPatch = buffer[66];

    const versionStr = `v${vMajor}.${vMinor}.${vPatch}`;

    return {
        seed: seed.toString(),
        info: {
            mhz,
            depth,
            country,
            // productCode removed as per user edit
            power,
            version: versionStr
        },
        serial: [serial1, serial2],
        shot: [
            { count: shot1, updateFlag: updateFlag1 },
            { count: shot2, updateFlag: updateFlag2 }
        ]
    };
}

module.exports = { send_start, send_stop, sendLineCartridgeInfo, scanLineCartridge, sendLineCartridgeSerial, sendLineCartridgeTotalShot, sendLineCartridgeRemShot, scanPenCartridge, sendPenCartridgeInfo, sendPenCartridgeSerial, sendPenCartridgeTotalShot, sendPenCartridgeRemShot, scanRfTip, sendRfTipInfo, sendRfTipSerial, sendRfTipTotalShot, sendRfTipRemShot, sendRfMhz, sendIrradiationTime, sendPwmModbus, sendPwmOn, sendPwmOff, toggleRelay };
