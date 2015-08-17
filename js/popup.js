/********
 * Init *
 ********/

/*
 * Global variables
 */

 var gvBackground = chrome.extension.getBackgroundPage();

/*
 *
 */
(function initialise(){

    log('popup.initialise: Start','PROCS');

    window.addEventListener('DOMContentLoaded', DOMContentLoadedListener);

})();


/**********************
 * Listener Functions *
 **********************/

/*
 *
 */
function DOMContentLoadedListener(){

    log('options.DOMContentLoadedListener: Start','PROCS');

    if (!gvBackground) {
        gvBackground = chrome.extension.getBackgroundPage();
    }
    var htmlString = '';

    Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');
    var user = Parse.User.current();

    var contentDiv = document.getElementById("contentDiv");

    htmlString += '<form id="manualSearchForm">';
    htmlString += '<div class="row">';
    if(user) {
        htmlString += '  <div class="small-12 columns header">';
        htmlString += '    <div class="row collapse">';
        htmlString += '      <div class="small-6 columns">';
        htmlString += '        <input type="text" id="fieldManualProductSearch" placeholder="Search" class="radius">';
        htmlString += '      </div>';
        htmlString += '      <div class="small-2 column text-center">';
        htmlString += '        <a href="" id="manualProductSearchSubmitButton" class="button postfix searchLinkIconPopup radius"><i class="fi-magnifying-glass searchIcon"></i></a>';
        htmlString += '      </div>';
        htmlString += '      <div class="small-2 column text-center">';
        htmlString += '        <a href="' + chrome.extension.getURL("options.html") + '" target="_blank" class="button postfix accountLinkIcon"><i class="fi-torso accountIcon"></i></a>';
        htmlString += '      </div>';
        htmlString += '      <div class="small-2 column text-center">';
        htmlString += '        <div id="showAddRecommendationWindowButton" class="button postfix accountLinkIcon"><i class="fi-plus addNewIcon"></i></div>';
        //htmlString += '        <a href="http://www.getbalu.org/webapp/addNewRecommendation.html?userId=' + gvBackground.getUserId() + '" target="_blank" class="button postfix accountLinkIcon"><i class="fi-plus addNewIcon"></i></a>';
        htmlString += '      </div>';
        htmlString += '    </div>';
        htmlString += '  </div>';
    }
    htmlString += '</div>';
    htmlString += '</form>';

    if(gvBackground.gvIsBaluOnOrOff === 'OFF'){
        htmlString += 'Balu is turned off. To get ethical recommendations while you shop <a href="' + chrome.extension.getURL("options.html") + '" target="_blank">turn Balu on</a><br />';
        contentDiv.innerHTML += htmlString;
    } else {

        if(!user){
            htmlString += '<a href="' + chrome.extension.getURL("options.html") + '" target="_blank">Log in</a> to get Balu\'s ethical recommendations while you shop<br />';
            contentDiv.innerHTML += htmlString;
        } else{
            chrome.tabs.getSelected(function(tab) {
                if(gvBackground.gvIsBaluShowOrHide === 'HIDE'){
                    htmlString += 'To show the Balu side bar, <a id="showBaluSideBarOnClick" href="">click here</a><br />';
                    contentDiv.innerHTML += htmlString;
                    document.getElementById("showBaluSideBarOnClick").addEventListener('click', showBaluSideBarOnClick);
                } else {
                    htmlString += 'To edit settings for Balu, <a href="' + chrome.extension.getURL("options.html") + '" target="_blank">click here</a><br />';
                    contentDiv.innerHTML += htmlString;
                }
                document.getElementById("manualProductSearchSubmitButton").addEventListener('click', manualProductSearchSubmit);
                document.getElementById("fieldManualProductSearch").addEventListener('keydown', manualProductSearchEnterKeyListener);
                document.getElementById("showAddRecommendationWindowButton").addEventListener('click',showAddRecommendationWindow);
            });
         }
    }

}

/*
 *
 */
function showAddRecommendationWindow() {

    log('options.showAddRecommendationWindow: Start','PROCS');

    chrome.windows.create({'url': 'userSubmittedRec.html', 'type': 'popup', 'width': 430, 'height': 500}, function(window) {
    });
}
/*
 *
 */
function showBaluSideBarOnClick(){

    log('options.showBaluSideBarOnClick: Start','PROCS');

    chrome.tabs.getSelected(function(tab) {
        gvBackground.gvIsBaluShowOrHide = 'SHOW';
        gvBackground.gvTabs[tab.id].isBaluShowOrHide_untilRefresh = 'SHOW';
        gvBackground.searchThePage_allTabs();
        window.close();
        chrome.storage.sync.set({'isBaluShowOrHide':'SHOW'}, function(){
            log('options.baluShowOrHideListener: alwaysShow checked, storage.sync.isBaluShowOrHide set to SHOW',' INFO');
        });
    });
}

function manualProductSearchEnterKeyListener(){

    log('options.manualProductSearchEnterKeyListener: Start','PROCS');

    if (event.keyCode == 13) {
        document.getElementById('manualProductSearchSubmitButton').click();
    }
}
/*
 *
 */
function manualProductSearchSubmit(){

    log('options.manualProductSearchSubmit: Start','PROCS');

    var searchTerm = document.getElementById('fieldManualProductSearch').value;

    log('options.manualProductSearchSubmit >>> searchTerm == ' + searchTerm,'DEBUG');

    var query = {active: true, currentWindow: true};

    chrome.tabs.query(query, function(tabs){
        gvBackground.manualProductSearch(tabs[0].id,searchTerm);
        // To do: doesn't work if tab is not already a fully active search bar tab
        // feel like I need to revise code structure to allow more flexibiliy over
        // forcing tab to appear. or could I just hack a varaible all the way through
        // that overrides? Might want to consider creating a port to every tab, too. Although seems like overkill just for this...

        window.close();
    });
}

/**************************
 * Error and Log handling *
 **************************/

/*
 *
 */
function log(message, levelP) {

    gvBackground.log(message,levelP);

}
