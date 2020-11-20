// Copyright (c) 2010 - 2015 Sipcentric Ltd. Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
// background.js

// Globals
var stream = null;
var socket = null;
var attempts = 0;
var streamCheck = 0;
var streamSuspended = false;

var notification_timeout = 5; // Minutes

// Add listener for messages passed from the content.js script
chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.number != null) { sendResponse(tryCall(request.number, request.numberHold, request.callerId)); }
    if (request.sms != null) { sendResponse(sendSMS(request.sms, request.message, request.from)); }
    if (request.clickableEnabled != null) { sendResponse(clickableEnabled()); }
    if (request.connectStream != null) { attempts = 0; setupNotifications(); }
    if (request == 'killStream') { socket.unsubscribe(); }
  }
);

function log(message) {
  if (localStorage.getItem('logging') == 'true') {
    console.log(message);
  }
}

function getRandomArbitary (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function setupNotifications() {

  username = localStorage['loginUsername'];
  password = localStorage['loginPassword'];

  try {
    socket.unsubscribe();
  } catch (e) {
    //log("Can't unsubscribe");
  }

  if (localStorage['loginValid'] == "true") {

    streamSuspended = false;
    var auth = window.btoa(localStorage["loginUsername"] + ":" + localStorage["loginPassword"]);
    authHeaders = {};
    authHeaders["Authorization"] = "Basic " + auth;

    socket = $.atmosphere;

    stream = { url : localStorage['baseURL'] + '/stream',
                    contentType : 'application/json',
                    logLevel : 'info',
                    headers : authHeaders,
                    attachHeadersAsQueryString: false,
                    maxReconnectOnClose : 0,
                    enableXDR : true,
                    transport : 'streaming' };

    stream.onOpen = function(response) {
      log('[SCCE] Stream flowing.');
      localStorage[localStorage['loginUsername'] + '_notificationConnection'] = true;
    };

    // stream.onClose = function(response) {
    // }

    stream.onError = function(response) {
      log('[SCCE] Stream has dried up. (Error)');
      localStorage[localStorage['loginUsername'] + '_notificationConnection'] = false;

      if (response.status == '401') {
	// authentication failed - don't bother retrying
        streamSuspended = true;
      } else if (attempts < 5) {
        log('[SCCE] Going to reconnect in 20 secconds. Try: ' + attempts)
        attempts += 1;
        setTimeout(function(){ if (!streamSuspended) {setupNotifications()}; },20000);
      } else if (!streamSuspended) {
        log('[SCCE] Max attempts reached.');
        var errorNotification = webkitNotifications.createNotification('images/icon48.png', 'Connection Error', "Can't connect to the notifications server. Click here to reconnect.");
        streamSuspended = true;
        errorNotification.onclick = function(){
          attempts = 0;
          errorNotification.cancel();
          setupNotifications();
        }

        errorNotification.show();
      }
    };

    stream.onMessage = function (response) {
      var message = response.responseBody;
      localStorage[localStorage['loginUsername'] + '_streamFlow'] = new Date().getTime();

      try {
        var json = jQuery.parseJSON(message);

        if (json.event == "smsreceived") {

          if (notificationSmsEnabled() == true) {
            smsnotification({ from: json.values['from'],
                              message: json.values['excerpt'] });
          }

        } else if (json.event == "incomingcall") {

          if (localStorage['baseURL'] + json.values['endpoint'] == localStorage[localStorage['loginUsername'] + '_prefMainExtension']) {

            if (notificationCallEnabled() == true) {

              var name = json.values['callerIdName'];

              if (localStorage[localStorage['loginUsername'] + '_prefCallLookupURL']) {

                var baseUrl = localStorage[localStorage['loginUsername'] + '_prefCallLookupURL'];
                var url = baseUrl.replace('[callerid]', json.values['callerIdNumber']);

                $.ajax({
                  url: url,
                  type: 'GET'
                }).done(function(response) {

                  name = response || json.values['callerIdName'];

                  callnotification({
                    number: json.values['callerIdNumber'],
                    name: name,
                    extension: localStorage[localStorage['loginUsername'] + '_prefMainExtensionShort']
                  });

                  return true;

                }).error(function(response) {

                  log('LookupURL Error: ' + response.status);

                  callnotification({
                    number: json.values['callerIdNumber'],
                    name: name,
                    extension: localStorage[localStorage['loginUsername'] + '_prefMainExtensionShort']
                  });

                  return false;

                });

              } else {

                callnotification({ number: json.values['callerIdNumber'],
                                   name: json.values['callerIdName'],
                                   extension: localStorage[localStorage['loginUsername'] + '_prefMainExtensionShort'] });

              }

            }

          }
        }

      } catch (e) {
        return;
      }
    };

    if (navigator.onLine) {
      var subSocket = socket.subscribe(stream);
    }
  }
}

function smsnotification(context) {

  options = {
    'type': 'basic',
    'iconUrl': 'images/notification.png',
    'isClickable': true
  }

  options['title'] = 'New message from ' + context.from;
  options['message'] = context.message + '...';

  chrome.notifications.create(notificationId='', options=options, function(id) {

    log_notification(true, id);

    setTimeout( function() {

      log_notification(false, id);

    }, 60000 * notification_timeout);

  });
}

function callnotification(context) {

  var nopop = false

  options = {
    'type': 'basic',
    'iconUrl': 'images/notification.png',
    'isClickable': true
  }

  options['title'] = 'Incoming call to ' + context.extension;

  if (!context.number) {

    if (context.name) {
      options['message'] = 'Anonymous caller (' + context.name + ')';
    } else {
      options['message'] = 'Anonymous caller';
    }
    nopop = true;

  } else if (context.number == 'anonymous') {

    if (context.name) {
      options['message'] = 'Anonymous caller (' + context.name + ')';
    } else {
      options['message'] = 'Anonymous caller';
    }
    nopop = true;

  } else {

    options['message'] = 'From ' + context.name + ' (' + context.number + ')';

  }

  if ( popCallEnabled() == true && nopop == false) {
    domain = url_domain(localStorage[localStorage['loginUsername'] + '_prefCallPopURL']);

    options['buttons'] = [{"title": "Open in " + domain }]
  }

  chrome.notifications.create(notificationId='', options=options, function(id) {

    localStorage[id] = JSON.stringify({'type': 'incomingcall', 'number': context.number, 'name': context.name, 'extension': context.extension});
    log_notification(true, id);

    setTimeout( function() {

      log_notification(false, id);

    }, 60000 * notification_timeout);

  });

}

chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {

  data = JSON.parse(localStorage[notificationId]);

  if (data['type'] == 'incomingcall') {

    number = data['number'];

    url = localStorage[localStorage['loginUsername'] + '_prefCallPopURL'];

    open = url.replace("[callerid]", number);

    chrome.tabs.create({'url': open});

  } else if (data['type'] == 'update') {

    chrome.tabs.create({'url': data['url']});

  }

});

