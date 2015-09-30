/********
 * Init *
 ********/

/*
 * Global variables
 */

var gvScriptName_userSubmittedRec = 'userSubmittedRec';

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

    displayPage(getAddNewRecFormHTML());
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
   document.getElementById('submitButton').addEventListener('click',addNewRec);

 }

/*
 *
 */
function getAddNewRecFormHTML(thankYouText) {

    log(gvScriptName_userSubmittedRec + '.getAddNewRecFormHTML: Start','PROCS');

    var htmlString = '';

    if(thankYouText) {
        htmlString += '<div class="row">';
        htmlString += '  <div class="small-12 columns">';
        htmlString += '    <h6>' + thankYouText + '</h6>';
        htmlString += '  </div>';
        htmlString += '</div>';
        htmlString += '<hr />';

    }
    htmlString += '<form>';
    htmlString += '  <div class="row">';
    htmlString += '    <div class="small-12 end columns">';
    htmlString += '      <h3 class="subheader">Share your favourite products!</h3>';
    htmlString += '    </div>';
    htmlString += '  </div>';
    htmlString += '  <div class="row">';
    htmlString += '    <div class="small-4 end columns">';
    htmlString += '      <a id="submitButton" class="button radius tiny left">Submit</a>';
    htmlString += '    </div>';
    htmlString += '  </div>';
    htmlString += '  <div class="row">';
    htmlString += '    <div class="small-12 columns">';
    htmlString += '      <label>Tell us the name of a great product or brand';
    htmlString += '        <input required type="text" id="fieldProductName_addRec" placeholder="Product name" />';
    htmlString += '      </label>';
    htmlString += '    </div>';
    htmlString += '  </div>';
    htmlString += '  <div class="row">';
    htmlString += '    <div class="small-12 columns">';
    htmlString += '      <label>Do you know the company\'s website or Twitter username  ?';
    htmlString += '        <input type="text" id="fieldURLorTwitter_addRec" placeholder="Website or Twitter" />';
    htmlString += '      </label>';
    htmlString += '    </div>';
    htmlString += '  </div>';
    htmlString += '  <div class="row">';
    htmlString += '    <div class="small-12 columns">';
    htmlString += '      <label>Tell us why you think this product is so awesome (optional)';
    htmlString += '        <textarea id="fieldWhy_addRec" placeholder="This product is a great ethical alternative to...' + String.fromCharCode(10) + String.fromCharCode(10) + 'Because..." rows="6"></textarea>';
    htmlString += '      </label>';
    htmlString += '    </div>';
    htmlString += '  </div>';
    htmlString += '</form>';

    return htmlString;
}

/*
 * Called on receipt of a successful submission
 */
function showUserSubmittedRecSuccess() {

    log(gvScriptName_userSubmittedRec + '.showUserSubmittedRecSuccess: Start','PROCS');

    var successMessage = '';
    successMessage += 'Thank You! <br /><br />';
    successMessage += 'Balu relies on people spreading the word about great ethical brands. So we really appreciate your contribution. Keep them coming!<br /><br />';
    successMessage += 'You\'ll see your recommendation in the Balu sidebar just as soon as we can add it to the database.<br /><br />';
    successMessage += 'Got any more great products you want to share with the world...? Add them below.';

    displayPage(getAddNewRecFormHTML(successMessage));
}

/******************
 * Data Functions *
 ******************/

/*
 *
 */
function addNewRec() {

    log(gvScriptName_userSubmittedRec + '.addNewRec: Start','PROCS');

    var fieldProductName  = document.getElementById("fieldProductName_addRec");
    var fieldURLOrTwitter = document.getElementById("fieldURLorTwitter_addRec");
    var fieldWhy          = document.getElementById("fieldWhy_addRec");

    var formFieldValues = {productName:  fieldProductName.value,
                           URLOrTwitter: fieldURLOrTwitter.value,
                           why:          fieldWhy.value};

    sendMessage('BG_main','pleaseSaveUserSubmittedRec',{formFieldValues: formFieldValues});
}

/**************************
 * Error and Log handling *
 **************************/

// log() calls go straight to CS_APIs
