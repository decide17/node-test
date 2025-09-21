const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const fs = require('fs');
const YModem = require('ymodem');
const exp = require('constants');
var refreshSerialList = 0;  //serial port refresh check
var selectSerialPort;
var selectOptionIndex = 0;
var portOpened = false;
let port = false;
var serialPort;
var value_tx = 0;
var send_value = 0;
const count = 8;
let interval;

let slot_status = {
    door_status: [0,0,0,0,0,0,0,0],
    battery_in: [0,0,0,0,0,0,0,0]
};

let version = {
    target : 'control',
    cmd : 'version',
}

let action = {
    target : 'control',
    id : 0,
    cmd : 'action',
    control : 'fan1',
    io : 'on',
}

let info = {
    target : 'control',
    id : 0,
    cmd : 'info'
}
//"target" : "control" 일 경우
let fw_download = {
    target : "control",
    cmd : "action",
    control : "boot_mode"
}

let fw_file;

const strHTML_1 = `<div class="card" id="slot_`
const strHTML_2 =`" style="width: 16rem;">
    <div class="card-body">
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">구분</th>
                    <th scope="col">값</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th scope="row">슬롯ID</th>
                    <td name="slot_id"></td>
                </tr>
                <tr>
                    <th scope="row">슬롯SW</th>
                    <td name="slot_sw_ver"></td>
                </tr>
                <tr>
                    <th scope="row">슬롯Date</th>
                    <td name="slot_ReleaseDate"></td>
                </tr>
                <tr>
                    <th scope="row">배터리ID</th>
                    <td name="bat_id"></td>
                </tr>
                <tr>
                    <th scope="row">배터리SW</th>
                    <td name="bat_sw_ver"></td>
                </tr>
                <tr>
                    <th scope="row">전압</th>
                    <td name="slot_volt"></td>
                </tr>
                <tr>
                    <th scope="row">전류</th>
                    <td name="slot_curr"></td>
                </tr>
                <tr>
                    <th scope="row">SOC</th>
                    <td name="bat_soc"></td>
                </tr>
                <tr>
                    <th scope="row">SOH</th>
                    <td name="bat_soh"></td>
                </tr>
                <tr>
                    <th scope="row">슬롯온도</th>
                    <td name="slot_temp"></td>
                </tr>
                <tr>
                    <th scope="row">설정전압</th>
                    <td name="set_voltage"></td>
                </tr>
                <tr>
                    <th scope="row">설정전류</th>
                    <td name="set_current"></td>
                </tr>
            </tbody>
        </table>
        <div class="d-flex flex-row justify-content-start">
            <p style="line-height: 32px; margin: 0px 0px 0px 0px; width:80px;"> 셀전압</p>
            <select class="form-select" name="cell_voltage" style="font-size:12px; height:32px; width:150px;">
            </select>
        </div>
        <div class="d-flex flex-row justify-content-start">
            <p style="line-height: 32px; margin: 0px 0px 0px 0px; width:80px;"> 배터리온도</p>
            <select class="form-select" name="bat_temp" style="font-size:12px; height:32px; width:150px;">
            </select>
        </div>
        <div class="d-flex flex-row justify-content-start">
            <p style="line-height: 32px; margin: 0px 0px 0px 0px; width:80px;"> 에러리스트</p>
            <select class="form-select" name="error_list" style="font-size:12px; height:32px; width:150px;">
            </select>
        </div>
        <div class="d-flex justify-content-center">
            <input class="btn btn-secondary btn-sm my-1 mx-1" type="button" name="slot_door" style="height:32px; width:90px;" value="도어 인식" disabled>
            <input class="btn btn-secondary btn-sm my-1 mx-1" type="button" name="slot_bat_in" style="height:32px; width:90px;" value="배터리 인식" disabled>
        </div>
        <div class="d-flex justify-content-center">
            <button type="button" class="btn btn-secondary btn-sm my-1 mx-1" name="slot_door_open" style="height:32px; width:90px;" onClick="sendToSlotSerial(this)">도어 열림</button>
            <button type="button" class="btn btn-secondary btn-sm my-1 mx-1" name="charge_on" style="height:32px; width:90px;" onClick="sendToSlotSerial(this)">충전 ON</button>
        </div>
        <div class="d-flex justify-content-center">
            <button type="button" class="btn btn-secondary btn-sm my-1 mx-1" name="charge_off" style="height:32px; width:90px;" onClick="sendToSlotSerial(this)">충방전 OFF</button>
            <button type="button" class="btn btn-secondary btn-sm my-1 mx-1" name="slot_reset" style="height:32px; width:90px;" onClick="sendToSlotSerial(this)">슬롯 리셋</button>
        </div>
        <div class="d-flex justify-content-center">
            <button type="button" class="btn btn-secondary btn-sm my-1 mx-1" name="discharge_on" style="height:32px; width:90px;" onClick="sendToSlotSerial(this)">방전 ON</button>
        </div>
    </div>
</div>`

