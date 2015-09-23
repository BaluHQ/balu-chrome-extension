/********
 * Init *
 ********/

/*
 * Global variables
 */

var gvScriptName_userSubmittedRec = 'userSubmittedWebsiteRec';

/*
 * We listen for DOM loaded because that triggers the script that displays the form
 * We also need a message listener, so the background script can communicate with this tab
 * (the existing content_script listener doesn't cover the pop up window)
 */
(function initialise(){

    log(gvScriptName_userSubmittedRec + '.initialise: Start','INITS');

    window.addEventListener('DOMContentLoaded', DOMContentLoadedListener);
    chrome.runtime.onMessage.addListener(chromeMessageListener);

})();


/**********************
 * Listener Functions *
 **********************/

/*
 *
 */
function DOMContentLoadedListener(){

    log(gvScriptName_userSubmittedRec + '.DOMContentLoadedListener: Start','LSTNR');

    displayPage(getAddNewWebsiteRecFormHTML());
}




/******************
 * HTML Functions *
 ******************/

/*
 *
 */

function displayPage(contentHTML) {

   log(gvScriptName_userSubmittedRec + '.displayPage: Start','PROCS');

   var htmlString = '';

   //htmlString += getNavBarHTML();
   htmlString += '<br />';
   htmlString += '<br />';
   htmlString += contentHTML;

   document.getElementById('contentDiv').innerHTML = htmlString;
   document.getElementById('submitButton').addEventListener('click',addNewWebsiteRec);

 }

/*
 *
 */
function getAddNewWebsiteRecFormHTML(thankYouText) {

    log(gvScriptName_userSubmittedRec + '.getAddNewWebsiteRecFormHTML: Start','PROCS');

    var htmlString = '';

    if(thankYouText) {
        htmlString += '<div class="row">';
        htmlString += '  <div class="small-10 small-offset-1 columns end">';
        htmlString += '    <h6>' + thankYouText + '</h6>';
        htmlString += '  </div>';
        htmlString += '</div>';
        htmlString += '<hr />';

    }
    htmlString += '  <div class="row">';
    htmlString += '    <div class="small-12 end columns">';
    htmlString += '      <h3 class="subheader">Tell us about a website you think Balu should cover</h3>';
    htmlString += '    </div>';
    htmlString += '  </div>';
    htmlString += '  <div class="row">';
    htmlString += '    <div class="small-4 end columns">';
    htmlString += '      <a id="submitButton" class="button radius tiny left">Submit</a>';
    htmlString += '    </div>';
    htmlString += '  </div>';
    htmlString += '  <div class="row">';
    htmlString += '    <div class="small-12 columns">';
    htmlString += '      <input required type="text" id="fieldWebsite_addWebsiteRec" placeholder="Website URL or name" />';
    htmlString += '    </div>';
    htmlString += '  </div>';

    return htmlString;
}

/*
 * Called on receipt of a successful submission
 */
function showUserSubmittedWebsiteRecSuccess() {

    log(gvScriptName_userSubmittedRec + '.showUserSubmittedWebsiteRecSuccess: Start','PROCS');

    var successMessage = '';
    successMessage += 'Thank You! <br /><br />';
    successMessage += 'Balu relies on everybody helping each other. So we really appreciate your contribution. Keep them coming!<br /><br />';
    successMessage += 'We are "turning on" more websites as quickly as we can. We\'ll prioritise your suggestion.<br /><br />';

    displayPage(getAddNewWebsiteRecFormHTML(successMessage));
}

/******************
 * Data Functions *
 ******************/

/*
 *
 */
function addNewWebsiteRec() {

    log(gvScriptName_userSubmittedRec + '.addNewWebsiteRec: Start','PROCS');

    var fieldWebsiteRec  = document.getElementById("fieldWebsite_addWebsiteRec");

    var formFieldValues = {fieldWebsiteRec:  fieldWebsiteRec.value};

    sendMessage('BG_main','pleaseSaveUserSubmittedWebsiteRec',{formFieldValues: formFieldValues});
}

/**************************
 * Error and Log handling *
 **************************/

// log() calls go straight to CS_APIs
