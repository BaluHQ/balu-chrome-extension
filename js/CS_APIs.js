/********
 * Init *
 ********/

/*
 * Global Variables
 */

var gvScriptName_CSMessaging = 'CS_APIs';

/*
 *
 */
(function initialise(){
    log(gvScriptName_CSMessaging + '.initialise: Start','INITS');
})();

/************
 * INCOMING *
 ************/

/*
 * Messages from the extension (Chrome APIs)
 */
function chromeMessageListener(msg, sender, callback) {

    var logMessage = gvScriptName_CSMessaging + ' >> message <- ' + msg.sender + ': ' + msg.subject;

    switch (msg.sender + " | " + msg.subject) {

        // Core search functions

        case 'BG_main | pleaseSearchThePage':
            log(logMessage,'MESSG');
            // We handover to the search JS script to handle the search, and when done it will
            // request pleaseRetrieveRecommendations from BG_main
            searchPage_master(msg.data.tabURL,msg.data.websiteURL,document,msg.data.searchData);
        break;

        case 'BG_main | pleaseDisplayRecommendations':
            log(logMessage,'MESSG');
            createSidebar(createResultsSidebarContent,msg.data.recommendationData, msg.data.searchTerm, msg.data.showJoyride, msg.data.displayChristmasBanner, true);
        break;

        // Logging in and out

        case 'BG_main | pleaseDisplayLogInSidebar':
            log(logMessage,'MESSG');
            createSidebar(createLogInSidebarContent,null,null,false,false,true,msg.data.authMessage);
        break;

        // Sidebar visibility

        case 'BG_main | pleaseHideSidebar':
            log(logMessage,'MESSG');
            hideSidebar(callback); // call back can be the main sidebar refresh. We do it like this so we get the sidebar to hide before re-showing (or not)
        break;

        // Comms from BG_main to popup windows

        case 'BG_main | pleaseShowUserSubmittedRecSuccessWindow':
            log(logMessage,'MESSG');
            showUserSubmittedRecSuccess(); // this is in userSubmittedRec.js script
        break;

        case 'BG_main | pleaseShowUserSubmittedWebsiteRecSuccessWindow':
            log(logMessage,'MESSG');
            showUserSubmittedWebsiteRecSuccess(); // this is in userSubmittedWebsiteRec.js script
        break;

        case 'BG_main | pleaseShowUserBlockBrandSuccessWindow':
            log(logMessage,'MESSG');
            showUserBlockBrandSuccess(); // this is in userBlockBrand.js script
        break;

        // Misc

        case 'BG_main | pleaseGetThePageDOM':
            log(logMessage,'MESSG');
            // Callback is the BTS_test.addFeedbackPage function
            callback({
                tabId:       msg.data.tabId,
                pageHTML:  document.all[0].outerHTML,
                feedback:  msg.data.feedback
            });
        break;

        // Default

        default:
            if(msg.sender === 'BG_main') {
                log('UNKNOWN MESSAGE >>> ' + logMessage,'ERROR');
            } else {
                // do nothing

                // The userSubRec screen adds a second message listener (in addition to the background script's)
                // that will respond to the chrome.runtime.sendMessage messages (sent by the content_script).
                // It will therefore pick up messages sent from content_script to background - messages that
                // this handler function doesn't accept. If we log these as errors we create an infinite loop for
                // as long as the subRec window is open.
            }
     }
}


/*
 * Messages from the page (HTML postMessage)
 */
function iFrameListener(msg) {

    var logMessage = gvScriptName_CSMessaging + ' >> message <- ' + msg.data.sender + ': ' + msg.data.subject;

    switch (msg.data.sender + " | " + msg.data.subject) {

        //

        case 'IF_main | pleaseRegisterIframeAsReady':
            log(logMessage,'MESSG');
            // A recursive wait function will be waiting for this var to go to true
            gvIsIframeReady = true;
        break;

        case 'IF_main | pleaseMarkJoyrideAsDone':
            log(logMessage,'MESSG');
            sendMessage('BG_main','pleaseMarkJoyrideAsDone',msg.data);
        break;

        // logging

        case 'IF_main | pleaseLogEventInUserLog':
            log(logMessage,'MESSG');
            userLog(msg.data.data.eventName,msg.data.data.data);
        break;

        case 'IF_main | pleaseLogMessageOnConsole':
            log(msg.data.message,msg.data.level);
        break;

        // default
        default:
            if (msg.data.sender === 'IF_main') {
                log('UNKNOWN MESSAGE >>> ' + logMessage,'ERROR');
            } else {
                // No error handling here, because lots of DOM messages are fired off by some pages and we don't want to clutter up the logs
            }
     }
}

/************
 * OUTGOING *
 ************/

/*
 *
 */
function sendMessage(recipient,subject,data,callback){

    if(recipient === 'BG_main'){
        log(gvScriptName_CSMessaging + ' >> message -> ' + recipient + ': ' + subject, 'MESSG');

        chrome.runtime.sendMessage({sender:  'CS_main',
                                    subject: subject,
                                    data:    data},
                                    callback);

    } else if (recipient === 'IF_main'){
        log(gvScriptName_CSMessaging + ' >> message -> ' + recipient + ': ' + subject, 'MESSG');

        window.frames.iFrameBaluSidebar.contentWindow.postMessage({sender: 'CS_main',
                                                                   subject: subject,
                                                                   data:    data}, '*');
    } else {
        log(gvScriptName_CSMessaging + '.sendMessage: UNKOWN RECIPIENT', 'ERROR');
    }

}

/**************************
 * Error and Log handling *
 **************************/

function log(message, level) {

    chrome.runtime.sendMessage({sender:  'CS_main',
                                subject: 'pleaseLogMessageOnConsole',
                                message:  message,
                                level:    level});
}

function userLog(eventName, data) {

    chrome.runtime.sendMessage({sender:     'CS_main',
                                subject:    'pleaseLogEventInUserLog',
                                eventName:  eventName,
                                data:       data});
}
