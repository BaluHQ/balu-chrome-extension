/********
 * Init *
 ********/

gvScriptName_BGMain = 'BG_main';

/*
 * Parse SDK Config
 *   For Prod: https://balu-parse-server.herokuapp.com/parse
 *   For Test: https://balu-parse-server-test.herokuapp.com/parse
 *   For LocalHost: http://localhost:1337/parse
 */
var gvParseServerURL = 'https://balu-parse-server.herokuapp.com/parse';
var gvAppId = 'mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu';

/*
 * Global variables
 */
var gvHaveWeAlreadyTriedToReconnectSinceLastTabRefresh = false;
var gvIsBaluOnOrOff;
var gvIsBaluShowOrHide;
var gvIsBaluShowOrHide_untilRestart = 'SHOW';
var gvIsBaluShowOrHide_tempOverride = 'HIDE'; // allows the popup to force the sidebar to display when we have recommendations but gvIsBaluShowOrHide is 'HIDE'
var gvUninstallURL = 'http://balu-directory.herokuapp.com/thanks';

var gvSearchProducts;
var gvSearchWebsites;
var gvBlockBrandParams;
var gvRecentlyVisitedWebsites; // websites that are currently "off" for this user (for website-level rec), because they've recently visited the page
var gvDelayBetweenWebsiteRecs = 5; // How long we wait before display website level recs again

var gvTabs = [];
var gvTrackedTabs = []; // These are tabs we've opened from the extension that we want to track for a bit

var gvShowJoyride;

/*
 * Every time the browser starts up (or the extension is updated) the background script initialises
 *
 * We get Balu's settings and, if Balu is on, we then load the key search data from Parse
 *
 * Note, there are three key on/off catches in the process flow:
 *  1) here, at point of background init
 *  2) in the message listener, at point of content_script's initial communication with background script
 *  3) in all other background listeners, all of which should be created in initialise()
 */

(function initialise(){

    setLoggingControl(gvParseServerURL);
    var lvFunctionName = 'initialise';
    log(gvScriptName_BGMain + '.' + lvFunctionName + ': Start','INITS');

    Parse.initialize(gvAppId);
    Parse.serverURL = gvParseServerURL;

    log(gvScriptName_BGMain + '.' + lvFunctionName + ': Initalised Balu\'s Parse Server at ' + gvParseServerURL,' INFO');

    // Listeners //

    try {
        // Listen for messages from the content scripts
        chrome.runtime.onMessage.addListener(chromeMessageListener);
        // Listen for tab closures
        chrome.tabs.onRemoved.addListener(chromeRemovedTabListener);
        // Listen for tab change
        chrome.tabs.onActivated.addListener(chromeActivatedTabListener);
        // Listen for the install event, to display a welcome page
        chrome.runtime.onInstalled.addListener(chromeInstalledExtensionListener);
        // Set the app to redirect to the directory when the user uninstalls the extension. This code is repeated in the login function, so we get the user's ID

        if(Parse.User.current()){
            chrome.runtime.setUninstallURL(gvUninstallURL + '?u=' + Parse.User.current().id,null);
        } else {
            chrome.runtime.setUninstallURL(gvUninstallURL,null);
        }

    } catch(err){
        log(gvScriptName_BGMain + '.' + lvFunctionName + ': Extension background script failed to create all necessary listeners. Error: ' + err.message,'ERROR');
    }

    // Initalise extension //

    try {
        getBaluSettings(function(settings){ // settings are passed back, but also saved to global vars
            userLog(null,'APP_LOAD_USER_STATUS',{settings: settings});
            if(settings.isBaluOnOrOff === 'ON') {
                log(gvScriptName_BGMain + '.' + lvFunctionName + ': turning Balu on and loading data. App is initialised when gvSearchProducts, gvSearchWebsites and gvRecentlyVisitedWebsites have all been loaded',' INFO');
                turnBaluOn();
                userLog(0,'APP_LOAD');
            } else {
                log(gvScriptName_BGMain + '.initialise: settings.isBaluOnOrOff !== ON',' INFO');
                setBrowserActionIcon('OFF');
                userLog(0,'INIT_OFF');
            }
        });
    } catch(err){
        log(gvScriptName_BGMain + '.' + lvFunctionName + ': failed to initalise extension (getBaluSettings/turnBaluOn/etc). Error: ' + err.message,'ERROR');
    }

})();

function turnBaluOn(){

    log(gvScriptName_BGMain + '.turnBaluOn: Start','PROCS');

    setBrowserActionIcon('ON');
    userLog(0,'APP_LOAD');

    // Load the website and search data from Parse. After these functions the background script
    // stops until a content script requests a tab initialisation. There are wait functions on
    // the tab init to ensure that website and searchProduct data are present first.
    getSearchData();
}

/*
 * Six different icons depending on whether we're pointing at prod, test or localhost parse server,
 * and then whether the extension is ON or OFF
 */
function setBrowserActionIcon(pvOnOrOff){
    log(gvScriptName_BGMain + '.setBrowserActionIcon: Start','PROCS');

    if(pvOnOrOff === 'ON') {
        if(gvParseServerURL.includes('balu-parse-server-test')) {
            chrome.browserAction.setIcon({path: chrome.extension.getURL('images/test-icon-browser_action.png')});
            chrome.browserAction.setBadgeText({text: "Test"});
        } else if (gvParseServerURL.includes('localhost')){
            // Set the browser icon to the active version
            chrome.browserAction.setIcon({path: chrome.extension.getURL('images/local-icon-browser_action.png')});
            chrome.browserAction.setBadgeText({text: "localhost"});
        } else {
            chrome.browserAction.setIcon({path: chrome.extension.getURL('images/icon-browser_action.png')});
            chrome.browserAction.setBadgeText({text: ""});
        }
    } else {
        if(gvParseServerURL.includes('balu-parse-server-test')) {
            chrome.browserAction.setIcon({path: chrome.extension.getURL('images/test-icon-browser_action-off.png')});
            chrome.browserAction.setBadgeText({text: "Test"});
        } else if (gvParseServerURL.includes('localhost')){
            // Set the browser icon to the active version
            chrome.browserAction.setIcon({path: chrome.extension.getURL('images/local-icon-browser_action-off.png')});
            chrome.browserAction.setBadgeText({text: "localhost"});
        } else {
            chrome.browserAction.setIcon({path: chrome.extension.getURL('images/icon-browser_action-off.png')});
            chrome.browserAction.setBadgeText({text: ""});
        }
    }
}
/**********************
 * Listener Functions *
 **********************/

/*
 * If a tab is closed we need to remove the tab
 */
function chromeRemovedTabListener(tabId, removeInfo){
    gvTabs.splice(tabId,1);
}

/*
 * If the active tab changes, we need to update the badge icon
 */
function chromeActivatedTabListener(activeInfo){
    // new tabs won't be in gvTabs yet, but if they're new they'll activate themselves so we don't need to worry here
    if(gvTabs[activeInfo.tabId]){
        var badgeText;
        if (gvTabs[activeInfo.tabId].recommendationCount === 0) {
            badgeText = '';
        } else {
            badgeText = "" + gvTabs[activeInfo.tabId].recommendationCount + "";
        }
        chrome.browserAction.setBadgeText({text: badgeText,tabId: activeInfo.tabId});
    }
}

/*
 * When the extension is first installed, display a welcome screen
 * Note, this can be used for updates to the extension and to Chrome too
 */
function chromeInstalledExtensionListener(details){

    if (details.reason == "install") { //reason ( enum of "install", "update", or "chrome_update" )
        chrome.tabs.create({url: chrome.runtime.getURL('options.html') + '#start-from-install'});
        //chrome.runtime.openOptionsPage();
    }
}

/*******************************
 * Setup Functions             *
 *   These are all run on init *
 *******************************/

/*
 * Check whether the extension is turned on etc and set the global variables
 */
function getBaluSettings(callback){

     log(gvScriptName_BGMain + '.getBaluSettings: Start','PROCS');

     gvIsBaluShowOrHide = 'HIDE';
     gvIsBaluOnOrOff = 'OFF';
     gvIsBaluShowOrHide_untilRestart = 'SHOW';

     // ShowHide and OnOff are held in chrome.storage, as strings

     chrome.storage.sync.get('isBaluShowOrHide',function(obj2){
         if(obj2.isBaluShowOrHide){
             gvIsBaluShowOrHide = obj2.isBaluShowOrHide;
         } else {
             gvIsBaluShowOrHide = 'SHOW'; // If nothing was found in Chrome storage then assume first use of app and default to sidebar visible
             chrome.storage.sync.set({'isBaluShowOrHide': gvIsBaluShowOrHide}, function(){
                 log(gvScriptName_BGMain + '.getBaluSettings: Nothing found in storage; storage.sync.isBaluShowOrHide set to ' + gvIsBaluShowOrHide, ' INFO');
             }); // Let this run asynchronously, because we're not going to need it again unless the extension is restarted
         }

         chrome.storage.sync.get('isBaluOnOrOff',function (obj1) {
             if(obj1.isBaluOnOrOff){
                 gvIsBaluOnOrOff = obj1.isBaluOnOrOff;
             } else {
                 gvIsBaluOnOrOff = 'ON'; // If nothing was found in Chrome storage then assume first use of app and turn on
                 chrome.storage.sync.set({'isBaluOnOrOff': gvIsBaluOnOrOff}, function(){
                     log(gvScriptName_BGMain + '.getBaluSettings: Nothing found in storage; storage.sync.isBaluOnOrOff set to ' + gvIsBaluOnOrOff, ' INFO');
                 }); // Let this run asynchronously, because we're not going to need it again unless the extension is restarted
             }

             log(gvScriptName_BGMain + '.getBaluSettings: isBaluOnOrOff == ' + gvIsBaluOnOrOff + ', isBaluShowOrHide == ' + gvIsBaluShowOrHide,' INFO');
             log(gvScriptName_BGMain + '.getBaluSettings: settings fetched from Chrome storage', 'PROCS');

             callback({isBaluOnOrOff: gvIsBaluOnOrOff,
                       isBaluShowOrHide: gvIsBaluShowOrHide});

         });
     });
 }

