// Copyright (c) 2010 - 2015 Sipcentric Ltd. Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php

function getUrlParams() {
    var params = {};
    window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi,
	function (str, key, value) {
    	params[key] = value;
	});
    return params;
}

function dial() {

  if ($('#btnDial.disabled').length == false) {

    $("#btnDial").addClass("disabled");
    setTimeout(function(){ $("#btnDial").removeClass("disabled"); },3000);

    if (document.getElementById('dialerWithhold').checked) {
      var withhold = 1;
    } else {
      var withhold = 0;
    }

    var call = $('#number').val();

    chrome.extension.sendMessage({number: call, numberHold: withhold}, function(response) {
      status = response[0];
      message = response[1];

      $('#dialerNumberGroup').removeClass('error');

      if (status == 200 || status == 201) {
        showAlert("alert-info", "Pickup your extension...", "4000");
        setTimeout(function(){ closetab(); },5000);
      } else if (status == 401) {
        showAlert("alert-error", "<small><strong>Error!</strong> Login invalid!</small>", "4000");
        setTimeout(function(){ closetab(); },5000);
      } else {
        showAlert("alert-error", "<small><strong>Error!</strong> Number is not valid!</small>", "3000");
      }

      console.log(status);

    });

  }
  return false;
}

function showAlert(type, message, time) {

  if (time == null) {
    time = 2000;
  }

  console.log("Alert: " + message);
  $('#notification').text("");
  $('#notification').fadeIn(400);
  $('#notification').append($("<div class='alert " + type + " fade in'>" + message + "</div>"));
  setTimeout(function(){ $('#notification').fadeOut(400); },time);

  return false;
}

function closetab() {
	window.close();
}

$(document).ready(function() {

	$('#btnClose').click(closetab);
	$('#btnDial').click(dial);

	$('#banner').text('Extension: ' + localStorage[localStorage['loginUsername'] + '_prefMainExtensionShort']);

	$('#callModal').modal({
	  backdrop: "static",
	  keyboard: false
	})

	$('#callModal').modal('show');
  setTimeout(function() { $("#number").focus(); }, 1000);

	$('#number').keypress(function(e) {
	    if(e.which == 13) {
	        jQuery(this).blur();
	        jQuery('#btnDial').focus().click();
	    }
	});

	var getNumber = getUrlParams();

  if (getNumber.number) {
    var number = decodeURIComponent(getNumber.number);
    number = number.replace("\(0\)","");
    number = number.replace("\+44","0");
    number = number.replace(/\D/g,"");
    $('#number').val(number);
  }

});
