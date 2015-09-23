/********
 * Init *
 ********/

/*
 * Global variables
 */

var gvBackground;
var gvScriptName_BAMain = 'BA_main';
var gvActiveTab;
var isInvalidTab = false;

/*
 *
 */
(function initialise(){
    gvBackground = chrome.extension.getBackgroundPage();
    window.addEventListener('DOMContentLoaded', DOMContentLoadedListener);
})();


/******************
 * HTML functions *
 ******************/

/*
 *
 */
function DOMContentLoadedListener(){
    waitForBackgroundPageThenBuildPopupHTML(1);
}

/*
 * I've been finding that the popup often displays blank until you click on it a second time because this JS script can't
 * call gvBackground.log. I think this is because getBackgroundPage hasn't returned yet, but it doesn't seem to have a callback
 * So this is a wait function to ensure we don't try to build the popup until we have the background page
 *
 */
function waitForBackgroundPageThenBuildPopupHTML(counter){

    // Every 50 miliseconds, recheck to see whether we have retrieved data

    if(gvBackground !== null){
        log(gvScriptName_BAMain + '.waitForBackgroundPageThenBuildPopupHTML: Ending wait: gvBackground is set','PROCS');
        buildPopupHTML();
    } else {
        if (counter > 200) { // time out after ten seconds
            // Don't log with gvBackground!
            //console.log('ERROR: ' + gvScriptName_BAMain + '.waitForBackgroundPageThenBuildPopupHTML: Ending wait: counter reached ' + counter + ' before gvBackground was set');
            return;
        }
        counter++;
        window.setTimeout(function(){return waitForBackgroundPageThenBuildPopupHTML(counter);},50);
    }
}

/*
 *
 */