/*
 * This function populates three global variables with all the necessary data to identify when
 * to display the Balu Sidebar, and what content to display in it
 *
 * The three datasets are gvSearchProducts, gvSearchWebsites and gvRecentlyVisitedWebsites
 *
 * gvSearchWebsites has:
 *  - A list of all websites, with one row per website / "search level"
 *  - The search level is a concept that is  held on categoryWebsiteJoin, where a value of TRUE
 *    in isWebsiteLevelRec indicates it's website-level and a value of FALSE or undefined
 *    indicates it's product-level (which is kind of the default).
 *  - To have one website do both product-level and website-level at the same time (say,
 *    for example, we land on a search results page of Tesco which has website-level
 *    generic grocery recommendations but product-level chutney recommendations), you would
 *    need to enter two rows into categoryWebsiteJoin, one tesco.com | TRUE    and one   tesco.com | FALSE
 *  - Alternatively, blacks.co.uk only has website-level recs, so will have only one row: blacks.co.uk | TRUE
 *  - It's also possible to turn a website off entirely, for product-level and website-level search
 *    This is is configured at the Website grain, so because each website will be repeated multiple times in
 *    gvSearchWebsites, every row for any given website will have its isWebsiteOnOrOff value repeated too.
 *
 * gvRecentlyVisitedWebsites has:
 *  - All website-level rec websites the user has visited in the last gvDelayBetweenWebsiteRecs days, in an associative array indexed by website id
 *
 * gvSearchProducts has:
 *   - The SearchProduct name and search terms, listed for every categoryWebsiteJoin they are relevant to
 *   - The ProductGroup. This will allow us to identify matching recommendations after the page search
 *     is complete (the "join" between search products and recommendations is through the product groups)
 *
 * This function is run as part of the app initialisation - i.e. these datasets will
 * not refresh without a browser or extension restart.
 *
 */
function getSearchData() {

    var lvFunctionName = 'getSearchData';
    log(gvScriptName_BGMain + '.' + lvFunctionName + ': Start','PROCS');

    // These are our global variables we need to populate
    gvSearchWebsites = [];
    gvSearchProducts = [];
    gvRecentlyVisitedWebsites = {};

    // We can populate these in parallel because the sidebar will wait for both
    // to be populated before it can initialise itself.

    /********************
     * gvSearchWebsites *
     ********************/

    /* First, get all SearchCategory-Website pairs */

    var CategoryWebsiteJoin = Parse.Object.extend('CategoryWebsiteJoin');
    var categoryWebsiteJoinQuery = new Parse.Query(CategoryWebsiteJoin);
    categoryWebsiteJoinQuery.limit(1000);
    categoryWebsiteJoinQuery.include('searchCategory');
    categoryWebsiteJoinQuery.include('website');
    categoryWebsiteJoinQuery.find({
        success: function(pvCategoryWebsiteJoins){
            if(pvCategoryWebsiteJoins.length >= 1000) {
                log(gvScriptName_model + '.' + lvFunctionName + ': categoryWebsiteJoinQuery.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!','ERROR');
            }
            for(var l = 0; l < pvCategoryWebsiteJoins.length; l++) {
                // If websiteLevelRec is set, then it's website level. Otherwise it's prodcuct level
                var lvIsProductLevelRec = true;
                var lvIsWebsiteLevelRec = false;
                if(pvCategoryWebsiteJoins[l].get('isWebsiteLevelRec')) {
                    lvIsProductLevelRec = false;
                    lvIsWebsiteLevelRec = true;
                }
                gvSearchWebsites.push({// Search Category
                                       searchCategoryId:              pvCategoryWebsiteJoins[l].get('searchCategory').id,
                                       searchCategoryName:            pvCategoryWebsiteJoins[l].get('searchCategory').get('categoryName'),
                                       departments:                   pvCategoryWebsiteJoins[l].get('departments_LC'),
                                       whyDoWeCare:                   pvCategoryWebsiteJoins[l].get('searchCategory').get('whyDoWeCare'), // obsolete. still held in DB, but not used in code
                                       // Website
                                       websiteId:                     pvCategoryWebsiteJoins[l].get('website').id,
                                       websiteURL:                    pvCategoryWebsiteJoins[l].get('website').get('websiteURL'),
                                       isWebsiteOnOrOff:              pvCategoryWebsiteJoins[l].get('website').get('isWebsiteOnOrOff'),
                                       isWebsiteLevelRec:             lvIsWebsiteLevelRec,
                                       isProductLevelRec:             lvIsProductLevelRec});
            }
            log(gvScriptName_BGMain + '.' + lvFunctionName + ': ' + gvSearchWebsites.length + ' rows of gvSearchWebsites data fetched from Parse DB', 'PROCS');
        },
        error: parseErrorFind
    });

    /*****************************
     * gvRecentlyVisitedWebsites *
     *****************************/

    // we want to exclude any that the user has seen in the last gvDelayBetweenWebsiteRecs days
    // We can only do this if we're logged in, of course
    if(Parse.User.current()){
        var lvDateLimit = new Date();
        lvDateLimit.setDate(lvDateLimit.getDate() - gvDelayBetweenWebsiteRecs);

        var UserLog_WebsiteLevelRecs = Parse.Object.extend('UserLog_WebsiteLevelRecs');
        var userLog_WebsiteLevelRecsQuery = new Parse.Query(UserLog_WebsiteLevelRecs);
        userLog_WebsiteLevelRecsQuery.include('website');
        userLog_WebsiteLevelRecsQuery.greaterThanOrEqualTo('lastTimeSidebarShown',lvDateLimit);
        userLog_WebsiteLevelRecsQuery.equalTo('user',Parse.User.current()); // although the ACL would deal with this anyway
        userLog_WebsiteLevelRecsQuery.find({
            success: function(pvUserLog_websiteLevelRecs) {
                if(pvUserLog_websiteLevelRecs.length >= 1000) {
                    log(gvScriptName_model + '.' + lvFunctionName + ': userLog_WebsiteLevelRecsQuery.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!','ERROR');
                }

                var lvCounter = 0;
                for(var m = 0; m < pvUserLog_websiteLevelRecs.length; m++) {
                    if(!gvRecentlyVisitedWebsites[pvUserLog_websiteLevelRecs[m].get('website').id]){
                        lvCounter++;
                        gvRecentlyVisitedWebsites[pvUserLog_websiteLevelRecs[m].get('website').id] = true; // doesn't really matter what value is here. The fact that we found it means it's to be excluded
                    }
                }
                log(gvScriptName_BGMain + '.' + lvFunctionName + ': ' + lvCounter + ' rows of gvRecentlyVisitedWebsites data fetched from Parse DB (for this user, logged within the last ' + gvDelayBetweenWebsiteRecs + ' days)', 'PROCS');
            },
            error: parseErrorFind
        });
    }

    /********************
     * gvSearchProducts *
     ********************/

    // First get all SearchProducts, and their Categories and ProductGroups

    var SearchProduct = Parse.Object.extend('SearchProduct');
    var searchProductQuery = new Parse.Query(SearchProduct);
    searchProductQuery.include('searchCategories');
    searchProductQuery.include('productGroups');
    searchProductQuery.ascending('productGroup_sort, productName');
    searchProductQuery.limit(1000);
    searchProductQuery.find({
        success: function(searchProducts) {
            // Then get all SearchCategory-Website pairs
            var CategoryWebsiteJoin = Parse.Object.extend('CategoryWebsiteJoin');
            var categoryWebsiteJoinQuery = new Parse.Query( CategoryWebsiteJoin);
            categoryWebsiteJoinQuery.limit(1000);
            categoryWebsiteJoinQuery.include('searchCategory');
            categoryWebsiteJoinQuery.include('website');
            categoryWebsiteJoinQuery.find({
                success: function(categoryWebsiteJoins){

                    for (var i = 0; i < searchProducts.length; i++){

                        for (var j = 0; j < categoryWebsiteJoins.length; j++) {

                            if(searchProducts[i].get('searchCategories').id === categoryWebsiteJoins[j].get('searchCategory').id) {

                                var searchTermsArray = [];
                                searchTermsArray.push(searchProducts[i].get('searchTerm1'));
                                searchTermsArray.push(searchProducts[i].get('searchTerm2'));
                                searchTermsArray.push(searchProducts[i].get('searchTerm3'));
                                searchTermsArray.push(searchProducts[i].get('searchTerm4'));
                                searchTermsArray.push(searchProducts[i].get('searchTerm5'));
                                searchTermsArray.push(searchProducts[i].get('searchTerm6'));
                                searchTermsArray.push(searchProducts[i].get('searchTerm7'));

                                var negativeSearchTermsArray = [];
                                negativeSearchTermsArray.push(searchProducts[i].get('negativeSearchTerm1'));
                                negativeSearchTermsArray.push(searchProducts[i].get('negativeSearchTerm2'));
                                negativeSearchTermsArray.push(searchProducts[i].get('negativeSearchTerm3'));
                                negativeSearchTermsArray.push(searchProducts[i].get('negativeSearchTerm4'));

                                gvSearchProducts.push({// Search Category
                                                       searchCategoryId:         categoryWebsiteJoins[j].get('searchCategory').id,
                                                       categoryName:             categoryWebsiteJoins[j].get('searchCategory').get('categoryName'),
                                                       departments:              categoryWebsiteJoins[j].get('departments_LC'),
                                                       whyDoWeCare:              categoryWebsiteJoins[j].get('searchCategory').get('whyDoWeCare'),
                                                       // Website
                                                       websiteId:                categoryWebsiteJoins[j].get('website').id,
                                                       websiteURL:               categoryWebsiteJoins[j].get('website').get('websiteURL'),
                                                       isWebsiteOnOrOff:         categoryWebsiteJoins[j].get('website').get('isWebsiteOnOrOff'),
                                                       // Product Group
                                                       productGroupId:           searchProducts[i].get('productGroups').id,
                                                       productGroupName:         searchProducts[i].get('productGroups').get('productGroupName'),
                                                       // Search Product
                                                       searchProductId:          searchProducts[i].id,
                                                       productName:              searchProducts[i].get('productName'),
                                                       brand:                    searchProducts[i].get('brand'),
                                                       brand_LC:                 searchProducts[i].get('brand_LC'),
                                                       searchTermsArray:         searchTermsArray,
                                                       andOr:                    searchProducts[i].get('andOr'),
                                                       sex:                      searchProducts[i].get('sex'),
                                                       sex_LC:                   searchProducts[i].get('sex_LC'),
                                                       negativeSearchTermsArray: negativeSearchTermsArray,
                                                       negativeAndOr:            searchProducts[i].get('negativeAndOr'),
                                                       numberOfSearchHits:       0}); // this is used by the search function to count up hits (and order the results)
                            }
                        }
                    }

                    log(gvScriptName_BGMain + '.' + lvFunctionName + ': ' + gvSearchProducts.length + ' rows of gvSearchProducts data fetched from Parse DB', 'PROCS');
                },
                error: parseErrorFind
            });
        },
        error: parseErrorFind
    });
}

/******************************************************
 * Tab response functions                             *
 *   These are all run in response to messages from a *
 *   content script                                   *
 ******************************************************/

// Initalise and refresh the tab (called from CS_main at init)

/*
 * Add the requesting tab to gvTabs, an array of (custom) tab objects. Pass the tab object back to
 * callback, which gives it to the tab's content script to store (for easy access to its own state)
 *
 * The first thing we do in this function is identify whether the tab's URL matches one of
 * Balu's active websites. If it does, we save that website record in gvTabs.
 * However, even if it doesn't, we still maintain the state of the tab. This is
 * because manual search (etc) can happen on any tab.
 *
 * We can't call initialiseTab directly, because we need to be sure
 * the background script has finished initialising. So we call a recursive wait function instead.
 * If we reach the recursion limit without having detected a successful init, we call a complete
 * app init. But we only do this once! It will happen again the next time a tab is loaded/refreshed.
 *
 * if @tab is null, init all tabs
 */