// chrome.notifications.onClosed.addListener(function(notificationId, buttonIndex) {
//   log('User closed notification');
// });

function log_notification(state, id) {

  if (localStorage.getItem('notifications') === null) {
    var notifications = [];
  } else {
    var notifications = JSON.parse(localStorage['notifications']);
  }

  if (state == true) {

    notifications.push(id);

    log('Logged notification ' + id);

  } else if (state == false) {

    localStorage.removeItem(id);

    chrome.notifications.clear(id, function() {
      log('Cleared notification ' + id);
    });

    var item = notifications.indexOf(id);

    if (item > -1) {
      notifications.splice(item, 1);
    }

    log('Removed logged notification ' + id);

  } else if (state == 'clear') {

    for (var i in notifications) {

      log('Removing: ' + notifications[i]);

      localStorage.removeItem(notifications[i]);

    }

    notifications = [];

  }

  localStorage['notifications'] = JSON.stringify(notifications);

}

function url_domain(data) {

  var a = document.createElement('a');
  a.href = data;
  return a.hostname;

}

function notificationCallEnabled() { if (localStorage[localStorage['loginUsername'] + '_prefCallNotify'] == 1) { return true; } else { return false; } }

function notificationSmsEnabled() { if (localStorage[localStorage['loginUsername'] + '_prefSmsNotify'] == 1) { return true; } else { return false; } }

function clickableEnabled() { if (localStorage[localStorage['loginUsername'] + '_prefEnableClickable'] == 1) { return true; } else { return false; } }

function popCallEnabled() { if (localStorage[localStorage['loginUsername'] + '_prefCallPop'] == 1 && localStorage[localStorage['loginUsername'] + '_prefCallPopURL'] != false) { return true; } else { return false; } }

function sendSMS(number, message, from) {

  log('[SCCE] Send SMS. Number: ' + number + ' From: ' + from + ' Message: ' + message);

  var xmlhttp = new XMLHttpRequest();
  var customerId = localStorage[localStorage['loginUsername'] + '_prefMainCustomer']; 
  xmlhttp.open("POST", localStorage['baseURL'] + "/customers/"+customerId+"/sms", false);
  var auth = window.btoa(localStorage["loginUsername"] + ":" + localStorage["loginPassword"]);
  xmlhttp.setRequestHeader('Authorization', 'Basic ' + auth);
  xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xmlhttp.send(JSON.stringify({   type: "smsmessage",
                                  to: number,
                                  from: from,
                                  body: message
                              }));

  var status = xmlhttp.status;

  var message;
  if (xmlhttp.responseText != null) {
    message = JSON.parse(xmlhttp.responseText);
  }

  return [status, message];

  // var handle = new Request("/customers/me/sms");

  // handle.type = "POST";

  // handle.data = {
  //   type: "smsmessage",
  //   to: number,
  //   from: from,
  //   body: message
  // }

  // handle.success(function(response, status){
  //   return [201, response];
  // });

  // handle.failed(function(response, status){
  //   return [status, response];
  // });

  // handle.go();

}

