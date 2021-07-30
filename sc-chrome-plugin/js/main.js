// Nimvelo Chrome Extension - main.js
// Copyright (c) 2010 - 2015 Sipcentric Ltd. Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php

var loadingModal;

function loadingState(state) {
  if (state == true) {
    loadingModal = setTimeout(function(){
      $('#loadingModal').modal('show');
    }, 500);
  } else if (state == false) {
    clearInterval(loadingModal);
    $('#loadingModal').modal('hide');
  }
}

// Show the welcome block and hide menu
function showWelcome() {
  hide();
  hideMenu();
  $('#blockWelcome').fadeIn(400);

  // This stops any forms from being submitted
  return false;
}

// Show the dialer block
function showDialer() {
  hide();
  showMenu();
  getOutgoingNumbers();
  numbersAutoComplete("#dialerNumber", true, true);
  $('#blockDialer').fadeIn(400);
  $("#menuDialer").addClass("active");

  $("#dialerNumber").attr('maxlength','15');

  // Remove any error classes that may there
  $('#dialerNumberGroup').removeClass('error');

  // Uncheck withhold checkbox just incase it is
  $('#dialerWithhold').prop('checked', false);

  // Add some useful info for the user
  $('#dialerInfo').text('This will dial from extension ' + localStorage[localStorage['loginUsername'] + '_prefMainExtensionShort'] +'.');

  setTimeout(function(){ $('#dialerNumber').focus(); },200);

  // Lets see if we have any URL params
  // As the dialer screen is the default one we also use it to catch URL params for other blocks!
  // This would be best placed somewhere else, but for now it works here
  var getNumber = getUrlParams();
  if (getNumber.number) {
    // If we get a number then we put it in the text field
    $('#dialerNumber').val(getNumber.number);
  } else if (getNumber.sms) {
    // If we got a sms number we do the same as above but send the user to the messages block
    showSMSMessages();
    showNewSMS();
    $('#smsNumber').val(getNumber.sms);
  } else if (getNumber.contact) {
    // This will pull up a edit contact modal in the contacts block
    showBook();
    showContact(getNumber.contact);
  } else if (getNumber.smsThread) {
    showSMSThread(getNumber.smsThread);
  }

  return false;
}

function numbersAutoComplete(element, extensions, contacts) {
  var autoComplete = [];

  if (extensions == true) { try {
    autoComplete = JSON.parse(localStorage[localStorage['loginUsername'] + '_localExtensions']);
  } catch (err) { console.log('No extensions'); }}

  if (contacts == true) { try {
    var contacts = JSON.parse(localStorage[localStorage['loginUsername'] + '_contacts']);
    for (var item in contacts) {
      var obj = { label: contacts[item].name + ' - ' + contacts[item].phoneNumber, value: contacts[item].phoneNumber, category: "Company Contacts" };
      autoComplete.push(obj);
    }} catch (err) { console.log('No contacts'); }}

  $(element).catcomplete({ source: autoComplete });
}

function outgoingAutoComplete(element) {
  console.log(element);
  var autoComplete = [];

  try {
    autoComplete = JSON.parse(localStorage[localStorage['loginUsername'] + '_allowSMSFrom']);
    console.log(autoComplete);
  } catch (err) {
    console.log(err);
  }

  $(element).catcomplete({ source: autoComplete });
}

function showLogin() {
  hide();
  hideMenu();
  $('#blockLogin').fadeIn(400);

  // If there is already a saved username we fill in the field with the username and then set the focus on the password field
  if ( localStorage["loginUsername"] != null ) {
    $('#username').val(localStorage["loginUsername"]);
    $('#password').focus();
  } else {
    $('input:visible:enabled:first').focus();
  }
  return false;
}

function showBook() {
  hide();
  showMenu();
  $("#menuBook").addClass("active");
  $('#blockBook').fadeIn(400);
  // This will fetch the contacts if we don't already have them
  displayContacts();
  return false;
}

function showRecent() {
  hide();
  showMenu();
  $('#blockRecent').fadeIn(400);

  displayRecent();
  return false;
}


function hideMenu() {
  $('#mainMenu').hide();
  $('#subMenu').hide();
  return false;
}

function showMenu() {
  $('#mainMenu').show();
  $('#subMenu').show();
  setBanner();
}

function showSettings(settings) {
  hide();
  showMenu();

  // If you pass a 0 to this function we will only show the user prefs and not the global settings
  // This is used on the inital setup to force users to pick an extension
  if (settings === 0) {
    $('#settings').hide();
  } else {
    $('#settings').show();
  }

  // Show the block and update the menu
  $('#blockSettings').fadeIn(400);
  $("#menuSettings").addClass("active");

  if ( localStorage[localStorage['loginUsername'] + '_notifyTime'] == null) {
    localStorage[localStorage['loginUsername'] + '_notifyTime'] = "10";
  }

  if ( localStorage[localStorage['loginUsername'] + '_prefCallNotify'] == null ) {
    localStorage[localStorage['loginUsername'] + '_prefCallNotify'] = 1;
  }

  if ( localStorage[localStorage['loginUsername'] + '_prefSmsNotify'] == null ) {
    localStorage[localStorage['loginUsername'] + '_prefSmsNotify'] = 1;
  }
  // Get all customers on account
  getCustomers();
  // Get all extensions on account
  getExtensions();
  // Get account infomation like company name etc
  getInfo();
  // Lets restore all the user settings
  restoreSettings();
  // Get credit status
  getCredit();

  return false;
}

// Function used to get params from the URL
function getUrlParams() {
    var params = {};
    window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi,
function (str, key, value) {
    params[key] = value;
});
    return params;
}

// This function hides eveything, ready for new blocks to be displayed
function hide() {
  $('#splashScreen').hide();
  $('#blockLogin').hide();
  $('#blockSettings').hide();
  $('#blockDialer').hide();
  $('#blockSMS').hide();
  $('#blockWelcome').hide();
  $('#blockBook').hide();
  $('#blockRecent').hide();
  $('#blockSMSThread').hide();

  // Reset menu active classes
  $("#menuDialer").removeClass("active");
  $("#menuMessages").removeClass("active");
  $("#menuSettings").removeClass("active");
  $("#menuBook").removeClass("active");
  return false;
}

// Gets settings from local storage and displays the values back to the user in the settings block
function restoreSettings() {
  // Set the current customer if one is set
  if ( localStorage[localStorage['loginUsername'] + '_prefMainCustomer'] != null) {
  	$("select option[value='" + localStorage[localStorage['loginUsername'] + '_prefMainCustomer'] + "']").attr("selected","selected");
  }
  // Set the current extension if one is set
  if ( localStorage[localStorage['loginUsername'] + '_prefMainExtension'] != null) {
  	$("select option[value='" + localStorage[localStorage['loginUsername'] + '_prefMainExtension'] + "']").attr("selected","selected");
  }

  // Check if the clicable numbers feature is enabled, then set the relevent buttons
  if ( localStorage[localStorage['loginUsername'] + '_prefEnableClickable'] == 1 ) {
    $('#clickableOn').addClass('btn-info');
    $('#clickableOff').removeClass('btn-info');
  } else {
    $('#clickableOff').addClass('btn-info');
    $('#clickableOn').removeClass('btn-info');
  }

  // Check if auto update phonebook feature is enabled, then set the relevent buttons
  if ( localStorage[localStorage['loginUsername'] + '_prefAutoUpdatePhonebook'] == 1 ) {
    $('#autoUpdateOn').addClass('btn-info');
    $('#autoUpdateOff').removeClass('btn-info');
  } else {
    $('#autoUpdateOff').addClass('btn-info');
    $('#autoUpdateOn').removeClass('btn-info');
  }

}