function waitForExtensionInitThenInitialiseTab(tab,counter){

    // Every 50 miliseconds, recheck to see whether we have retrieved data

    var hasExtensionInitialisd = false;

    if(typeof gvSearchWebsites !== 'undefined' && typeof gvSearchProducts !== 'undefined' && typeof gvIsBaluOnOrOff !== 'undefined'){
        if(gvSearchProducts.length > 0 && gvSearchWebsites.length > 0 && gvIsBaluOnOrOff !== null){
            log(gvScriptName_BGMain + '.waitForExtensionInitThenInitialiseTab: Ending wait: gvSearchProducts (' + gvSearchProducts.length + '), gvSearchWebsites (' + gvSearchWebsites.length + ') and gvIsBaluOnOrOff (' + gvIsBaluOnOrOff + ') are set','PROCS');
            if(tab !== null) {
                initialiseTab(tab);
            } else {
                initialise_allTabs();
            }

            hasExtensionInitialisd = true;
            chrome.storage.local.set({'baluParseErrorMessage': null}, function(){
                chrome.browserAction.setBadgeText({text: ""});
            });
        }
    }

    if(!hasExtensionInitialisd) {
        if (counter > 200) { // time out after ten seconds
            log(gvScriptName_BGMain + '.waitForExtensionInitThenInitialiseTab: Ending wait: counter reached ' + counter + ' before gvSearchProducts, gvSearchWebsites and/or gvIsBaluOnOrOff were set',' INFO');
            if(!gvHaveWeAlreadyTriedToReconnectSinceLastTabRefresh){
                log(gvScriptName_BGMain + '.waitForExtensionInitThenInitialiseTab: Attmepting to reconnect app and init tab again','PROCS');
                gvHaveWeAlreadyTriedToReconnectSinceLastTabRefresh = true;
                turnBaluOn();
                waitForExtensionInitThenInitialiseTab(tab,1);
            } else {
                log(gvScriptName_BGMain + '.waitForExtensionInitThenInitialiseTab: First attempt to reconnect and reinit failed - giving up','ERROR');
            }
            return;
        } else {
            log(gvScriptName_BGMain + '.waitForExtensionInitThenInitialiseTab: Waiting...',' INFO');
        }
        counter++;
        window.setTimeout(function(){return waitForExtensionInitThenInitialiseTab(tab,counter);},50);
    }
}

function initialise_allTabs(){
    log(gvScriptName_BGMain + '.initialise_allTabs: Start','PROCS');
    for(var tab in gvTabs) {initialiseTab(gvTabs[tab].tab);}
}
function initialiseTab(tab){
    var lvFunctionName = 'initialiseTab';
    log(gvScriptName_BGMain + '.' + lvFunctionName + ': Start','PROCS');

    /* Save some details about the current tab for easy access later */

    // A website is active if it is configured for either product-level or website-level search,
    // which is set at the categoryWebsiteJoins grain. It might be configured for product-level search
    // on X searchCategories, and website-level search on another Y searchCategories. But all we
    // are going to store about the current tab is whether it's configured for one or more websites.
    // I.e. we're aggregating all that detail up to the website grain, and storing it against the tab
    // If the user navigates to an active website, we will reference gvSearchWebsites and get back down
    // to the details.

    // We're going to create a gvTabs record regardless, so these default
    // values are what we get for gvTabs records that /don't/ match to a website in gvSearchWebsites
    var lvWebsite = null;
    var lvIsWebsiteOnOrOff = 'OFF';
    var lvIsProductLevelRec = false;
    var lvIsWebsiteLevelRec = false;
    var lvHasUserVisitedWebsiteRecently = false;

    for (i = 0; i < gvSearchWebsites.length; i++) {
        if (tab.url.indexOf(gvSearchWebsites[i].websiteURL) !== -1) {

            // Note, and to do?, it is possible that a tab URL could match more than one Balu website.
            // (e.g. http://marketplace.asos.com/ would match asos.com and marketplace.asos.com)
            // If this is the case, the last website to match (they are in alphabetical order and we loop
            // through the whole lot) wins. In theory, this wouldn't matter too much: asos and asos
            // marketplace will have very similar search categories activated.

            /* The website record (see getSearchData()) */

            lvWebsite = gvSearchWebsites[i];

            // Beacuse gvTabs.website can be null, we would have to check it every time we
            // reference the website on/off etc variables. So let's create them directly inside gvTabs as well.

            /* isWebsiteOnOrOff */

            lvIsWebsiteOnOrOff = gvSearchWebsites[i].isWebsiteOnOrOff;

            /* isWebsiteLevelRec */

            // A website configured for product-level and website-level search will appear multiple times
            // in gvSearchWebsites, so we want to make sure we don't end up with this being incorretly false
            // (i.e. we only need one positive match to leave us on a positive)
            if(!lvIsProductLevelRec && gvSearchWebsites[i].isProductLevelRec) {
                lvIsProductLevelRec = true;
            }
            if(!lvIsWebsiteLevelRec && gvSearchWebsites[i].isWebsiteLevelRec) {
                lvIsWebsiteLevelRec = true;
            }

            /* hasUserVisitedWebsiteRecently */

            // Just the existence of this website in gvRecentlyVisitedWebsites tells us all we need to know.
            if(gvRecentlyVisitedWebsites[gvSearchWebsites[i].websiteId]){
                lvHasUserVisitedWebsiteRecently = true;
            }
        }
    }

    /* Add our gvTabs record */

    gvTabs[tab.id] = {tab:                           tab, // Chrome's original tab object
                      website:                       lvWebsite, // can be null, so for ease of programming, let's pull out the key values below
                      //
                      isWebsiteOnOrOff:              lvIsWebsiteOnOrOff,
                      isProductLevelRec:             lvIsProductLevelRec,
                      isWebsiteLevelRec:             lvIsWebsiteLevelRec,
                      hasUserVisitedWebsiteRecently: lvHasUserVisitedWebsiteRecently,
                      //
                      isBaluShowOrHide_untilRefresh: 'SHOW', // A setting available on every sidebar; will always be SHOW right after refresh
                      recommendationCount:           0,
                      recommendationCount_manual:    0,
                      productGroupIdsArray:          []};

   /* Do we need to show the joyride? */

   var currentUser = Parse.User.current();
   var lvJoyrideStatus;
   if(currentUser){
       lvJoyrideStatus = currentUser.get('joyrideStatus');
   }
   gvShowJoyride = false;
   if(currentUser && (typeof lvJoyrideStatus === 'undefined' || lvJoyrideStatus === 'NOT DONE')){
       gvShowJoyride = true;
   }

   /* Log it */

   log(gvScriptName_BGMain + '.' + lvFunctionName + ': tab ' + tab.id + ' saved; lvIsWebsiteOnOrOff == ' + lvIsWebsiteOnOrOff + ', isWebsiteLevelRec == ' + lvIsWebsiteLevelRec,' INFO');

   if (gvIsBaluOnOrOff === 'ON' && lvIsWebsiteOnOrOff === 'ON') {
       hideSidebar(tab.id,function(){refreshTab(tab.id);}); // the call to hideSidebar first is just to secure the code against unexpected combinations of events. In theory, this should just be refreshTab here.
   } else {
       log(gvScriptName_BGMessaging + '.onMessage: gvIsBaluOnOrOff == ' + gvIsBaluOnOrOff + ' and isWebsiteOnOrOff == ' + lvIsWebsiteOnOrOff + ', so doing nothing',' INFO');
   }

}

/*
 * We keep "refreshing" the tab separate from "initialising" to allow us to easily show/hide the side bar (e.g.
 * from the options screen, or from clicking on the browser action)
 * Anything more fundamental, like logging out and in, and turning Balu off and on, should call the init
 * functions above
 */
function refreshTab_allTabs(){
    log(gvScriptName_BGMain + '.refreshTab_allTabs: Start','PROCS');
    for(var tab in gvTabs) {refreshTab(tab.id);}
}
function refreshTab(tabId,authMessage){

    log(gvScriptName_BGMain + '.refreshTab: Start','PROCS');

    // Step one: cases where we need to re-search the page

    // Only do something if Balu is on and the website is an active website
    if(gvIsBaluOnOrOff === 'ON' && gvTabs[tabId].isWebsiteOnOrOff === 'ON') {

        log(gvScriptName_BGMain + '.refreshTab: Balu is on and website is active',' INFO');

        // Depending whether user is logged in, determines whether we show sign sidebar or run a search
        var user = Parse.User.current();
        if(user) {
            sendMessage(tabId,'pleaseSearchThePage',{productSearchData:  gvSearchProducts,
                                                     websiteSearchData:  gvSearchWebsites,
                                                     tab:                gvTabs[tabId]});
        } else {
            sendMessage(tabId,'pleaseDisplayLogInSidebar',{authMessage: authMessage});
            userLog(tabId,'SHOW_LOG_IN_SIDEBAR');
        }
    }

    // Step two: cases where we need to hide the sidebar (some overlap with previous case)

    if ((gvIsBaluOnOrOff === 'OFF' || gvIsBaluShowOrHide === 'HIDE') && gvTabs[tabId].isWebsiteOnOrOff === 'ON') {
        // If Balu is off or hidden, then we hide the sidebar.
        // It might not be displayed, but this is a catch all
        hideSidebar(tabId);
    }

    // Step three: cases where we need to blank out the badge icon

    if(gvIsBaluOnOrOff === 'OFF') {
        gvTabs[tabId].recommendationCount = 0;
        chrome.browserAction.setBadgeText({text: '',tabId: tabId});
    }
}

// // // The next three functions are the core funtionality to retrieve
      // recommendations and display the results to the user.
      //
      // They consist of:
      //  1) displayRecommendations (to put the results on the screen)
      //  2) getRecommendations (to pull recs from Parse for the auto search)
      //  3) manualSearch (to pull recs from Parse for the manual search)

/*
 *
 */
