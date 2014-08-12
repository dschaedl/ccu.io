/**
 *      CCU.IO Onkyo Adapter
 *      01'2014 Eisbaeeer
 *      mail: Eisbaeeer@gmail.com 
 
 *      Version 1.0
 *      
 *      Get this code on Github
 *      https://github.com/Eisbaeeer/Onkyo 
 *      
 */
var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.onkyo || !settings.adapters.onkyo.enabled) {
    process.exit();
}

//Settings laden
var onkyoSettings = settings.adapters.onkyo.settings;

//firstID wird in den Settings festgelegt und beschreibt ab welcher ID deine Variablen starten z.B. 100101

var logger = require(__dirname+'/../../logger.js'),
    io     = require('socket.io-client'),
	net    = require('net');
	
	var socketOnkyo;
  var onkyoConnected = 'false';
	var objects = {},
	    datapoints = {};

if (settings.ioListenPort) {
    socket = io("http://127.0.0.1:" + settings.ioListenPort);
} else if (settings.ioListenPortSsl) {
    socket = io("https://127.0.0.1:" + settings.ioListenPortSsl);
} else {
	process.exit();
}

connectOnkyo();


function connectOnkyo() {
	//Hier wird der Socket zum Receiver geöffnet
	  if (onkyoSettings.debug == true) {
	logger.info("adapter onkyo starting connect to:"+onkyoSettings.IP+" "+onkyoSettings.port);
	                                   }
  socketOnkyo = net.connect({port: onkyoSettings.port, host: onkyoSettings.IP},
	    function() {
      onkyoConnected = 'true';
      setState(onkyoSettings.firstId+39,true); 
	  	logger.info("adapter onkyo connected to Receiver: "+ onkyoSettings.IP);
      logger.info("adapter onkyo debug is set to: "+ onkyoSettings.debug);
		//Wenn Du noch was senden willst musst (initialisierung?) dann so:
	  	//socketOnkyo.write("HIER_DEN_STRING");
      //socketOnkyo.write("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211MVLQSTN\x0D");
	});
}

//Wird aufgerufen wenn der Socket zum Onkyo geschlossen wird
  socketOnkyo.on('close', function () {
    logger.info("adapter onkyo  disconnected from Receiver");
  });

