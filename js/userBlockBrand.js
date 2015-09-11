/********
 * Init *
 ********/

/*
 * Global variables
 */

var gvScriptName_userBlockBrand = 'userBlockBrand';
var gvParams;

/*
 * We listen for DOM loaded because that triggers the script that displays the form
 * We also need a message listener, so the background script can communicate with this tab
 * (the existing content_script listener doesn't cover the pop up window)
 */
(function initialise(){

    log(gvScriptName_userBlockBrand + '.initialise: Start','INITS');

    window.addEventListener('DOMContentLoaded', DOMContentLoadedListener);
    chrome.runtime.onMessage.addListener(chromeMessageListener);

    gvParams = chrome.extension.getBackgroundPage().gvBlockBrandParams;

})();


/**********************
 * Listener Functions *
 **********************/

/*
 *
 */
function DOMContentLoadedListener(){

    log(gvScriptName_userBlockBrand + '.DOMContentLoadedListener: Start','LSTNR');

    displayPage(getBlockBrandFormHTML(),true);
}

/******************
 * HTML Functions *
 ******************/

/*
 *
 */

function displayPage(contentHTML,listenersNeeded) {

   log(gvScriptName_userBlockBrand + '.displayPage: Start','PROCS');

   var htmlString = '';

   //htmlString += getNavBarHTML();
   htmlString += '<br />';
   htmlString += '<br />';
   htmlString += contentHTML;

   document.getElementById('contentDiv').innerHTML = htmlString;

   if(listenersNeeded){
       document.getElementById('submitButton').addEventListener('click',blockBrand);
   }
}

/*
 *
 */
function getBlockBrandFormHTML(confirmationText) {

    log(gvScriptName_userBlockBrand + '.getBlockBrandFormHTML: Start','PROCS');

    var htmlString = '';

    if(confirmationText) {
        htmlString += '<div class="row">';
        htmlString += '  <div class="small-10 small-offset-1 columns end">';
        htmlString += '    <h6>' + confirmationText + '</h6>';
        htmlString += '  </div>';
        htmlString += '</div>';
        htmlString += '<hr />';

    } else {
        htmlString += '<form>';
        htmlString += '  <div class="row">';
        htmlString += '    <div class="small-12 end columns">';
        htmlString += '      <h3 class="subheader">Block this brand from your Balu sidebar</h3>';
        htmlString += '    </div>';
        htmlString += '  </div>';
        htmlString += '  <div class="row">';
        htmlString += '    <div class="small-12 columns">';
        htmlString += '      <span>If you no longer want Balu to recommend ' + gvParams.brandName + '\'s products, confirm below.<br /><br />And if you have time please tell us why not.<br /><br /></span>';
        htmlString += '      <textarea rows="4" cols="50" id="fieldReason" placeholder="I never want to see product recommendations from ' + gvParams.brandName + ' because..."></textarea>';
        htmlString += '      <a id="submitButton" class="button radius tiny left">OK, remove this brand!</a>';
        htmlString += '    </div>';
        htmlString += '  </div>';
        htmlString += '</form>';
    }

    return htmlString;
}

/*
 * Called on receipt of a successful submission
 */
function showUserBlockBrandSuccess() {

    log(gvScriptName_userBlockBrand + '.showUserBlockBrandSuccess: Start','PROCS');

    var confirmationText = '';
    confirmationText += 'Done. <br /><br />';
    confirmationText += 'You can always review your blocked brands from the options screen';

    displayPage(getBlockBrandFormHTML(confirmationText),false);
}

/******************
 * Data Functions *
 ******************/

/*
 *
 */
function blockBrand() {

    log(gvScriptName_userBlockBrand + '.blockBrand: Start','PROCS');

    var reason = document.getElementById('fieldReason').value;
    gvParams.reason = reason;
    sendMessage('pleaseBlockThisBrand',gvParams);
}

/**************************
 * Error and Log handling *
 **************************/

// log() calls go straight to CS_APIs