function displayRecommendations(pvArgs){

    log(gvScriptName_BGMain + '.displayRecommendations: start','PROCS');

    // Get the rec count and display it on the browser action
    if(pvArgs.searchTerm){
        gvTabs[pvArgs.tabId].recommendationCount_manual = pvArgs.recommendationData.length;
    } else {
        gvTabs[pvArgs.tabId].recommendationCount = pvArgs.recommendationData.length;
    }

    var badgeText;
    if(gvTabs[pvArgs.tabId].recommendationCount === 0) {
        badgeText = '';
    } else {
        badgeText = "" + gvTabs[pvArgs.tabId].recommendationCount + "";
    }

    chrome.browserAction.setBadgeText({text: badgeText,tabId: pvArgs.tabId});

    // Save the productGroupIdsArray into the gvTab record
    // We do this because the Feedback Page feature needs to know the IDs.
    // Arguably, though, we should be storing the entire rec set on the tab - would probably help many features. Too late though; too much of a rewrite to make the most of it
    gvTabs[pvArgs.tabId].productGroupIdsArray = pvArgs.productGroupIdsArray;

    // We only want to display the sidebar if:
    //   1) Balu is set to SHOW (gvIsBaluShowOrHide)
    //   2) The sidebar has not been temporarily hidden across all tabs (gvIsBaluShowOrHide_untilRestart)
    //   3) The sidebar has not been temporarily hidden on this tab (tab.isBaluShowOrHide_untilRefresh)
    //   4) The user hasn't recently seen this (website-level) rec
    // OR
    //   3) it is a manual search
    // OR
    //   4) the browser action is forcing the results onto the page (gvIsBaluShowOrHide_tempOverride)

    if((gvIsBaluShowOrHide === 'SHOW' &&
        gvIsBaluShowOrHide_untilRestart === 'SHOW' &&
        gvTabs[pvArgs.tabId].isBaluShowOrHide_untilRefresh === 'SHOW' &&
        !gvTabs[pvArgs.tabId].hasUserVisitedWebsiteRecently) ||
        pvArgs.searchTerm ||
        gvIsBaluShowOrHide_tempOverride === 'SHOW') {

        gvIsBaluShowOrHide_tempOverride = 'HIDE';

        if(pvArgs.websiteLevelRecs && !gvTabs[pvArgs.tabId].hasUserVisitedWebsiteRecently /* we might have overridden this, but don't want to log again */) {
            recordRecentVisitToWebsite(pvArgs.tabId);
        }
        userLog(pvArgs.tabId,'SHOW_RESULTS_SIDEBAR');
        sendMessage(pvArgs.tabId,'pleaseDisplayRecommendations',{recommendationData:     pvArgs.recommendationData,
                                                                 searchTerm:             pvArgs.searchTerm,
                                                                 showJoyride:            gvShowJoyride,
                                                                 displayChristmasBanner: pvArgs.displayChristmasBanner});
    }
}

// Retrieve recommendations (Called from CS_search after search)

/*
 * In this function, we retrieve the product recommendation data for the content_script to display
 * to the user. Unlike the search data (above), which must ALL be sent to the content_script, we
 * only retrieve and send the relevant recommendations based on the content_script's search results.
 *
 * Everytime the content_script searches the page (and finds something) it will re-request recommendations
 * from this function.
 *
 * There are two ways we determine which recommendations to pull. The first is by filtering on productGroup,
 * which is for the product-level search. The seond is by filtering on searchCategory, which is for the
 * website-level search
 *
 * @pvProductSearchResults is an array created by the content_scripts during the page search. It is simply an array
 * of elements from the gvSearchProducts array created in the above (getSearchData) function. The only
 * difference is the pvProductSearchResults array only contains the elements that were found in the user's webpage
 *
 * @pvWebsiteSearchResults is an array created by the content_scripts, a subset of gvSearchWebsites, only containing the
 * categoryWebsiteJoin rows that are relevant for the website we're currently on
 *
 * We also pull the user's rec ratings here and add them to the recs being returned so we can correctly order
 * and flag in the sidebar
 *
 * To do, the product-level/website-level split has been hacked in here a little untidily. Could do with a refactor.
 */
function getRecommendations(tabId,pvProductSearchResults,pvWebsiteSearchResults,callback_displayRecommendations) {

    log(gvScriptName_BGMain + '.getRecommendations: start','PROCS');

    // Filters for the recommendation query
    var ProductGroup = Parse.Object.extend('ProductGroup');
    productGroupQuery = new Parse.Query(ProductGroup);
    var SearchCategory = Parse.Object.extend('SearchCategory');
    searchCategoryQuery = new Parse.Query(SearchCategory);

    // Used when we construct the recommendations array
    var productGroups = {};

    /************************
     * Product-level filter *
     ************************/

    // To get the recommendations, the only part of pvProductSearchResults we're interested in is the ProductGroup.
    // If the content_script found products A, B and C on the user's webpage, and products A, B and C belong
    // to ProductGroups X, X and Y respectively, then we need to recommend ALL recommendation products that
    // belong to ProductGroups X & Y.

    // Our first step is to create an array of productGroup IDs to feed into the Parse query
    // At the same time, we will produce an associative array of {productGroupId, hitCount} objects,
    // indexed by the productGroupId so that, after we have our recommendations back from Parse,
    // we can quickly add the hitCounts in.
    // We need to pick out the max hit count because, to sort asc, we need to "flip" the hitCounts

    // We might have no pvProductSearchResults if it's for a website that's only configured for website-level search (or if we didn't find any product matches)
    if(pvProductSearchResults !== null) {
        var maxHitCount = 0;
        var productGroupIdsArray = [];
        var displayChristmasBanner = false;
        for (var i = 0; i < pvProductSearchResults.length; i++) {
            // If this is the first time we've come across this productGroup, add it to our two arrays
            if(!productGroups[pvProductSearchResults[i].productGroupId]) {
                productGroups[pvProductSearchResults[i].productGroupId] = {productGroupId: pvProductSearchResults[i].productGroupId,
                                                                           hitCount:       pvProductSearchResults[i].numberOfSearchHits || 0};
                productGroupIdsArray.push(pvProductSearchResults[i].productGroupId);
            } else {
                // Otherwise, increment the hitCount for this product group
                productGroups[pvProductSearchResults[i].productGroupId].hitCount += pvProductSearchResults[i].numberOfSearchHits;
            }
            // Check to see whether we've got a new maxHitCount
            if (productGroups[pvProductSearchResults[i].productGroupId].hitCount > maxHitCount) {
                maxHitCount = productGroups[pvProductSearchResults[i].productGroupId].hitCount;
            }
        }

        // Now we can define the filter on the Parse query (which we will use below to filter the Recommendation query
        productGroupQuery.containedIn('objectId',productGroupIdsArray);
    } else {
        // If we don't have any productSearchResults, then force this query to return nothing
        productGroupQuery.equalTo('objectId','not an object');
    }

    /************************
     * Website-level filter *
     ************************/

    // As above, we might have no pvWebsiteSearchResults if it's for a website that's only configured for product-level search
    if(pvWebsiteSearchResults !== null) {
        var lvSearchCategoryIdsArray = [];
        for (var j = 0; j < pvWebsiteSearchResults.length; j++) {
            lvSearchCategoryIdsArray.push(pvWebsiteSearchResults[j].searchCategoryId);
        }
        // Now we can define the filter on the Parse query (which we will use below to filter the Recommendation query
        searchCategoryQuery.containedIn('objectId',lvSearchCategoryIdsArray);
    } else {
        // If we don't have any pvWebsiteSearchResults, then force this query to return nothing
        searchCategoryQuery.equalTo('objectId','not an object');
    }

    /************************************
     * Query the reccommendations table *
     ************************************/

    // Before retrieveing recommendations, we need to pull the user's blocked brands
    var UserBlockedBrand = Parse.Object.extend('UserBlockedBrand');
    var userBlockedBrandQuery = new Parse.Query(UserBlockedBrand);
    userBlockedBrandQuery.include('ethicalBrand');
    userBlockedBrandQuery.equalTo('user',Parse.User.current());
    userBlockedBrandQuery.find({
        success: function(blockedBrands){
            var userBlockedBrandsArray = [];
            for(b = 0; b < blockedBrands.length; b++){
                userBlockedBrandsArray.push({__type: "Pointer",className: "EthicalBrand",objectId: blockedBrands[b].get('ethicalBrand').id});
            }
            // Set up two queries, which we'll OR together when we fire it off to Parse
            var Recommendation = Parse.Object.extend('Recommendation');
            var recommendationQuery_productGroup = new Parse.Query(Recommendation);
            var recommendationQuery_searchCategory = new Parse.Query(Recommendation);

            recommendationQuery_productGroup.matchesQuery('productGroups',productGroupQuery);
            recommendationQuery_productGroup.notContainedIn('ethicalBrand',userBlockedBrandsArray);

            recommendationQuery_searchCategory.matchesQuery('searchCategory',searchCategoryQuery);
            recommendationQuery_searchCategory.notContainedIn('ethicalBrand',userBlockedBrandsArray);

            var recommendationQuery = Parse.Query.or(recommendationQuery_productGroup,recommendationQuery_searchCategory);
            recommendationQuery.notEqualTo('isArchived',true);
            recommendationQuery.include('productGroups');
            recommendationQuery.include('ethicalBrand');
            recommendationQuery.include('searchCategory');

            var recommendationsArray = [];
            var userRecommendationRatingsArray = {};

            recommendationQuery.find({
                success: function(recommendations) {
                    // Because we need to sort the ratingScore asc, we need to know the max and min, so
                    // we need to (annoyingly) loop through the recs now, get the max/min, and then
                    // loop through them again later to build our results set
                    var maxRatingScore = 0;
                    var minRatingScore = 0;
                    var negativeOffset = 0;
                    for(a = 0; a < recommendations.length; a++){
                        var ratingScore = recommendations[a].get('ratingScore');
                        if(ratingScore > maxRatingScore) {
                            maxRatingScore = ratingScore;
                        }
                        if(ratingScore < minRatingScore) {
                            minRatingScore = ratingScore;
                        }
                    }

                    if(minRatingScore < 0) {
                        minRatingScore = 0;
                        maxRatingScore = maxRatingScore + Math.abs(minRatingScore);
                        negativeOffset = Math.abs(minRatingScore);
                    }

                    var lvDidWeGetAnyWebsiteLevelRecs = false; // we need to register this here and pass it through to display func, so we can log it iff the sidebar is active
                    for (var j = 0; j < recommendations.length; j++) {

                        // Load the imageURL separately in case there isn't one
                        var lvImageURL = "";
                        if(recommendations[j].get('image')){
                            lvImageURL = recommendations[j].get('image').url();
                        }

                        var currentProductGroupId;
                        var lvSortOrder;
                        var lvProductGroupId;
                        var lvProductGroupName;
                        var lvSectionTitle;

                        // On the sidebar we want the product-level recommendations sorted as follows:

                        // For product-level search results...

                        //   1) Product Group sections sorted by hit count
                        //   2) .. then by product group name (and ID) (to ensure the recs of product groups with matching hit counts remain grouped!)
                        //   3) Within the product group sections, sort recs by ratingScore
                        //   4) .. then by rec productName (for aesthetic purposes)
                        //  *** Note that any recs with negative votes (made by this user) will be dealt with at the point of rendering the HTML (and shoved at the bottom of their respective product groups) ***

                        // For the numbers, flip them so sort asc works, then turn them into strings of fixed length with leading zeros
                        //   15 leading 0s, plus the number itself tagged on the end, trimmed back to 15 (I think. Whatever -pad.length does!)

                        // But now taking into account website-level recs....

                        // There's an intractable problem here, because in rare cases, where we have recs configured as both product-level and website-level,
                        // we lose the ability to differentiate them (because we return a discreet list of recs from a single query).
                        // We default to putting recs in the productLevel block if one (that matches on ProductGroup) exists

                        // confused here about the different ways this can be populated, so covering all bases
                        if(typeof recommendations[j].get('productGroups') !== 'undefined' && typeof recommendations[j].get('productGroups').id !== 'undefined' && typeof productGroups[recommendations[j].get('productGroups').id] !== 'undefined') {
                            currentProductGroupId = recommendations[j].get('productGroups').id;
                            var currentProductGroupName = recommendations[j].get('productGroups').get('productGroupName');
                            var pad = '000000000000000';
                            var productGroupHitCount_asString = (pad + (maxHitCount - productGroups[currentProductGroupId].hitCount)).slice(-pad.length);
                            var ratingScore_asString = (pad + (maxRatingScore - (recommendations[j].get('ratingScore')+negativeOffset))).slice(-pad.length);
                            lvSortOrder = productGroupHitCount_asString + '_' + currentProductGroupName + '_' + currentProductGroupId + '_' + ratingScore_asString + '_' + recommendations[j].get('productName');

                            lvProductGroupId = recommendations[j].get('productGroups').id;
                            lvProductGroupName = recommendations[j].get('productGroups').get('productGroupName');
                            lvSectionTitle = lvProductGroupName;
                        } else {
                            // website-level recs
                            lvSortOrder = 'z' + j; // force it to be a string
                            lvSectionTitle = recommendations[j].get('searchCategory').get('categoryName');
                            lvProductGroupId = null;
                            lvDidWeGetAnyWebsiteLevelRecs = true;
                            // by putting this here, and logging website-level recs in the following display func, we ensure that a user doesn't get
                            // logged as a recent visitor unless they not only saw website-level recs, but saw them under a generic guise: i.e. with no
                            // matching products on the screen. This is all rare case anyway.
                        }

                        recommendationsArray.push({productGroupId:         lvProductGroupId,
                                                   sectionTitle:           lvSectionTitle,
                                                   productGroupName:       lvProductGroupName,
                                                   recommendationId:       recommendations[j].id,
                                                   productName:            recommendations[j].get('productName'),
                                                   pageConfirmationSearch: recommendations[j].get('pageConfirmationSearch'),
                                                   productURL:             recommendations[j].get('productURL'),
                                                   brandName:              recommendations[j].get('ethicalBrand').get('brandName'),
                                                   brandId:                recommendations[j].get('ethicalBrand').id,
                                                   baluFavourite:          recommendations[j].get('ethicalBrand').get('baluFavourite'),
                                                   imageURL:               lvImageURL,
                                                   twitterHandle:          recommendations[j].get('ethicalBrand').get('twitterHandle'),
                                                   brandSpiel:             recommendations[j].get('ethicalBrand').get('brandSpiel').replace(/(\r\n|\n|\r)/g,"<br />"),
                                                   sortOrder:              lvSortOrder});

                        // If the recommendaiton we've just added is flagged to display the Christmas banner, then set the variable
                        if(typeof recommendations[j].get('productGroups') !== 'undefined') {
                            if(recommendations[j].get('productGroups').get('christmasBanner') === true){
                                displayChristmasBanner = true;
                            }
                        }
                    } // loop through recommendations

                    if (recommendationsArray.length > 0){
                        recommendationsArray = recommendationsArray.sort(function(a,b){
                            return a.sortOrder.localeCompare(b.sortOrder);
                        });
                        // Build up the parameters that we'll pass through to the displayRecommendations function
                        var lvArgs_displayRecs = {tabId: tabId,
                                                  recommendationData: recommendationsArray,
                                                  searchTerm: null,
                                                  displayChristmasBanner: displayChristmasBanner,
                                                  productGroupIdsArray: productGroupIdsArray,
                                                  websiteLevelRecs: lvDidWeGetAnyWebsiteLevelRecs};
                        callback_displayRecommendations(lvArgs_displayRecs);
                        userLog(tabId,'RECOMMENDATIONS_FOUND',{recommendationsArray: recommendationsArray});
                    } else {
                        // Because there should be a recommendation for every productGroup of every searchProduct,
                        // this eventuality is unlikely to happen.
                        // It should only happen if the user has blocked brands.
                        // And it is, of course, possible that the user will block the only brand left on the sidebar,
                        // which means we need to do a cautious call to hideSidebar (even though it may not be displayed)
                        hideSidebar(tabId);
                        gvTabs[tabId].recommendationCount = 0;
                        chrome.browserAction.setBadgeText({text: '',tabId: tabId});
                        userLog(tabId,'RECOMMENDATIONS_NOT_FOUND');
                    }
                },
                error: parseErrorFind
            }); // recommendationQuery
        },
        error: parseErrorFind
    }); // userBlockedBrandQuery
}