//Wird aufgerufen wenn Daten auf dem Socket vom Onkyo kommen:
  socketOnkyo.on('data', function (data) {
//hier z.B den String vom Onkyo zerpflücken:
  chunk = data.toString().slice(9);
  chunk = chunk.substr(9,3);
  string = data.toString().slice(9);
	string = string.substr(12,80);
  
  //Logger | Debug
  if (onkyoSettings.debug == true) {
	   logger.info("adapter Onkyo Event Receiver raw:"+data.toString());
	   logger.info("adapter Onkyo Event Receiver chunk:"+chunk.toString());  
     logger.info("adapter Onkyo Event Receiver string:"+string);
                                      }  
	//usw...
	//z.B. ne CCU.IO Variable setzen
	//setState(ID,WERT); also setState(onkyoSettings.firstId+5,"10");
  
  //Onkyo_NET/USB_Artist_Name_Info
  if (chunk == 'NAT')  {
    setState(onkyoSettings.firstId+1,string);
                    }
  //Onkyo_NET/USB_Time_Info
  if (chunk == 'NTM')  {
    setState(onkyoSettings.firstId+2,string);
                    }
  //Onkyo_NET/USB_Album_Name_Info
  if (chunk == 'NAL')  {
    setState(onkyoSettings.firstId+3,string);
                    }
  //Onkyo_NET/USB_Track_Info
  if (chunk == 'NTR')  {
    setState(onkyoSettings.firstId+4,string);
                    }
  //Onkyo_NET/USB_Track_Info
  if (chunk == 'NTI')  {
    setState(onkyoSettings.firstId+5,string);
                    }
  //Onkyo_Volume_Zone1
  if (chunk == 'MVL')  {
    string = parseInt(string, 16);              //convert hex to decimal - backward: string = string.toString(16);
    setState(onkyoSettings.firstId+6,string);
                    }
  //Onkyo_Volume_Zone2
  if (chunk == 'ZVL')  {
    string = parseInt(string, 16);              //convert hex to decimal
    setState(onkyoSettings.firstId+7,string);
                    }
  //Onkyo_Tuning_Zone1
  if (chunk == 'TUN')  {
    string = parseInt(string) / 100;            //set dot for decimal
    setState(onkyoSettings.firstId+8,string);
                    }
  //Onkyo_Tuning_Zone2                    
  if (chunk == 'TUZ')  {
    string = parseInt(string) / 100;            //set dot for decimal
    setState(onkyoSettings.firstId+9,string);
                    }
  //Onkyo_Internet_Radio_Preset_Zone1 
  if (chunk == 'NPR')  {
    string = parseInt(string, 16);              //convert hex to decimal
    setState(onkyoSettings.firstId+10,string);
                    }
  //Onkyo_Internet_Radio_Preset_Zone2
  if (chunk == 'NPZ')  {
    string = parseInt(string, 16);              //convert hex to decimal
    setState(onkyoSettings.firstId+11,string);
                    }
  //Onkyo_Input_Select_Zone1  (hex)
  if (chunk == 'SLI')  {
    string = string.substr(0,2)        
    setState(onkyoSettings.firstId+12,string);
                    }
  //Onkyo_Input_Select_Zone2  (hex)
  if (chunk == 'SLZ')  {
    string = string.substr(0,2)  
    setState(onkyoSettings.firstId+13,string);
                    }
  //Onkyo_Audio_Mute_Zone1
  if (chunk == 'AMT')  {
    string = parseInt(string);                  //convert string to integer
    if (string == '1') {
      setState(onkyoSettings.firstId+14,true);
                        }
    if (string == '0') {
      setState(onkyoSettings.firstId+14,false);
                        }
                      }                              
  //Onkyo_Audio_Mute_Zone2
  if (chunk == 'ZMT')  {
    string = parseInt(string);                  //convert string to integer  
    if (string == '1') {
      setState(onkyoSettings.firstId+15,true);
                        }
    if (string == '0') {
      setState(onkyoSettings.firstId+15,false);
                        } 
                    }
  //Onkyo_Tuner_Preset_Zone1
  if (chunk == 'PRS')  {
    string = parseInt(string, 16);              //convert hex to decimal
    setState(onkyoSettings.firstId+16,string);
                    }
  //Onkyo_Tuner_Preset_Zone2
  if (chunk == 'PRZ')  {
    string = parseInt(string, 16);              //convert hex to decimal
    setState(onkyoSettings.firstId+17,string);
                    }
  //Onkyo_Power_Zone1
  if (chunk == 'PWR')  {
   string = parseInt(string);                   //convert string to integer
    if (string == '1') {
      setState(onkyoSettings.firstId+18,true);
                        }
    if (string == '0') {
      setState(onkyoSettings.firstId+18,false);
                        }                                              
                    }
  //Onkyo_Power_Zone2
  if (chunk == 'ZPW')  {
   string = parseInt(string);                   //convert string to integer
    if (string == '1') {
      setState(onkyoSettings.firstId+19,true);
                        }
    if (string == '0') {
      setState(onkyoSettings.firstId+19,false);
                        } 
                    }
  //Navigation bei Netzwerk Modus
  if (chunk == 'NLT')  {
    var string_nlt = string.substr(22,40);   
    setState(onkyoSettings.firstId+30,string_nlt);
    //String zerlegen fuer Navigation
    var string_nlt_nav = string.substr(6,2);                    //2 digits navigation
    string_nlt_nav = parseInt(string_nlt_nav, 16) + 1;              //this start at zero, we need start at one and convert hex to decimal
    var string_nlt_nav_summ = string.substr(10,2);              //2 digits navigation summary
    string_nlt_nav_summ = parseInt(string_nlt_nav_summ, 16);    //convert hex to decimal    
    setState(onkyoSettings.firstId+32,string_nlt_nav+"/"+string_nlt_nav_summ);
                          }  
  //Rückgabe NSL-U0 ibs U9 in Variable schreiben
  if (chunk == 'NLS')  {
    var string_nls = string.substr(0,2);
    var string_menu = string.substr(3,40);
    var string_cursor = string.substr(0,1);         //Cursor
    var string_position = string.substr(1,1);       //Cursor position
    var string_update = string.substr(2,1);         //Cursor position update (clear list)
        if (onkyoSettings.debug == true) {
            logger.info("adapter Onkyo Event Receiver NLS:"+string_nls);
                                            }
    //Clear Menu when update is need
    if (string_update == 'P') {                            
            setState(onkyoSettings.firstId+21,"");
            setState(onkyoSettings.firstId+22,"");
            setState(onkyoSettings.firstId+23,"");
            setState(onkyoSettings.firstId+24,"");
            setState(onkyoSettings.firstId+25,"");
            setState(onkyoSettings.firstId+26,"");
            setState(onkyoSettings.firstId+27,"");
            setState(onkyoSettings.firstId+28,"");
            setState(onkyoSettings.firstId+29,"");
                      }
    
    //Set Curso position in var
    if (string_cursor == 'C') {
            string_position = parseInt(string_position) + 1;     
            setState(onkyoSettings.firstId+31,string_position) 
                              }
    //Debug                          
    if (onkyoSettings.debug == true) {
    logger.info("adapter Onkyo Nav: "+string_cursor+" "+string_position+" "+string_update);
		                                    }                          
    
    switch (string_nls)
                    {
            case "U0":
                      setState(onkyoSettings.firstId+20,string_menu);                      
                      break;
            case "U1":
                      setState(onkyoSettings.firstId+21,string_menu);
                      break;
            case "U2":
                      setState(onkyoSettings.firstId+22,string_menu);
                      break;
            case "U3":
                      setState(onkyoSettings.firstId+23,string_menu);
                      break;
            case "U4":
                      setState(onkyoSettings.firstId+24,string_menu);
                      break;
            case "U5":
                      setState(onkyoSettings.firstId+25,string_menu);
                      break;
            case "U6":
                      setState(onkyoSettings.firstId+26,string_menu);
                      break;
            case "U7":
                      setState(onkyoSettings.firstId+27,string_menu);
                      break;
            case "U8":
                      setState(onkyoSettings.firstId+28,string_menu);
                      break;
            case "U9":
                      setState(onkyoSettings.firstId+29,string_menu);
                      break;
            //default: 
            //alert('Default case');
            //break;
                    }            
                    }
  //Listening Mode
  if (chunk == 'LMD')  {
    string = string.substr(0,2)  
    setState(onkyoSettings.firstId+33,string);
                    }                    
  //Audio information
  if (chunk == 'IFA')  {  
    setState(onkyoSettings.firstId+34,string);
                    }                    

  //Video information
  if (chunk == 'IFV')  {
    setState(onkyoSettings.firstId+35,string);
                    }  
  //Net Play Status
  if (chunk == 'NST')  {
    var nst_play = string.substr(0,1);         //Play status
    var nst_repeat = string.substr(1,1);       //Repeat status
    var nst_shuffle = string.substr(2,1);      //Shuffle status
    setState(onkyoSettings.firstId+36,nst_play);
    setState(onkyoSettings.firstId+37,nst_repeat);
    setState(onkyoSettings.firstId+38,nst_shuffle);
                    }                                    
});