// Saves users settings on the settings block
function saveSettings() {
  // User must set an extension before they can save.
	if ( $('#extensions').val() != "notset" ) {
    var extension = $('#extensions').val();
    
    var customerId = $('#customers').val();
    var shortNumber = localStorage[localStorage['loginUsername'] + '_' + $('#extensions').val()];

    var selectedExtension = JSON.parse(localStorage[localStorage['loginUsername'] + '_localExtensions']).find(x => x.value === shortNumber);
    
    localStorage[localStorage['loginUsername'] + '_prefMainCustomer'] = customerId;
   
    localStorage[localStorage['loginUsername'] + '_prefMainExtension'] = extension;
    localStorage[localStorage['loginUsername'] + '_prefMainExtensionShort'] = shortNumber;
    localStorage[localStorage['loginUsername'] + '_prefMainExtensionDefaultCallerId'] = selectedExtension.defaultCallerId;

    // Set up is done, so we set the _loginSetup value to done
    localStorage[localStorage['loginUsername'] + "_loginSetup"] = 'done';
    showAlert("alert-info", "Settings Saved!", "1000");
    // This takes the user back to dialer after they have saved there settings
    setTimeout(function(){ showDialer(); },1500);
	} else {
    showAlert("alert-error", "Please select an extension!");
  }
  return false;
}

// Lets try and login the user on the login block
function login() {
  // We won't try and do the login if the login button is set to disabled
  if ($('#login.disabled').length == false) {
    // Get values from form
    var username = $('#username').val();
    var password = $('#password').val();
    // Add the disabled state to stop users from loging in again while we are checking them
    $("#login").addClass("disabled");

    // Start http request
    // We can use this URL to check if the auth is valid
    var url = localStorage['baseURL'] + '/customers/me';
    var xmlhttp = new XMLHttpRequest();
    // This opens the request with username and password
    xmlhttp.open("HEAD", url, false);
    var auth = window.btoa(username + ":" + password);
    xmlhttp.setRequestHeader('Authorization', 'Basic ' + auth);

    // We wait untill something happens
    xmlhttp.onreadystatechange=function() {
      if (xmlhttp.readyState==4) {
        console.log(xmlhttp.getAllResponseHeaders())
        // If we get a 200 that means the credentials are correct
        if (xmlhttp.status === 200) {
          // So we save the username and password as they are correct
          storeLogin(username, password);
          // set default customer as /me if it has not been set
          if (!localStorage[username + '_prefMainCustomer']) {
            localStorage[username + '_prefMainCustomer'] = 'me';
          }

          // Get background page to connect to stream
          notifyConnect();

          // If they have completed the inital setup for that user we take them directly to the dialer block
          if ( localStorage[localStorage['loginUsername'] + "_loginSetup"] == "done") {
            // revalidate extensions before showing dialer
            getExtensions(getCustomerId(), showDialer);
            getContacts(1);
          } else {
            // If they have not we force them to setup their settings
            localStorage[localStorage['loginUsername'] + '_prefEnableClickable'] = 1;
            showSettings(0);
            // We hide the menu to prevent the user from clicking off
            hideMenu();
            getContacts(1);
          }
        } else {
          // If we get anything apart from a 200 we assume the login was incorrect
          console.log("Auth error! (Or some other error)");
          showAlert("alert-error", "Check username and password!");
          // As they need to try again we remove the diabled class on the login button
          setTimeout(function(){ $("#login").removeClass("disabled"); },1000);
          $("#login").bind('click');
        }
      }
    }
    // This sends the actual request to the server, but we are not posting any data so we send null
    xmlhttp.send(null);
  }
  return false;
}

function storeLogin(username, password) {
  // Store login credentials
  localStorage['loginUsername'] = username;
  localStorage['loginPassword'] = password;

  // Update valid login
  localStorage['loginValid'] = 'true';
}

function logout() {
  // Change login valid to null to force the user to login when they next load the extension
  localStorage['loginValid'] = null;
  // Wipe the password from the localstorage, but we keep the username as we need it when they login again
  localStorage['loginPassword'] = null;

  // We send another request to force Chrome to not cache the username and password otherwise it remembers it after logoff!
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("HEAD", localStorage['baseURL'], false, localStorage["loginUsername"], null);
  xmlhttp.send(null);

  // Kill websockets stream
  chrome.extension.sendMessage('killStream');

  // Let the user know and force the window to close or things will go wrong!
  showAlert("alert-info", "Logging out.");
  // Set time out is used so the user sees the logged out message
  setTimeout(function(){ window.close(); },1500);

}

// This is called when the user clicks the reset button on the settings block
function resetSettings() {
  // We first change the button to btn-danger and change the text to make sure the user wants to do this
  if ($('#reset.btn-danger').length) {
    // Clears localstorage
    var updateWelcome = localStorage['updateWelcome'];
    localStorage.clear();
    localStorage['updateWelcome'] = updateWelcome;
    // Quit the window as we don't need it anymore
    setTimeout(function(){ window.close(); },500);
  } else {
    $('#reset').addClass('btn-danger');
    $('#resetInfo').addClass('text-error');
    $('#resetInfo').text('Are you sure!?');

    // If they don't click the button within 4 seconds we reset back to normal state
    setTimeout(function(){
      $('#reset').removeClass('btn-danger');
      $('#resetInfo').removeClass('text-error');
      $('#resetInfo').text('This will reset all data!');
    },4000);
  }
}

function showAlert(type, message, time) {
  if (time == null) {
    // If message time is not set we set a default of 2 seconds
    time = 2000;
  }
  $('#notification').text("");
  $('#notification').fadeIn(400);
  $('#notification').append($("<div class='alert " + type + " fade in'>" + message + "</div>"));
  setTimeout(function(){ $('#notification').fadeOut(400); },time);
}

// This alert function is the same as above but only for the edit contact modal
function showContactAlert(type, message, time) {
  if (time == null) {
    time = 2000;
  }
  $('#contactModalNotification').text("");
  $('#contactModalNotification').fadeIn(400);
  $('#contactModalNotification').append($("<div class='alert " + type + " fade in'>" + message + "</div>"));
  setTimeout(function(){ $('#contactModalNotification').fadeOut(400); },time);
  return false;
}

// This alert function is the same as above but only for the edit contact modal
function showSMSAlert(type, message, time) {
  if (time == null) {
    time = 4000;
  }
  $('#newSMSModalNotification').text("");
  $('#newSMSModalNotification').fadeIn(400);
  $('#newSMSModalNotification').append($("<div class='alert " + type + " fade in'><small>" + message + "</small></div>"));
  setTimeout(function(){ $('#newSMSModalNotification').fadeOut(400); },time);
  return false;
}