// Main sidebar functionality

/*
 * I can't see an obvious way to integrate this with the existing search functions,
 * so repeating the code here.
 */
function manualSearch(pvTabId, pvSearchTerm) {

    log(gvScriptName_BGMain + '.manualSearch: Start >>> pvTabId == ' + pvTabId + ', pvSearchTerm == ' + pvSearchTerm,'PROCS');

    // Build up the parameters that we'll pass through to the displayRecommendations function
    var lvArgs_displayRecs = {tabId: pvTabId,
                              recommendationData: [],
                              searchTerm: pvSearchTerm,
                              displayChristmasBanner: false,
                              productGroupIdsArray: []};

    if(pvSearchTerm === ''){
        displayRecommendations(lvArgs_displayRecs);
        userLog(pvTabId,'MANUAL_SEARCH_EMPTY_STRING');
    } else{

        userLog(pvTabId,'MANUAL_SEARCH',{searchTerm: pvSearchTerm});

        var lvSearchTerm_LC = pvSearchTerm.toLowerCase();
        var isMenInSearchTerm = false;
        var isWomenInSearchTerm = false;

        // We really don't want "men's ---" to return product's with "women's ---" in the name, so we have to do a little manual hack to fix this
        // While we're at it, we may as well match both "women" and "men" on sex
        if(lvSearchTerm_LC.indexOf('men') === 0 || lvSearchTerm_LC.indexOf(' men') !== -1 || lvSearchTerm_LC.indexOf('man') === 0 || lvSearchTerm_LC.indexOf(' man') !== -1) {
            isMenInSearchTerm = true;
        }
        if(lvSearchTerm_LC.indexOf('women') !== -1 || lvSearchTerm_LC.indexOf('woman') !== -1 || lvSearchTerm_LC.indexOf('lady') !== -1 || lvSearchTerm_LC.indexOf('ladies') !== -1) {
            isWomenInSearchTerm = true;
        }

        /******************************************************************
         * Hit the searchProducts with a whole bunch of different filters *
         ******************************************************************/

        var SearchProduct = Parse.Object.extend('SearchProduct');

        var searchProductQuery_productName  = new Parse.Query(SearchProduct);
        var searchProductQuery_brand        = new Parse.Query(SearchProduct);
        var searchProductQuery_searchTerm1  = new Parse.Query(SearchProduct);
        var searchProductQuery_searchTerm2  = new Parse.Query(SearchProduct);
        var searchProductQuery_searchTerm3  = new Parse.Query(SearchProduct);
        var searchProductQuery_searchTerm4  = new Parse.Query(SearchProduct);
        var searchProductQuery_searchTerm5  = new Parse.Query(SearchProduct);
        var searchProductQuery_searchTerm6  = new Parse.Query(SearchProduct);
        var searchProductQuery_productGroupName = new Parse.Query(SearchProduct);

        searchProductQuery_productName.contains('productName_LC',lvSearchTerm_LC);
        searchProductQuery_brand.contains('brand_LC',lvSearchTerm_LC);
        searchProductQuery_searchTerm1.contains('searchTerm1_LC',lvSearchTerm_LC);
        searchProductQuery_searchTerm2.contains('searchTerm2_LC',lvSearchTerm_LC);
        searchProductQuery_searchTerm3.contains('searchTerm3_LC',lvSearchTerm_LC);
        searchProductQuery_searchTerm4.contains('searchTerm4_LC',lvSearchTerm_LC);
        searchProductQuery_searchTerm5.contains('searchTerm5_LC',lvSearchTerm_LC);
        searchProductQuery_searchTerm6.contains('searchTerm6_LC',lvSearchTerm_LC);
        searchProductQuery_productGroupName.contains('productGroup_sort',lvSearchTerm_LC);

        // To do: the negative search terms?

        var searchProductCompoundQuery = Parse.Query.or(searchProductQuery_productName,
                                                        searchProductQuery_brand,
                                                        searchProductQuery_searchTerm1,
                                                        searchProductQuery_searchTerm2,
                                                        searchProductQuery_searchTerm3,
                                                        searchProductQuery_searchTerm4,
                                                        searchProductQuery_searchTerm5,
                                                        searchProductQuery_searchTerm6,
                                                        // We can't do any more - max OR clauses reached
                                                        searchProductQuery_productGroupName);
        searchProductCompoundQuery.include('searchCategories');
        searchProductCompoundQuery.find({
            success: function(searchProducts){
                for (var i = 0; i < searchProducts.length; i++) {
                    var includeThisProduct = true;
                    if(isMenInSearchTerm && isWomenInSearchTerm) {
                        // do nothing
                    } else {
                        if(isMenInSearchTerm && searchProducts[i].get('sex_LC') === 'women') {
                            includeThisProduct = false;
                        }
                        if(isWomenInSearchTerm && searchProducts[i].get('sex_LC') === 'men') {
                            includeThisProduct = false;
                        }
                    }
                    if(includeThisProduct) {
                        lvArgs_displayRecs.productGroupIdsArray.push(searchProducts[i].get('productGroups').id);
                    }
                }

                /*******************************************************************
                 * Hit the recommendations with a whole bunch of different filters *
                 *******************************************************************/

                var Recommendation = Parse.Object.extend('Recommendation');

                // Product-level recs have productGroups
                var ProductGroup = Parse.Object.extend('ProductGroup');
                var productGroupQuery = new Parse.Query(ProductGroup);
                productGroupQuery.containedIn('objectId',lvArgs_displayRecs.productGroupIdsArray);
                var recommendationQuery_productGroups = new Parse.Query(Recommendation);
                recommendationQuery_productGroups.matchesQuery('productGroups',productGroupQuery);

                // Website-level recs have SearchCategories
                var SearchCategory = Parse.Object.extend('SearchCategory');
                var searchCategoryQuery = new Parse.Query(SearchCategory);
                searchCategoryQuery.contains('categoryName_LC',lvSearchTerm_LC);
                var recommendationQuery_searchCategory = new Parse.Query(Recommendation);
                recommendationQuery_searchCategory.matchesQuery('ethicalBrand',searchCategoryQuery);

                // All recs have a brand
                var EthicalBrand = Parse.Object.extend('EthicalBrand');
                var ethicalBrandQuery = new Parse.Query(EthicalBrand);
                ethicalBrandQuery.contains('brandName_LC',lvSearchTerm_LC);
                ethicalBrandQuery.notEqualTo('isArchived',true);
                var recommendationQuery_ethicalBrand = new Parse.Query(Recommendation);
                recommendationQuery_ethicalBrand.matchesQuery('ethicalBrand',ethicalBrandQuery);

                // Also search on productName ...
                var recommendationQuery_productName = new Parse.Query(Recommendation);
                recommendationQuery_productName.contains('productName_LC',lvSearchTerm_LC);

                // ... and productURL
                var recommendationQuery_productURL = new Parse.Query(Recommendation);
                recommendationQuery_productURL.contains('productURL',lvSearchTerm_LC);

                // Compound the whole lot together
                var recommendationCompoundQuery = Parse.Query.or(recommendationQuery_productGroups,
                                                                 recommendationQuery_searchCategory,
                                                                 recommendationQuery_ethicalBrand,
                                                                 recommendationQuery_productName,
                                                                 recommendationQuery_productURL);

                recommendationCompoundQuery.include('productGroups');
                recommendationCompoundQuery.include('ethicalBrand');

                // And remove the archived recs
                recommendationCompoundQuery.notEqualTo('isArchived',true);

                // The sort order is important, otherwise the ProductGroups will not
                // form up correctly on the sidebar
                recommendationCompoundQuery.ascending('productGroup_sort,-ratingScore, productName');

                recommendationCompoundQuery.find({
                    success: function(recommendations){
                        var lvProductGroupId;
                        var lvProductGroupName;
                        var lvSectionTitle;
                        for (var j = 0; j < recommendations.length; j++) {
                            var imageURL = "";
                            if(recommendations[j].get('image')){
                                imageURL = recommendations[j].get('image').url();
                            }
                            // confused here about the different ways this can be populated, so covering all bases
                            if(typeof recommendations[j].get('productGroups') !== 'undefined' && typeof recommendations[j].get('productGroups').id !== 'undefined') {
                                lvProductGroupId = recommendations[j].get('productGroups').id;
                                lvProductGroupName = recommendations[j].get('productGroups').get('productGroupName');
                                lvSectionTitle = lvProductGroupName;
                            } else {
                                // website-level recs
                                lvSectionTitle = recommendations[j].get('searchCategory').get('categoryName');
                                lvProductGroupId = null;
                            }

                            lvArgs_displayRecs.recommendationData.push({productGroupId:         lvProductGroupId,
                                                                        sectionTitle:           lvSectionTitle,
                                                                        productGroupName:       lvProductGroupName,
                                                                        recommendationId:       recommendations[j].id,
                                                                        productName:            recommendations[j].get('productName'),
                                                                        pageConfirmationSearch: recommendations[j].get('pageConfirmationSearch'),
                                                                        productURL:             recommendations[j].get('productURL'),
                                                                        brandName:              recommendations[j].get('ethicalBrand').get('brandName'),
                                                                        brandId:                recommendations[j].get('ethicalBrand').id,
                                                                        baluFavourite:          recommendations[j].get('ethicalBrand').get('baluFavourite'),
                                                                        imageURL:               imageURL,
                                                                        twitterHandle:          recommendations[j].get('ethicalBrand').get('twitterHandle'),
                                                                        brandSpiel:             recommendations[j].get('ethicalBrand').get('brandSpiel').replace(/(\r\n|\n|\r)/g,"<br />")});

                           // If the recommendation we've just added is flagged to display the Christmas banner, then set the variable
                           if(typeof recommendations[j].get('productGroups') !== 'undefined') {
                               if(recommendations[j].get('productGroups').get('christmasBanner') === true){
                                   lvArgs_displayRecs.displayChristmasBanner = true;
                               }
                           }
                        }

                        // Note, the content_script will catch no-results and display the empty side bar
                        // But we also want to log no results separately, because these could be products we should be adding to Balu
                        if(!recommendations || lvArgs_displayRecs.recommendationData.length === 0) {
                            userLog(pvTabId,'MANUAL_SEARCH_NO_RESULTS',{searchTerm: pvSearchTerm});
                        }
                        displayRecommendations(lvArgs_displayRecs);
                        userLog(pvTabId,'MANUAL_SEARCH_RECOMMENDATIONS_RETURNED',{searchTerm: pvSearchTerm, recommendationsArray: lvArgs_displayRecs.recommendationData});
                    },
                    error: parseErrorFind
                });
            },
            error: parseErrorFind
        });
    }
}

