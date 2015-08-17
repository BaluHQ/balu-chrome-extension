/********
 * Init *
 ********/

/*
 * Global variables
 */

var gvBackground = chrome.extension.getBackgroundPage();

 // Logging control
 var gvLogErrors = true;
 var gvLogProcs  = true;
 var gvLogDebugs = true;
 var gvLogInfos  = false;
 var gvLogLstnrs = false;
 var gvLogTemps  = true;


/*
 *
 */
(function initialise(){

    log('addNewRec.initialise: Start','PROCS');

    window.addEventListener('DOMContentLoaded', DOMContentLoadedListener);

})();

/**********************
 * Listener Functions *
 **********************/

/*
 *
 */
function DOMContentLoadedListener(){

    log('addNewRec.DOMContentLoadedListener: Start','LSTNR');

    displayPage(getAddNewRecFormHTML());
}

/******************
 * HTML Functions *
 ******************/

/*
 *
 */

function displayPage(contentHTML) {

   log("userSubmittedRec.displayPage: Start",'PROCS');

   var htmlString = '';

   //htmlString += getNavBarHTML();
   htmlString += '<br />';
   htmlString += '<br />';
   htmlString += contentHTML;

   document.getElementById('container').innerHTML = htmlString;
   document.getElementById('submitButton').addEventListener('click',addNewRec);

 }

/*
 *
 */
function getAddNewRecFormHTML(thankYouText) {

    log('userSubmittedRec.getAddNewRecFormHTML: Start','PROCS');

    var htmlString = '';

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

    log('userSubmittedRec.addNewRec: Start','PROCS');

    var fieldProductName  = document.getElementById("fieldProductName_addRec");
    var fieldURLOrTwitter = document.getElementById("fieldURLorTwitter_addRec");
    var fieldWhy          = document.getElementById("fieldWhy_addRec");

    var productName  = fieldProductName.value;
    var URLOrTwitter = fieldURLOrTwitter.value;
    var why          = fieldWhy.value;

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

/**************************
 * Error and Log handling *
 **************************/

function log(message, level) {
    gvBackground.log(message, level);
}

function parseError(result, error) {
    alert("Error: " + error.code + " " + error.message);
}

function userLog(eventName, data) {
   var noTabId;
   gvBackground.userLog(noTabId, eventName, data);
}
