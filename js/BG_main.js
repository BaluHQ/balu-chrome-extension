/********
 * Init *
 ********/

gvScriptName_BGMain = 'BG_main';

/*
 * Parse init
 */
var gvAppId = 'mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu';
var gvJSKey = 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY';

/*
 * Global variables
 */
var gvIsBaluOnOrOff;
var gvIsBaluShowOrHide;
var gvIsBaluShowOrHide_untilRestart = 'SHOW';
var gvIsBaluShowOrHide_tempOverride = 'HIDE'; // allows the popup to force the sidebar to display when we have recommendations but gvIsBaluShowOrHide is 'HIDE'
var gvWebsites;
var gvSearchProducts;
var gvTabs = [];
var gvTrackedTabs = []; // These are tabs we've opened from the extension that we want to track for a bit
var gvShowJoyride;

/*
 * Global variables for param passing to popup windows
 */
var gvBlockBrandParams;

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

    log(gvScriptName_BGMain + '.initialise: Start','INITS');

    // Listeners //

    // Listen for messages from the content scripts
    chrome.runtime.onMessage.addListener(chromeMessageListener);
    // Listen for tab closures
    chrome.tabs.onRemoved.addListener(chromeRemovedTabListener);
    // Listen for tab change
    chrome.tabs.onActivated.addListener(chromeActivatedTabListener);

    // Initalise extension //

    getBaluSettings(function(settings){

        if(settings.isBaluOnOrOff === 'ON') {
            turnBaluOn(); // Split this out so we can call it separately (e.g. from options screen when turning Balu on)
        } else {
            // Set the browser icon to the inactive version
            chrome.browserAction.setIcon({path: chrome.extension.getURL('images/icon-browser_action-off.png')});

        }
    });
})();