// This is called when the user clicks on the dial button in the dial block
function dial() {
  // We check the diabled status of the button first to stop lots of requests to api and extension
  if ($('#dial.disabled').length == false) {
    $("#dial").addClass("disabled");
    // We let the user click the button again after 3 seconds
    setTimeout(function(){ $("#dial").removeClass("disabled"); },3000);
    // Get number from form
    var call = $('#dialerNumber').val();

    if (call == 'enablelog') {
      $('#dialerNumber').val('');
      localStorage['logging'] = 'true';
      return false;
    }
    if (call == 'disablelog') {
      $('#dialerNumber').val('');
      localStorage.removeItem('logging');
      return false;
    }

    if (document.getElementById('dialerWithhold').checked) {
      var withhold = 1;
    } else {
      var withhold = 0;
    }

    var selectedCallerId = $('#callerIdPicker').val();
    // We send the number to the background page (background.js) as we use this in some other places as well
    chrome.extension.sendMessage({number: call, numberHold: withhold, callerId: selectedCallerId}, function(response) {
      // Status is the numeric code of the request
      status = response[0];
      // The mesage contains any validation errors etc
      message = response[1];

      // Remove the error class on the number field just in case it was left over
      $('#dialerNumberGroup').removeClass('error');

      // Call was successful if we get a 200, a 201 status is if something was created as well like a live call status, at the moment the API does not have this
      if (status == 200 || status == 201) {
        // Tell the user they should pick up there phone
        showAlert("alert-info", "Pickup your extension...", "6000");
      } else if (status == 401) {
        // We get a 401 if there was a problem with auth, and force the user to login again
        showAlert("alert-error", "<small><strong>401!</strong> Auth Denied!</small>");
        setTimeout(function(){ showLogin(); },3000);
      } else if (status == 400) {
        // If we get a 400 it is most likely a validation error so we display a message to the user
        showAlert("alert-error", "<small><strong>Error!</strong> " + message.message + "</small>");

        // If we have validation errors, select the field that contains the error to alert the user
        for (var i = 0; i < message.validationErrors.length; i++) {
          var item = message.validationErrors[i].field;
          if (item == 'to') {
            $('#dialerNumberGroup').addClass('error');
          }
        }

      } else {
        // A catch all to handle any other problems
        showAlert("alert-error", "<small><strong>Oh snap!</strong>" + status + " Something went wrong!</small>");
      }
    });
  }
  return false;
}

/**
 * Lets get all extensions the user can set
 * @param {string?} customerId
 * @param {Function?} cb runs after extensions have been fetched
 */
function getExtensions(customerId = getCustomerId(), cb = function(){}) {
  // Set up a new array to store the extensions
  var localExtensions = [];

  // Remove any existing options
  $('#extensions').find('option').remove();
  // Add the default "Extension" option
  $('#extensions').append($("<option></option>").attr("value","notset").text("Extension"));

  var handle = new Request("/customers/"+customerId+"/endpoints");

  handle.params['type'] = "Phone";
  handle.pageSize(200);

  handle.loading(function(state){
    loadingState(state);
  });

  handle.success(function(response, status){

    for (i in response['items']) {
      var item = response['items'][i];

      lable = item['name'] + ' - ' + item['shortNumber'];
      value = item['shortNumber'];
      localExtensions.push({label: lable, value: value, category: "Extensions", defaultCallerId: item['defaultCallerId']});

      localStorage[localStorage['loginUsername'] + '_' + item['uri']] = item['shortNumber'];

      if (!item['readOnly']) {
        var newItem = $("<option></option>").attr("value",item['uri']).text(item['shortNumber'] + " - " + item['name']);
	      if (item['uri'] == localStorage[localStorage['loginUsername'] + '_prefMainExtension']) {
          newItem.attr("selected", "selected");
          // update selected extension properties
          localStorage[localStorage['loginUsername'] + '_prefMainExtensionDefaultCallerId'] = item['defaultCallerId'];
          localStorage[localStorage['loginUsername'] + '_prefMainExtensionShort'] = item['shortNumber'];
        }
        $('#extensions').append(newItem);
      }
    }

    localStorage[localStorage['loginUsername'] + '_localExtensions'] = JSON.stringify(localExtensions);
    cb();
  });

  handle.go();

  return false;
}

// Lets get all customers the user can set
// limited to first 200 results
function getCustomers() {
  // Set up a new array to store the extensions
  var localCustomers = [];

  // Remove any existing options
  $('#customers').find('option').remove();
  // Add the default "Extension" option
  $('#customers').append($("<option></option>").attr("value","me").text("Default Customer"));

  var handle = new Request("/customers");
  handle.success(function(response, status){
    for (i in response['items']) {
      var item = response['items'][i];

      label = item['company'];
      if (item['partnerCompany']) {
        label += ' - ' + item['partnerCompany'];
      }
      value = item['id'];
      localCustomers.push({label: label, value: value, category: "Customers"});

      localStorage[localStorage['loginUsername'] + '_' + item['uri']] = item['id'];

        var newItem = $("<option></option>").attr("value",item['id']).text(label);
	      if (item['id'] == localStorage[localStorage['loginUsername'] + '_prefMainCustomer']) {
          newItem.attr("selected", "selected");
        }
        $('#customers').append(newItem);
      }

    localStorage[localStorage['loginUsername'] + '_localCustomers'] = JSON.stringify(localCustomers);
  });

  handle.go();

  return false;
}
// when customer if selected in dropdown, update extension list
function changeCustomer(e){
    var customerId = e.target.value;
    getExtensions(customerId);
}
// helper function for getting customer id from localstorage
function getCustomerId(){
  return localStorage[localStorage['loginUsername'] + '_prefMainCustomer'];
}

function displayRecent() {
  console.log('Display recent');
  getRecent();
}

function getRecent() {

  var handle = new Request("/customers/"+getCustomerId()+"/calls");

  handle.pageSize(200);
  handle.params['includeLocal'] = true;

  handle.failed(function(response, status){
    console.log(response);
  });

  handle.loading(function(state){
    loadingState(state);
  });

  handle.success(function(response, status){

    var items = response['items'];

    $("#tableRecent tr").remove();

    for (var item in items) {

      var item = items[item];

      date = new Date(item['callStarted']);
      from = item['from'].replace(/.*\<|\>/gi,'');
      to = item['to'].replace(/.*\<|\>/gi,'');
      status = item['outcome'];

      // if ( item['links']['recordings'] ) {
      //   recording = item['links']['recordings'];
      //   console.log(recording);
      // } else {
      //   console.log('No recording');
      // }

      if (status == "answered" || status == "ANSWERED") {
        status = '<span class="label label-info right">Answered</span>';
      } else if (status == "busy" || status == "BUSY") {
        status = '<span class="label right">Busy</span>';
      } else if (status == "no-answer" || status == "NO_ANSWER") {
        status = '<span class="label right">No Answer</span>';
      } else if (status == "failed" || status == "FAILED") {
        status = '<span class="label label-important right">Failed</span>';
      } else {
        status = '<span class="label right">' + status + '</span>';
      }

      if (from != localStorage[localStorage['loginUsername'] + '_prefMainExtensionShort']) {
        from = '<a class="mutedLink" href="?number=' + from + '">' + from + '</a>';
      }
      if (to != localStorage[localStorage['loginUsername'] + '_prefMainExtensionShort']) {
        to = '<a class="mutedLink" href="?number=' + to + '">' + to + '</a>';
      }

      if (to == localStorage[localStorage['loginUsername'] + '_prefMainExtensionShort'] || from == localStorage[localStorage['loginUsername'] + '_prefMainExtensionShort']) {
        $('#tableRecent').append('<tr><td><small>' + from + ' <i class="icon-arrow-right"></i> ' + to + '<br /><span class="muted">' + moment(date).format('HH:mm ddd Do') + '</span>' + status + '</small></td></tr>');
      }

    }

  });

  handle.go();

}

