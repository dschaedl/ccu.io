/**
 *      CCU.IO Fritz.Box call monitor Adapter
 *      01'2014 Bluefox
 *      Can store incoming calls into the list.
 *
 *      Version 0.5
 *
 * Changelog 0.5 (07.06.2014)
 *    Unterscheide zwischen OUT und IN angenommenen Anrufen.
 *
 * Changelog 0.4 (09.02.2014)
 *    IP-Adresse standardmäßig auf fritz.box geändert (anli)
 *    Weitergehende Meldung im Log-Eintrag, wenn Fehler auftritt (IP prüfen und Dialmonitor aktiv prüfen) (anli)
 *    kleinere Korrekturen
 *
 *    Wenn man beim Telefon #96*5* eintippt, wird der TCP-Port 1012 geoffnet.
 *    Mit #96*4* wird dieser wieder geschlossen.
 *
 *    Ausgehende Anrufe:            datum;CALL;      ConnectionID;Nebenstelle;GenutzteNummer;    AngerufeneNummer;
 *    Eingehende Anrufe:            datum;RING;      ConnectionID;Anrufer-Nr; Angerufene-Nummer;
 *    Zustandegekommene Verbindung: datum;CONNECT;   ConnectionID;Nebenstelle;Nummer;
 *    Ende der Verbindung:          datum;DISCONNECT;ConnectionID;dauerInSekunden;
 */
var settings = require(__dirname + '/../../settings.js');

if (!settings.adapters.fritzBox || !settings.adapters.fritzBox.enabled) {
    process.exit();
}

settings.language = settings.language || 'en';
var fritzBoxSettings = settings.adapters.fritzBox.settings;

fritzBoxSettings.maxAll = fritzBoxSettings.maxAll || 20;

var logger = require(__dirname + '/../../logger.js'),
    io     = require('socket.io-client'),
    net    = require('net');

var socketBox,
    missedCount  = 0,
    missedList   = [],
    allCallsList = [],
    connecting   = null,
    objects      = {},
    datapoints   = {},
    callStatus   = {};

var objState                  = fritzBoxSettings.firstId + 0, // Current state of phone: FREE, RING, TALKING
    objRinging                = fritzBoxSettings.firstId + 1, // TRUE if ringing, else false
    objMissedCalls            = fritzBoxSettings.firstId + 2, // Count of missed calls
    objMissedList             = fritzBoxSettings.firstId + 3, // List of missed calls
    objMissedListFormatted    = fritzBoxSettings.firstId + 4, // List of missed calls
    objLastMissed             = fritzBoxSettings.firstId + 5, // Last missed call
    objRingingNumber          = fritzBoxSettings.firstId + 6, // Now ringing Number / Name
    objRingingNumberImage     = fritzBoxSettings.firstId + 7, // Now ringing Number / Image
    objAllCallsList           = fritzBoxSettings.firstId + 8, // Incoming, Outgoing, Missed all together
    objAllCallsListFormatted  = fritzBoxSettings.firstId + 9, // the same as previous but, formatted
    objAllCallsListJson       = fritzBoxSettings.firstId + 10, // the same as previous but, javascript object
    objAllCallsListJsonAdd    = fritzBoxSettings.firstId + 11; // the same as previous but, last event as javascript object

var socket;
if (settings.ioListenPort) {
    socket = io("http://127.0.0.1:" + settings.ioListenPort);
} else if (settings.ioListenPortSsl) {
    socket = io("https://127.0.0.1:" + settings.ioListenPortSsl);
} else {
    process.exit();
}

function createObject(id, obj) {
    objects[id] = obj;
    if (obj.Value) {
        datapoints[obj.Name] = [obj.Value];
    }
    socket.emit("setObject", id, obj);
}

function setState(id, val) {
    datapoints[id] = [val];
    socket.emit("setState", [id,val,null,true]);
}

function getState(id, callback) {
    logger.verbose("adapter fritzBox getState "+id);
    socket.emit("getDatapoint", [id], function (id, obj) {
        callback (id, obj);
    });
}

function stop() {
    logger.info("adapter fritzBox terminating");
    if (socketBox) {
        socketBox.end();
        socketBox = null;
    }
    setTimeout(function () {
        process.exit();
    }, 250);
}

