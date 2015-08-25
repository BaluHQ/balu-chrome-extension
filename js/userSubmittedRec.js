/********
 * Init *
 ********/

/*
 * Global variables
 */

var gvScriptName_userSubmittedRec_userSubmittedRec = 'userSubmittedRec';
var gvParams;

/*
 *
 */
(function initialise(){

    log(gvScriptName_userSubmittedRec_userSubmittedRec + '.initialise: Start','INITS');
    window.addEventListener('DOMContentLoaded', DOMContentLoadedListener);

    gvParams = getSearchParameters();

})();

/*
 * Decode get parameter to get userId
 */
 function getSearchParameters() {
       var prmstr = window.location.search.substr(1);
       return prmstr !== null && prmstr !== "" ? transformToAssocArray(prmstr) : {};
 }

 function transformToAssocArray( prmstr ) {
     var params = {};
     var prmarr = prmstr.split("&");
     for ( var i = 0; i < prmarr.length; i++) {
         var tmparr = prmarr[i].split("=");
         params[tmparr[0]] = tmparr[1];
     }
     return params;
 }

/**********************
 * Listener Functions *
 **********************/

/*
 *
 */
function DOMContentLoadedListener(){

    log(gvScriptName_userSubmittedRec_userSubmittedRec + '.DOMContentLoadedListener: Start','LSTNR');

    displayPage(getAddNewRecFormHTML());
}




/******************
 * HTML Functions *
 ******************/

/*
 *
 */

function displayPage(contentHTML) {

   log(gvScriptName_userSubmittedRec_userSubmittedRec + '.displayPage: Start','PROCS');

   var htmlString = '';

   //htmlString += getNavBarHTML();
   htmlString += '<br />';
   htmlString += '<br />';
   htmlString += contentHTML;

   document.getElementById('contentDiv').innerHTML = htmlString;
   document.getElementById('submitButton').addEventListener('click',addNewRec);
   document.getElementById('returnToSidebar').addEventListener('click',returnToSidebar);

 }

/*
 *
 */
function getAddNewRecFormHTML(thankYouText) {

    log(gvScriptName_userSubmittedRec_userSubmittedRec + '.getAddNewRecFormHTML: Start','PROCS');

    var htmlString = '';

    // To do: need to know whether this came from popup or not and, if so, not to show return to sidebar button
    if (gvParams.fromPopup === 'true') {
        // nothing
    } else {
        htmlString += '<a id="returnToSidebar" class="button radius tiny right">Return to sidebar</a>';
    }


    if(thankYouText) {
        htmlString += '<div class="row">';
        htmlString += '  <div class="small-10 small-offset-1 columns end">';
        htmlString += '    <h6>' + thankYouText + '</h6>';
        htmlString += '  </div>';
        htmlString += '</div>';
        htmlString += '<hr />';

    }
    htmlString += '<form>';
    htmlString += '  <div class="row">';
    htmlString += '    <div class="small-8 columns">';
    htmlString += '      <h3 class="subheader">Share your favourite products!</h3>';
    htmlString += '    </div>';
    htmlString += '    <div class="small-4 columns">';
    htmlString += '      <a id="submitButton" class="button radius tiny right">Submit</a>';
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

/******************
 * Data Functions *
 ******************/

/*
 *
 */
function addNewRec() {

    log(gvScriptName_userSubmittedRec_userSubmittedRec + '.addNewRec: Start','PROCS');

    var fieldProductName  = document.getElementById("fieldProductName_addRec");
    var fieldURLOrTwitter = document.getElementById("fieldURLorTwitter_addRec");
    var fieldWhy          = document.getElementById("fieldWhy_addRec");

    var productName  = fieldProductName.value;
    var URLOrTwitter = fieldURLOrTwitter.value;
    var why          = fieldWhy.value;

// to do, replace with vars
    Parse.initialize("mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu", "IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY");

    var UserSubmittedRec = Parse.Object.extend("UserSubmittedRec");
    var userSubmittedRec = new UserSubmittedRec({ACL: new Parse.ACL(Parse.User.current())});

    userSubmittedRec.set('user',Parse.User.current());
    userSubmittedRec.set('productName',productName);
    userSubmittedRec.set('URLOrTwitter',URLOrTwitter);
    userSubmittedRec.set('why',why);

    userSubmittedRec.save(null,{
        success: function(userSubmittedRec){
            displayPage(getAddNewRecFormHTML('Thank You! <br /><br />Balu relies on everybody helping each other. So we really appreciate your contribution. Keep them coming!<br /><br />You\'ll see your recommendation in the Balu sidebar just as soon as we can add it to the database.<br /><br />Got any more great products you want to share with the world...?'));
        },
        error: parseError
    });
}

/*
 *
 */
function returnToSidebar() {

    log(gvScriptName_userSubmittedRec_userSubmittedRec + '.returnToSidebar: Start','PROCS');

    chrome.runtime.sendMessage({sender:  'content_script',
                                subject: 'pleaseRefreshTab'});

}

/**************************
 * Error and Log handling *
 **************************/

function log(message, level) {
    chrome.runtime.sendMessage({sender:  'content_script',
                                subject: 'pleaseLogMessageOnConsole',
                                message:  message,
                                level:    level});
}

function parseErrorSave(object,error) {gvBackground.parseErrorSave(object,error);}

function userLog(eventName, data) {
   var noTabId;
   gvBackground.userLog(noTabId, eventName, data);
}