function getCredit() {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", localStorage['baseURL'] + '/customers/'+getCustomerId()+'/creditstatus', false);
  var auth = window.btoa(localStorage["loginUsername"] + ":" + localStorage["loginPassword"]);
  xmlhttp.setRequestHeader('Authorization', 'Basic ' + auth);
  xmlhttp.onreadystatechange=function() {
    if (xmlhttp.readyState == 4) {
      if (xmlhttp.status === 200) {
        obj = JSON.parse(xmlhttp.responseText);
        if (obj.accountType == 'prepaid') {
          localStorage[localStorage['loginUsername'] + '_credit'] = obj.creditRemaining;
        }
      }
    }
  }
  xmlhttp.send(null);
}

function searchContact(number) {
  try {
    contacts = localStorage[localStorage['loginUsername'] + '_contacts'];
    obj = JSON.parse(contacts);
    for (item in obj) {
      if (number == obj[item].phoneNumber) {
        return obj[item].name;
      }
    }
  } catch(err) {
    return;
  }
}

function getSMSMessages() {

  smsMessages = [];

  url = localStorage['baseURL'] + '/customers/'+getCustomerId()+'/sms?pageSize=200&page=1';
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", url, false);
  var auth = window.btoa(localStorage["loginUsername"] + ":" + localStorage["loginPassword"]);
  xmlhttp.setRequestHeader('Authorization', 'Basic ' + auth);
  xmlhttp.onreadystatechange=function() {
    if (xmlhttp.readyState == 4) {
      if (xmlhttp.status === 200) {
        obj = JSON.parse(xmlhttp.responseText);
        localStorage[localStorage['loginUsername'] + '_smsTotal'] = obj.totalItems;
        smsMessages = obj.items
      }
    }
  }
  xmlhttp.send(null);

  if (JSON.stringify(smsMessages) == "[]") {
    localStorage[localStorage['loginUsername'] + '_smsMessages'] = "";
  } else {
    localStorage[localStorage['loginUsername'] + '_smsMessages'] = JSON.stringify(smsMessages);
  }

  // Array for storing displayed numbers
  smsThreads = [];

  if (JSON.stringify(smsMessages) != "[]") {

    // Clear table rows
    $("#blockSMSTable tr").remove();

    for (var message in smsMessages) {
      to = smsMessages[message]['to'];
      from = smsMessages[message]['from'];
      date = new Date(smsMessages[message]['created']);
      direction = smsMessages[message]['direction'];
      body = smsMessages[message]['body'];

      if (to.indexOf("44") == 0) { to = '0'.concat(to.substr(2)) }
      if (from.indexOf("44") == 0) { from = '0'.concat(from.substr(2)) }
      if (direction.toUpperCase() == 'IN') { number = from } else if (direction.toUpperCase() == 'OUT') { number = to }
      if (body == "" || body == undefined || body == "null") { body = 'Message Empty.' }

      if (jQuery.inArray(number, smsThreads) !== -1) {
        // Number message has already been displayed for this number.
      } else {
        // Add number to threads array so we don't display another message for this number
        smsThreads.push(number); //smsThreads.push(from);
        var name = searchContact(number);
        if (name != null) {
          $('#blockSMSTable').append('<tr><td><small><a href="?smsThread=' + number + '"">' + name + '</a><span class="right smsDate">' + moment(date).format('HH:mm ddd Do MMM') + '</span><br />' + body + '</small></td></tr>');
        } else {
          $('#blockSMSTable').append('<tr><td><small><a href="?smsThread=' + number + '"">' + number + '</a><span class="right smsDate">' + moment(date).format('HH:mm ddd Do MMM') + '</span><br />' + body + '</small></td></tr>');
        }
      }
    }

  }
}

function showSMSMessages() {
  hide();
  showMenu();
  getSMSMessages();

  $('#blockSMS').fadeIn(400);
  $("#menuMessages").addClass("active");
}

function showSMSThread(threadNumber) {
  hide();
  showMenu();
  $('#blockSMSThread').fadeIn(400);
  $('#threadNumber').text(threadNumber);

  data = JSON.parse(localStorage[localStorage['loginUsername'] + '_smsMessages']);

  smsTo = threadNumber;

  // Clear table rows
  $("#smsMessageTableBody tr").remove();

  smsMessages = [];
  for (var message in data) {
    smsMessages.unshift(data[message]);
  }

  for (var message in smsMessages) {
    to = smsMessages[message]['to'];
    from = smsMessages[message]['from'];
    date = new Date(smsMessages[message]['created']);
    direction = smsMessages[message]['direction'];
    body = smsMessages[message]['body'];

    if (to.indexOf("44") == 0) { to = '0'.concat(to.substr(2)) }
    if (from.indexOf("44") == 0) { from = '0'.concat(from.substr(2)) }
    if (direction.toUpperCase() == 'IN') {
      number = from; flag = '<i class="icon-arrow-left"></i>';
    } else if (direction.toUpperCase() == 'OUT') {
      number = to; flag = '<i class="icon-arrow-right"></i>';
    }
    if (body == "" || body == undefined || body == "null") { body = 'Message Empty.' }

    if (number == threadNumber) {
      $('#smsMessageTableBody').append('<tr><td><small><span class="smsDate">' + moment(date).format('HH:mm ddd Do MMM') + '</span><span class="right">' + flag + '</span><br /><span class="break-word">' + body + '</span></small></td></tr>');
      if (direction.toUpperCase() == 'IN') { smsFrom = to; } else if (direction.toUpperCase() == 'OUT') { smsFrom = from; }
      //$('#smsThreadFrom').text("Will be sent from " + smsFrom);
    }
  }

  // Scroll to the bottom of the table
  $("#SMSThreadTableWrapper").scrollTop($("#SMSThreadTableWrapper")[0].scrollHeight);

  getOutgoingNumbers();
  obj = JSON.parse(localStorage[localStorage['loginUsername'] + '_allowSMSFrom']);
  if (!obj[0]) {
    $('#SMSThreadReplyMessage').prop('disabled', true);
    $('#SMSThreadReplySend').addClass('disabled');
  }

  var $remaining = $('#SMSThreadReplyInfo'),
    $messages = $remaining.next();

  $('#SMSThreadReplyMessage').keyup(function(){
    var chars = this.value.length,
    messages = Math.ceil(chars / 160),
    remaining = messages * 160 - (chars % (messages * 160) || messages * 160);
    if (messages == 1) { text = 'message' } else { text = 'messages' }
    $remaining.text('(' + remaining + ') ' + messages + ' ' + text + ' will be sent from "' + smsFrom + '"');
  });

}