// function send_start() {
//     if ( port == false ){
//         if(openPortConnection()) {
//             port = true;
//             interval = setInterval(tx_callback , 300);
//         }
//     }
// }

// function send_stop() {
//     parser.removeListener("data", rx_handler);
//     close();
//     clearInterval(interval);
//     port = false;
// }

function  tx_callback () {
    let serialMessage;
    if ( send_value ){
        value_tx = send_value;
        send_value = 0;
    }
    switch( value_tx ) {
        case 0 :
            console.log(version);
            serialMessage = JSON.stringify(version);
            serialPort.write(serialMessage, function(err) {
                if (err) {
                    return console.log("error Serial port write error");
                }
            });
            break;  
        case 1 :
            console.log(info);
            serialMessage = JSON.stringify(info);
            serialPort.write(serialMessage, function(err) {
                if (err) {
                    return  console.log("error Serial port write error");
                }
            });

            break;  
        case 2 :
            console.log(action);
            serialMessage = JSON.stringify(action);
            serialPort.write(serialMessage, function(err) {
                if (err) {
                    return console.log("error Serial port write error");
                }
            });
            if (action.target == "control" && action.control == "reset")
                value_tx = 1;
            break;
        case 3 :
            console.log(fw_download);
            serialMessage = JSON.stringify(fw_download);
            serialPort.write(serialMessage, function(err) {
                if (err) {
                    return console.log("error Serial port write error");
                }
            });
            send_stop();
            version.target = "control"
            value_tx = 0;
            break;
        default :
            value_tx = 0
            break;
    }
}

// get & show serialPort list
async function listSerialPorts() {
    console.log("listSerialPorts function called.");
    await SerialPort.list().then((ports, err) => {
        if(err) {        
            return console.log("error : Serial port list error");
        }
        var selectOption = document.getElementById('serial_ports');
        if (selectOption ){
            if (refreshSerialList == 0) {
                selectOption.length=0;
                portOpened = false;
                var defaultOpt = document.createElement('option');
                defaultOpt.text = 'No serial connected';
                defaultOpt.value = 'No serial connected';
                selectOption.appendChild(defaultOpt);
            }

            if (refreshSerialList != ports.length) {
                refreshSerialList = ports.length;
                selectOption.length=0;

                var selectGuideOpt = document.createElement('option');
                selectGuideOpt.text = 'SERIAL';
                selectGuideOpt.value = 'Select serial';
                selectOption.appendChild(selectGuideOpt);

                for(var i=0; i<ports.length; i++){
                    var serialOpt = document.createElement('option');
                    serialOpt.text = ports[i].path;
                    serialOpt.value = ports[i].path;
                    selectOption.appendChild(serialOpt);
                    console.log(ports[i].path);
                }
            }
        }

    })
}

// serial port select option event
function onChangeSelectOption() {
    let selectOption = document.getElementById('serial_ports');
    selectSerialPort = selectOption.options[selectOption.selectedIndex].value.toString();
    selectOptionIndex = selectOption.selectedIndex;
    console.log("Selected Serial Port:", selectSerialPort);
    console.log("Selected Index:", selectOptionIndex);
}