/*
 *
 */
function recordRecentVisitToWebsite(tabId) {

    var lvFunctionName = 'recordRecentVisitToWebsite';
    log(gvScriptName_BGMain + '.' + lvFunctionName + ': Start','PROCS');

    // I need to hold the recent visits in memory, loaded on app load
    // and stored as an associative array so they can be easily checked and updated
    // everytime we refresh a website-level page
    if(gvRecentlyVisitedWebsites[gvTabs[tabId].website.websiteId]) {
        // do nothing, it's already in there
    } else {
        gvRecentlyVisitedWebsites[gvTabs[tabId].website.websiteId] = true;
        userLog(tabId,'RECOMMENDATIONS_WEBSITE_LEVEL_REC'); // written to the DB, so on the next app load we bring it into gvRecentlyVisitedWebsites
    }
}

function markJoyrideAsDone(){

    log(gvScriptName_BGMain + '.markJoyrideAsDone: start','PROCS');

    var currentUser = Parse.User.current();
    currentUser.set('joyrideStatus', 'DONE');
    currentUser.save();
    gvShowJoyride = false;
}

function markJoyrideAsNotDone(callback){

    log(gvScriptName_BGMain + '.markJoyrideAsNotDone: start','PROCS');

    var currentUser = Parse.User.current();
    currentUser.set('joyrideStatus', 'NOT DONE');
    currentUser.save();
    gvShowJoyride = true;

    userLog(null,'JOYRIDE_REACTIVATE',{joyrideIndex: -1});

    callback();

}

function showOptionsPageWindow(tabId, pvPage){

    log(gvScriptName_BGMain + '.showOptionsPageWindow: start','PROCS');

    var lvPage = 'options.html';
    if(pvPage !== null) {
        lvPage = pvPage;
    }
    // Note: the user log is created by the options page

    chrome.tabs.create({'url': chrome.extension.getURL(lvPage)}, function(tab) {});

}

function showProductLinkWindow(tabId,productURL,recommendationId, recProductName, pageConfirmationSearch, isManualSearch){

    log(gvScriptName_BGMain + '.showProductLinkWindow: start','PROCS');

    userLog(tabId,'REC_CLICK_THROUGH',{recommendationId:       recommendationId,
                                       productURL:             productURL,
                                       pageConfirmationSearch: pageConfirmationSearch,
                                       recProductName:         recProductName,
                                       isManualSearch:         isManualSearch});

    chrome.tabs.create({'url': productURL}, function(tab){trackNewTab(tab,productURL,recommendationId,pageConfirmationSearch);});

    // In parallel, register this click on the recommendation's click count

    // don't log for the dev / test user
    if(Parse.User.current().get('email') !== 'dev.baluhq@gmail.com'){

        var RecommendationClickCount = Parse.Object.extend('RecommendationClickCount');
        var recommendationClickCountQuery = new Parse.Query(RecommendationClickCount);
        recommendationClickCountQuery.equalTo('recommendation',{__type: "Pointer",className: "Recommendation",objectId: recommendationId});
        recommendationClickCountQuery.find({
            success: function(recommendationClickCounts){
                if(recommendationClickCounts.length === 1) {
                    recommendationClickCounts[0].increment("clickCount");
                    recommendationClickCounts[0].save();
                } else {
                    recommendationClickCount = new RecommendationClickCount();
                    recommendationClickCount.set('recommendation',{__type: "Pointer",className: "Recommendation",objectId: recommendationId});
                    recommendationClickCount.set('clickCount',1);

                    var acl = new Parse.ACL();
                    acl.setRoleReadAccess("Analytics",true);
                    acl.setReadAccess(Parse.User.current(),true);
                    acl.setWriteAccess(Parse.User.current(),true);
                    recommendationClickCount.setACL(acl);

                    recommendationClickCount.save();
                }
            },
            error: parseErrorFind
        });
    }
}
/*
function voteProductUpOrDown(tabId,recommendationId,upOrDown){

    log(gvScriptName_BGMain + '.voteProductUpOrDown: start','PROCS');

    var ratingScore = 0;

    // We save upOrDown for good measure, but also a rating score to make retrieving the score easier
    if(upOrDown === 'UP'){
        ratingScore = 1;
    } else if (upOrDown === 'DOWN'){
        ratingScore = -1;
    }

    var Recommendation = Parse.Object.extend('Recommendation');
    var recommendationQuery = new Parse.Query(Recommendation);
    recommendationQuery.get(recommendationId,{
        success: function(recommendation){
            var UserRecommendationRating = Parse.Object.extend('UserRecommendationRating');
            var userRecommendationRatingQuery = new Parse.Query(UserRecommendationRating);
            userRecommendationRatingQuery.include('recommendation');
            userRecommendationRatingQuery.include('user');

            userRecommendationRatingQuery.equalTo('recommendation',recommendation);
            userRecommendationRatingQuery.equalTo('user',Parse.User.current());

            userRecommendationRatingQuery.find({
                success: function(userRecommendationRatings){
                    if(userRecommendationRatings.length === 1) {

                        // if it's already set to the selected value, then take it back to null/null
                        if(userRecommendationRatings[0].get('upOrDownOrNull') === upOrDown){
                            upOrDown = 'NULL';
                            ratingScore = 0;
                        }
                        userRecommendationRatings[0].set('upOrDownOrNull',upOrDown);
                        userRecommendationRatings[0].set('ratingScore',ratingScore);
                        userRecommendationRatings[0].save(null, {
                            success: function(userRecommendationRating){
                                userLog(tabId,'RECOMMENDATION_RATING',{recommendationId: userRecommendationRatings[0].get('recommendation').id,
                                                                            upOrDownOrNull: upOrDown});
                                log(gvScriptName_BGMain + '.userRecommendationRating_createOrUpdate: updated existing userRecommendationRating object','DEBUG');
                            },
                            error: parseErrorSave
                        });
                    } else {
                        var user = Parse.User.current();
                        userRecommendationRating = new UserRecommendationRating();
                        userRecommendationRating.set('recommendation',recommendation);
                        userRecommendationRating.set('user',user);
                        userRecommendationRating.set('upOrDownOrNull',upOrDown);
                        userRecommendationRating.set('ratingScore',ratingScore);

                        var acl = new Parse.ACL();
                        acl.setRoleReadAccess("Analytics",true);
                        acl.setReadAccess(user,true);
                        acl.setWriteAccess(user,true);
                        userRecommendationRating.setACL(acl);

                        userRecommendationRating.save(null, {
                            success: function(userRecommendationRatings){
                                userLog(tabId,'RECOMMENDATION_RATING',{recommendationId: recommendation.id,
                                                                            upOrDownOrNull: upOrDown});
                                log(gvScriptName_BGMain + '.userRecommendationRating_createOrUpdate: created new userRecommendationRating object','DEBUG');

                            },
                            error: parseErrorSave
                        });
                    }
                },
                error: parseErrorFind
            });
        },
        error: parseErrorGet
    });
}
*/

