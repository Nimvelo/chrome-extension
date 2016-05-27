// Copyright (c) 2010 - 2015 Sipcentric Ltd. Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
// content.js

var urlBlackList = ["mail.google.com", "google.com", "google.co.uk", "secure.helpscout.net/mailbox", "yahoo.com"];

function checkBlocked() {

  var disallow = null;
  var url = document.location.href;

  $.each(urlBlackList, function(index, value){
    var re = new RegExp('^.*' + value + '.*$');
    if (url.match(re)) {
      disallow = true;
    }
  });

  var meta = $('meta[name=sccextension]');
  if (meta.attr('content') == 'clickable-off') {
    disallow = true;
  }

  if (!disallow) {
    linkNumbers();
  } else {
    console.log('Clickable numbers disabled on this page or domain');
  }

}

function linkNumbers() {
  var extension = chrome.extension.getURL("call.html");
  var pattern = /((?:0|\+44)(?:[0-9]|\(|-|\)|\s(?:[0-9]|\()){8,20})/g;
  $('body').find(':not(textarea,input,a,pre,code)').replaceText( pattern, '<a title="Click to call this number" href="' + extension + '?number=$1" target="_blank">$1<\/a>' );
}

$(document).ready(function() {
  chrome.extension.sendMessage({clickableEnabled: 1}, function(response) {
    if (response == true) {
      checkBlocked();
    }
  });
});