function showNewSMS() {
  // Clear stuff
  $('#smsNumber').val('');
  $('#smsMessage').val('');
  $('#smsNumber').attr('maxlength','15');

  // Get allowed outgoing SMS numbers
  getOutgoingNumbers();

  // SMS From newSMSFrom
  obj = JSON.parse(localStorage[localStorage['loginUsername'] + '_allowSMSFrom']);
  if (obj[0]) {
    $('#newSMSFrom').find('option').remove();
    //$('#newSMSFrom').append($("<option></option>").text("From"));
    for (var item in obj) {
      $('#newSMSFrom')
        .append($("<option></option>")
        .attr("value",(obj[item].label))
        .text(obj[item].label));
    }

    // Display the modal
    $('#newSMSModal').modal('show');

    var $remaining = $('#smsCost'),
      $messages = $remaining.next();

    $('#smsMessage').keyup(function(){
      var chars = this.value.length,
      messages = Math.ceil(chars / 160),
      remaining = messages * 160 - (chars % (messages * 160) || messages * 160);
      if (messages == 1) { text = 'message' } else { text = 'messages' }
      $remaining.text(messages + ' ' + text + ' will be sent (' + remaining + ')');
    });

    // Setup autocomplete on fields
    numbersAutoComplete("#smsNumber", false, true);

  } else {
    $('#newSMSModalNoNumbers').modal('show');
  }

  return false;
}

function getOutgoingNumbers(type) {
  var allowCalls = [];
  var allowSMS = [];

  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", localStorage['baseURL'] + '/customers/'+getCustomerId()+'/outgoingcallerids?pageSize=200', false);
  var auth = window.btoa(localStorage["loginUsername"] + ":" + localStorage["loginPassword"]);
  xmlhttp.setRequestHeader('Authorization', 'Basic ' + auth);
  xmlhttp.onreadystatechange=function() {
    if (xmlhttp.readyState==4) {
      if (xmlhttp.status === 200) {
        obj = JSON.parse(xmlhttp.responseText);

         // Remove any existing options
        $('#callerIdPicker').find('option').remove();

        // Add Anonymous option to the start
        var anonymousCLI = $("<option></option>").attr("value","").text("Anonymous").attr("selected", "selected");
        $('#callerIdPicker').append(anonymousCLI);
        localStorage[localStorage['loginUsername'] + '_outgoingCallerIds'] = JSON.stringify(obj.items);

        for (var i in obj.items) {
          const itemObj = obj.items[i];
          var label = itemObj.number;
          var value = itemObj.number;

          if (itemObj.allowCalls == true) {
            allowCalls.push({label: label, value: value, category: "Numbers"});

            var newItem = $("<option></option>").attr("value",itemObj['uri']).text(label);

            if (itemObj.uri == localStorage[localStorage['loginUsername'] + '_prefMainExtensionDefaultCallerId']) {
              newItem.attr("selected", "selected");
              // deselect anonymous as we have a default cli
              anonymousCLI.attr("selected", null);
            }
            $('#callerIdPicker').append(newItem);
          }

          if (itemObj.allowSms) {
            allowSMS.push({label: label, value: value, category: "SMS Enabled"});
          }
        }
      }
    }
  }
  xmlhttp.send(null);

  // Store the names and short numbers in localstorage
  localStorage[localStorage['loginUsername'] + '_allowCallsFrom'] = JSON.stringify(allowCalls);
  localStorage[localStorage['loginUsername'] + '_allowSMSFrom'] = JSON.stringify(allowSMS);

}

function quickSMSSend() {

  if ($('#SMSThreadReplySend.disabled').length == false) {
    $("#SMSThreadReplySend").addClass("disabled");
    setTimeout(function(){ $("#SMSThreadReplySend").removeClass("disabled"); },3000);

    var message = $('#SMSThreadReplyMessage').val();

    if (message == "") {
      quickSMSNotification('Message Empty!');
    } else {
      // Send request to background page, just like the dial request, but with more values
      chrome.extension.sendMessage({sms: smsTo, message: message, from: smsFrom}, function(response) {
        status = response[0];
        message = response[1];

        if (status == 200 || status == 201) {
          $('#SMSThreadReplyMessage').val('');
          $('#SMSThreadReplyMessage').focus();
          quickSMSNotification('Message Sent.');
          getSMSMessages();
          setTimeout(function(){ showSMSThread(smsTo); },2000);

        } else if (status == 401) {
          quickSMSNotification('Auth Denied.');
          setTimeout(function(){ showLogin(); },3000);
        } else {
          quickSMSNotification('Error! Something went wrong.');
        }
      });
  }
  }
  return false;

}

function quickSMSNotification(message) {
  $('#SMSThreadReplyInfo').text(message);
  setTimeout(function(){ $('#SMSThreadReplyInfo').text(''); }, 3000);
}

function newSMSSend() {

  if ($('#newSMSSend.disabled').length == false) {
    $("#newSMSSend").addClass("disabled");
    setTimeout(function(){ $("#newSMSSend").removeClass("disabled"); },3000);

    // Get values from form
    var to = $('#smsNumber').val();
    var message = $('#smsMessage').val();
    var from = $('#newSMSFrom').val();

    error = null;

    $('#smsNumberGroup').removeClass('error');
    $('#smsFromGroup').removeClass('error');
    $('#smsMessageGroup').removeClass('error');

    if (to == "") {
      $('#smsNumberGroup').addClass('error');
      showSMSAlert("alert-error", "Please fill in all required fields!");
      error = true;
    } else if (from == "") {
      $('#smsFromGroup').addClass('error');
      showSMSAlert("alert-error", "Please fill in all required fields!");
      error = true;
    } else if (message == "") {
      $('#smsMessageGroup').addClass('error');
      showSMSAlert("alert-error", "Please fill in all required fields!");
      error = true;
    }

    // Send request to background page, just like the dial request, but with more values
    if (error != true) {
      chrome.extension.sendMessage({sms: to, message: message, from: from}, function(response) {
        status = response[0];
        message = response[1];

        if (status == 200 || status == 201) {
          showSMSAlert("alert-info", "SMS Message sent");
          $('#smsNumber').val("");
          $('#smsMessage').val("");
          $('#smsCost').text("");
          $('#smsNumber').focus();

          localStorage[localStorage['loginUsername'] + '_smsFrom'] = from;

        } else if (status == 401) {
          showSMSAlert("alert-error", "<strong>401!</strong> Auth Denied!");
          setTimeout(function(){ showLogin(); },3000);
        } else if (status == 400) {
          showSMSAlert("alert-error", "<strong>Error!</strong> " + message.message);

          for (var i = 0; i < message.validationErrors.length; i++) {
            var item = message.validationErrors[i].field;
            console.log(item);
            if (item == 'to') {
              $('#smsNumberGroup').addClass('error');
            }
            if (item == 'from') {
              $('#smsFromGroup').addClass('error');
            }
            if (item == 'message') {
              $('#smsMessageGroup').addClass('error');
            }
          }
        } else {
          showSMSAlert("alert-error", "<strong>Oh snap!</strong> Something went wrong!");
        }
      });
    }
  }
  return false;
}

