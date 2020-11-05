import jsSHA from './sha1';
import _ from './jsOTP';

(function () {
	var currentTab = null;
	var keyForm = null;
	var keyInput = null;
	var saveKeyButton = null;
	var resetButton = null;
	var totpArea = null;
	var totpNumber = null;
	var timespanBar = null;
	var keyStore = null;
	var keyName = null;
	var errorLabel = null;

	function shortcutUrl(url, stop) {
		var length;

		if ((length = url.indexOf(stop)) > 0) {
			return url.substr(0, length); 
		} else {
			return url;
		}
	}

	function getCurrentUrlKeyName() {
		var url = currentTab.url.toLowerCase();
		url = shortcutUrl(url, "?");
		url = shortcutUrl(url, "#");
		
		var shaObj = new jsSHA("SHA-1", "TEXT");
		shaObj.update(url);
		return "url_" + shaObj.getHash("HEX");
	}

	function getCurrentUrlKey() {
		return (keyStore || {})[keyName] || null;
	}
	
	function showKeyForm() {
		keyInput.value = "";
		totpArea.style.display = "none";
		keyForm.style.display = "";
	}
	
	function setTotpValue(totpKey) {
		var totp = new jsOTP.totp(30, 6);
		var otpValue = totp.getOtp(totpKey);
		
		// update totp value
		if (totpNumber.innerHTML != otpValue) {
			totpNumber.innerHTML = otpValue;
		}
		
		// update banner
		var seconds = 30 - ((new Date().getSeconds()) % 30);
		var percent = Math.floor((seconds || 30) / 30 * 100);
		timespanBar.style.width = ("" + percent + "%");
	}
	
	function showScreen(totpKey) {
		try {
			setTotpValue(totpKey);
		} 
		catch(err) {
			console.error(err);
		}
		
		keyForm.style.display = "none";
		totpArea.style.display = "";
		
		refresh();
	}
	
	function saveKey() {
		if (!(/^[ABCDEFGHIJKLMNOPQRSTUVWXYZ234567]+$/i).test(keyInput.value) || ((new jsOTP.totp()).base32tohex(keyInput.value).length % 2) != 0) {
			errorLabel.innerHTML = "Invalid base32 key";
			return;
		} else {
			errorLabel.innerHTML = "&nbsp;";
		}
		
		var storeValue = keyStore || {};
		storeValue[keyName] = keyInput.value;
		
		chrome.storage.local.set({totpKeyStore: storeValue}, function() {
			start();
		});
	}
	
	function resetKey() {
		var storeValue = keyStore || {};
		delete storeValue[keyName];
		
		chrome.storage.local.set({totpKeyStore: storeValue}, function() {
			start();
		});
	}
	
	function refresh() {
		if (keyStore) {
			var urlKey = getCurrentUrlKey();
			
			if (urlKey) {
				setTotpValue(urlKey);
				
				var milliseconds = 1000 - (new Date().getMilliseconds());
				
				if (milliseconds < 10) {
					milliseconds += 1000;
				}
				
				setTimeout(refresh, milliseconds);
			}
		}
	}
	
	function start() {
		chrome.storage.local.get(['totpKeyStore'], function (result) {
			keyStore = result.totpKeyStore;
			var urlKey;
			
			if (urlKey = getCurrentUrlKey()) {
				showScreen(urlKey);
			} else {
				showKeyForm();
			}
		});
	}

	// initial popup elements
	keyForm = document.getElementById("keyForm");
	keyInput = document.getElementById("totpKey");
	saveKeyButton = document.getElementById("saveButton");
	totpArea = document.getElementById("totpArea");
	totpNumber = document.getElementById("totpNumber");
	resetButton = document.getElementById("reset");
	timespanBar = document.getElementById("timespan");
	errorLabel = document.getElementById("error");

	// popup events
	saveKeyButton.onclick = saveKey;
	resetButton.onclick = resetKey;
	
	chrome.tabs.getSelected(null, function(tab) {
        currentTab = tab;
		keyName = getCurrentUrlKeyName();
		start();
    });
})();