function buildPopupHTML(){

    Parse.initialize(gvBackground.gvAppId, gvBackground.gvJSKey);
    var lvUser = Parse.User.current();

    var lvHtmlString = '';

    // Get the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){

        /*******************************************
         * Determine what to display in this popup *
         *******************************************/

        gvActiveTab = gvBackground.gvTabs[tabs[0].id];

        var isThereAnErrorMessage = false;
        var errorMessage;
        if(chrome.storage.local.get('baluParseErrorMessage',function(obj){
            if(obj.baluParseErrorMessage){
                isThereAnErrorMessage = true;
                errorMessage = 'Not good!<br /><br />Something\'s gone wrong. It\'s probably got something to do with accessing the Balu database.<br /><br />Can you check your internet connection and restart Chrome? If it keeps happening, we\'d be really grateful if you could email the error message below to <a href="mailto:support@getbalu.org" target="_blank">support@getbalu.org</a><br /><br />' + obj.parseErrorMessage;
            }

            var isBaluOn = false;
            if(gvBackground.gvIsBaluOnOrOff === 'ON') {
                isBaluOn = true;
            }
            var isLoggedIn = false;
            if(lvUser) {
                isLoggedIn = true;
            }
            var isSidebarVisibleForAllTabs = false;
            if(gvBackground.gvIsBaluShowOrHide === 'SHOW') {
                isSidebarVisibleForAllTabs = true;
            }
            var isSidebarVisibleForAllTabs_untilRestart = false;
            if(gvBackground.gvIsBaluShowOrHide_untilRestart === 'SHOW'){
                isSidebarVisibleForAllTabs_untilRestart = true;
            }

            var isWebsiteOn = false;
            var isSidebarVisibleOnThisTab = false;
            var isThereAnyRecommendationsForThisTab = false;

            if(gvActiveTab){

                // to do: build generic mechanism for adding lost tabs back into gvtabs

                // Determine what to display on the popup

                if(gvActiveTab.isWebsiteOnOrOff === 'ON') {
                    isWebsiteOn = true;
                }
                if(gvActiveTab.isBaluShowOrHide_untilRefresh === 'SHOW' ) {
                    isSidebarVisibleOnThisTab = true;
                }
                if(gvActiveTab.recommendationCount > 0) {
                    isThereAnyRecommendationsForThisTab = true;
                }
            }

            // For all chrome:// and chrome-extension:// tabs, treat them as website off but in addition do not allow the search
            isInvalidTab = false;
            if(tabs[0].url.indexOf('chrome://') !== -1 || tabs[0].url.indexOf('chrome-extension://') !== -1 ) {
                isInvalidTab = true;
                isWebsiteOn = false;
            }

            /***********************************************************************************************************
             * If the sidebar is currently set to hidden but we have recommendations, then overide and display sidebar *
             ***********************************************************************************************************/

             if((!isSidebarVisibleForAllTabs || !isSidebarVisibleForAllTabs_untilRestart || !isSidebarVisibleOnThisTab) && isThereAnyRecommendationsForThisTab) {

                 // temporarily override our show/hide variables
                 gvBackground.gvIsBaluShowOrHide_tempOverride = 'SHOW';
                 gvBackground.gvTabs[gvActiveTab.tab.id].isBaluShowOrHide_untilRefresh = 'SHOW';

                 // reactivate sidebar
                 gvBackground.refreshTab(gvActiveTab.tab.id);
             }

            /******************************************************
             * build the HTML for the top bar of the popup window *
             ******************************************************/

            // For both/either not on and not logged in we just want the options link at the top of the popup
            if(!isBaluOn || !isLoggedIn || isInvalidTab) {
                lvHtmlString += '<div class="row">';
                lvHtmlString += '  <div class="small-12 columns header">';
                lvHtmlString += '    <div class="row collapse">';
                lvHtmlString += '      <div class="small-2 small-offset-10 columns end text-center">';
                lvHtmlString += '        <a href="' + chrome.extension.getURL("options.html") + '" target="_blank" class="button postfix accountLinkIcon"><i class="fi-torso accountIcon"></i></a>';
                lvHtmlString += '      </div>';
                lvHtmlString += '    </div>';
                lvHtmlString += '  </div>';
                lvHtmlString += '</div>';

            // If Balu is on and the user is logged in, then display the header (manual search and options page link)
            } else {
                lvHtmlString += '<form id="manualSearchForm">';
                lvHtmlString += '<div class="row">';
                lvHtmlString += '  <div class="small-12 columns header">';
                lvHtmlString += '    <div class="row collapse">';
                lvHtmlString += '      <div class="small-6 columns">';
                lvHtmlString += '        <input type="text" id="fieldManualSearch" placeholder="Search" class="radius">';
                lvHtmlString += '      </div>';
                lvHtmlString += '      <div class="small-2 column text-center">';
                lvHtmlString += '        <a id="manualSearchSubmit_icon" class="button postfix searchLinkIconPopup radius"><i class="fi-magnifying-glass searchIcon"></i></a>';
                lvHtmlString += '      </div>';
                lvHtmlString += '      <div class="small-2 column text-center">';
                lvHtmlString += '        <a id="showOptionsPageWindow_icon" class="button postfix accountLinkIcon"><i class="fi-torso accountIcon"></i></a>';
                lvHtmlString += '      </div>';
                lvHtmlString += '      <div class="small-2 column text-center">';
                lvHtmlString += '        <a id="showUserSubmittedRecWindow_icon" class="button postfix accountLinkIcon"><i class="fi-plus addNewIcon"></i></a>';
                lvHtmlString += '      </div>';
                lvHtmlString += '    </div>';
                lvHtmlString += '  </div>';
                lvHtmlString += '</div>';
            }

            /*************************************************************
             * build the HTML for the bottom section of the popup window *
             *************************************************************/

            if(isThereAnErrorMessage){
                lvHtmlString += errorMessage;
            } else
            if(isInvalidTab) {
                lvHtmlString += 'To search Balu, navigate to a real website (like <a href="http://www.google.com" target="_blank">Google.com</a>) and open this popup again.';
            //    lvHtmlString += '<br />';
            } else
            if(!isBaluOn) {
                lvHtmlString += 'Balu is turned off. To get Balu\'s ethical recommendations while you shop click on the account button above and turn Balu back on.';
            //    lvHtmlString += '<br />';
            } else
            if(!gvActiveTab) {
                lvHtmlString += 'Something\'s wrong! Can you try refreshing your page and clicking the Balu icon again? If that doesn\'t work, try restarting Chrome.<br /><br />If you\'re still having problems <a href="mailto:support@getbalu.org" target="_blank">contact us</a>.';
            } else
            if(!isWebsiteOn){
                lvHtmlString += 'You can search Balu manually using the search box above.<br /><br /><span style="font-size: 12px">Your current website is not an active Balu website. If this is a site you think we should "turn on", please <a id="showUserSubmittedWebsiteRecWindow_link">tell us</a>.<br /><br />We are "turning on" more websites as quickly as we can; click on the account button above to see a list of current active websites.</span>';
        //        lvHtmlString += '<br />';
            } else
            if(!isLoggedIn) {
                lvHtmlString += 'You are not logged in to Balu. To get Balu\'s ethical recommendations while you shop click on the account button above and log in or create a new account.';
        //        lvHtmlString += '<br />';
            } else

            // If we have forced the sidebar on because of a temp hide, then close the popup - we've done what we need to do with it.
            if((!isSidebarVisibleForAllTabs_untilRestart || !isSidebarVisibleOnThisTab) && isSidebarVisibleForAllTabs && isThereAnyRecommendationsForThisTab) {
                window.close();
            } else

            // If we are permanent hidden, regarldess of whether we have any recs
            if(!isSidebarVisibleForAllTabs){
                    lvHtmlString += 'Balu is not set to automatically display the sidebar. You\'ll see a number on the Balu icon instead.<br /><br />To change this setting, click the account icon above.';
        //            lvHtmlString += '<br />';
            } else

            // If we are not permanently hidden and we don't have any recs
            if(isSidebarVisibleForAllTabs && !isThereAnyRecommendationsForThisTab) {
                lvHtmlString += 'Balu does not have any ethical alternatives for products on this page. If you know of any, please tell us about them by <b>clicking on the plus icon above.';
        //        lvHtmlString += '<br />';
            } else

            // If sidebar is set to visible and we have recommendations (i.e. the sidebar is actually displayed without being forced!)
            if((isSidebarVisibleForAllTabs && isSidebarVisibleForAllTabs_untilRestart && isSidebarVisibleOnThisTab) && isThereAnyRecommendationsForThisTab) {
                lvHtmlString += 'Ethical recommendations are being displayed in the Balu sidebar. If you are having issues seeing them contact us at <a href="mailto:support@getbalu.org" target="_blank">support@getbalu.org</a>.<br /><br />If you have own ethical recommendations to share with the Balu community, click on the plus icon above.';
        //        lvHtmlString += '<br />';
            }

            var lvContentDiv = document.getElementById("contentDiv");
            lvContentDiv.innerHTML += lvHtmlString;

            if(isBaluOn && isLoggedIn && !isInvalidTab && gvActiveTab) {
                document.getElementById("manualSearchSubmit_icon").addEventListener('click', manualSearchSubmit_listener);
                document.getElementById("fieldManualSearch").addEventListener('keydown', manualSearch_keydown_listener);
                document.getElementById("showOptionsPageWindow_icon").addEventListener('click',showOptionsPageWindow_listener);
                document.getElementById("showUserSubmittedRecWindow_icon").addEventListener('click',showUserSubmittedRecWindow_listener);
            }
            if (!isWebsiteOn){
                document.getElementById('showUserSubmittedWebsiteRecWindow_link').addEventListener('click',showUserSubmittedWebsiteRecWindow_listener);
            }
        }));
    });
}
/**********************
 * Listener Functions *
 **********************/

