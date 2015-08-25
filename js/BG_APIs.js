/********
 * Init *
 ********/

/*
 * Global Variables
 */

gvScriptName_BGMessaging = 'BG_APIs';

/*
 *
 */
(function initialise(){
    log(gvScriptName_BGMessaging + '.initialise: Start','INITS');
})();

/************
 * INCOMING *
 ************/

/*
 * All communication between tabs and the extension (this background page) is done via chrome.runtime.messages
 *
 * The message listener is created in the init function, regardless of Balu's on/off status (because it needs to
 * be there in case Balu is turned on later). Therefore, where relevant, the on/off status should be checked before
 * each message is processed
 */
function chromeMessageListener(msg, sender, callback){

    var logMessage = gvScriptName_BGMessaging + ' >> message <- ' + msg.sender + ':    ' + msg.subject;

    switch (msg.sender + ' | ' + msg.subject) {

        // Initalise and activate the sidebar (called from CS_main at init)
        case 'content_script | pleaseInitialiseThisTab':
            log(logMessage,'MESSG');
            // We can't init the tab until we know whether it matches a Balu website (and subsequently, we can't
            // search the page until we have the searchData), so we're going to make sure these data have been
            // pulled from the Parse database before we proceed
            if (gvIsBaluOnOrOff === 'ON') {
                waitForSearchDataThenInitialiseTab(sender.tab,callback,1);
            } else {
                log(gvScriptName_BGMessaging + '.onMessage: gvIsBaluOnOrOff == ' + gvIsBaluOnOrOff + ', so doing nothing',' INFO');
            }
        break;

        case 'content_script | pleaseRefreshTab':
            log(logMessage,'MESSG');
            if (gvIsBaluOnOrOff === 'ON') {
                if(msg.tabId) {
                    refreshTab(msg.tabId);
                } else {
                    refreshTab_allTabs();
                }
            } else {
                log(gvScriptName_BGMessaging + '.onMessage: gvIsBaluOnOrOff == ' + gvIsBaluOnOrOff + ', so doing nothing',' INFO');
            }
        break;

        // Retrieve recommendations (Called from CS_search after search)

        case 'content_script | pleaseRetrieveRecommendations':
            log(logMessage,'MESSG');
            getRecommendations(msg.tabId,msg.data.searchResults,msg.data.productGroupHeaders,displayRecommendations);
        break;

        // Main sidebar functionality (called by CS_main listeners)

        case 'content_script | pleaseRunManualSearch':
            log(logMessage,'MESSG');
            manualSearch(msg.tabId, msg.data.searchTerm);
        break;

        case 'content_script | pleaseShowOptionsPageWindow':
            log(logMessage,'MESSG');
            showOptionsPageWindow(msg.tabId);
        break;

        case 'content_script | pleaseShowWhyDoWeCareWindow':
            log(logMessage,'MESSG');
            showWhyDoWeCareWindow(msg.tabId,msg.data.whyDoWeCareURLName);
        break;

        case 'content_script | pleaseShowProductLinkWindow':
            log(logMessage,'MESSG');
            showProductLinkWindow(msg.tabId,msg.data.productURL,msg.data.recommendationId,msg.data.pageConfirmationSearch);
        break;

        case 'content_script | pleaseVoteProductUp':
            log(logMessage,'MESSG');
            voteProductUpOrDown(msg.tabId,msg.data.recommendationId,'UP');
        break;

        case 'content_script | pleaseVoteProductDown':
            log(logMessage,'MESSG');
            voteProductUpOrDown(msg.tabId,msg.data.recommendationId,'DOWN');
        break;

        case 'content_script | pleaseShowUserSubmittedRecWindow':
            log(logMessage,'MESSG');
            showUserSubmittedRecWindow(msg.tabId);
        break;

        case 'content_script | pleaseHideSidebar_untilRefresh':
            log(logMessage,'MESSG');
            hideSidebar_untilRefresh(msg.tabId);
        break;

        case 'content_script | pleaseHideSidebar_untilRestart':
            log(logMessage,'MESSG');
            hideSidebar_untilRestart(msg.tabId);
        break;

        case 'content_script | pleaseShowFAQWindow':
            log(logMessage,'MESSG');
            showFAQWindow(msg.tabId);
        break;

        case 'content_script | pleaseShowPrivacyWindow':
            log(logMessage,'MESSG');
            showPrivacyWindow(msg.tabId);
        break;

        // Log in sidebar

        case 'content_script | pleaseLogUserIn':
            log(logMessage,'MESSG');
            logUserIn(msg.tabId,msg.data.username, msg.data.password);
        break;

        case 'content_script | pleaseSignUserUp':
            log(logMessage,'MESSG');
            signUserUp(msg.tabId, msg.data.username, msg.data.password);
        break;

        // Tab tracking

        case 'content_script | pleaseTrackThisTab':
            log(logMessage,'MESSG');
            if(gvTrackedTabs[msg.tabId]){
                log('Tab is being tracked, calling callback to search page',' INFO');
                callback(gvTrackedTabs[msg.tabId]);
            } else {
                log('Tab is NOT being tracked, ending execution',' INFO');
            }
        break;

        case 'content_script | pleaseRegisterTrackedTabAsOK':
            log(logMessage,'MESSG');
            removeTrackedTab(msg.tabId,msg.data.trackedTab);
        break;

        case 'content_script | pleaseRegisterTrackedTabAsProblem':
            log(logMessage,'MESSG');
            reportTrackedTabError(msg.tabId,msg.data.trackedTab);
        break;

        // Logging

        case 'content_script | pleaseLogMessageOnConsole':
            log(msg.message,msg.level);
        break;

        case 'content_script | pleaseLogEventInUserLog':
            userLog(msg.tabId,msg.eventName,msg.data);
        break;

        // Catch All
        default:
            log('UNKNOWN MESSAGE >>> ' + logMessage,'ERROR');
        }

 }


/************
 * OUTGOING *
 ************/

 function sendMessage(tabId,subject,data,callback){

     log(gvScriptName_BGMessaging + ' >> message -> content_script:    ' + subject, 'MESSG');

     chrome.tabs.sendMessage(tabId,
                             {sender:  'background_script',
                              subject: subject,
                              data:    data},
                              null, // options
                              callback);
 }