//Wird beim Socket Fehler aufgerugen
socketOnkyo.on('error', function (data) {
      if (onkyoSettings.debug == true) {
	logger.info("adapter onkyo ERROR Connection Receiver:" +data.toString());
                                      }
  setState(onkyoSettings.firstId+39,false);                                    
  onkyoConnected = 'false';
	//Neuen connect in 10sec initiieren (geht nur einmalig, deshalb setinterval onkyoreconnect)
    activityTimeout = setTimeout(function () {
       connectOnkyo();
    }, 10000);
});

//Wird aufgerufen bei Connect zu CCU.IO
socket.on('connect', function () {
    logger.info("adapter onkyo connected to ccu.io");
});

//Wird aufgerufen bei disconnect zu CCU.IO
socket.on('disconnect', function () {
    logger.info("adapter onkyo disconnected from ccu.io");
});


//Wird aufgerufen bei Änderungen von Objekten in CCU.IO. Hier musst Du nach den für Dich interessanten IDs suchen, z.B. Deine eigenen ID´s.
socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
	
	//ID des geänderten Objektes
    var id = obj[0];
	//Wert des geänderten Objektes
    var val = obj[1];
	//Timestamp der letzten Änderung
    var ts = obj[2];
	//ACKnowledge der letzten Änderung
    var ack = obj[3];
	
	//z.B. wenn ID = onkyoSettings.firstId (also bei Dir 100101) ODER onkyoSettings.firstId +1 (hier 100102) dann mach etwas
	//if (obj[0] == onkyoSettings.firstId || obj[0] == onkyoSettings.firstId +1) {
  //if (obj[0] == onkyoSettings.firstId || obj[0] == onkyoSettings.ccuID) {  
  
  if (obj[0] == onkyoSettings.firstId || obj[0] == onkyoSettings.firstId +6 || obj[0] == onkyoSettings.firstId +7 || obj[0] == onkyoSettings.firstId +8 || obj[0] == onkyoSettings.firstId +9 || obj[0] == onkyoSettings.firstId +10 || obj[0] == onkyoSettings.firstId +11 || obj[0] == onkyoSettings.firstId +12 || obj[0] == onkyoSettings.firstId +13 || obj[0] == onkyoSettings.firstId +14 || obj[0] == onkyoSettings.firstId +15 || obj[0] == onkyoSettings.firstId +16 || obj[0] == onkyoSettings.firstId +17 || obj[0] == onkyoSettings.firstId +18 || obj[0] == onkyoSettings.firstId +19 ) {
  //if (obj[0] == onkyoSettings.firstId) {
		
	//logger.info("adapter onkyo Event (hier hat sich bei der 100100 (firstID) was geändert): "+id+" "+val+" "+ts+" "+ack+" "+obj);
    if (onkyoSettings.debug == true) {
        logger.info("adapter Onkyo Event: "+id+" "+val+" "+ts+" "+ack+" "+obj);
		                                    }
    
		//Änderung der ersten ID 100101 und Wert ungleich ""
		//if (id == onkyoSettings.firstId && val != "" || id == onkyoSettings.ccuId && val != "") {
			if (id == onkyoSettings.firstId && val != "") { 
      
    //Array bauen und die Erste onkyoSettings.firstId einlesen
    var myarray = val.split (','); 
    
      if (onkyoSettings.debug == true) {
				      logger.info("adapter Onkyo myArray:"+myarray);
              logger.info("adapter Onkyo myArray:"+myarray.length);        
                      for( var i=0 ; i < myarray.length ; i++ )  {
                              logger.info("adapter Onkyo myArray:"+myarray[i]);
                                                  }
                                              }
		                                              
			//Einen String für den Onkyo zusammenbasteln     
      for( var i=0 ; i < myarray.length ; i++ )  {
           command = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211"+myarray[i]+"\x0D");
           socketOnkyo.write(command);
           sleep(50);
           
       //Variablen wieder zurücksetzen
       setState(id, "");

                                                  }
                                              }

  //MVL in hex
  if (id == onkyoSettings.firstId +6 && ack != true) {
          //convert decimal to hex 
        var new_val = parseInt(val);  //string to integer
        new_val = decimalToHex(new_val).toUpperCase();  //call function decimalToHex();
        command = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211MVL"+new_val+"\x0D");
          if (onkyoSettings.debug == true) {
				      logger.info("adapter Onkyo send:"+command);
                                              }
				socketOnkyo.write(command);
        //Variablen wieder zurücksetzen
        //setState(id, "");
		}
  //ZVL in hex
  if (id == onkyoSettings.firstId +7 && obj[3] != true) { 
        //convert decimal to hex
        var new_val = parseInt(val);  //string to integer
        new_val = decimalToHex(new_val).toUpperCase();  //call function decimalToHex();
        command = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211ZVL"+new_val+"\x0D");
          if (onkyoSettings.debug == true) {
				      logger.info("adapter Onkyo send:"+command);
                                              }
				socketOnkyo.write(command);
        //Variablen wieder zurücksetzen
        //setState(id, "");
		}    
  //TUN  
  if (id == onkyoSettings.firstId +8 && ack != true) { 
        //String zerlegen, damit TUNDIRECT verwendet werden kann
          val1 = val.substr(0,1);
          val2 = val.substr(1,1);
          val3 = val.substr(2,1);
          val4 = val.substr(4,1);
          val5 = val.substr(5,1);
        command1 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211SLI24\x0D");
        command2 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211TUNDIRECT\x0D");
        command3 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211TUN"+val1+"\x0D");
        command4 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211TUN"+val2+"\x0D");
        command5 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211TUN"+val3+"\x0D");
        command6 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211TUN"+val4+"\x0D");
        command7 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211TUN"+val5+"\x0D");
 
				socketOnkyo.write(command1);
        sleep(50);
        socketOnkyo.write(command2);
        sleep(50);
        socketOnkyo.write(command3);
        sleep(50);
        socketOnkyo.write(command4);
        sleep(50);
        socketOnkyo.write(command5);
        sleep(50);
        socketOnkyo.write(command6);
        sleep(50);
        socketOnkyo.write(command7);
        //Variablen wieder zurücksetzen
        //setState(id, "");
        
        //Debug     
             if (onkyoSettings.debug == true) {
              logger.info("adapter Onkyo send:"+val);
				      logger.info("adapter Onkyo send:"+command1);
              logger.info("adapter Onkyo send:"+command2);
              logger.info("adapter Onkyo send:"+command3);
              logger.info("adapter Onkyo send:"+command4);
              logger.info("adapter Onkyo send:"+command5);
              logger.info("adapter Onkyo send:"+command6);
              logger.info("adapter Onkyo send:"+command7);
                                              }
		}
  //TUZ  
  if (id == onkyoSettings.firstId +9 && ack != true) { 
        //String zerlegen, damit TUNDIRECT verwendet werden kann
          val1 = val.substr(0,1);
          val2 = val.substr(1,1);
          val3 = val.substr(2,1);
          val4 = val.substr(4,1);
          val5 = val.substr(5,1);
        command1 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211SLZ24\x0D");
        command2 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211TUNDIRECT\x0D");
        command3 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211TUN"+val1+"\x0D");
        command4 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211TUN"+val2+"\x0D");
        command5 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211TUN"+val3+"\x0D");
        command6 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211TUN"+val4+"\x0D");
        command7 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211TUN"+val5+"\x0D");
 
				socketOnkyo.write(command1);
        sleep(50);
        socketOnkyo.write(command2);
        sleep(50);
        socketOnkyo.write(command3);
        sleep(50);
        socketOnkyo.write(command4);
        sleep(50);
        socketOnkyo.write(command5);
        sleep(50);
        socketOnkyo.write(command6);
        sleep(50);
        socketOnkyo.write(command7);
        //Variablen wieder zurücksetzen
        //setState(id, "");
        
        //Debug     
             if (onkyoSettings.debug == true) {
              logger.info("adapter Onkyo send:"+val);
				      logger.info("adapter Onkyo send:"+command1);
              logger.info("adapter Onkyo send:"+command2);
              logger.info("adapter Onkyo send:"+command3);
              logger.info("adapter Onkyo send:"+command4);
              logger.info("adapter Onkyo send:"+command5);
              logger.info("adapter Onkyo send:"+command6);
              logger.info("adapter Onkyo send:"+command7);
                                              }
		}                
  //NPR in hex
  if (id == onkyoSettings.firstId +10 && ack != true) { 
        //convert decimal to hex 
        var new_val = parseInt(val);  //string to integer
        new_val = decimalToHex(new_val).toUpperCase();  //call function decimalToHex();
        command1 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211SLI2B\x0D");
        command2 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211NPR"+new_val+"\x0D");
          if (onkyoSettings.debug == true) {
				      logger.info("adapter Onkyo send:"+command1);
              logger.info("adapter Onkyo send:"+command2);
                                              }
        socketOnkyo.write(command1);
        sleep(50);
        socketOnkyo.write(command2);
		}
        
  //NPZ in hex
  if (id == onkyoSettings.firstId +11 && ack != true) { 
        //convert decimal to hex 
        var new_val = parseInt(val);  //string to integer
        new_val = decimalToHex(new_val).toUpperCase();  //call function decimalToHex();
        command1 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211SLZ2B\x0D");
        command2 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211NPZ"+new_val+"\x0D");
          if (onkyoSettings.debug == true) {
				      logger.info("adapter Onkyo send:"+command1);
              logger.info("adapter Onkyo send:"+command2);
                                              }
        socketOnkyo.write(command1);
        sleep(50);
        socketOnkyo.write(command2);
		}  
        
  //SLI
  if (id == onkyoSettings.firstId +12 && ack != true) { 
        command = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211SLI"+val+"\x0D");
          if (onkyoSettings.debug == true) {
				      logger.info("adapter Onkyo send:"+command);
                                              }
				socketOnkyo.write(command);
        //Variablen wieder zurücksetzen
        //setState(id, "");
		}    
  //SLZ
  if (id == onkyoSettings.firstId +13 && ack != true) { 
        command = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211SLZ"+val+"\x0D");
          if (onkyoSettings.debug == true) {
				      logger.info("adapter Onkyo send:"+command);
                                              }
				socketOnkyo.write(command);
        //Variablen wieder zurücksetzen
        //setState(id, "");
		}    
  //AMT
  if (id == onkyoSettings.firstId +14 && ack != true) {
        //add support of "true|false"
        if (val == true) {
            val = '01';
            }
        if  (val == false) {
            val = '00';
            } 
        command = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211AMT"+val+"\x0D");
          if (onkyoSettings.debug == true) {
				      logger.info("adapter Onkyo send:"+command);
                                              }
				socketOnkyo.write(command);
		}
      
  //ZMT
  if (id == onkyoSettings.firstId +15 && ack != true) { 
        //add support of "true|false"
        if (val == true) {
            val = '01';
            }
        if  (val == false) {
            val = '00';
            } 
        command = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211ZMT"+val+"\x0D");
          if (onkyoSettings.debug == true) {
				      logger.info("adapter Onkyo send:"+command);
                                              }
				socketOnkyo.write(command);
		}
    
  //PRS in hex
  if (id == onkyoSettings.firstId +16 && ack != true) { 
        //convert decimal to hex 
        var new_val = parseInt(val);  //string to integer
        new_val = decimalToHex(new_val).toUpperCase();  //call function decimalToHex();
        command1 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211SLI24\x0D");
        command2 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211PRS"+new_val+"\x0D");
        if (onkyoSettings.debug == true) {
				      logger.info("adapter Onkyo send:"+command1);
              logger.info("adapter Onkyo send:"+command2);
                                              }
        socketOnkyo.write(command1);
        sleep(50);
        socketOnkyo.write(command2);
		}                

  //PRZ in hex
  if (id == onkyoSettings.firstId +17 && ack != true) { 
        //convert decimal to hex 
        var new_val = parseInt(val);  //string to integer
        new_val = decimalToHex(new_val).toUpperCase();  //call function decimalToHex();
        command1 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211SLZ24\x0D");
        command2 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211PRZ"+new_val+"\x0D");
        if (onkyoSettings.debug == true) {
				      logger.info("adapter Onkyo send:"+command1);
              logger.info("adapter Onkyo send:"+command2);
                                              }

        socketOnkyo.write(command1);
        sleep(50);
        socketOnkyo.write(command2);
		}   
  
  //PWR
  if (id == onkyoSettings.firstId +18 && ack != true) { 
        //add support of "true|false"
        if (val == true) {
            val = '01';
            }
        if  (val == false) {
            val = '00';
            }   
        command = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211PWR"+val+"\x0D");
        //init after power on
        command1 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211MVLQSTN\x0D");
        command2 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211AMTQSTN\x0D");
        command3 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211LMDQSTN\x0D");
        command4 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211IFAQSTN\x0D");
        command5 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211IFVQSTN\x0D");
        command6 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211SLIQSTN\x0D");
          if (onkyoSettings.debug == true) {
				      logger.info("adapter Onkyo send:"+command);
                                              }
				socketOnkyo.write(command);
        sleep(50);
        socketOnkyo.write(command1);
        sleep(50);
        socketOnkyo.write(command2);
        sleep(50);
        socketOnkyo.write(command3);
        sleep(50);
        socketOnkyo.write(command4);
        sleep(50);
        socketOnkyo.write(command5);
	    	sleep(50);
        socketOnkyo.write(command6);
} 
    
  //ZPW
  if (id == onkyoSettings.firstId +19 && ack != true) { 
        //add support of "true|false"
        if (val == true) {
            val = '1';
            }
        if  (val == false) {
            val = '0';
            }   
        command = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211ZPW0"+val+"\x0D");
        command1 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211ZVLQSTN\x0D");
        command2 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211ZMTQSTN\x0D");
        command3 = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211SLZQSTN\x0D");
          if (onkyoSettings.debug == true) {
				      logger.info("adapter Onkyo send:"+command);
                                              }
				socketOnkyo.write(command);
        sleep(50);
        socketOnkyo.write(command1);
        sleep(50);
        socketOnkyo.write(command2);
        sleep(50);
        socketOnkyo.write(command3);
		}       
      
	}
	
	
});