function tryCall(number, numberHold, callerId) {

  log('makeCall - Number: ' + number);
  log('[SCCE] Call number. Number: ' + number);

  if (numberHold == 1) {
    number = '*67' + number;
  }

  var realNumber = fixNumber(number);
  return makeCall(realNumber, callerId);
}

function fixNumber(number) {

  return number.replace(/(?:\+44|\(|\)|-|\s)/g, "");
}

function makeCall(number, callerId) {

  var endpoint = localStorage[localStorage['loginUsername'] + '_prefMainExtension'];
  var username = localStorage["loginUsername"];
  var password = localStorage["loginPassword"];

  var xmlhttp = new XMLHttpRequest();
  var customerId = localStorage[localStorage['loginUsername'] + '_prefMainCustomer']; 
  xmlhttp.open("POST", localStorage['baseURL'] + "/customers/"+customerId+"/calls", false);
  var auth = window.btoa(localStorage["loginUsername"] + ":" + localStorage["loginPassword"]);
  xmlhttp.setRequestHeader('Authorization', 'Basic ' + auth);
  xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xmlhttp.send(JSON.stringify({   type: "call",
                                  endpoint: endpoint,
                                  to: number,
                                  callerId: callerId,
                              }));

  var status = xmlhttp.status;

  if (status == 401) {
    return [status, "Not logged in!"];
  } else {
    var message;
    if (xmlhttp.responseText) {
        message = JSON.parse(xmlhttp.responseText);
    }
    return [status, message];
  }
}

function setupCheck() {
  streamCheck = window.setInterval(function(){ checkStream(); },120000);
}

function checkStream() {
  if (streamSuspended == false) {
    last = localStorage[localStorage['loginUsername'] + '_streamFlow'];
    now = new Date().getTime();

    if ( now - parseInt(last) > 70000 ) {
      log('[SCCE] Stream connection timed out.');
      setupNotifications();
    } else {
      //log('[SCCE] No timeout.');
    }
  }
}

function checkVersion() {
  // The updateCode is NOT the version number, just a string we have to match!

  // var updateCode = '30a04cf33ee91a3ecf4b75c71268f316'; // Code for V1.1.0
  // var updateCode = '184e62de39dc3ec565c84837ea6a4d75'; // Code for V1.1.8
  var updateCode = '79559797c12dc6ee015dd9d5bb263168'; // Code for V1.2.0 (Nimvelo brand update)

  var url = 'http://www.nimvelo.com/'; // Set to empty if you don't want to use it
  var updateMessage = 'Sipcentric for Chrome is now Nimvelo for Chrome!';

  if (localStorage['updateWelcome'] != updateCode) {

    if (localStorage[localStorage['loginUsername'] + '_loginSetup'] == 'done') {

      options = {
        'type': 'basic',
        'iconUrl': 'images/notification.png',
        'isClickable': true,
        'title': 'Nimvelo for Chrome updated!',
        'message': updateMessage
      }

      if (url != "") {

        options['buttons'] = [{ "title": "Find out more" }]

      }

      chrome.notifications.create(notificationId='', options=options, function(id) {

        localStorage[id] = JSON.stringify({'type': 'update', 'url': url});

        log_notification(true, id);

        setTimeout( function() {

          log_notification(false, id);

        }, 60000 * 40);

      });


    }

    // WARNING THIS WILL CLEAR THE LOCALSTORAGE IF THE UPDATE CODE DOES NOT MATCH!
    // localStorage.clear();

    // if (localStorage[localStorage['loginUsername'] + '_prefMainExtension'] != null) {
    //
    //   var ext = localStorage[localStorage["loginUsername"] + '_prefMainExtension'];
    //   localStorage[localStorage["loginUsername"] + '_prefMainExtension'] = ext.replace("http","https");
    //
    //   localStorage["baseURL"] = 'https://pbx.sipcentric.com/api/v1';
    //
    //   setupNotifications();
    // }

    localStorage['updateWelcome'] = updateCode;

  }
}

function contextDial(){
  var dialWindow = chrome.extension.getURL("call.html");
  chrome.contextMenus.create({
    "type":"normal",
    "title":"Dial Selected Number...",
    "contexts":["all", "page", "frame", "selection", "link", "editable"],
    "onclick": function (info, tab) {
      if (info.selectionText != null) {
        if (info.selectionText.length < 20) {
          chrome.tabs.create({ url: dialWindow + '?number=' + info.selectionText });
        } else {
          alert('Not a valid number.');
        }
      } else {
        alert('Highlight a number to dial first.');
      }
    }
  });
}

$(document).ready(function() {

  setupNotifications();
  log_notification('clear');

  contextDial();
  setupCheck();
  checkVersion();

});