function showTweetWindow(tabId,tweetContent){

    log(gvScriptName_BGMain + '.showTweetWindow: start','PROCS');

    userLog(tabId,'SHOW_TWEET_WINDOW',{tweetContent: tweetContent});

    chrome.windows.create({'url': 'https://twitter.com/home?status=' + tweetContent, 'type': 'popup', 'width': 550, 'height': 450, 'left': 300,'top': 100}, function(window) {});

}

function showBlockBrandWindow(tabId,data){

    log(gvScriptName_BGMain + '.showBlockBrandWindow: start','PROCS');

    gvBlockBrandParams = data;

    chrome.windows.create({'url': chrome.extension.getURL('userBlockBrand.html'), 'type': 'popup', 'width': 450, 'height': 450, 'left': 300,'top': 100}, function(window) {});
}

function blockBrand(tabId,data){

    log(gvScriptName_BGMain + '.blockBrand: start','PROCS');

    var UserBlockedBrand = Parse.Object.extend("UserBlockedBrand");
    var userBlockedBrand = new UserBlockedBrand();

    userBlockedBrand.set('user',Parse.User.current());
    userBlockedBrand.set('ethicalBrand',{__type: "Pointer",className: "EthicalBrand",objectId: data.brandId});

    var acl = new Parse.ACL();
    acl.setRoleReadAccess("Analytics",true);
    acl.setReadAccess(Parse.User.current(),true);
    acl.setWriteAccess(Parse.User.current(),true);
    userBlockedBrand.setACL(acl);

    userBlockedBrand.save(null,{
        success: function(userBlockedBrand){
            sendMessage(tabId,'pleaseShowUserBlockBrandSuccessWindow');
            userLog(null,'USER_BLOCK_BRAND',data);
            refreshTab_allTabs();
        },
        error: parseErrorSave
    });
}

function unBlockBrand(brandId,callback){

    log(gvScriptName_BGMain + '.unBlockBrand: start','PROCS');

    var UserBlockedBrand = Parse.Object.extend("UserBlockedBrand");
    var userBlockedBrandQuery = new Parse.Query(UserBlockedBrand);
    userBlockedBrandQuery.equalTo('ethicalBrand',{__type: "Pointer",className: "EthicalBrand",objectId: brandId});
    userBlockedBrandQuery.find({
        success: function(userBlockedBrands){

            // Save some data ready for logging. We are not going to get the other data because we can't be absolutely sure it's all still there
            var data = {recommendationId: null,
                        productName:      null,
                        brandName:        null,
                        brandId:          userBlockedBrands[0].get('ethicalBrand').id,
                        reason:           '',
                        tabURL:           'options.html'};

            Parse.Object.destroyAll(userBlockedBrands).then(callback());
            refreshTab_allTabs();
            userLog(null,'USER_UNBLOCK_BRAND',data);
        },
        error: parseErrorFind
    });
}

function showUserSubmittedRecWindow(tabId){

    log(gvScriptName_BGMain + '.showUserSubmittedRecWindow: start','PROCS');

    userLog(tabId,'SHOW_USER_SUB_REC_WINDOW');

    chrome.windows.create({'url': chrome.extension.getURL('userSubmittedRec.html'), 'type': 'popup', 'width': 450, 'height': 450, 'left': 300,'top': 100}, function(window) {});
}

/*
 * @data contains the field values from the html form
 */
function saveUserSubmittedRec(tabId,formFieldValues){

    log(gvScriptName_BGMain + '.saveUserSubmittedRec: start','PROCS');

    var UserSubmittedRec = Parse.Object.extend("UserSubmittedRec");
    var userSubmittedRec = new UserSubmittedRec();

    userSubmittedRec.set('user',Parse.User.current());
    userSubmittedRec.set('productName',formFieldValues.productName);
    userSubmittedRec.set('URLOrTwitter',formFieldValues.URLOrTwitter);
    userSubmittedRec.set('why',formFieldValues.why);

    var acl = new Parse.ACL();
    acl.setRoleReadAccess("Analytics",true);
    acl.setReadAccess(Parse.User.current(),true);
    acl.setWriteAccess(Parse.User.current(),true);
    userSubmittedRec.setACL(acl);

    userSubmittedRec.save(null,{
        success: function(userSubmittedRec){
            sendMessage(tabId,'pleaseShowUserSubmittedRecSuccessWindow');
        },
        error: parseErrorSave
    });
}

function showUserSubmittedWebsiteRecWindow(tabId){

    log(gvScriptName_BGMain + '.showUserSubmittedWebsiteRecWindow: start','PROCS');

    userLog(tabId,'SHOW_USER_SUB_WEB_REC_WINDOW');

    chrome.windows.create({'url': chrome.extension.getURL('userSubmittedWebsiteRec.html'), 'type': 'popup', 'width': 450, 'height': 450, 'left': 300,'top': 100}, function(window) {});
}

/*
 * @data contains the field values from the html form
 */
function saveUserSubmittedWebsiteRec(tabId,formFieldValues){

    log(gvScriptName_BGMain + '.saveUserSubmittedWebsiteRec: start','PROCS');

    var UserSubmittedWebsiteRec = Parse.Object.extend("UserSubmittedWebsiteRec");
    var userSubmittedWebsiteRec = new UserSubmittedWebsiteRec({ACL: new Parse.ACL(Parse.User.current())});

    userSubmittedWebsiteRec.set('user',Parse.User.current());
    userSubmittedWebsiteRec.set('websiteRec',formFieldValues.fieldWebsiteRec);

    var acl = new Parse.ACL();
    acl.setRoleReadAccess("Analytics",true);
    acl.setReadAccess(Parse.User.current(),true);
    acl.setWriteAccess(Parse.User.current(),true);
    userSubmittedWebsiteRec.setACL(acl);

    userSubmittedWebsiteRec.save(null,{
        success: function(userSubmittedRec){
            sendMessage(tabId,'pleaseShowUserSubmittedWebsiteRecSuccessWindow');
        },
        error: parseErrorSave
    });
}


function hideSidebar_untilRefresh(tabId) {

    log(gvScriptName_BGMain + '.hideSidebar_untilRefresh: start','PROCS');

    userLog(tabId,'HIDE_SIDEBAR_REFRESH');

    gvTabs[tabId].isBaluShowOrHide_untilRefresh = 'HIDE';

    // without setting the Chrome storage (or gvIsBaluShowOrHide), sidebar will display after next refresh
    hideSidebar(tabId);
}

function hideSidebar_untilRestart(tabId) {

    log(gvScriptName_BGMain + '.hideSidebar_untilRestart: start','PROCS');

    userLog(tabId,'HIDE_SIDEBAR_RESTART');

    gvIsBaluShowOrHide_untilRestart = 'HIDE'; // without setting Chrome storage, sidebar will display after next extension load (browser restart)
    hideSidebar_allTabs();
}

function hideSidebar_allTabs(){
    log(gvScriptName_BGMain + '.hideSidebar_allTabs: start','PROCS');
    for(var tab in gvTabs) {hideSidebar(gvTabs[tab].tab.id);}
}
function hideSidebar(tabId,callback) {
    log(gvScriptName_BGMain + '.hideSidebar: start','PROCS');
    sendMessage(tabId,'pleaseHideSidebar',null,callback);

}

function showInfoWindow(tabId){

    log(gvScriptName_BGMain + '.showInfoWindow: start','PROCS');

    userLog(tabId,'SHOW_INFO_WINDOW');

    chrome.tabs.create({'url': 'http://www.getbalu.org/'});
}

function showFAQWindow(tabId){

    log(gvScriptName_BGMain + '.showFAQWindow: start','PROCS');

    userLog(tabId,'SHOW_FAQ_WINDOW');

    chrome.windows.create({'url': 'http://www.getbalu.org/webapp/FAQs.html', 'type': 'popup', 'width': 450, 'height': 450, 'left': 300,'top': 100}, function(window) {});
}

function showPrivacyWindow(tabId){

    log(gvScriptName_BGMain + '.showFAQWindow: start','PROCS');

    userLog(tabId,'SHOW_PRIVACY_WINDOW');

    chrome.windows.create({'url': 'http://www.getbalu.org/webapp/privacy.html', 'type': 'popup', 'width': 450, 'height': 450, 'left': 300,'top': 100}, function(window) {});
}

// Log in

function logUserIn(tabId,username,password,callback){

    log(gvScriptName_BGMain + '.logUserIn: start','PROCS');

    Parse.User.logIn(username,password, {
        success: function(user) {
            userLog(tabId,'USER_LOG_IN',{user: user});
            chrome.extension.getBackgroundPage().waitForExtensionInitThenInitialiseTab(null,1);

            // Reset the uninstall redirect URL (this is originally set in the initialise function, but if the user installs the app, logs in, and then uninstalls, we won't get the user ID unless
            // we update the URL here at point on login)
            chrome.runtime.setUninstallURL(gvUninstallURL + '?u=' + Parse.User.current().id,null);

            // If we're logging in from the options page we have a callback to refresh the page
            // If we're logging in from the sidebar we dont need a callback because refreshTab takes care of everything
            if(callback) {
                callback();
            }
        },
        error: function(user,error){
            var lvErrorMessage = error.message;
            if(error.code === 101){
                lvErrorMessage = 'Incorrect email or password';
            }
            if(callback){
                callback(lvErrorMessage);
            } else {
                refreshTab(tabId,lvErrorMessage);
            }
        }
    });
}

function signUserUp(tabId,username,password,callback){

    log(gvScriptName_BGMain + '.signUserUp: start','PROCS');

    var user = new Parse.User();
    user.set("username", username.toLowerCase());
    user.set("password", password);
    user.set("email",    username.toLowerCase());
    user.set("joyrideStatus", 'NOT DONE');

    user.signUp(null, {
        success: function(user) {
            logUserIn(tabId,username,password,callback);
            userLog(tabId,'USER_SIGNED_UP',{user: user});
        },
        error: function(user,error){
            var lvErrorMessage = '';
            if(typeof error.message === 'undefined'){
                lvErrorMessage = 'Something\'s wrong; check your username and password and try again';
            } else {
                lvErrorMessage = error.message;
            }
            if(callback){
                callback(lvErrorMessage);
            } else {
                refreshTab(tabId,lvErrorMessage);
            }
        }
    });
}

/********************************************
 * Miscellaneous Functions                  *
 *   These are mostly utility functions for *
 *   the Browser Action (BA_main)           *
 ********************************************/

/*
 *
 */
function logUserOut(callback){

    log(gvScriptName_BGMain + '.logUserOut: start','PROCS');

    var user = Parse.User.current();

    userLog(null,'USER_LOG_OUT',{user: user});

    // The callback is used by the options page to refresh the page
    Parse.User.logOut().then(function() {
        hideSidebar_allTabs();
        callback();
    });
}

/*
 * If @email is null then pull the email from the current user
 */