// get & show serialPort list
function listSel() {
    let selectOption = document.getElementById('fw_sel');
    if (selectOption) {
        var selectGuideOpt = document.createElement('option');
        selectGuideOpt.text = 'Control';
        selectGuideOpt.value = 'Control';
        selectOption.appendChild(selectGuideOpt);

        for(var i=0; i<8; i++){
            var serialOpt = document.createElement('option');
            serialOpt.text = 'Slot ' + i;
            serialOpt.value = 'Slot ' + i;
            selectOption.appendChild(serialOpt);
        }
    }
}


function onChangeSelectFW() {
    let selectOption = document.getElementById('fw_sel');
    switch (selectOption.selectedIndex) {
        case 0:
            fw_download.target = "control";
            break;
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
            fw_download.target = "slot";
            fw_download.id = selectOption.selectedIndex-1;
            break;
        default:
            console.log("error");
            break;
    } console.log(fw_download);

}

function sendToControlSerial(type) {
    send_value = 2;
    action.target = "control";
    action.id = 0;
    action.cmd = "action";
    if(type == 'fan1on'){
        action.control = "fan1";
        action.io = "on";
    } else if(type == 'fan1off'){
        action.control = "fan1";
        action.io = "off";
    } else if(type == 'heater1on'){
        action.control = "heater1";
        action.io = "on";
    } else if(type == 'heater1off'){
        action.control = "heater1";
        action.io = "off";
    } else if(type == 'reset'){
        action.control = "reset";
        action.io = "on";
    }
    console.log("success Message sent successfully" );
}

function sendToSlotSerial(type) {
    const result = type.parentNode.parentNode.parentNode.id.substr(5, 1);
    send_value = 2;
    action.target = "slot";
    action.id = Number.parseInt(result);
    action.cmd = "action";
    if(type.name == 'slot_reset') {
        action.control = "reset";
        action.io = "on";
        document.querySelector( '#slot_'+result+' [name=slot_reset]' ).style.background='green';
        setTimeout(function () {
            document.querySelector( '#slot_'+result+' [name=slot_reset]' ).style.background='#6c757d';
        }, 2000);
    } else if(type.name == 'slot_door_open') {
        action.control = "door";
        action.io = "on";
        document.querySelector( '#slot_'+result+' [name=slot_door_open]' ).style.background='green';
        setTimeout(function () {
            document.querySelector( '#slot_'+result+' [name=slot_door_open]' ).style.background='#6c757d';
        }, 2000);
    } else if(type.name == 'charge_on') {
        action.control = "charge";
        action.io = "on";
    } else if(type.name == 'charge_off') {
        if(document.querySelector( '#slot_'+action.id+' [name=charge_on]' ).style.background == 'green'){
            action.control = "charge";
            console.log("action.control = \"charge\";");
        } else if(document.querySelector( '#slot_'+action.id+' [name=discharge_on]' ).style.background=='green'){
            action.control = "discharge";
            console.log("action.control = \"discharge\";");
        } else {
            action.control = "charge";
        }
        action.io = "off";
    } else if(type.name == 'discharge_on') {
        action.control = "discharge";
        action.io = "on";
    }
    console.log("success Message sent successfully" );
}

let parser;

async function openPortConnection() {
    if (refreshSerialList == 0) {
        console.log('No serial');        
        return false;
    }

    if (selectOptionIndex == 0) {
        console.log("error No select port");
        return false;
    }

    if (!portOpened) {
        portOpened = true;
        serialPort = new SerialPort({
            path: selectSerialPort,
            baudRate: 115200
        });
        serialPort.on('open', function () {
            // serialPort.set({ dtr: true, rts: true, })
            console.log(timestamp(), '--', 'Port', serialPort.path, 'opened')
        })
        
        serialPort.on('close', function () {
            console.log(timestamp(), '--', 'Port', serialPort.path, 'closed')
        })
        
        serialPort.on('error', function (err) {
            console.log(timestamp(), '--', 'Error:', err.message)
        })
    }
    await open();

    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    parser.on("data", rx_handler);

    return true;
}