function displayContacts(force, callback) {

  getContacts(force, callback);
  $("#tableContacts tr").remove();

  if (localStorage[localStorage['loginUsername'] + '_contactsTotal'] != null) {
    $('#contactCount').text(localStorage[localStorage['loginUsername'] + '_contactsTotal']);
  }

  if (localStorage[localStorage['loginUsername'] + '_contacts'] != "") {
    contacts = JSON.parse(localStorage[localStorage['loginUsername'] + '_contacts']);
    for (i=0; i < contacts.length; i++) {
      var name = contacts[i].name;
      var phoneNumber = contacts[i].phoneNumber;
      var speedDial = contacts[i].speedDial;
      var uri = contacts[i].uri;

      if (speedDial != null) {
        $('#tableContacts').append('<tr><td><small>' + name + '<br /><a href="?number=' + phoneNumber + '">' + phoneNumber + '</a><span class="muted"> *0' + speedDial + '</span></small></td><td><a href="?contact=' + uri + '" class="btn btn-mini pull-right" type="button"><i class="icon-pencil"></i></a><a id="smsSpacer" href="?sms=' + phoneNumber + '" class="btn btn-mini pull-right" type="button"><i class="icon-envelope"></i></a></td></tr>');
      } else {
        $('#tableContacts').append('<tr><td><small>' + name + '<br /><a href="?number=' + phoneNumber + '">' + phoneNumber + '</a></small></td><td><a href="?contact=' + uri + '" class="btn btn-mini pull-right" type="button"><i class="icon-pencil"></i></a><a id="smsSpacer" href="?sms=' + phoneNumber + '" class="btn btn-mini pull-right" type="button"><i class="icon-envelope"></i></a></td></tr>');
      }
    }
  } else {
    name = 'Nimvelo';
    phoneNumber = '01212854400';
    $('#tableContacts').append('<tr><td><small>' + name + '<br /><a href="?number=' + phoneNumber + '">' + phoneNumber + '</a></small></td><td><a href="?sms=' + phoneNumber + '" class="btn btn-mini pull-right" type="button"><i class="icon-envelope"></i></a></td></tr>');
  }
}

function getContacts(force, callback) {

  var contactsLastUpdate = localStorage[localStorage['loginUsername'] + '_contactsLastUpdate'];
  var epoc = new Date().getTime() / 1000;
  if (contactsLastUpdate == null) { contactsLastUpdate = 0; }
  var limit = parseFloat(contactsLastUpdate) + 150;

  if (limit == null) {
    limit = 0;
  }
  if (limit < epoc || force == 1) {
    $('#contactsRefresh').addClass('disabled');



    setTimeout(function() {
      $('#contactsRefresh').removeClass('disabled');
      if (typeof callback === 'function') {
        callback();
      }
    }, 2000);
    contacts = [];
    url = localStorage['baseURL'] + "/customers/"+getCustomerId()+"/phonebook?pageSize=200&page=1";
    getContactsPage(url);
    storeContacts();
  }
}

function getContactsPage(url) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", url, false);
  var auth = window.btoa(localStorage["loginUsername"] + ":" + localStorage["loginPassword"]);
  xmlhttp.setRequestHeader('Authorization', 'Basic ' + auth);
  xmlhttp.onreadystatechange=function() {
    if (xmlhttp.readyState == 4) {
      if (xmlhttp.status === 200) {
        obj = JSON.parse(xmlhttp.responseText);
        localStorage[localStorage['loginUsername'] + '_contactsTotal'] = obj.totalItems;
        contacts.push.apply(contacts, obj.items);

        if (obj.nextPage) {
          url = obj.nextPage;
          getContactsPage(url);
        }
      }
    }
  }
  xmlhttp.send(null);
}

function storeContacts() {
  if (JSON.stringify(contacts) == "[]") {
    localStorage[localStorage['loginUsername'] + '_contacts'] = "";
  } else {
    localStorage[localStorage['loginUsername'] + '_contacts'] = JSON.stringify(contacts);
  }
  localStorage[localStorage['loginUsername'] + '_contactsLastUpdate'] = new Date().getTime() / 1000;
}

function notifyModal() {
  $('#notifyTimeInputGroup').removeClass('error');
  $('#notifyModal').modal('show');

  if (localStorage[localStorage['loginUsername'] + '_notificationConnection'] == "true") {
    $('#notifyStatus').text('Connected');
    $('#notifyStatus').addClass('disabled');
  } else {
    $('#notifyStatus').text('Not Connected');
    $('#notifyStatus').removeClass('disabled');
  }

  if ( localStorage[localStorage['loginUsername'] + '_notifyTime'] != "" ) {
    $('#notifyTimeInput').val(localStorage[localStorage['loginUsername'] + '_notifyTime']);
  }

  if ( localStorage[localStorage['loginUsername'] + '_prefCallNotify'] == 1 ) {
    $('#callNotifyOn').addClass('btn-info');
    $('#callNotifyOff').removeClass('btn-info');
  } else {
    $('#callNotifyOff').addClass('btn-info');
    $('#callNotifyOn').removeClass('btn-info');
  }

  if ( localStorage[localStorage['loginUsername'] + '_prefSmsNotify'] == 1 ) {
    $('#smsNotifyOn').addClass('btn-info');
    $('#smsNotifyOff').removeClass('btn-info');
  } else {
    $('#smsNotifyOff').addClass('btn-info');
    $('#smsNotifyOn').removeClass('btn-info');
  }

  if ( localStorage[localStorage['loginUsername'] + '_prefCallLookupURL'] != "" ) {
    $('#callLookupURL').val(localStorage[localStorage['loginUsername'] + '_prefCallLookupURL']);
  }

  $('#callLookupURL').keyup(function(){
    var callerID = '0123456789';
    var url = $('#callLookupURL').val();
    var sample = url.replace("[callerid]",callerID);
    $('#sampleLookupURL').text(sample);
  });

}

function notifyConnect() {
  chrome.extension.sendMessage({connectStream: '1'});
}

function notifySave() {

  var notifyTime = $('#notifyTimeInput').val();
  if ( notifyTime >= 1 && notifyTime <= 20 || !notifyTime) {
    var url = $('#callLookupURL').val();
    localStorage[localStorage['loginUsername'] + '_prefCallLookupURL'] = url;
    localStorage[localStorage['loginUsername'] + '_notifyTime'] = notifyTime;
    $('#notifyModal').modal('hide');
  } else {
    $('#notifyTimeInputGroup').addClass('error');
  }
}

function callNotify(state){
  if ( state == 'on') {
    $('#callNotifyOn').addClass('btn-info');
    $('#callNotifyOff').removeClass('btn-info');
    localStorage[localStorage['loginUsername'] + '_prefCallNotify'] = 1;
  } else if ( state == 'off' ){
    $('#callNotifyOff').addClass('btn-info');
    $('#callNotifyOn').removeClass('btn-info');
    localStorage[localStorage['loginUsername'] + '_prefCallNotify'] = 0;
  }
}

function smsNotify(state){
  if ( state == 'on') {
    $('#smsNotifyOn').addClass('btn-info');
    $('#smsNotifyOff').removeClass('btn-info');
    localStorage[localStorage['loginUsername'] + '_prefSmsNotify'] = 1;
  } else if ( state == 'off' ){
    $('#smsNotifyOff').addClass('btn-info');
    $('#smsNotifyOn').removeClass('btn-info');
    localStorage[localStorage['loginUsername'] + '_prefSmsNotify'] = 0;
  }
}

function poppingModal() {
  $('#poppingModal').modal('show');

  if ( localStorage[localStorage['loginUsername'] + '_prefCallPop'] == 1 ) {
    $('#callPopOn').addClass('btn-info');
    $('#callPopOff').removeClass('btn-info');
  } else {
    $('#callPopOff').addClass('btn-info');
    $('#callPopOn').removeClass('btn-info');
  }

  if ( localStorage[localStorage['loginUsername'] + '_prefCallPopURL'] != "" ) {
    $('#poppingURL').val(localStorage[localStorage['loginUsername'] + '_prefCallPopURL']);
  }

  $('#poppingURL').keyup(function(){
    var callerID = '0123456789';
    var url = $('#poppingURL').val();
    var sample = url.replace("[callerid]",callerID);
    $('#sampleURL').text(sample);
  });

}