function turnBaluOn(){

    log(gvScriptName_BGMain + '.turnBaluOn: Start','PROCS');

    // Set the browser icon to the active version
    chrome.browserAction.setIcon({path: chrome.extension.getURL('images/icon-browser_action.png')});

    // Load the website and search data from Parse. After these functions the background script
    // stops until a content script requests a tab initialisation. There are wait functions on
    // the tab init to ensure that website and searchProduct data are present first.
    getWebsiteData();
    getSearchProductData();
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


/*******************************
 * Setup Functions             *
 *   These are all run on init *
 *******************************/

/*
 * Check whether the extension is turned on etc and set the global variables
 */
function getBaluSettings(callback){

     log(gvScriptName_BGMain + '.getBaluSettings: Start','PROCS');

     var settings = {isBaluOnOrOff: 'OFF',
                     isBaluShowOrHide: 'HIDE'};

     chrome.storage.sync.get('isBaluShowOrHide',function(obj2){

         if(obj2.isBaluShowOrHide){
             settings.isBaluShowOrHide = obj2.isBaluShowOrHide;
         } else {
             settings.isBaluShowOrHide = 'SHOW'; // If nothing was found in Chrome storage then assume first use of app and default to sidebar visible
             chrome.storage.sync.set({'isBaluShowOrHide': settings.isBaluShowOrHide}, function(){
                 log(gvScriptName_BGMain + '.getBaluSettings: storage.sync.isBaluShowOrHide set to ' + settings.isBaluShowOrHide, ' INFO');
             }); // Let this run asynchronously, because we're not going to need it again unless the extension is restarted
         }

         chrome.storage.sync.get('isBaluOnOrOff',function (obj1) {
             if(obj1.isBaluOnOrOff){
                 settings.isBaluOnOrOff = obj1.isBaluOnOrOff;
             } else {
                 settings.isBaluOnOrOff = 'ON'; // If nothing was found in Chrome storage then assume first use of app and turn on
                 chrome.storage.sync.set({'isBaluOnOrOff': settings.isBaluOnOrOff}, function(){
                     log(gvScriptName_BGMain + '.getBaluSettings: storage.sync.isBaluOnOrOff set to ' + settings.isBaluOnOrOff, ' INFO');
                 }); // Let this run asynchronously, because we're not going to need it again unless the extension is restarted
             }

             log(gvScriptName_BGMain + '.getBaluSettings: isBaluOnOrOff == ' + settings.isBaluOnOrOff + ', isBaluShowOrHide == ' + settings.isBaluShowOrHide,' INFO');

             gvIsBaluOnOrOff = settings.isBaluOnOrOff;
             gvIsBaluShowOrHide = settings.isBaluShowOrHide;
             gvIsBaluShowOrHide_untilRestart = 'SHOW';

             log(gvScriptName_BGMain + '.getBaluSettings: settings fetched from Chrome storage', 'PROCS');

             callback(settings);

         });
     });
 }

/*
 *
 */
function getWebsiteData(callback){

    log(gvScriptName_BGMain + '.getWebsiteData: Start','PROCS');

    // gvWebsites is our global variable that we need to populate
    gvWebsites = [];

    Parse.initialize(gvAppId,gvJSKey);

    var Website = Parse.Object.extend("Website");
    var websiteQuery = new Parse.Query(Website);
    websiteQuery.notEqualTo('websiteURL','balutestwebsite.html');
    websiteQuery.ascending('websiteURL');

    websiteQuery.find({
        success: function(websites){
            for (var i = 0; i < websites.length; i++) {
                gvWebsites.push({websiteId:        websites[i].id,
                                 websiteURL:       websites[i].get('websiteURL'),
                                 isWebsiteOnOrOff: websites[i].get('isWebsiteOnOrOff')});
            }
            log(gvScriptName_BGMain + '.getWebsiteData: website data fetched from Parse DB', 'PROCS');
        },
        error: parseErrorFind
    });
}

/*
 * This function populates a global variable with all the necessary data to search
 * users' webpages for "unethical" products. That means we need:
 *   - The SearchProduct name and search terms
 *   - The SearchProduct's SearchCategory
 *   - The active websites for the SearchCategories
 *
 * One SearchProduct can only have one SearchCategory [so far, this probably needs to change] but one
 * SearchCategory can be active on many websites. Hence the resulting SearchProduct dataset
 * will contain duplicates, one for every active website.
 *
 * In addition to the above, we also need the ProductGroup. This will allow us to identify
 * matching recommendations after the page search is complete (the "join" between search products
 * and recommendations is through the product groups)
 *
 * This function is run as part of the app initialisation - i.e. the ProductSearch dataset will
 * not refresh without a browser or extension restart.
 *
 */
function getSearchProductData() {

    log(gvScriptName_BGMain + '.getSearchProductData: Start','PROCS');

    // gvSearchProducts is our global variable that we need to populate
    gvSearchProducts = [];

    Parse.initialize(gvAppId, gvJSKey);

    // First get all SearchProducts, and their Categories and ProductGroups

    var SearchProduct = Parse.Object.extend('SearchProduct');
    var searchProductQuery = new Parse.Query(SearchProduct);
    searchProductQuery.include('searchCategories');
    searchProductQuery.include('productGroups');
    searchProductQuery.ascending('productGroup_sort, productName');

    // Deal with Parse row limit
    var limit = 1000; // 1000 is max!
    searchProductQuery.limit(limit);

    searchProductQuery.count({
        success: function(count){
            if(count > limit){
                logError('PARSE_ROW_LIMIT_ERROR',{message: 'searchProducts contain ' + count + ' rows but query limit set to ' + limit});
            }
        }
    });


    searchProductQuery.find({
        success: function(searchProducts) {
            // Then get all SearchCategory-Website pairs
            var CategoryWebsiteJoin = Parse.Object.extend('CategoryWebsiteJoin');
            var categoryWebsiteJoinQuery = new Parse.Query( CategoryWebsiteJoin);
            categoryWebsiteJoinQuery.include('searchCategory');
            categoryWebsiteJoinQuery.include('website');
            categoryWebsiteJoinQuery.find({
                success: function(categoryWebsiteJoins){

                    for (var i = 0; i < searchProducts.length; i++){

                        for (var j = 0; j < categoryWebsiteJoins.length; j++) {

                            if(searchProducts[i].get('searchCategories').id === categoryWebsiteJoins[j].get('searchCategory').id) {

                                gvSearchProducts.push({// Search Category
                                                       searchCategoryId:       categoryWebsiteJoins[j].get('searchCategory').id,
                                                       categoryName:           categoryWebsiteJoins[j].get('searchCategory').get('categoryName'),
                                                       whyDoWeCare:            categoryWebsiteJoins[j].get('searchCategory').get('whyDoWeCare'),
                                                       // Website
                                                       websiteId:              categoryWebsiteJoins[j].get('website').id,
                                                       websiteURL:             categoryWebsiteJoins[j].get('website').get('websiteURL'),
                                                       isWebsiteOnOrOff:       categoryWebsiteJoins[j].get('website').get('isWebsiteOnOrOff'),
                                                       // Product Group
                                                       productGroupId:         searchProducts[i].get('productGroups').id,
                                                       productGroupName:       searchProducts[i].get('productGroups').get('productGroupName'),
                                                       // Search Product
                                                       searchProductId:        searchProducts[i].id,
                                                       productName:            searchProducts[i].get('productName'),
                                                       brand:                  searchProducts[i].get('brand'),
                                                       brand_LC:               searchProducts[i].get('brand_LC'),
                                                       searchTerm1:            searchProducts[i].get('searchTerm1'),
                                                       searchTerm1_LC:         searchProducts[i].get('searchTerm1_LC'),
                                                       searchTerm2:            searchProducts[i].get('searchTerm2'),
                                                       searchTerm2_LC:         searchProducts[i].get('searchTerm2_LC'),
                                                       searchTerm3:            searchProducts[i].get('searchTerm3'),
                                                       searchTerm3_LC:         searchProducts[i].get('searchTerm3_LC'),
                                                       searchTerm4:            searchProducts[i].get('searchTerm4'),
                                                       searchTerm4_LC:         searchProducts[i].get('searchTerm4_LC'),
                                                       searchTerm5:            searchProducts[i].get('searchTerm5'),
                                                       searchTerm5_LC:         searchProducts[i].get('searchTerm5_LC'),
                                                       searchTerm6:            searchProducts[i].get('searchTerm6'),
                                                       searchTerm6_LC:         searchProducts[i].get('searchTerm6_LC'),
                                                       searchTerm7:            searchProducts[i].get('searchTerm7'),
                                                       searchTerm7_LC:         searchProducts[i].get('searchTerm7_LC'),
                                                       andOr:                  searchProducts[i].get('andOr'),
                                                       sex:                    searchProducts[i].get('sex'),
                                                       sex_LC:                 searchProducts[i].get('sex_LC'),
                                                       negativeSearchTerm1:    searchProducts[i].get('negativeSearchTerm1'),
                                                       negativeSearchTerm1_LC: searchProducts[i].get('negativeSearchTerm1_LC'),
                                                       negativeSearchTerm2:    searchProducts[i].get('negativeSearchTerm2'),
                                                       negativeSearchTerm2_LC: searchProducts[i].get('negativeSearchTerm2_LC'),
                                                       negativeSearchTerm3:    searchProducts[i].get('negativeSearchTerm3'),
                                                       negativeSearchTerm3_LC: searchProducts[i].get('negativeSearchTerm3_LC'),
                                                       negativeSearchTerm4:    searchProducts[i].get('negativeSearchTerm4'),
                                                       negativeSearchTerm4_LC: searchProducts[i].get('negativeSearchTerm4_LC'),
                                                       negativeAndOr:          searchProducts[i].get('negativeAndOr'),
                                                       numberOfSearchHits:     0}); // this is used by the search function to count up hits (and order the results)
                            }
                        }
                    }

                    log(gvScriptName_BGMain + '.getSearchProductData: productSearch data fetched from Parse DB', 'PROCS');
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
 *
 * if @tab is null, init all tabs
 */
function waitForExtensionInitThenInitialiseTab(tab,counter){

    // Every 50 miliseconds, recheck to see whether we have retrieved data

    var hasExtensionInitialisd = false;

    if(typeof gvWebsites !== 'undefined' && typeof gvSearchProducts !== 'undefined' && typeof gvIsBaluOnOrOff !== 'undefined'){
        if(gvWebsites.length > 0 && gvSearchProducts.length > 0 && gvIsBaluOnOrOff !== null){
            log(gvScriptName_BGMain + '.waitForExtensionInitThenInitialiseTab: Ending wait: gvWebsites (' + gvWebsites.length + '), gvSearchProducts (' + gvSearchProducts.length + ') and gvIsBaluOnOrOff (' + gvIsBaluOnOrOff + ') are set','PROCS');
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
        if (counter > 400) { // time out after twenty seconds
            log(gvScriptName_BGMain + '.waitForExtensionInitThenInitialiseTab: Ending wait: counter reached ' + counter + ' before gvWebsites, gvSearchProducts and/or gvIsBaluOnOrOff were set','ERROR');
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

   log(gvScriptName_BGMain + '.initialiseTab: Start','PROCS');

   // Note, it is possible that a tab URL could match more than one Balu website.
   // (e.g. http://marketplace.asos.com/ would match asos.com and marketplace.asos.com)
   // If this is the case, the first website to match (they are in alphabetical order) wins.
   // In theory, this wouldn't matter too much: asos and asos marketplace will have very similar
   // search categories activated.

   var website;
   var isWebsiteOnOrOff = 'OFF';

   for (i = 0; i < gvWebsites.length; i++) {
       if (tab.url.indexOf(gvWebsites[i].websiteURL) != -1) {
           website = gvWebsites[i];
           isWebsiteOnOrOff = gvWebsites[i].isWebsiteOnOrOff; // So we can easily tell whether website is on/off without checking gvtabs.website for null
           break;
       }
   }

   // Do we need to show the joyride. To do: might be better for it not to be here. must be a scenario where you can get the joyride to reappear by triggering a refresh tab, without re-init the app.
   Parse.initialize(gvAppId, gvJSKey);

   var currentUser = Parse.User.current();
   var joyrideStatus;

   if(currentUser){
       joyrideStatus = currentUser.get('joyrideStatus');
   }

   gvShowJoyride = false;
   if(currentUser && (typeof joyrideStatus === 'undefined' || joyrideStatus === 'NOT DONE')){
       gvShowJoyride = true;
   }

   gvTabs[tab.id] = {tab:                           tab, // Chrome's original tab object
                     isBaluShowOrHide_untilRefresh: 'SHOW', // A setting available on every sidebar; will always be SHOW right after refresh
                     isWebsiteOnOrOff:              isWebsiteOnOrOff,
                     website:                       website,
                     recommendationCount:           0,
                     recommendationCount_manual:    0};

   var logText =  website ? 'website valid' : 'website not valid';
   log(gvScriptName_BGMain + '.initialiseTab: ' + gvTabs[tab.id].tab.id + ' saved; ' + logText + '; isWebsiteOnOrOff == ' + isWebsiteOnOrOff,' INFO');

   if (gvIsBaluOnOrOff === 'ON' && isWebsiteOnOrOff === 'ON') {
       refreshTab(tab.id);
   } else {
       log(gvScriptName_BGMessaging + '.onMessage: gvIsBaluOnOrOff == ' + gvIsBaluOnOrOff + ' and isWebsiteOnOrOff == ' + isWebsiteOnOrOff + ', so doing nothing',' INFO');
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
    for(var tab in gvTabs) {refreshTab(gvTabs[tab].tab.id);}
}
function refreshTab(tabId){

    log(gvScriptName_BGMain + '.refreshTab: Start','PROCS');

    // Step one: cases where we need to re-search the page

    // Only do something if Balu is on and the website is an active website
    if(gvIsBaluOnOrOff === 'ON' && gvTabs[tabId].isWebsiteOnOrOff === 'ON') {

        // Depending whether user is logged in, determines whether we show sign sidebar or run a search
        Parse.initialize(gvAppId, gvJSKey);
        var user = Parse.User.current();
        if(user) {
            sendMessage(tabId,'pleaseSearchThePage',{searchData:  gvSearchProducts,
                                                     tabURL:      gvTabs[tabId].tab.url,
                                                     websiteURL:  gvTabs[tabId].website.websiteURL});
        } else {
            sendMessage(tabId,'pleaseDisplayLogInSidebar');
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
function displayRecommendations(tabId,recommendationData,searchTerm){

    log(gvScriptName_BGMain + '.displayRecommendations: start','PROCS');

    // Get the rec count and display it on the browser action
    if(searchTerm){
        gvTabs[tabId].recommendationCount_manual = recommendationData.length;
    } else {
        gvTabs[tabId].recommendationCount = recommendationData.length;
    }

    var badgeText;
    if(gvTabs[tabId].recommendationCount === 0) {
        badgeText = '';
    } else {
        badgeText = "" + gvTabs[tabId].recommendationCount + "";
    }

    chrome.browserAction.setBadgeText({text: badgeText,tabId: tabId});

    // We only want to display the sidebar if:
    //   1) Balu is set to SHOW (gvIsBaluShowOrHide)
    //   2) The sidebar has not been temporarily hidden across all tabs (gvIsBaluShowOrHide_untilRestart)
    //   3) The sidebar has not been temporarily hidden on this tab (tab.isBaluShowOrHide_untilRefresh)
    // OR
    //   3) it is a manual search
    // OR
    //   4) the browser action is forcing the results onto the page (gvIsBaluShowOrHide_tempOverride)

    if((gvIsBaluShowOrHide === 'SHOW' &&
        gvIsBaluShowOrHide_untilRestart === 'SHOW' &&
        gvTabs[tabId].isBaluShowOrHide_untilRefresh === 'SHOW') ||
       searchTerm ||
       gvIsBaluShowOrHide_tempOverride === 'SHOW') {
        gvIsBaluShowOrHide_tempOverride = 'HIDE';

        sendMessage(tabId,'pleaseDisplayRecommendations',{recommendationData:  recommendationData,
                                                          searchTerm:          searchTerm,
                                                          showJoyride:         gvShowJoyride});
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
 * @SearchResults is an array created by the content_scripts during the page search. It is simply an array
 * of elements from the SearchProducts array created in the above (getSearchProductData) function. The only
 * difference is the @SearchResults array only contains the elements that were found in the user's webpage
 *
 * We also pull the user's rec ratings here and add them to the recs being returnedso we can correctly order
 * and flag in the sidebar
 */
function getRecommendations(tabId,searchResults,callback_displayRecommendations) {

    log(gvScriptName_BGMain + '.getRecommendations: start','PROCS');

    // To get the recommendations, the only part of searchResults we're interested in is the ProductGroup.
    // If the content_script found products A, B and C on the user's webpage, and products A, B and C belong
    // to ProductGroups X, X and Y respectively, then we need to recommend ALL recommendation products that
    // belong to ProductGroups X & Y.

    // Our first step is to create an array of productGroup IDs to feed into the Parse query
    // At the same time, we will produce an associative array of {productGroupId, hitCount, whyDoWeCare} objects,
    // indexed by the productGroupId so that, after we have our recommendations back from Parse,
    // we can quickly add the hitCounts and whyDoWeCares in.
    // We need to pick out the max hit count because, to sort asc, we need to "flip" the hitCounts

    var productGroups = {};
    var maxHitCount = 0;
    var productGroupIdsArray = [];
    for (var i = 0; i < searchResults.length; i++) {
        if(!productGroups[searchResults[i].productGroupId]) {
            productGroups[searchResults[i].productGroupId] = {productGroupId: searchResults[i].productGroupId,
                                                              hitCount:       0,
                                                              whyDoWeCare:    searchResults[i].whyDoWeCare};

            productGroupIdsArray.push(searchResults[i].productGroupId);
        }
        productGroups[searchResults[i].productGroupId].hitCount = searchResults[i].numberOfSearchHits + (productGroups[searchResults[i].productGroupId].hitCount || 0);
        if (productGroups[searchResults[i].productGroupId].hitCount > maxHitCount) {
            maxHitCount = productGroups[searchResults[i].productGroupId].hitCount;
        }
    }

    // Now we can create a Parse query for these ProductGroups and use that
    // to filter the Recommendation query

    Parse.initialize(gvAppId, gvJSKey);

    var ProductGroup = Parse.Object.extend('ProductGroup');
    var productGroupQuery = new Parse.Query(ProductGroup);
    productGroupQuery.containedIn('objectId',productGroupIdsArray);

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

            var Recommendation = Parse.Object.extend('Recommendation');
            var recommendationQuery = new Parse.Query(Recommendation);
            recommendationQuery.matchesQuery('productGroups',productGroupQuery);
            recommendationQuery.include('productGroups');
            recommendationQuery.include('ethicalBrand');
            recommendationQuery.notContainedIn('ethicalBrand',userBlockedBrandsArray);
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

                    var UserRecommendationRating = Parse.Object.extend('UserRecommendationRating');
                    userRecommendationRatingQuery = new Parse.Query(UserRecommendationRating);
                    userRecommendationRatingQuery.include('user');
                    userRecommendationRatingQuery.include('recommendation');
                    userRecommendationRatingQuery.equalTo('user',Parse.User.current());
                    // to do: can't easily filter to only relevant recs, because it creates a ref loops and stack overflow on Parse.

                    //userRecommendationRatingQuery.matches('recommendation',recommendationQuery);

                    userRecommendationRatingQuery.find({
                        success: function(userRecommendationRatings){
                            // Push each recommendationRating into an array, indexed by the recommendation ID, and then
                            // use the array to efficiently add it to the recommendationsArray in the next step.
                            for (var k = 0; k < userRecommendationRatings.length; k++){
                                userRecommendationRatingsArray[userRecommendationRatings[k].get('recommendation').id] = userRecommendationRatings[k].get('upOrDownOrNull');
                            }

                            // Push each recommendation into a recommendationsArray with all the extra data required to displaly on sidebar
                            for (var j = 0; j < recommendations.length; j++) {

                                // If they haven't rated this product it's userRecRating entry will be undefined
                                var userRecommendationRating = userRecommendationRatingsArray[recommendations[j].id] || 0;

                                // Load the imageURL separately in case there isn't one
                                var imageURL = "";
                                if(recommendations[j].get('image')){
                                    imageURL = recommendations[j].get('image').url();
                                }

                                // On the sidebar we want the recommendations sorted as follows:
                                //   1) Product Group sections sorted by hit count
                                //   2) .. then by product group name (and ID) (to ensure the recs of product groups with matching hit counts remain grouped!)
                                //   3) Within the product group sections, sort recs by ratingScore
                                //   4) .. then by rec productName (for aesthetic purposes)
                                //  *** Note that any recs with negative votes (made by this user) will be dealt with at the point of rendering the HTML (and shoved at the bottom of their respective product groups) ***

                                // For the numbers, flip them so sort asc works, then turn them into strings of fixed length with leading zeros
                                //   15 leading 0s, plus the number itself tagged on the end, trimmed back to 15 (I think. Whatever -pad.length does!)
                                var currentProductGroupId = recommendations[j].get('productGroups').id;
                                var currentProductGroupName = recommendations[j].get('productGroups').get('productGroupName');
                                var pad = '000000000000000';
                                var productGroupHitCount_asString = (pad + (maxHitCount - productGroups[currentProductGroupId].hitCount)).slice(-pad.length);
                                var ratingScore_asString = (pad + (maxRatingScore - (recommendations[j].get('ratingScore')+negativeOffset))).slice(-pad.length);
                                var sortOrder = productGroupHitCount_asString + '_' + currentProductGroupName + '_' + currentProductGroupId + '_' + ratingScore_asString + '_' + recommendations[j].get('productName');

                                recommendationsArray.push({productGroupId:         recommendations[j].get('productGroups').id,
                                                           productGroupName:       recommendations[j].get('productGroups').get('productGroupName'),
                                                           recommendationId:       recommendations[j].id,
                                                           productName:            recommendations[j].get('productName'),
                                                           pageConfirmationSearch: recommendations[j].get('pageConfirmationSearch'),
                                                           productURL:             recommendations[j].get('productURL'),
                                                           brandName:              recommendations[j].get('ethicalBrand').get('brandName'),
                                                           brandId:                recommendations[j].get('ethicalBrand').id,
                                                           imageURL:               imageURL,
                                                           twitterHandle:          recommendations[j].get('ethicalBrand').get('twitterHandle'),
                                                           brandSpiel:             recommendations[j].get('ethicalBrand').get('brandSpiel').replace(/(\r\n|\n|\r)/g,"<br />"),
                                                           upOrDownOrNull:         userRecommendationRating,
                                                           whyDoWeCare:            productGroups[currentProductGroupId].whyDoWeCare,
                                                           sortOrder:              sortOrder});
                            }

                            if (recommendationsArray.length > 0){
                                recommendationsArray = recommendationsArray.sort(function(a,b){
                                    return a.sortOrder.localeCompare(b.sortOrder);
                                });
                                callback_displayRecommendations(tabId,recommendationsArray);
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
                    }); // userRecommendationRatingQuery
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
function manualSearch(tabId, searchTerm) {

    log(gvScriptName_BGMain + '.manualSearch: Start >>> tabId == ' + tabId + ', searchTerm == ' + searchTerm,'PROCS');

    var recommendationsArray = [];

    if(searchTerm === ''){
        displayRecommendations(tabId,recommendationsArray, searchTerm);
        userLog(tabId,'MANUAL_SEARCH_EMPTY_STRING');
    } else{

        userLog(tabId,'MANUAL_SEARCH',{searchTerm: searchTerm});

        var searchTerm_LC = searchTerm.toLowerCase();
        var isMenInSearchTerm = false;
        var isWomenInSearchTerm = false;

        // We really don't want "men's ---" to return product's with "women's ---" in the name, so we have to do a little manual hack to fix this
        // While we're at it, we may as well match both "women" and "men" on sex
        if(searchTerm_LC.indexOf('men') === 0 || searchTerm_LC.indexOf(' men') !== -1 || searchTerm_LC.indexOf('man') === 0 || searchTerm_LC.indexOf(' man') !== -1) {
            isMenInSearchTerm = true;
        }
        if(searchTerm_LC.indexOf('women') !== -1 || searchTerm_LC.indexOf('woman') !== -1 || searchTerm_LC.indexOf('lady') !== -1 || searchTerm_LC.indexOf('ladies') !== -1) {
            isWomenInSearchTerm = true;
        }

        Parse.initialize(gvAppId, gvJSKey);

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

        searchProductQuery_productName.contains('productName_LC',searchTerm_LC);
        searchProductQuery_brand.contains('brand_LC',searchTerm_LC);
        searchProductQuery_searchTerm1.contains('searchTerm1_LC',searchTerm_LC);
        searchProductQuery_searchTerm2.contains('searchTerm2_LC',searchTerm_LC);
        searchProductQuery_searchTerm3.contains('searchTerm3_LC',searchTerm_LC);
        searchProductQuery_searchTerm4.contains('searchTerm4_LC',searchTerm_LC);
        searchProductQuery_searchTerm5.contains('searchTerm5_LC',searchTerm_LC);
        searchProductQuery_searchTerm6.contains('searchTerm6_LC',searchTerm_LC);
        searchProductQuery_productGroupName.contains('productGroup_sort',searchTerm_LC);

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

                var productGroupIDsArray = [];
                var productGroups = {};
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
                        productGroupIDsArray.push(searchProducts[i].get('productGroups').id);
                        productGroups[searchProducts[i].get('productGroups').id] = {whyDoWeCare: searchProducts[i].get('searchCategories').get('whyDoWeCare')};
                    }
                }

                var ProductGroup = Parse.Object.extend('ProductGroup');
                var productGroupQuery = new Parse.Query(ProductGroup);
                productGroupQuery.containedIn('objectId',productGroupIDsArray);

                var EthicalBrand = Parse.Object.extend('EthicalBrand');
                var ethicalBrandQuery_brandName = new Parse.Query(EthicalBrand);
                var ethicalBrandQuery_twitterHandle = new Parse.Query(EthicalBrand);
                ethicalBrandQuery_brandName.contains('brandName_LC',searchTerm_LC);
                ethicalBrandQuery_twitterHandle.contains('twitterHandle_LC',searchTerm_LC);
                var ethicalBrandCompoundQuery = Parse.Query.or(ethicalBrandQuery_brandName,
                                                               ethicalBrandQuery_twitterHandle);
                // Assuming we don't want to search the brand spiel too
                //

                var Recommendation = Parse.Object.extend('Recommendation');

                var recommendationQuery_productGroups = new Parse.Query(Recommendation);
                var recommendationQuery_ethicalBrand = new Parse.Query(Recommendation);
                var recommendationQuery_productName = new Parse.Query(Recommendation);
                var recommendationQuery_productURL = new Parse.Query(Recommendation);

                recommendationQuery_productGroups.matchesQuery('productGroups',productGroupQuery);
                recommendationQuery_ethicalBrand.matchesQuery('ethicalBrand',ethicalBrandCompoundQuery);
                recommendationQuery_productName.contains('productName_LC',searchTerm_LC);
                recommendationQuery_productURL.contains('productURL',searchTerm_LC);

                var recommendationCompoundQuery = Parse.Query.or(recommendationQuery_productGroups,
                                                                 recommendationQuery_ethicalBrand,
                                                                 recommendationQuery_productName,
                                                                 recommendationQuery_productURL);

                recommendationCompoundQuery.include('productGroups');
                recommendationCompoundQuery.include('ethicalBrand');

                // The sort order is important, otherwise the ProductGroups will not
                // form up correctly on the sidebar
                recommendationCompoundQuery.ascending('productGroup_sort,-ratingScore, productName');

                recommendationCompoundQuery.find({
                    success: function(recommendations){

                        var UserRecommendationRating = Parse.Object.extend('UserRecommendationRating');
                        userRecommendationRatingQuery = new Parse.Query(UserRecommendationRating);
                        userRecommendationRatingQuery.include('user');
                        userRecommendationRatingQuery.include('recommendation');
                        userRecommendationRatingQuery.equalTo('user',Parse.User.current());
                        // to do: can't easily filter to only relevant recs, because it creates a ref loops and stack overflow on Parse.
                        //userRecommendationRatingQuery.matches('recommendation',recommendationCompoundQuery);

                        userRecommendationRatingQuery.find({
                            success: function(userRecommendationRatings){

                                // Push each recommendationRating into an array, indexed by the recommendation ID, and then
                                // use the array to efficiently add it o the recommendationsArray in the next step
                                var userRecommendationRatingsArray = {};
                                for (var k = 0; k < userRecommendationRatings.length; k++){
                                    var key = userRecommendationRatings[k].get('recommendation').id;
                                    userRecommendationRatingsArray[key] = userRecommendationRatings[k].get('upOrDownOrNull');
                                }

                                for (var j = 0; j < recommendations.length; j++) {
                                    var imageURL = "";
                                    if(recommendations[j].get('image')){
                                        imageURL = recommendations[j].get('image').url();
                                    }

                                    // We might not have a corresponding searchProduct, in which case we won't have a search category and hence no why do we care handle
                                    var whyDoWeCare = '';
                                    if(productGroups[recommendations[j].get('productGroups').id]) {
                                        whyDoWeCare = productGroups[recommendations[j].get('productGroups').id].whyDoWeCare;
                                    }

                                    recommendationsArray.push({productGroupId:         recommendations[j].get('productGroups').id,
                                                               productGroupName:       recommendations[j].get('productGroups').get('productGroupName'),
                                                               recommendationId:       recommendations[j].id,
                                                               productName:            recommendations[j].get('productName'),
                                                               productURL:             recommendations[j].get('productURL'),
                                                               pageConfirmationSearch: recommendations[j].get('pageConfirmationSearch'),
                                                               brandName:              recommendations[j].get('ethicalBrand').get('brandName'),
                                                               brandId:                recommendations[j].get('ethicalBrand').id,
                                                               imageURL:               imageURL,
                                                               twitterHandle:          recommendations[j].get('ethicalBrand').get('twitterHandle'),
                                                               brandSpiel:             recommendations[j].get('ethicalBrand').get('brandSpiel').replace(/(\r\n|\n|\r)/g,"<br />"),
                                                               upOrDownOrNull:         userRecommendationRatingsArray[recommendations[j].id],
                                                               whyDoWeCare:            whyDoWeCare});
                                }

                                // Note, the content_script will catch no-results and display the empty side bar
                                displayRecommendations(tabId,recommendationsArray,searchTerm);
                                userLog(tabId,'MANUAL_SEARCH_RECOMMENDATIONS_RETURNED',{searchTerm: searchTerm, recommendationsArray: recommendationsArray});
                            },
                            error: parseErrorFind
                        });
                    },
                    error: parseErrorFind
                });
            },
            error: parseErrorFind
        });
    }
}
// to do: remove search function when not logged in

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

function showOptionsPageWindow(tabId){

    log(gvScriptName_BGMain + '.showOptionsPageWindow: start','PROCS');

    // Note: the user log is created by the options page

    chrome.tabs.create({'url': chrome.extension.getURL('options.html')}, function(tab) {});

}

function showWhyDoWeCareWindow(tabId,whyDoWeCareURLName){

    log(gvScriptName_BGMain + '.showWhyDoWeCareWindow: start','PROCS');

    userLog(tabId,'WHY_CARE_CLICK',{whyDoWeCareURLName: whyDoWeCareURLName});

    var lvURL = 'http://www.getbalu.org/why-do-we-care/' + whyDoWeCareURLName;

    chrome.tabs.create({'url': lvURL}, function(tab){
        trackNewTab(tab,lvURL,null,whyDoWeCareURLName);});
}

function showProductLinkWindow(tabId,productURL,recommendationId, recProductName, pageConfirmationSearch){

    log(gvScriptName_BGMain + '.showProductLinkWindow: start','PROCS');

    userLog(tabId,'REC_CLICK_THROUGH',{recommendationId:       recommendationId,
                                       productURL:             productURL,
                                       pageConfirmationSearch: pageConfirmationSearch,
                                       recProductName:         recProductName});

    chrome.tabs.create({'url': productURL}, function(tab){trackNewTab(tab,productURL,recommendationId,pageConfirmationSearch);});

    // In parallel, register this click on the recommendation's click count

    // don't log for the dev / test user
    if(user.get('username') !== 'dev.baluhq@gmail.com'){

        Parse.initialize(gvAppId, gvJSKey);

        var RecommendationClickCount = Parse.Object.extend('RecommendationClickCount');
        var recommendationClickCountQuery = new Parse.Query(RecommendationClickCount);
        recommendationClickCountQuery.equalTo('recommendation',{__type: "Pointer",className: "Recommendation",objectId: recommendationId});
        recommendationClickCountQuery.find({
            success: function(recommendationClickCounts){
                if(recommendationClickCounts.length === 1) {
                    recommendationClickCounts[0].increment("clickCount");
                    recommendationClickCounts[0].save();
                } else {
                    recommendationClickCount = new RecommendationClickCount({ACL: new Parse.ACL(Parse.User.current())});
                    recommendationClickCount.set('recommendation',{__type: "Pointer",className: "Recommendation",objectId: recommendationId});
                    recommendationClickCount.set('clickCount',1);
                    recommendationClickCount.save();
                }
            },
            error: parseErrorFind
        });
    }
}

function voteProductUpOrDown(tabId,recommendationId,upOrDown){

    log(gvScriptName_BGMain + '.userRecommendationRating_createOrUpdate: start','PROCS');

    var ratingScore = 0;

    // We save upOrDown for good measure, but also a rating score to make retrieving the score easier
    if(upOrDown === 'UP'){
        ratingScore = 1;
    } else if (upOrDown === 'DOWN'){
        ratingScore = -1;
    }

    Parse.initialize(gvAppId, gvJSKey);

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
                        userRecommendationRating = new UserRecommendationRating({ACL: new Parse.ACL(user)});
                        userRecommendationRating.set('recommendation',recommendation);
                        userRecommendationRating.set('user',user);
                        userRecommendationRating.set('upOrDownOrNull',upOrDown);
                        userRecommendationRating.set('ratingScore',ratingScore);
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

    Parse.initialize(gvAppId, gvJSKey);

    var UserBlockedBrand = Parse.Object.extend("UserBlockedBrand");
    var userBlockedBrand = new UserBlockedBrand({ACL: new Parse.ACL(Parse.User.current())});

    userBlockedBrand.set('user',Parse.User.current());
    userBlockedBrand.set('ethicalBrand',{__type: "Pointer",className: "EthicalBrand",objectId: data.brandId});

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

    Parse.initialize(gvAppId, gvJSKey);

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

    Parse.initialize(gvAppId, gvJSKey);

    var UserSubmittedRec = Parse.Object.extend("UserSubmittedRec");
    var userSubmittedRec = new UserSubmittedRec({ACL: new Parse.ACL(Parse.User.current())});

    userSubmittedRec.set('user',Parse.User.current());
    userSubmittedRec.set('productName',formFieldValues.productName);
    userSubmittedRec.set('URLOrTwitter',formFieldValues.URLOrTwitter);
    userSubmittedRec.set('why',formFieldValues.why);

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

    Parse.initialize(gvAppId, gvJSKey);

    var UserSubmittedWebsiteRec = Parse.Object.extend("UserSubmittedWebsiteRec");
    var userSubmittedWebsiteRec = new UserSubmittedWebsiteRec({ACL: new Parse.ACL(Parse.User.current())});

    userSubmittedWebsiteRec.set('user',Parse.User.current());
    userSubmittedWebsiteRec.set('websiteRec',formFieldValues.fieldWebsiteRec);

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
function hideSidebar(tabId) {
    log(gvScriptName_BGMain + '.hideSidebar: start','PROCS');
    sendMessage(tabId,'pleaseHideSidebar');
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

// Log in sidebar

function logUserIn(tabId,username,password,callback){

    log(gvScriptName_BGMain + '.logUserIn: start','PROCS');

    Parse.User.logIn(username,password, {
        success: function(user) {
            userLog(tabId,'USER_LOG_IN',{user: user});
            chrome.extension.getBackgroundPage().waitForExtensionInitThenInitialiseTab(null,1);

            // If we're logging in from the options page we have a callback to refresh the page
            // If we're logging in from the sidebar we dont need a callback because refreshTab takes care of everything
            if(callback) {
                callback();
            }
        },
        error: parseErrorUser
    });
}

function signUserUp(tabId,username,password,callback){

    log(gvScriptName_BGMain + '.signUserUp: start','PROCS');

    var user = new Parse.User();
    user.set("username", username.toLowerCase());
    user.set("password", password);
    user.set("email",    username.toLowerCase());

    user.signUp(null, {
        success: function(user) {
            logUserIn(tabId,username,password,callback);
            userLog(tabId,'USER_SIGNED_UP',{user: user});
        },
        error: parseErrorUser
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

    Parse.initialize(gvAppId, gvJSKey);
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

    Parse.initialize(gvAppId, gvJSKey);

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
        error: parseErrorUserSimple
    });
}

/*
 *
 */
function isUserLoggedIn(){
    Parse.initialize(gvAppId, gvJSKey);
    if(Parse.User.current()){
        return true;
    } else{
        return false;
    }
}

/*
 *
 */
function getUserId(){
    Parse.initialize(gvAppId, gvJSKey);
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

/******************
 * Error handling *
 ******************/

function parseErrorSave(object,error) {
    var errorMsg = "Parse error on .save() request: " + error.code + " " + error.message;
    chrome.storage.local.set({'baluParseErrorMessage': errorMsg}, function(){
        chrome.browserAction.setBadgeText({text: "!"});
    });
}

function parseErrorFind(error) {
    var errorMsg = "Parse error on .find() request: " + error.code + " " + error.message;
    chrome.storage.local.set({'baluParseErrorMessage': errorMsg}, function(){
        chrome.browserAction.setBadgeText({text: "!"});
    });
}

function parseErrorUser(user,error) {
    var errorMsg = "Parse error on authentication request: " + error.code + " " + error.message;
    chrome.storage.local.set({'baluParseErrorMessage': errorMsg}, function(){
        chrome.browserAction.setBadgeText({text: "!"});
    });
}

function parseErrorGet(user,error) {
    var errorMsg = "Parse error on .get() request: " + error.code + " " + error.message;
    chrome.storage.local.set({'baluParseErrorMessage': errorMsg}, function(){
        chrome.browserAction.setBadgeText({text: "!"});
    });
}

function parseErrorUserSimple(error) {
    var errorMsg = "Parse error on user request: " + error.code + " " + error.message;
    chrome.storage.local.set({'baluParseErrorMessage': errorMsg}, function(){
        chrome.browserAction.setBadgeText({text: "!"});
    });
}

// To do: remove these alerts and replace with a more user-friendly error catch.
