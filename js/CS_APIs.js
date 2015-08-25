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

function chromeMessageListener(msg, sender, callback) {

    var logMessage = gvScriptName_CSMessaging + ' >> message <- ' + msg.sender + ': ' + msg.subject;

    switch (msg.sender + " | " + msg.subject) {

        // Core search functions

        case 'background_script | pleaseSearchThePage':
            log(logMessage,'MESSG');
            // We handover to the search JS script to handle the search, and when done it will
            // call our callback function: processSearchResults
            searchPage_master(msg.data.searchData,gvThisTab.tab.url,gvThisTab.website.websiteURL);
        break;

        case 'background_script | pleaseDisplayRecommendations':
            log(logMessage,'MESSG');
            createSidebar(createResultsSidebarContent,msg.data.recommendationData, msg.data.productGroupHeaders, msg.data.searchTerm);
        break;

        // Logging in and out

        case 'background_script | pleaseDisplayLogInSidebar':
            log(logMessage,'MESSG');
            createSidebar(createLogInSidebarContent);
        break;

        // Sidebar visibility

        case 'background_script | pleaseHideSidebar':
            log(logMessage,'MESSG');
            hideSidebar();
        break;

        // Default

        default:
            log('UNKNOWN MESSAGE >>> ' + logMessage,'ERROR');
    }
}

/************
 * OUTGOING *
 ************/

function sendMessage(subject,data,callback){

    log(gvScriptName_CSMessaging + ' >> message -> background_script: ' + subject, 'MESSG');

    var tabId;
    if(gvThisTab){
        tabId = gvThisTab.tab.id;
    }

    chrome.runtime.sendMessage({tabId:   tabId,
                                sender:  'content_script',
                                subject: subject,
                                data:    data},
                                callback);
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

function userLog(eventName, data) {

    var tabId;
    if(gvThisTab){
        tabId = gvThisTab.tab.id;
    }

    chrome.runtime.sendMessage({tabId:      tabId,
                                sender:     'content_script',
                                subject:    'pleaseLogEventInUserLog',
                                eventName:  eventName,
                                data:       data});
}