function rx_handler (data) {
    try {
        let velog = JSON.parse(data);
        data = data.replace(/\s+/, "");//왼쪽 공백제거
        data = data.replace(/\s+$/g, "");//오른쪽 공백제거
        data = data.replace(/\n/g, "");//행바꿈제거
        data = data.replace(/\r/g, "");//엔터제거
        data = data.replace(/\t/g, "");//탭제거

        const date = new Date();
        const TIME_ZONE = 9 * 60 * 60 * 1000; // 9시간
        const yy_mm_dd =  new Date(date.getTime() + TIME_ZONE).toISOString().replace('T', ' ').slice(0, -5);
        data = yy_mm_dd + "\n" + data + "\n";

        document.getElementById("freeform").value += data;
        document.getElementById("freeform").scrollTop = document.getElementById("freeform").scrollHeight;
        console.log(velog);
        switch(value_tx) {
            case 0:
                if ( velog.control ) {
                    document.getElementById("sw_ver").value = "sw : "  + velog.control.sw_version;
                    document.getElementById("hw_ver").value = "hw : "  + velog.control.hw_version;
                    for (var i = 0; i < velog.slot.length; i++) {
                            document.querySelector( '#slot_'+i+' [name=slot_id]' ).innerHTML = velog.slot[i].id;
                            document.querySelector( '#slot_'+i+' [name=slot_sw_ver]' ).innerHTML = velog.slot[i].sw_version;
                            document.querySelector( '#slot_'+i+' [name=slot_ReleaseDate]' ).innerHTML = velog.slot[i].ReleaseDate;
                    }
                    version.target = "battery";
                } else if ( velog.battery ) {
                    for (var i = 0; i < count; i++) {
                        if ( velog.battery[i] != undefined ) {
                            console.log('velog.battery.slot_id : ' + velog.battery[i].slot_id);
                            document.querySelector( '#slot_'+velog.battery[i].slot_id+' [name=bat_id]' ).innerHTML = velog.battery[i].id;
                            document.querySelector( '#slot_'+velog.battery[i].slot_id+' [name=bat_sw_ver]' ).innerHTML = velog.battery[i].sw_version;
                            document.querySelector( '#slot_'+velog.battery[i].slot_id+' [name=bat_hw_ver]' ).innerHTML = velog.battery[i].hw_version;
                        }
                    }
                    value_tx = 1;
                } else {
                    value_tx = 0;
                    version.target = "control";
                }
                break;
            case 1:
                // if (info.target === "control") {
                if ( velog.tower_id == 0 || velog.tower_id == 1 || velog.tower_id == 2 || velog.tower_id == 3 ) {
                    document.getElementById("tower_id").value = "ID " + velog.tower_id;
                    document.getElementById("TEMP").value = "온도 : "  + (velog.input.temp / 100) + "℃";
                    document.getElementById("HUMI").value = "습도 : "  + (velog.input.humi / 100) + "℃";
                    if (velog.input.emergency == true)          document.getElementById("emergency").style.background='green';
                    else                                        document.getElementById("emergency").style.background='#6c757d';
                    if (velog.input.water_level == true)        document.getElementById("WATER_LEVEL").style.background='green';
                    else                                        document.getElementById("WATER_LEVEL").style.background='#6c757d';

                    if (velog.output.fan1 == true) {
                        document.getElementById("fan1on").style.background='green';
                        document.getElementById("fan1off").style.background='#6c757d';
                    } else {
                        document.getElementById("fan1on").style.background='#6c757d';
                        document.getElementById("fan1off").style.background='green';
                    }
                    if (velog.output.heater1 == true) {
                        document.getElementById("heater1on").style.background='green';
                        document.getElementById("heater1off").style.background='#6c757d';
                    } else {
                        document.getElementById("heater1on").style.background='#6c757d';
                        document.getElementById("heater1off").style.background='green';
                    }
                    info.target = "slot";
                } else if ( velog.slot_id >= 0 && velog.slot_id <= 7 ) {
                // else if (info.target === "slot") {
                    if (velog.input.door_chk == true)           document.querySelector( '#slot_'+velog.slot_id+' [name=slot_door]' ).style.background='green';
                    else                                        document.querySelector( '#slot_'+velog.slot_id+' [name=slot_door]' ).style.background='#6c757d';
                    if (velog.charge.status == 'on' || velog.charge.status == 'cc' ){
                        document.querySelector( '#slot_'+velog.slot_id+' [name=charge_on]' ).style.background='green';
                        document.querySelector( '#slot_'+velog.slot_id+' [name=charge_off]' ).style.background='#6c757d';
                    } else {
                        document.querySelector( '#slot_'+velog.slot_id+' [name=charge_on]' ).style.background='#6c757d';
                        document.querySelector( '#slot_'+velog.slot_id+' [name=charge_off]' ).style.background='green';
                    }
                    if (velog.input.battery_in == true)         document.querySelector( '#slot_'+velog.slot_id+' [name=slot_bat_in]' ).style.background='green';
                    else                                        document.querySelector( '#slot_'+velog.slot_id+' [name=slot_bat_in]' ).style.background='#6c757d';
                    document.querySelector( '#slot_'+velog.slot_id+' [name=slot_temp]' ).innerHTML = (velog.input.temp / 10) + " ℃";
                    document.querySelector( '#slot_'+velog.slot_id+' [name=slot_volt]' ).innerHTML = (velog.charge.volt / 10) + " V";
                    /////////////////////////////////////////////////////////////////////
                    if ( velog.battery ) {
                        console.log('step velog.battery')
                        document.querySelector( '#slot_'+velog.slot_id+' [name=bat_id]' ).innerHTML = velog.battery.id;
                        document.querySelector( '#slot_'+velog.slot_id+' [name=bat_soc]' ).innerHTML = (velog.battery.soc / 10) + " %";
                        document.querySelector( '#slot_'+velog.slot_id+' [name=bat_soh]' ).innerHTML = (velog.battery.soh / 10) + " %";
                        document.querySelector( '#slot_'+velog.slot_id+' [name=slot_curr]' ).innerHTML = (velog.battery.curr / 10) + " A";
                        const sel_cell = document.querySelector( '#slot_'+velog.slot_id+' [name=cell_voltage]' );
                        for ( var i = sel_cell.length - 1; i>=0; i--) {
                                sel_cell.remove(i);
                        }
                        for (var i = 0; i < velog.battery.cell.length; i++) {
                            const opt1 = document.createElement("option");
                            opt1.value = i;
                            opt1.text = i + " : "+ (velog.battery.cell[i] / 1000) + " V";
                            sel_cell.add(opt1, null);
                        }
                        const sel_temp = document.querySelector( '#slot_'+velog.slot_id+' [name=bat_temp]' );
                        for ( var i = sel_temp.length - 1; i>=0; i--) {
                                sel_temp.remove(i);
                        }
                        for (var i = 0; i < velog.battery.temp.length; i++) {
                            const opt2 = document.createElement("option");
                            opt2.value = i;
                            opt2.text = i + " : "+ velog.battery.temp[i] + " ℃";
                            sel_temp.add(opt2, null);
                        }
                    }
                    /////////////////////////////////////////////////////////
                    if (info.id >= (count-1)) {
                        // info.target = "battery";
                        info.target = "control";
                        info.id = 0;
                    } else info.id++;
                }
                //  else if (info.target === "battery") {
                //     console.log('step target.battery')
                //     if ( velog.id != undefined ) {
                //         document.querySelector( '#slot_'+info.id+' [name=bat_id]' ).innerHTML = velog.id;
                //         document.querySelector( '#slot_'+info.id+' [name=bat_soc]' ).innerHTML = (velog.soc / 10) + " %";
                //         document.querySelector( '#slot_'+info.id+' [name=bat_soh]' ).innerHTML = (velog.soh / 10) + " %";
                //         document.querySelector( '#slot_'+info.id+' [name=slot_curr]' ).innerHTML = (velog.curr / 10) + " A";
                //         const sel_cell = document.querySelector( '#slot_'+info.id+' [name=cell_voltage]' );
                //         for ( var i = sel_cell.length - 1; i>=0; i--) {
                //                 sel_cell.remove(i);
                //         }
                //         for (var i = 0; i < velog.cell.length; i++) {
                //             const opt1 = document.createElement("option");
                //             opt1.value = i;
                //             opt1.text = i + " : "+ (velog.cell[i] / 1000) + " V";
                //             sel_cell.add(opt1, null);
                //         }
                //         const sel_temp = document.querySelector( '#slot_'+info.id+' [name=bat_temp]' );
                //         for ( var i = sel_temp.length - 1; i>=0; i--) {
                //                 sel_temp.remove(i);
                //         }
                //         for (var i = 0; i < velog.temp.length; i++) {
                //             const opt2 = document.createElement("option");
                //             opt2.value = i;
                //             opt2.text = i + " : "+ velog.temp[i] + " ℃";
                //             sel_temp.add(opt2, null);
                //         }
                //     }
                //     if (info.id >= (count-1)) {
                //         info.target = "control";
                //         info.id = 0;
                //     } else info.id++;
                // } 
                else {
                    value_tx = 0;
                    version.target = "control";
                }
                break;
            case 2:
                value_tx = 1;
                break;
            case 3:
                value_tx = 1;
                break;
        }
    } catch (e) {
        console.log(e);
        return false;
    }
}