function manualSearch_keydown_listener(event) {if (event.keyCode == 13) {manualSearchSubmit_listener();}}
function manualSearchSubmit_listener() {

    log(gvScriptName_BAMain + '.gfManualSearchSubmit_listener: Start','PROCS');

    var lvSearchTerm = document.getElementById('fieldManualSearch').value;

    // Get the active tab to display the results on
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        gvBackground.manualSearch(tabs[0].id,lvSearchTerm);
        // To do: doesn't work if tab is not already a fully active search bar tab
        // feel like I need to revise code structure to allow more flexibiliy over
        // forcing tab to appear. or could I just hack a varaible all the way through
        // that overrides? Might want to consider creating a port to every tab, too. Although seems like overkill just for this...
        window.close();
    });
}

function showOptionsPageWindow_listener() {

    log(gvScriptName_BAMain + '.showOptionsPageWindow_listener: Start','PROCS');

    gvBackground.showOptionsPageWindow(gvActiveTab.tab.id);
}

function showUserSubmittedRecWindow_listener() {

    log(gvScriptName_BAMain + '.showUserSubmittedRecWindow_listener: Start','PROCS');

    gvBackground.showUserSubmittedRecWindow(gvActiveTab.tab.id);
}

function showUserSubmittedWebsiteRecWindow_listener(){

    log(gvScriptName_BAMain + '.showUserSubmittedWebsiteRecWindow_listener: Start','PROCS');

    gvBackground.showUserSubmittedWebsiteRecWindow(gvActiveTab.tab.id);
}

/**************************
 * Error and Log handling *
 **************************/

function log(pvMessage, pvLevelP) {gvBackground.log(pvMessage,pvLevelP);}