function resetPassword(email,callback){

    log(gvScriptName_BGMain + '.resetPassword: start','PROCS');

    var _email = null;

    if(Parse.User.current()){
        var user = Parse.User.current();
        userLog(null,'USER_PASSWORD_RESET',{user: user});
        if(email === null) {
            _email = user.get('email');
        }
    } else {
        userLog(null,'USER_PASSWORD_RESET',{user: 'unknown'});
    }

    if(_email === null){
        _email = email;
    }

    // The callback is used by the options page to update the page
    Parse.User.requestPasswordReset(_email, {
        success: function(){
            callback();
        },
        error: function(error){
            callback(error.message);
        }
    });
}

/*
 *
 */
function isUserLoggedIn(){
    if(Parse.User.current()){
        return {email: Parse.User.current().get('email'),
                isUserLoggedIn: true};
    } else{
        return {email: null,
                isUserLoggedIn: false};
    }
}

/*
 *
 */
function getUserId(){
    if(Parse.User.current()){
        return Parse.User.current().id;
    } else {
        return null;
    }
}

/*
 *
 */
function trackNewTab(tab,originalURL,recommendationId,pageConfirmationSearch){

    log(gvScriptName_BGMain + '.trackNewTab: start','PROCS');

    if(gvTrackedTabs[tab.id]){
        gvTrackedTabs.splice(tab.id,1);
    }
    gvTrackedTabs[tab.id] = {tab:                    tab,
                             originalURL:            originalURL,
                             recommendationId:       recommendationId,
                             pageConfirmationSearch: pageConfirmationSearch};
}

/*
 *
 */
function removeTrackedTab(tabId,trackedTab){
    log(gvScriptName_BGMain + '.removeTrackedTab: start','PROCS');
    gvTrackedTabs.splice(trackedTab.tab.id,1);
}

/*
 *
 */
function reportTrackedTabError(tabId,trackedTab){
    log(gvScriptName_BGMain + '.reportTrackedTabError','ERROR');
    userLog(tabId,'TRACKED_TAB_ERROR',{originalURL:            trackedTab.originalURL, // the URL that we tried to open, incase there's a redirect etc
                                       recommendationId:       trackedTab.recommendationId,
                                       productName:            trackedTab.productName,
                                       pageConfirmationSearch: trackedTab.pageConfirmationSearch});
}


/*******************************************
 * Balu Test System Functions              *
 *    These pick up test feedback commands *
 *    from the Browser Action & process    *
 *******************************************/

/*
 * @userFeedback one of 'MISSING' | 'FALSE +VE' | 'BANG ON'
 * This is a simple wrapper function, which requests the pageDOM from the content script
 * and then calls the proper addFeedbackPage function as a callback
 */
function _addFeedbackPage(userFeedback,tabId) {
    log(gvScriptName_BGMain + '._addFeedbackPage, userFeedback === ' + userFeedback,'PROCS');
    userLog(tabId,'BTS: PAGE_FEEDBACK',{feedback: userFeedback});
    sendMessage(tabId,'pleaseGetThePageDOM',{tabId:   tabId,
                                             feedback: userFeedback},addFeedbackPage);
}

/*
 * args = {tabId, pageHTML, feedback}
 *
 */

function addFeedbackPage(args) {

    log(gvScriptName_BGMain + '.addFeedbackPage: Start','PROCS');

    var acl = new Parse.ACL();
    acl.setRoleReadAccess("Balu Test System",true);
    acl.setRoleWriteAccess("Balu Test System",true);

    // Files cannot be read by test system, so store as four string parts

    var pageHTML = args.pageHTML; //LZString.compress(args.pageHTML); // this would do compression, if we wanted it
    var break01 = Math.ceil(pageHTML.length/8);
    var break02 = break01 + break01;
    var break03 = break02 + break01;
    var break04 = break03 + break01;
    var break05 = break04 + break01;
    var break06 = break05 + break01;
    var break07 = break06 + break01;

    var bts_CE_FilePart_01 = new Parse.Object("BTS_CE_FilePart");
    var bts_CE_FilePart_02 = new Parse.Object("BTS_CE_FilePart");
    var bts_CE_FilePart_03 = new Parse.Object("BTS_CE_FilePart");
    var bts_CE_FilePart_04 = new Parse.Object("BTS_CE_FilePart");
    var bts_CE_FilePart_05 = new Parse.Object("BTS_CE_FilePart");
    var bts_CE_FilePart_06 = new Parse.Object("BTS_CE_FilePart");
    var bts_CE_FilePart_07 = new Parse.Object("BTS_CE_FilePart");
    var bts_CE_FilePart_08 = new Parse.Object("BTS_CE_FilePart");

    bts_CE_FilePart_01.set('filePart',pageHTML.substring(0,break01));
    bts_CE_FilePart_02.set('filePart',pageHTML.substring(break01,break02));
    bts_CE_FilePart_03.set('filePart',pageHTML.substring(break02,break03));
    bts_CE_FilePart_04.set('filePart',pageHTML.substring(break03,break04));
    bts_CE_FilePart_05.set('filePart',pageHTML.substring(break04,break05));
    bts_CE_FilePart_06.set('filePart',pageHTML.substring(break05,break06));
    bts_CE_FilePart_07.set('filePart',pageHTML.substring(break06,break07));
    bts_CE_FilePart_08.set('filePart',pageHTML.substring(break07,pageHTML.length));

    var filePart01;
    var filePart02;
    var filePart03;
    var filePart04;
    var filePart05;
    var filePart06;
    var filePart07;
    var filePart08;

    bts_CE_FilePart_01.setACL(acl);
    bts_CE_FilePart_01.save().then(function(_filePart01){
        filePart01 = _filePart01;
        bts_CE_FilePart_02.setACL(acl);
        return bts_CE_FilePart_02.save();
    }).then(function(_filePart02){
        filePart02 = _filePart02;
        bts_CE_FilePart_03.setACL(acl);
        return bts_CE_FilePart_03.save();
    }).then(function(_filePart03){
        filePart03 = _filePart03;
        bts_CE_FilePart_04.setACL(acl);
        return bts_CE_FilePart_04.save();
    }).then(function(_filePart04){
        filePart04 = _filePart04;
        bts_CE_FilePart_05.setACL(acl);
        return bts_CE_FilePart_05.save();
    }).then(function(_filePart05){
        filePart05 = _filePart05;
        bts_CE_FilePart_06.setACL(acl);
        return bts_CE_FilePart_06.save();
    }).then(function(_filePart06){
        filePart06 = _filePart06;
        bts_CE_FilePart_07.setACL(acl);
        return bts_CE_FilePart_07.save();
    }).then(function(_filePart07){
        filePart07 = _filePart07;
        bts_CE_FilePart_08.setACL(acl);
        return bts_CE_FilePart_08.save();
    }).then(function(_filePart08){
        filePart08 = _filePart08;
        var bts_CE_FeedbackPage = new Parse.Object("BTS_CE_FeedbackPage");
        bts_CE_FeedbackPage.set('url', gvTabs[args.tabId].tab.url);
        bts_CE_FeedbackPage.set('websiteURL', gvTabs[args.tabId].website.websiteURL);

        // bts_CE_FeedbackPage.set('pageHTML_string', pageHTML_compressed);

        bts_CE_FeedbackPage.set('feedback', args.feedback);
        bts_CE_FeedbackPage.set('user', Parse.User.current());
        bts_CE_FeedbackPage.set('productGroupIds', gvTabs[args.tabId].productGroupIdsArray);

        bts_CE_FeedbackPage.set('filePart01',filePart01);
        bts_CE_FeedbackPage.set('filePart02',filePart02);
        bts_CE_FeedbackPage.set('filePart03',filePart03);
        bts_CE_FeedbackPage.set('filePart04',filePart04);
        bts_CE_FeedbackPage.set('filePart05',filePart05);
        bts_CE_FeedbackPage.set('filePart06',filePart06);
        bts_CE_FeedbackPage.set('filePart07',filePart07);
        bts_CE_FeedbackPage.set('filePart08',filePart08);

        bts_CE_FeedbackPage.setACL(acl);

        bts_CE_FeedbackPage.save({
            success: function() {
                log(gvScriptName_BGMain + '.addFeedbackPage: Saved Feedback Page to DB','PROCS');
            },
            error: parseErrorSave
        });

    });

}

/******************
 * Error handling *
 ******************/

function parseErrorSave(object,error) {
    var errorMsg = "Parse error on .save() request: " + error.code + " " + error.message;
    if(error.code === Parse.Error.INVALID_SESSION_TOKEN){
        logUserOut(function(){
            // do nothing. The user will get the log in sidebar the next time they navigate to an active website
        });
    } else {
        chrome.storage.local.set({'baluParseErrorMessage': errorMsg}, function(){
            chrome.browserAction.setBadgeText({text: "!"});
        });
        log(gvScriptName_BGMain + '.parseErrorFind: ' + errorMsg,'ERROR');
    }
}

function parseErrorFind(error) {
    var errorMsg = "Parse error on .find() request: " + error.code + " " + error.message;
    if(error.code === Parse.Error.INVALID_SESSION_TOKEN){
        logUserOut(function(){
            // do nothing. The user will get the log in sidebar the next time they navigate to an active website
        });
    } else {
        chrome.storage.local.set({'baluParseErrorMessage': errorMsg}, function(){
            chrome.browserAction.setBadgeText({text: "!"});
        });
        log(gvScriptName_BGMain + '.parseErrorFind: ' + errorMsg,'ERROR');
    }
}

function parseErrorUser(user,error) {
    var errorMsg = "Parse error on authentication request: " + error.code + " " + error.message;
    if(error.code === Parse.Error.INVALID_SESSION_TOKEN){
        logUserOut(function(){
            // do nothing. The user will get the log in sidebar the next time they navigate to an active website
        });
    } else {
        chrome.storage.local.set({'baluParseErrorMessage': errorMsg}, function(){
            chrome.browserAction.setBadgeText({text: "!"});
        });
        log(gvScriptName_BGMain + '.parseErrorFind: ' + errorMsg,'ERROR');
    }
}

function parseErrorGet(user,error) {
    var errorMsg = "Parse error on .get() request: " + error.code + " " + error.message;
    if(error.code === Parse.Error.INVALID_SESSION_TOKEN){
        logUserOut(function(){
            // do nothing. The user will get the log in sidebar the next time they navigate to an active website
        });
    } else {
        chrome.storage.local.set({'baluParseErrorMessage': errorMsg}, function(){
            chrome.browserAction.setBadgeText({text: "!"});
        });
        log(gvScriptName_BGMain + '.parseErrorFind: ' + errorMsg,'ERROR');
    }
}

function parseErrorUserSimple(error) {
    var errorMsg = "Parse error on user request: " + error.code + " " + error.message;
    if(error.code === Parse.Error.INVALID_SESSION_TOKEN){
        logUserOut(function(){

        });
    } else {
        chrome.storage.local.set({'baluParseErrorMessage': errorMsg}, function(){
            chrome.browserAction.setBadgeText({text: "!"});
        });
        log(gvScriptName_BGMain + '.parseErrorFind: ' + errorMsg,'ERROR');
    }
}
