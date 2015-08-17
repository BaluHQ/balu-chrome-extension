/********
 * Init *
 ********/

/*
 * Global variables
 */

/*
 * Inject the parse script into the user's page
 */
(function initialise(){

    log('inject_script.initialise: Start','PROCS');
/*
    var parseLibrary=document.createElement('script');
    parseLibrary.setAttribute("type","text/javascript");
    parseLibrary.setAttribute("src", "http://www.parsecdn.com/js/parse-1.4.2.min.js");
    document.getElementsByTagName("head")[0].appendChild(parseLibrary);
*/
})();

/*************
 * Functions *
 *************/

/*
 * signUpUser
 */
function signUpUser() {

    log('inject_script.signUpUser: Start','PROCS');

    var iframe = window.frames.iFrameBaluSideBar.contentDocument;
    var username = iframe.getElementById('fieldSignUpEmail').value;
    var password = iframe.getElementById('fieldSignUpPassword').value;
    var email = iframe.getElementById('fieldSignUpEmail').value;

    window.parent.postMessage({sender:  'inject_script',
                               subject: 'pleaseSignThisUserUp',
                               username: username,
                               password: password,
                               email:    email}, '*');

}

/*
 * signInUser
 */

function signInUser() {

    log('inject_script.signInUser: Start','PROCS');

    var iframe = window.frames.iFrameBaluSideBar.contentDocument;
    signInUserSubmit(iframe.getElementById('fieldSignInEmail').value, iframe.getElementById('fieldSignInPassword').value);

}

/*
 * signInUserSubmit
 */

function signInUserSubmit(username, password){

    log('inject_script.signInUserSubmit: Start','PROCS');

    window.parent.postMessage({sender:  'inject_script',
                               subject: 'pleaseLogThisUserIn',
                               username: username,
                               password: password}, '*');

}

/*
 * logOutUser
 */

function logOutUser() {

    log('inject_script.logOutUser: Start','PROCS');

    window.parent.postMessage({sender:  'inject_script',
                               subject: 'pleaseLogThisUserOut'}, '*');

}


/*
 * manualProductSearch
 */

function manualProductSearch() {

    log('inject_script.manualProductSearch: Start','PROCS');

    var iframe = window.frames.iFrameBaluSideBar.contentDocument;
    var searchTerm = iframe.getElementById('fieldManualProductSearch').value;

    window.parent.postMessage({sender:    'inject_script',
                               subject:   'pleaseRunManualSearch',
                               searchTerm: searchTerm}, '*');
}

/*
 *
 */

function voteUpRec(recommendationId) {

    log('inject_script.voteUpRec: Start','PROCS');

    window.parent.postMessage({sender:  'inject_script',
                               subject: 'pleaseVoteUpThisProduct',
                               recommendationId: recommendationId}, '*');
}

/*
 *
 */

function voteDownRec(recommendationId) {

    log('inject_script.voteDownRec: Start','PROCS');

    window.parent.postMessage({sender:  'inject_script',
                               subject: 'pleaseVoteDownThisProduct',
                               recommendationId: recommendationId}, '*');
}

/*
 *
 */

function hideBaluUntilRefresh() {

    log('inject_script.hideBaluUntilRefresh: Start','PROCS');

    window.parent.postMessage({sender:  'inject_script',
                              subject: 'pleaseHideBaluUntilRefresh'}, '*');
}

 /*
  *
  */

function hideBaluUntilRestart() {

    log('inject_script.hideBaluUntilRestart: Start','PROCS');

    window.parent.postMessage({sender:  'inject_script',
                               subject: 'pleaseHideBaluUntilRestart'}, '*');
}

/*
 *
 */
function showAddRecommendationWindow(userId) {

    log('inject_script.showAddRecommendationWindow: Start','PROCS');

    userLog('SHOW_ADD_REC_WINDOW',{noData: null});

    var newWindow = window.open("http://www.getbalu.org/webapp/addNewRecommendation.html?userId=" + userId, "", "_blank", "height=450,width=450,left=300,top=100");

}

/*
 *
 */
function showFAQWindow() {

   log('inject_script.showFAQWindow: Start','PROCS');

   userLog('SHOW_FAQ_WINDOW',{noData: null});

   var newWindow = window.open("http://www.getbalu.org/webapp/FAQs.html","_blank","height=450,width=450,left=300,top=100");

}

/*
 *
 */
function showPrivacyWindow() {

   log('inject_script.showPrivacyWindow: Start','PROCS');

   userLog('SHOW_PRIVACY_WINDOW',{noData: null});

   var newWindow = window.open("http://www.getbalu.org/webapp/privacy.html", "_blank", "height=450,width=450,left=300,top=100");

}

/*
 *
 */
function hyperlink_Rec(url,recommendationId){

    log('inject_script.hyperlink_Rec: Start','PROCS');

    window.parent.postMessage({sender:  'inject_script',
                               subject: 'pleaseIncrementRecClickCount',
                               recommendationId: recommendationId}, '*');

    userLog('HYPERLINK',{url: url,recommendationId: recommendationId});

    window.open(url,"");

}


/**************************
 * Error and Log handling *
 **************************/

/*
 *
 */

function log(message, level) {
     window.parent.postMessage({sender:    'inject_script',
                                subject:   'pleaseLogMessageOnConsole',
                                message:    message,
                                level:      level}, '*');

}

/*
 *
 */
function userLog(eventName,data) {

    log('inject_script.userLog: Start','PROCS');

    window.parent.postMessage({sender:    'inject_script',
                               subject:   'pleaseLogEventInUserLog',
                               eventName: eventName,
                               data:      data}, '*');

}