function add_HTML() {
    const el = document.querySelector("#slot")
    for(let i =0; i < (count/4); i++) {
        el.insertAdjacentHTML('beforeend', '<div class="d-flex justify-content-around" id="ch'+ i+'">' );
        let el1 = document.querySelector('#ch'+i)
        // for(let j =0; j < 4; j++) { 
        //     el1.insertAdjacentHTML('beforeend', strHTML_1 + (j+(4*i)) + strHTML_2 );
        // }
        el.insertAdjacentHTML('beforeend', '</div>' );
    }
}
add_HTML();

async function fw_download_func () {
    const fileinfo = document.getElementById('formFile').files;
    console.log(fileinfo);

    fw_file = fileinfo[0].path;
    // ymodem(fw_file);
    send_value = 3;
    await sleep(3000)
    ymodem_func(fw_file);
    // interval = setInterval(tx_callback , 400);
}

function handler(data) {
    const now = timestamp()
    if (data.length == 1 && data.includes(0x06))
        var data_str = ['ACK']
    else if (data.length == 1 && data.includes(0x15))
        var data_str = ['NAK']
    else
        var data_str = data.toString().trim().split(/\r?\n/)
    data_str.forEach(item => console.log(now, '>>', item.trim()))
}

function open() {
    serialPort.open(function (err) {
        if (err) {
            return console.log(timestamp(), '--', 'Error opening port: ', err.message)
        }
    })
}