function poppingSave() {
  var url = $('#poppingURL').val();
  localStorage[localStorage['loginUsername'] + '_prefCallPopURL'] = url;
  $('#poppingModal').modal('hide');
}

function callPop(state){
  if ( state == 'on') {
    $('#callPopOn').addClass('btn-info');
    $('#callPopOff').removeClass('btn-info');
    localStorage[localStorage['loginUsername'] + '_prefCallPop'] = 1;
  } else if ( state == 'off' ){
    $('#callPopOff').addClass('btn-info');
    $('#callPopOn').removeClass('btn-info');
    localStorage[localStorage['loginUsername'] + '_prefCallPop'] = 0;
  }
}

function showContact(uri) {
  localStorage[localStorage['loginUsername'] + '_currentContactUri'] = uri;

  $('#contactModalBanner').text('Add Contact');
  $('#contactModal').modal('show');

  $('#contactModalSave').show();
  $('#contactModalDelete').hide();
  $('#contactModalUpdate').hide();

  $('#contactEditNameGroup').removeClass('error');
  $('#contactEditNumberGroup').removeClass('error');
  $('#contactEditSpeedDialGroup').removeClass('error');
  $('#contactEditName').val('');
  $('#contactEditNumber').val('');
  $('#contactEditSpeedDial').val('');

  if (uri != "new") {

    $('#contactModalBanner').text('Edit Contact');

    $('#contactModalSave').hide();
    $('#contactModalDelete').show();
    $('#contactModalUpdate').show();

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", uri, true);
    var auth = window.btoa(localStorage["loginUsername"] + ":" + localStorage["loginPassword"]);
    xmlhttp.setRequestHeader('Authorization', 'Basic ' + auth);
    xmlhttp.onreadystatechange=function() {
      if (xmlhttp.readyState == 4) {
        if (xmlhttp.status === 200) {
          obj = JSON.parse(xmlhttp.responseText);
          $('#contactEditName').val(obj.name);
          $('#contactEditNumber').val(obj.phoneNumber);
          $('#contactEditSpeedDial').val(obj.speedDial);
        }
      }
    }
    xmlhttp.send(null);
  }
}

function hideContact() {
  $('#contactModal').modal('hide');
}

function isNumber (o) {
  return ! isNaN (o-0);
}

function saveContact() {
  editContact("POST");
}

function updateContact() {
  var uri = localStorage[localStorage['loginUsername'] + '_currentContactUri']
  editContact("PUT", uri);
}

function deleteContact() {
  var uri = localStorage[localStorage['loginUsername'] + '_currentContactUri']
  editContact("DELETE", uri);
}

function editContact(method, uri) {
  var name = $('#contactEditName').val();
  var number = $('#contactEditNumber').val();
  var speedDialRaw = $('#contactEditSpeedDial').val();

  if (method == "POST") {
    uri = localStorage['baseURL'] + '/customers/'+getCustomerId()+'/phonebook';
  }

  if (speedDialRaw != null) {
    if (isNumber(speedDialRaw)) {
      var speedDial = parseInt(speedDialRaw);
    } else {
      showContactAlert("alert-error", "<small><strong>Error!</strong> " + "Speed dial must be three digits or less!" + "</small>", 4000);
      return false;
    }
  }

  if (method == "POST") {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open(method, uri, false);
    var auth = window.btoa(localStorage["loginUsername"] + ":" + localStorage["loginPassword"]);
    xmlhttp.setRequestHeader('Authorization', 'Basic ' + auth);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send(JSON.stringify({"type": "phonebookentry","name": name,"phoneNumber": number,"speedDial": speedDial}));

    var status = xmlhttp.status;

    if (status == 200 || status == 201) {
        hideContact();
        showAlert("alert-info", "<small>Contact saved!</small>");
        displayContacts(1);
      } else if (status == 401) {
        hideContact();
        showAlert("alert-error", "<small><strong>401!</strong> Auth Denied!</small>");
        setTimeout(function(){ showLogin(); },3000);
      } else if (status == 400) {
        if (xmlhttp.responseText) {
          var message;
          message = JSON.parse(xmlhttp.responseText);

          showContactAlert("alert-error", "<small><strong>Error!</strong> " + message.message + "</small>", 4000);

          for (var i = 0; i < message.validationErrors.length; i++) {
            var item = message.validationErrors[i].field;
            if (item == 'phoneNumber') {
              $('#contactEditNumberGroup').addClass('error');
            }
            if (item == 'speedDial') {
              $('#contactSpeedDialGroup').addClass('error');
            }
          }
        }

      } else {
        showContactAlert("alert-error", "<small><strong>Oh snap!</strong>" + status + " Something went wrong!</small>");
      }

  } else if (method == "PUT") {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open(method, uri, false);
    var auth = window.btoa(localStorage["loginUsername"] + ":" + localStorage["loginPassword"]);
    xmlhttp.setRequestHeader('Authorization', 'Basic ' + auth);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send(JSON.stringify({"type": "phonebookentry","name": name,"phoneNumber": number,"speedDial": speedDial}));

    var status = xmlhttp.status;

    if (status == 200 || status == 201) {
        hideContact();
        showAlert("alert-info", "<small>Contact updated!</small>");
        displayContacts(1);
      } else if (status == 401) {
        hideContact();
        showAlert("alert-error", "<small><strong>401!</strong> Auth Denied!</small>");
        setTimeout(function(){ showLogin(); },3000);
      } else if (status == 400) {
        if (xmlhttp.responseText) {
          var message;
          message = JSON.parse(xmlhttp.responseText);

          showContactAlert("alert-error", "<small><strong>Error!</strong> " + message.message + "</small>", 4000);

          for (var i = 0; i < message.validationErrors.length; i++) {
            var item = message.validationErrors[i].field;
            if (item == 'phoneNumber') {
              $('#contactEditNumberGroup').addClass('error');
            }
            if (item == 'speedDial') {
              $('#contactSpeedDialGroup').addClass('error');
            }
          }
        }

      } else {
        showContactAlert("alert-error", "<small><strong>Oh snap!</strong>" + status + " Something went wrong!</small>");
      }

  } else if (method == "DELETE") {

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open(method, uri, false);
    var auth = window.btoa(localStorage["loginUsername"] + ":" + localStorage["loginPassword"]);
    xmlhttp.setRequestHeader('Authorization', 'Basic ' + auth);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send(null);

    var status = xmlhttp.status;

    if (status == 204) {
        hideContact();
        showAlert("alert-info", "<small>Contact removed!</small>");
        displayContacts(1);
      } else if (status == 401) {
        hideContact();
        showAlert("alert-error", "<small><strong>401!</strong> Auth Denied!</small>");
        setTimeout(function(){ showLogin(); },3000);
      } else {
        showContactAlert("alert-error", "<small><strong>Oh snap!</strong>" + status + " Something went wrong!</small>");
        displayContacts(1);
      }
  }
}

function clickableOn() {
  localStorage[localStorage['loginUsername'] + '_prefEnableClickable'] = 1;
  $('#clickableOn').addClass('btn-info');
  $('#clickableOff').removeClass('btn-info');
}

function clickableOff() {
  localStorage[localStorage['loginUsername'] + '_prefEnableClickable'] = null;
  $('#clickableOff').addClass('btn-info');
  $('#clickableOn').removeClass('btn-info');
}

