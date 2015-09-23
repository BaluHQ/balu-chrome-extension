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

    var logMessage = gvScriptName_BGMessaging + ' >> message <- ' + msg.sender + ': ' + msg.subject;

    switch (msg.sender + ' | ' + msg.subject) {

        // Initalise and activate the sidebar (called from CS_main at init)
        case 'CS_main | pleaseInitialiseThisTab':
            log(logMessage,'MESSG');
            // We can't init the tab until we know whether it matches a Balu website (and subsequently, we can't
            // search the page until we have the searchData), so we're going to make sure these data have been
            // pulled from the Parse database before we proceed
            if (gvIsBaluOnOrOff === 'OFF') {
                log(gvScriptName_BGMessaging + '.onMessage: gvIsBaluOnOrOff == ' + gvIsBaluOnOrOff + ', so doing nothing',' INFO');
            } else {
                waitForExtensionInitThenInitialiseTab(sender.tab,1);
            }
        break;

        case 'CS_main | pleaseMarkJoyrideAsDone':
            log(logMessage,'MESSG');
            markJoyrideAsDone();
        break;

        // Retrieve recommendations (Called from CS_search after search)

        case 'CS_main | pleaseRetrieveRecommendations':
            log(logMessage,'MESSG');
            getRecommendations(sender.tab.id,msg.data.searchResults,displayRecommendations);
        break;

        // Main sidebar functionality (called by CS_main listeners)

        case 'CS_main | pleaseRunManualSearch':
            log(logMessage,'MESSG');
            manualSearch(sender.tab.id, msg.data.searchTerm);
        break;

        case 'CS_main | pleaseShowOptionsPageWindow':
            log(logMessage,'MESSG');
            showOptionsPageWindow(sender.tab.id);
        break;

        case 'CS_main | pleaseShowWhyDoWeCareWindow':
            log(logMessage,'MESSG');
            showWhyDoWeCareWindow(sender.tab.id,msg.data.whyDoWeCare);
        break;

        case 'CS_main | pleaseShowProductLinkWindow':
            log(logMessage,'MESSG');
            showProductLinkWindow(sender.tab.id,msg.data.productURL,msg.data.recommendationId,msg.data.recProductName,msg.data.pageConfirmationSearch);
        break;

        case 'CS_main | pleaseVoteProductUp':
            log(logMessage,'MESSG');
            voteProductUpOrDown(sender.tab.id,msg.data.recommendationId,'UP');
        break;

        case 'CS_main | pleaseVoteProductDown':
            log(logMessage,'MESSG');
            voteProductUpOrDown(sender.tab.id,msg.data.recommendationId,'DOWN');
        break;

        case 'CS_main | pleaseShowTweetWindow':
            log(logMessage,'MESSG');
            showTweetWindow(sender.tab.id,msg.data.tweetContent);
        break;

        case 'CS_main | pleaseShowBlockBrandWindow':
            log(logMessage,'MESSG');
            msg.data.tabURL = sender.tab.url;
            showBlockBrandWindow(sender.tab.id,msg.data);
        break;

        case 'CS_main | pleaseBlockThisBrand':
            log(logMessage,'MESSG');
            blockBrand(sender.tab.id,msg.data);
        break;

        case 'CS_main | pleaseShowUserSubmittedRecWindow':
            log(logMessage,'MESSG');
            showUserSubmittedRecWindow(sender.tab.id);
        break;

        case 'CS_main | pleaseSaveUserSubmittedRec':
            log(logMessage,'MESSG');
            saveUserSubmittedRec(sender.tab.id,msg.data.formFieldValues);
        break;

        case 'CS_main | pleaseSaveUserSubmittedWebsiteRec':
            log(logMessage,'MESSG');
            saveUserSubmittedWebsiteRec(sender.tab.id,msg.data.formFieldValues);
        break;

        case 'CS_main | pleaseHideSidebar_untilRefresh':
            log(logMessage,'MESSG');
            hideSidebar_untilRefresh(sender.tab.id);
        break;

        case 'CS_main | pleaseHideSidebar_untilRestart':
            log(logMessage,'MESSG');
            hideSidebar_untilRestart(sender.tab.id);
        break;

        case 'CS_main | pleaseShowFAQWindow':
            log(logMessage,'MESSG');
            showFAQWindow(sender.tab.id);
        break;

        case 'CS_main | pleaseShowPrivacyWindow':
            log(logMessage,'MESSG');
            showPrivacyWindow(sender.tab.id);
        break;

        // Log in sidebar

        case 'CS_main | pleaseLogUserIn':
            log(logMessage,'MESSG');
            logUserIn(sender.tab.id,msg.data.username, msg.data.password);
        break;

        case 'CS_main | pleaseSignUserUp':
            log(logMessage,'MESSG');
            signUserUp(sender.tab.id, msg.data.username, msg.data.password);
        break;

        // Tab tracking

        case 'CS_main | pleaseTrackThisTab':
            log(logMessage,'MESSG');
            if(gvTrackedTabs[sender.tab.id]){
                log('Tab is being tracked, calling callback to search page',' INFO');
                callback(gvTrackedTabs[sender.tab.id]);
            } else {
                log('Tab is NOT being tracked, ending execution',' INFO');
            }
        break;

        case 'CS_main | pleaseRegisterTrackedTabAsOK':
            log(logMessage,'MESSG');
            removeTrackedTab(sender.tab.id,msg.data.trackedTab);
        break;

        case 'CS_main | pleaseRegisterTrackedTabAsProblem':
            log(logMessage,'MESSG');
            reportTrackedTabError(sender.tab.id,msg.data.trackedTab);
        break;

        // Logging

        case 'CS_main | pleaseLogMessageOnConsole':
            log(msg.message,msg.level);
        break;

        case 'userSubmittedRec | pleaseLogMessageOnConsole':
            log(msg.message,msg.level);
        break;

        case 'CS_main | pleaseLogEventInUserLog':
            userLog(sender.tab.id,msg.eventName,msg.data);
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

     log(gvScriptName_BGMessaging + ' >> message -> content_script: ' + subject, 'MESSG');

     chrome.tabs.sendMessage(tabId,
                             {sender:  'BG_main',
                              subject: subject,
                              data:    data},
                              null, // options
                              callback);
 }