//Ende des Adapters
function stop() {
    logger.info("adapter onkyo terminating");
    socketOnkyo.end;
	setTimeout(function () {
        process.exit();
    }, 250);
}

//Bei Unix SIGINT -->ende
process.on('SIGINT', function () {
    stop();
});

//Bei Unix SIGTERM -->ende
process.on('SIGTERM', function () {
    stop();
});

function setObject(id, obj) {
    objects[id] = obj;
    if (obj.Value) {
        datapoints[obj.Name] = [obj.Value];
    }
    socket.emit("setObject", id, obj);
}

function setState(id, val) {
	datapoints[id] = [val];
	logger.verbose("adapter onkyo setState "+id+" "+val);
	socket.emit("setState", [id,val,null,true]);
}

function decimalToHex(d, padding) {
    var hex = Number(d).toString(16);
    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

    while (hex.length < padding) {
        hex = "0" + hex;
    }

    return hex;
}

function onkyoReconnect() {
  if (onkyoConnected != 'true'){
      connectOnkyo();
      }
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function OnkyoInit() {
	
  socket.emit("setObject", onkyoSettings.firstId+40, {
    Name: "Onkyo-Receiver",
    TypeName: "DEVICE",
    HssType: "Receiver",
    Address: onkyoSettings.firstId+40,
    Interface: "CCU.IO",
    Channels: [
      onkyoSettings.firstId+41,
      onkyoSettings.firstId+42,
      onkyoSettings.firstId+43  
    ],
    _persistent: true
  });
  
  var mainDPs = {
    Onkyo_Command:                    onkyoSettings.firstId,
    Onkyo_NET_USB_Artist_Name_Info:   onkyoSettings.firstId+1,
    Onkyo_NET_USB_Time_Info:          onkyoSettings.firstId+2,
    Onkyo_NET_USB_Album_Name_Info:    onkyoSettings.firstId+3,
    Onkyo_NET_USB_Track_Info:         onkyoSettings.firstId+4,
    Onkyo_NET_USB_Track_Info:         onkyoSettings.firstId+5,
    Onkyo_NET_MENU_0:                 onkyoSettings.firstId+20,
    Onkyo_NET_MENU_1:                 onkyoSettings.firstId+21,
    Onkyo_NET_MENU_2:                 onkyoSettings.firstId+22,
    Onkyo_NET_MENU_3:                 onkyoSettings.firstId+23,
    Onkyo_NET_MENU_4:                 onkyoSettings.firstId+24,
    Onkyo_NET_MENU_5:                 onkyoSettings.firstId+25,
    Onkyo_NET_MENU_6:                 onkyoSettings.firstId+26,
    Onkyo_NET_MENU_7:                 onkyoSettings.firstId+27,
    Onkyo_NET_MENU_8:                 onkyoSettings.firstId+28,
    Onkyo_NET_MENU_9:                 onkyoSettings.firstId+29,
    Onkyo_NET_NAVIGATION:             onkyoSettings.firstId+30,
    Onkyo_NET_POSITION:               onkyoSettings.firstId+31,
    Onkyo_NET_POSITION_SUMM:          onkyoSettings.firstId+32,
    Onkyo_Listening_Mode:             onkyoSettings.firstId+33,
    Onkyo_Audio_Information:          onkyoSettings.firstId+34,
    Onkyo_Video_Information:          onkyoSettings.firstId+35,
    Onkyo_NET_Play_Status:            onkyoSettings.firstId+36,
    Onkyo_NET_Repeat_Status:          onkyoSettings.firstId+37,
    Onkyo_NET_Shuffle_Status:         onkyoSettings.firstId+38,
    Onkyo_Connect_Status:             onkyoSettings.firstId+39     
  };
  
  var zone1DPs = {
    Onkyo_Volume_Zone1:                 onkyoSettings.firstId+6,
    Onkyo_Tuning_Zone1:                 onkyoSettings.firstId+8,
    Onkyo_Internet_Radio_Preset_Zone1:  onkyoSettings.firstId+10,
    Onkyo_Input_Select_Zone1:           onkyoSettings.firstId+12,
    Onkyo_Audio_Mute_Zone1:             onkyoSettings.firstId+14,
    Onkyo_Tuner_Preset_Zone1:           onkyoSettings.firstId+16,
    Onkyo_Power_Zone1:                  onkyoSettings.firstId+18  
  };
  
  var zone2DPs = {
    Onkyo_Volume_Zone2:                 onkyoSettings.firstId+7,
    Onkyo_Tuning_Zone2:                 onkyoSettings.firstId+9,
    Onkyo_Internet_Radio_Preset_Zone2:  onkyoSettings.firstId+11,
    Onkyo_Input_Select_Zone2:           onkyoSettings.firstId+13,
    Onkyo_Audio_Mute_Zone2:             onkyoSettings.firstId+15,
    Onkyo_Tuner_Preset_Zone2:           onkyoSettings.firstId+17,
    Onkyo_Power_Zone2:                  onkyoSettings.firstId+19    
  };
  
  socket.emit("setObject", onkyoSettings.firstId+41, {
    Name: "Onkyo Main",
    TypeName: "CHANNEL",
    Address: onkyoSettings.firstId+41,
    HssType: "Onkyo Main Features",
    DPs: mainDPs,
    Parent: onkyoSettings.firstId+40,
    _persistent: true
  });
  
  socket.emit("setObject", onkyoSettings.firstId+42, {
    Name: "Onkyo Zone 1",
    TypeName: "CHANNEL",
    Address: onkyoSettings.firstId+42,
    HssType: "Onkyo Zone 1",
    DPs: zone1DPs,
    Parent: onkyoSettings.firstId+40,
    _persistent: true
  });
  
   socket.emit("setObject", onkyoSettings.firstId+43, {
    Name: "Onkyo Zone 2",
    TypeName: "CHANNEL",
    Address: onkyoSettings.firstId+43,
    HssType: "Onkyo Zone 2",
    DPs: zone2DPs,
    Parent: onkyoSettings.firstId+40,
    _persistent: true
  });    
  
	setObject(onkyoSettings.firstId, {
	  Name: "Onkyo_Command",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+1, {
	  Name: "Onkyo_NET/USB_Artist_Name_Info",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+2, {
	  Name: "Onkyo_NET/USB_Time_Info",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+3, {
	  Name: "Onkyo_NET/USB_Album_Name_Info",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+4, {
	  Name: "Onkyo_NET/USB_Track_Info",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+5, {
	  Name: "Onkyo_NET/USB_Track_Info",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+6, {
	  Name: "Onkyo_Volume_Zone1",
	  TypeName: "VARDP"
	});  
  setObject(onkyoSettings.firstId+7, {
	  Name: "Onkyo_Volume_Zone2",
	  TypeName: "VARDP"
	});
  setObject(onkyoSettings.firstId+8, {
	  Name: "Onkyo_Tuning_Zone1",
	  TypeName: "VARDP"
	});
  setObject(onkyoSettings.firstId+9, {
	  Name: "Onkyo_Tuning_Zone2",
	  TypeName: "VARDP"
	});
  setObject(onkyoSettings.firstId+10, {
	  Name: "Onkyo_Internet_Radio_Preset_Zone1",
	  TypeName: "VARDP"
	});
  setObject(onkyoSettings.firstId+11, {
	  Name: "Onkyo_Internet_Radio_Preset_Zone2",
	  TypeName: "VARDP"
	});
  setObject(onkyoSettings.firstId+12, {
	  Name: "Onkyo_Input_Select_Zone1",
	  TypeName: "VARDP"
	});
  setObject(onkyoSettings.firstId+13, {
	  Name: "Onkyo_Input_Select_Zone2",
	  TypeName: "VARDP"
	});
  setObject(onkyoSettings.firstId+14, {
	  Name: "Onkyo_Audio_Mute_Zone1",
	  TypeName: "HSSDP"
	});
  setObject(onkyoSettings.firstId+15, {
	  Name: "Onkyo_Audio_Mute_Zone2",
	  TypeName: "HSSDP"
	});
  setObject(onkyoSettings.firstId+16, {
	  Name: "Onkyo_Tuner_Preset_Zone1",
	  TypeName: "VARDP"
	});
  setObject(onkyoSettings.firstId+17, {
	  Name: "Onkyo_Tuner_Preset_Zone2",
	  TypeName: "VARDP"
	});
  setObject(onkyoSettings.firstId+18, {
	  Name: "Onkyo_Power_Zone1",
	  TypeName: "HSSDP"
	});
  setObject(onkyoSettings.firstId+19, {
	  Name: "Onkyo_Power_Zone2",
	  TypeName: "HSSDP"
	});
	setObject(onkyoSettings.firstId+20, {
	  Name: "Onkyo_NET-MENU-0",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+21, {
	  Name: "Onkyo_NET-MENU-1",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+22, {
	  Name: "Onkyo_NET-MENU-2",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+23, {
	  Name: "Onkyo_NET-MENU-3",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+24, {
	  Name: "Onkyo_NET-MENU-4",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+25, {
	  Name: "Onkyo_NET-MENU-5",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+26, {
	  Name: "Onkyo_NET-MENU-6",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+27, {
	  Name: "Onkyo_NET-MENU-7",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+28, {
	  Name: "Onkyo_NET-MENU-8",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+29, {
	  Name: "Onkyo_NET-MENU-9",
	  TypeName: "VARDP"
	});
  //Showing the actual position in NET-Mode
	setObject(onkyoSettings.firstId+30, {
	  Name: "Onkyo_NET_NAVIGATION",
	  TypeName: "VARDP"
	});
  //Point to navigation position in NET-Mode
	setObject(onkyoSettings.firstId+31, {
	  Name: "Onkyo_NET_POSITION",
	  TypeName: "VARDP"
	});
  //Point to navigation position in NET-Mode
	setObject(onkyoSettings.firstId+32, {
	  Name: "Onkyo_NET_POSITION_SUMM",
	  TypeName: "VARDP"
	});
	setObject(onkyoSettings.firstId+33, {
	  Name: "Onkyo_Listening_Mode",
	  TypeName: "VARDP"
	});  
	setObject(onkyoSettings.firstId+34, {
	  Name: "Onkyo_Audio_Information",
	  TypeName: "VARDP"
	});  
	setObject(onkyoSettings.firstId+35, {
	  Name: "Onkyo_Video_Information",
	  TypeName: "VARDP"
	});  
	setObject(onkyoSettings.firstId+36, {
	  Name: "Onkyo_NET_Play_Status",
	  TypeName: "VARDP"
	});  
	setObject(onkyoSettings.firstId+37, {
	  Name: "Onkyo_NET_Repeat_Status",
	  TypeName: "VARDP"
	});  
	setObject(onkyoSettings.firstId+38, {
	  Name: "Onkyo_NET_Shuffle_Status",
	  TypeName: "VARDP"
	});  
  setObject(onkyoSettings.firstId+39, {
	  Name: "Onkyo_Connect_Status",
	  TypeName: "HSSDP"
	});  

	  logger.info("adapter onkyo objects inserted, starting at: "+onkyoSettings.firstId);
}

logger.info("adapter onkyo start");
OnkyoInit ();
setInterval(onkyoReconnect,10000);