function autoUpdateOn() {
  localStorage[localStorage['loginUsername'] + '_prefAutoUpdatePhonebook'] = 1;
  $('#autoUpdateOn').addClass('btn-info');
  $('#autoUpdateOff').removeClass('btn-info');
}

function autoUpdateOff() {
  localStorage[localStorage['loginUsername'] + '_prefAutoUpdatePhonebook'] = null;
  $('#autoUpdateOff').addClass('btn-info');
  $('#autoUpdateOn').removeClass('btn-info');
}

function getInfo() {
  var endpoint = localStorage['baseURL'] + '/customers/'+getCustomerId();
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", endpoint, false);
  var auth = window.btoa(localStorage["loginUsername"] + ":" + localStorage["loginPassword"]);
  xmlhttp.setRequestHeader('Authorization', 'Basic ' + auth);

  xmlhttp.onreadystatechange=function() {
    if (xmlhttp.readyState==4) {
      if (xmlhttp.status === 200) {
        obj = JSON.parse(xmlhttp.responseText);
        localStorage[localStorage['loginUsername'] + "_companyName"] = obj.company;
      }
    }
  }
  xmlhttp.send(null);
  return false;
}

function setBanner() {
  if (localStorage[localStorage['loginUsername'] + "_prefMainExtensionShort"] != null) {
    $("#bannerName").text('Extension #' + localStorage[localStorage['loginUsername'] + "_prefMainExtensionShort"]);
  }
}

function getVersion() {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open('GET', 'manifest.json');
  xmlhttp.onload = function (e) {

      var manifest = JSON.parse(xmlhttp.responseText);
      localStorage['version'] = manifest.version;
      $('#version').text('Version: ' + localStorage['version']);
  }
  xmlhttp.send(null);
}

function openHelp() {
  chrome.tabs.create({'url': 'http://kb.nimvelo.com/category/22-chrome-extension'});
}

$(document).ready(function() {

  // Document has loaded, lets get going...
  console.log("Nimvelo - Hello there!");

  var baseURL = 'https://pbx.sipcentric.com/api/v1';
  localStorage['baseURL'] = baseURL;

  // Lets hide everything after the page has loaded
  hide();

  // Add listeners on buttons using jquery to call various functions
  // Login page listeners
  $('#login').click(login);

  // Settings page listeners
  $('#reset').click(resetSettings);
  $('#save').click(saveSettings);
  $('#clickableOn').click(clickableOn);
  $('#clickableOff').click(clickableOff);
  $('#autoUpdateOn').click(autoUpdateOn);
  $('#autoUpdateOff').click(autoUpdateOff);
  $('#showNotifySettings').click(notifyModal);
  $('#showPoppingSettings').click(poppingModal);
  $('#helpLink').click(openHelp);
  $('#customers').change(changeCustomer);

  // Welcome screen listeners
  $('#welcomeNext').click(showLogin);

  // Dialer screen listeners
  $('#dial').click(dial);

  // Recent listeners
  $('#recent').click(showRecent);
  $('#recentBack').click(showDialer);

  // Phone book listeners
  $('#addContact').click(function(){ showContact('new'); });
  $('#contactsRefresh').click(function(){ if ($('#contactsRefresh.disabled').length == 0) { displayContacts(true); } });

  // Messages screen listeners
  $('#newSMS').click(showNewSMS);
  $('#newSMSSend').click(newSMSSend);
  $('#blockSMSThreadBack').click(showSMSMessages);
  $('#SMSThreadReplySend').click(quickSMSSend);

  $('#SMSThreadReplyMessage').keypress(function(e) { if(e.which == 13) { quickSMSSend(); } });

  // Listeners for menu items
  //$('#menuDialer').click(showDialer);
  $('#menuMessages').click(showSMSMessages);
  $('#menuSettings').click(showSettings);
  $('#menuBook').click(showBook);
  $('#logout').click(logout);

  // Edit contact modal listeners
  $('#contactModalSave').click(saveContact);
  $('#contactModalUpdate').click(updateContact);
  $('#contactModalDelete').click(deleteContact);

  // Hide the edit contact modal
  $('#addContactModal').modal('hide');

  // Notify settings listeners
  $('#notifySave').click(notifySave);
  $('#callNotifyOn').click(function(){ callNotify('on') });
  $('#callNotifyOff').click(function(){ callNotify('off') });
  $('#smsNotifyOn').click(function(){ smsNotify('on') });
  $('#smsNotifyOff').click(function(){ smsNotify('off') });
  $('#notifyStatus').click(notifyConnect);

  // Popping settings listeners
  $('#callPopOn').click(function(){ callPop('on') });
  $('#callPopOff').click(function(){ callPop('off') });
  $('#poppingSave').click(poppingSave);

  // Lets check what we are
  getVersion();

  // We shall set up some global varibles here
  var timeout = null;
  var contacts = [];
  var smsTo = null;
  var smsFrom = null;

  // Get up to date phonebook
  if (localStorage[ localStorage['loginUsername'] + '_prefAutoUpdatePhonebook'] == 1) {
    displayContacts(1, function() {

      // jQuery custom autocomplete
      $.widget( "custom.catcomplete", $.ui.autocomplete, {
        _renderMenu: function( ul, items ) {
          var that = this,
            currentCategory = "";
          $.each( items, function( index, item ) {
            if ( item.category != currentCategory ) {
              ul.append( "<li class='ui-autocomplete-category'>" + item.category + "</li>" );
              currentCategory = item.category;
            }
            that._renderItemData( ul, item );
          });
        }
      });

    });
  }

  // jQuery custom autocomplete
  $.widget( "custom.catcomplete", $.ui.autocomplete, {
    _renderMenu: function( ul, items ) {
      var that = this,
        currentCategory = "";
      $.each( items, function( index, item ) {
        if ( item.category != currentCategory ) {
          ul.append( "<li class='ui-autocomplete-category'>" + item.category + "</li>" );
          currentCategory = item.category;
        }
        that._renderItemData( ul, item );
      });
    }
  });

  // Setup is done...
  // Check if there is a logged in or show welcome
  $('#splashScreen').show();
  if ( localStorage['loginUsername'] == null ) {
    showWelcome();
  } else if ( localStorage["loginValid"] != 'true' ) {
    showLogin();
  } else {
    hideMenu();
    var authUrl = localStorage['baseURL'] + '/customers/me';
    var checkAuth = new XMLHttpRequest();
    // This opens the request with username and password
    checkAuth.open("HEAD", authUrl, false);
    var auth = window.btoa(localStorage['loginUsername'] + ":" + localStorage['loginPassword']);
    checkAuth.setRequestHeader('Authorization', 'Basic ' + auth);
    checkAuth.onreadystatechange=function() {
      if (checkAuth.readyState==4) {
        if (checkAuth.status === 200) {
          if ( localStorage[localStorage['loginUsername'] + '_loginSetup'] == 'done' ) {
            // revalidate extensions before showing dialer
            getExtensions(getCustomerId(), showDialer);
          } else {
            // If the user has not completed the setup take them back to the settings page
            showSettings();
            // Hide menu prevents users from clicking off the page
            hideMenu();
          }
        } else {
          // invalid auth
          localStorage['loginValid'] = null;
          localStorage['loginPassword'] = null;
          showLogin();
        }
      }
    }
    // This sends the actual request to the server, but we are not posting any data so we send null
    checkAuth.send(null);
  }

});