process.on('SIGINT', function () {
    stop();
});

process.on('SIGTERM', function () {
    stop();
});

socket.on('connect', function () {
    logger.info("adapter fritzBox connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter fritzBox disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }

    if (obj[0] == objMissedCalls && (obj[1] == 0 || obj[1] == "0")) {
        missedCount = 0;
    }
});

function resolveNumber (number) {
    if (number) {
        for (var i = fritzBoxSettings.phonebook.length - 1; i >= 0; i--) {
            if (number.indexOf (fritzBoxSettings.phonebook[i].number) != -1) {
                return fritzBoxSettings.phonebook[i].name;
            }
        }
    }
    return number;
}

function resolveNumberImg (number) {
    if (number) {
        for (var i = fritzBoxSettings.phonebook.length - 1; i >= 0; i--) {
            if (number.indexOf (fritzBoxSettings.phonebook[i].number) != -1) {
                return fritzBoxSettings.phonebook[i].img || "/ccu.io/img/call.png";
            }
        }
    }
    return "/ccu.io/img/call.png";
}

function listToText (table) {
    var text = "";
    for (var i = table.length - 1; i >= 0; i--) {
        text += (text ? ";" : "") + table[i].type + "/" + table[i].time + "/" + table[i].number + "/" + table[i].duration;
    }

    return text;
}

function getImageType (type) {
    switch (type) {
        case "IN":
            return "/ccu.io/img/callin.png";
        case "OUT":
            return "/ccu.io/img/callout.png";
        case "MISSED":
            return "/ccu.io/img/callinfailed.png";
    }
    return "";
}

function formatDuration (seconds) {
    seconds = parseInt(seconds);

    if (!seconds)
        return "";

    var hr  = Math.floor(seconds / 3600);
    var min = Math.floor((seconds - hr * 3600) / 60);
    var sec = seconds % 60;

    if (hr  < 10) hr  = "0" + hr;
    if (min < 10) min = "0" + min;
    if (sec < 10) sec = "0" + sec;

    if (hr != "00")
        return hr +  ":" + min + ":" + sec;
    else
        return min + ":" + sec;
}

function listToHtml (table) {
    var text = '<table class="callListTable">';
    for (var i = table.length - 1; i >= 0; i--) {
        text += "<tr class='callListTableLine"+(i%2)+"'>";
        text += "<td class='callListTableType'><img src='" + getImageType (table[i].type) + "' /></td>";
        if (fritzBoxSettings.phonebook.length) {
            text += "<td class='callListTableImg'><img src='" + resolveNumberImg (table[i].number) + "' /></td>";
        }
        text += "<td class='callListTableTime'>" + table[i].time + "</td>";
        text += "<td class='callListTableName'>" + resolveNumber (table[i].number) + "</td>";
        text += "<td class='callListTableDuration'>" + formatDuration (table[i].duration) + "</td>";
        text += "</tr>";
    }
    text += "</table>";

    return text;
}


function elemToJson(table, i){
    if (fritzBoxSettings.phonebook.length) {
        return {
            'Image':    '<img src="' + getImageType(table[i].type) + '" class="tclass-img-type"/>',
            'Person':   '<img src="' + resolveNumberImg(table[i].number) + '" class="tclass-img-person"/>',
            'Time':     table[i].time,
            'Number':   resolveNumber(table[i].number),
            'Duration': formatDuration(table[i].duration)
        };
    }
    else {
        return {
            'Image':    '<img src="' + getImageType(table[i].type) + '" />',
            'Time':     table[i].time,
            'Number':   resolveNumber(table[i].number),
            'Duration': formatDuration(table[i].duration)
        };
    }
}

function updateAllCallsList () {
    setState(objAllCallsList,          listToText(allCallsList));
    setState(objAllCallsListFormatted, listToHtml(allCallsList));
    setState(objAllCallsListJson,      listToJson(allCallsList));
    if (allCallsList.length) {
        setState(objAllCallsListJsonAdd,   JSON.stringify(elemToJson(allCallsList, allCallsList.length - 1)));
    }
}
// following json string or object is expected:
//    '[\
//       {"Time": "12:34:34", "Event", "Door opened", "_data":{"Type": "1", "Event" : "SomeEvent1"}, "_class" : "selected"},\
//       {"Time": "12:34:35", "Event", "Door closed", "_data":{"Type": "2", "Event" : "SomeEvent2"}, "_class": "red" },\
//       {"Time": "12:34:36", "Event", "Window opened", "_data":{"Type": "3", "Event" : "SomeEvent3"}}\
//     ]'
//
function listToJson (table) {
    var json = [];
    for (var i = table.length - 1; i >= 0; i--) {
        json.push(elemToJson(table, i));
    }

    return JSON.stringify(json);
}

function connectToFritzBox () {
    if (connecting) {
        clearTimeout (connecting);
        connecting = null;
    }
    logger.info("adapter fritzBox connecting to:" + fritzBoxSettings.IP);

    socketBox = net.connect({port: 1012, host: fritzBoxSettings.IP}, function() {
        logger.info("adapter fritzBox connected to fritz: " + fritzBoxSettings.IP);
    });

    socketBox.on('close', function () {
        logger.info("adapter fritzBox received 'close'");
        if (socketBox) {
            socketBox.end();
            socketBox = null;
        }

        if (!connecting){
            connecting = setTimeout(function () {
                connectToFritzBox();
            }, 10000);
        }
    });

    socketBox.on('error', function (data) {
        logger.info("adapter fritzBox received 'error' - please ensure to open dialmonitor via dialing #96*5* on a phone connected to fritzBox and check the ip of the box (" + settings.adapters.fritzBox.IP + "):"+data.toString());
        if (!connecting){
            connecting = setTimeout(function () {
                connectToFritzBox();
            }, 10000);
        }
    });

    socketBox.on('end', function () {
        logger.info("adapter fritzBox received 'end'");
        if (socketBox) {
            socketBox.end();
            socketBox = null;
        }

        if (!connecting){
            connecting = setTimeout(function () {
                connectToFritzBox();
            }, 10000);
        }
    });

    socketBox.on('data', function (data) {
        var str = data.toString();
        var obj = str.split(";");
        var item = {
            time :          obj[0], // 01.01.14 12:34:56
            type :          obj[1], // CALL (outgoing), RING (incoming), CONNECT (start), DISCONNECT (end)
            connectionId :  obj[2], // identifier as integer
            extensionLine : 0,
            ownNumber:      "",
            calledNumber:   "",
            durationSecs:   null
        };

        // Outgoing call
        if (item.type == "CALL") {
            item.extensionLine = obj[3];    // used extension line
            item.ownNumber     = obj[4];    // used own number
            item.calledNumber  = obj[5];    // called number
        }
        else // Incoming call
        if (item.type == "RING") {
            item.extensionLine = 0;         // used extension line
            item.calledNumber  = obj[3];    // called number
            item.ownNumber     = obj[4];    // used own number
        }
        else // Start of call
        if (item.type == "CONNECT") {
            item.extensionLine = obj[3];    // used extension line
            item.calledNumber  = obj[4];    // called number
            item.ownNumber     = null;      // used own number
        }
        else // End of call
        if (item.type == "DISCONNECT") {
            item.durationSecs  = obj[3];    // call duration in seconds
        }
        else {
            logger.error ("adapter fritzBox unknown event type " + item.type);
            return;
        }
        item.calledNumber = item.calledNumber || (settings.language == 'de' ? "Unbekannt" : "Unknown");
        
        logger.info("adapter fritzBox received event (time: " + item.time +
            ", type: "     + item.type +
            ", ID: "       + item.connectionId +
            ", exLine: "   + item.extensionLine +
            ", called: "   + item.calledNumber +
            ", own: "      + item.ownNumber +
            ", sec: "      + item.durationSecs + ")");

        if (item.type == "DISCONNECT" && callStatus[item.connectionId] !== undefined) {
            callStatus[item.connectionId].durationSecs = item.durationSecs;

            // If missed call
            if (callStatus[item.connectionId].type == "RING") {
                callStatus[item.connectionId].type = item.type;

                if (item.durationSecs === 0 || item.durationSecs === "0") {
                    logger.info("adapter fritzBox missed call : "+ callStatus[item.connectionId].calledNumber + " / " +callStatus[item.connectionId].time);

                    // Delete oldest entry
                    if (missedList.length >= fritzBoxSettings.maxMissed) {
                        missedList.splice (0,1);
                    }
                    // Delete oldest entry
                    if (allCallsList.length >= fritzBoxSettings.maxAll) {
                        allCallsList.splice (0,1);
                    }

                    missedList[missedList.length]     = {
                        number:   callStatus[item.connectionId].calledNumber,
                        time:     callStatus[item.connectionId].time,
                        duration: 0
                    };
                    allCallsList[allCallsList.length] = {
                        type:     "MISSED",
                        number:   callStatus[item.connectionId].calledNumber,
                        time:     callStatus[item.connectionId].time,
                        duration: callStatus[item.connectionId].durationSecs
                    };
                    missedCount++;

                    setState(objMissedCalls,         missedCount);
                    setState(objMissedList,          listToText(missedList));
                    setState(objLastMissed,          resolveNumber(callStatus[item.connectionId].calledNumber));
                    setState(objMissedListFormatted, listToHtml (missedList));

                    updateAllCallsList();
                }
                else {
                    // Incoming and not missed
                    logger.info("adapter fritzBox incoming call : "+ callStatus[item.connectionId].calledNumber + " / " +callStatus[item.connectionId].time);

                    // Delete oldest entry
                    if (allCallsList.length >= fritzBoxSettings.maxAll) {
                        allCallsList.splice (0,1);
                    }

                    allCallsList[allCallsList.length] = {
                        type:     "IN",
                        number:   callStatus[item.connectionId].calledNumber,
                        time:     callStatus[item.connectionId].time,
                        duration: callStatus[item.connectionId].durationSecs};

                    updateAllCallsList();
                }
            }
            else
            // If incoming call initiated
            if (callStatus[item.connectionId].type == "CONNECT") {
                callStatus[item.connectionId].type = item.type;
                if (callStatus[item.connectionId].direction == "OUT") {
                    // outgoing
                    logger.info("adapter fritzBox outgoing call : "+ callStatus[item.connectionId].calledNumber + " / " +callStatus[item.connectionId].time + " TAKEN");

                    // Delete oldest entry
                    if (allCallsList.length >= fritzBoxSettings.maxAll) {
                        allCallsList.splice (0,1);
                    }

                    allCallsList[allCallsList.length] = {
                        type:     "OUT",
                        number:   callStatus[item.connectionId].calledNumber,
                        time:     callStatus[item.connectionId].time,
                        duration: callStatus[item.connectionId].durationSecs
                    };
                    updateAllCallsList();

                } else {
                    // incoming
                    logger.info("adapter fritzBox incoming call : "+ callStatus[item.connectionId].calledNumber + " / " +callStatus[item.connectionId].time + " TAKEN");

                    // Delete oldest entry
                    if (allCallsList.length >= fritzBoxSettings.maxAll) {
                        allCallsList.splice (0,1);
                    }

                    allCallsList[allCallsList.length] = {
                        type:     "IN",
                        number:   callStatus[item.connectionId].calledNumber,
                        time:     callStatus[item.connectionId].time,
                        duration: callStatus[item.connectionId].durationSecs
                    };
                    updateAllCallsList();
                }
            }
            else
            // If outgoing call
            if (callStatus[item.connectionId].type == "CALL") {
                // outgoing call
                logger.info("adapter fritzBox outgoing call : "+ callStatus[item.connectionId].calledNumber + " / " +callStatus[item.connectionId].time);

                // Delete oldest entry
                if (allCallsList.length >= fritzBoxSettings.maxAll) {
                    allCallsList.splice (0,1);
                }

                allCallsList[allCallsList.length] = {type: "OUT", number: callStatus[item.connectionId].calledNumber, time: callStatus[item.connectionId].time, duration: callStatus[item.connectionId].durationSecs};
                setState(objAllCallsList,          listToText(allCallsList));
                setState(objAllCallsListFormatted, listToHtml (allCallsList));
                setState(objAllCallsListJson,      listToJson(allCallsList));
                setState(objAllCallsListJsonAdd,   JSON.stringify(elemToJson(allCallsList, allCallsList.length - 1)));
            }
        }
        else {
            var direction = null;
            // Remember the direction of the call: out or in
            if (callStatus[item.connectionId]) {
                direction = callStatus[item.connectionId].direction;
            }
            if (item.type == "CALL") {
                direction = "OUT";
            } else
            if (item.type == "RING") {
                direction = "IN";
            }
            callStatus[item.connectionId] = item;
            callStatus[item.connectionId].direction = direction;
        }

        var newState = "NONE";

        for (var event in callStatus) {
            var status = callStatus[event].type;

            if (status == "RING") {
                newState = "RING";
                break;
            }
            else
            if (status == "CONNECT" || status == "CALL") {
                newState = "TALKING";
                break;
            }
        }

        // Set ringing object
        if (datapoints[objRinging] != (newState == "RING")) {
            if (newState == "RING") {
                setState(objRingingNumber, resolveNumber(callStatus[item.connectionId].calledNumber));
                setState(objRingingNumberImage, resolveNumberImg(callStatus[item.connectionId].calledNumber));
                setState(objRinging, true);
            }
            else {
                setState(objRingingNumber, null);
                setState(objRingingNumberImage, null);
                setState(objRinging, false);
            }
        }

        setState(objState, newState);
    });
}

connectToFritzBox();

createObject(objState, {
    Name:     "FRITZBOX.STATE",
    TypeName: "VARDP",
    "DPInfo": "FritzBox",
    Value :   "NONE",
    "ValueType": 20,
    "ValueSubType": 11
});
createObject(objRinging, {
    Name:     "FRITZBOX.RINGING",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    Value :   false,
    "ValueType": 4,
    "ValueSubType": 0
});

createObject(objMissedCalls, {
    Name:     "FRITZBOX.MISSED",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 4,
    "ValueSubType": 0
});

createObject(objMissedList, {
    Name:     "FRITZBOX.MISSED_LIST",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 20,
    "ValueSubType": 11
});

createObject(objMissedListFormatted, {
    Name:     "FRITZBOX.MISSED_LIST_FMT",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 20,
    "ValueSubType": 11
});

createObject(objLastMissed, {
    Name:     "FRITZBOX.LAST_MISSED",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 20,
    "ValueSubType": 11
});

createObject(objRingingNumber, {
    Name:     "FRITZBOX.RINGING_NUMBER",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 20,
    "ValueSubType": 11
});

createObject(objRingingNumberImage, {
    Name:     "FRITZBOX.RINGING_IMAGE",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 20,
    "ValueSubType": 11
});

createObject(objAllCallsList, {
    Name:     "FRITZBOX.ALL_LIST",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 20,
    "ValueSubType": 11
});

createObject(objAllCallsListFormatted, {
    Name:     "FRITZBOX.ALL_LIST_FMT",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 20,
    "ValueSubType": 11
});

createObject(objAllCallsListJson, {
    Name:     "FRITZBOX.ALL_JSON_TABLE",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 20,
    "ValueSubType": 11
});

createObject(objAllCallsListJsonAdd, {
    Name:     "FRITZBOX.ALL_JSON_TABLE_EVENT",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 20,
    "ValueSubType": 11
});

// Init objects if they are not stored
getState (objMissedCalls, function (id, obj) {
    if (!obj){
        setState (objMissedCalls, 0);
    }
    else {
        missedCount = obj[0];
    }
});

// Read stored lists
getState (objMissedList, function (id, obj) {
    if (!obj){
        setState (objMissedList, "");
    }
    else if (obj[0]) {
        var calls = obj[0].split(";");
        for (var i = calls.length - 1; i >= 0; i--) {
            var els = calls[i].split("/", 4);// type/time/number/duration
            missedList[missedList.length] = {number: els[2], time: els[1]};
        }
        setState(objMissedListFormatted, listToHtml (missedList));
    }
});

getState (objAllCallsList, function (id, obj) {
    if (!obj){
        setState (objAllCallsList, "");
    }
    else if (obj[0]) {
        var calls = obj[0].split(";");
        for (var i = calls.length - 1; i >= 0; i--) {
            var els = calls[i].split("/", 4);// type/time/number/duration
            allCallsList[allCallsList.length] = {type: els[0], time: els[1], number: els[2], duration: els[3]};
        }
        setState(objAllCallsListFormatted, listToHtml(allCallsList));
        setState(objAllCallsListJson, listToJson(allCallsList));
    }
});