function close() {
    serialPort.close(function (err) {
        if (err) {
            return console.log(timestamp(), '--', 'Error closing port: ', err.message)
        }
    })
}

function send(data) {
    const now = timestamp()
    serialPort.write(data + '\r\n', function (err) {
        if (err) {
            return console.log(now, '--', 'Error on write: ', err.message, 'data: "', data, '"')
        }
        console.log(now, '<<', data.trim())
    })
}

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function timestamp() {
    const date = new Date()
    const time = date.toLocaleTimeString("en-US", { hour12: false })
    const millis = ('000' + date.getMilliseconds()).slice(-3)
    return time + '.' + millis
}


async function ymodem_func(firmware) {
    serialPort.on('data', handler)
    open()
    await sleep(5000)
    send('C')
    await sleep(500)
    send('C')
    await sleep(500)
    send('C')
    await sleep(2000)
    timeout = 20000
    serialPort.removeListener('data', handler);
    await YModem.transfer(serialPort, firmware, fs.readFileSync(firmware), timeout)
        .then((result) => {
            if (result && result.totalBytes == result.writtenBytes) {
                console.log('file transfer successful')
            } else {
                console.log('file transfer error')
            }
        })
        .catch((err) => {
            console.log(err)
        });
    serialPort.on('data', handler);
    await sleep(1000);
    await close();
    serialPort.removeListener('data', handler);
    await sleep(5000);
    await send_start(selectSerialPort);
}

listSerialPorts();



