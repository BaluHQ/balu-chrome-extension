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

    // Listen for one-off Chrome messages (used by content script to tell us when page has loaded and to access console.log)
    chrome.runtime.onMessage.addListener(chromeMessageListener);
    // Listen for tab closures
    chrome.tabs.onRemoved.addListener(chromeRemovedTabListener);
    // Listen for tab change
    chrome.tabs.onActivated.addListener(chromeActivatedTabListener);

    // Initalise extension //

    getBaluSettings(function(settings){

        if(settings.isBaluOnOrOff === 'ON') {

            // Set the browser icon to the active version
            chrome.browserAction.setIcon({path: chrome.extension.getURL('images/icon-browser_action.png')});

            // Load the website and search data from Parse. After these functions the background script
            // stops until a content script requests a tab initialisation. There are wait functions on
            // the tab init to ensure that website and searchProduct data are present first.
            getWebsiteData();
            getSearchProductData();

        } else {

            // Set the browser icon to the inactive version
            chrome.browserAction.setIcon({path: chrome.extension.getURL('images/icon-browser_action-off.png')});

        }
    });
})();

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

    searchProductQuery.find({
        success: function(searchProducts) {

            // Then get all SearchCategory-Website pairs
            var CategoryWebsiteJoin = Parse.Object.extend('CategoryWebsiteJoin');
            var categoryWebsiteJoinQuery = new Parse.Query(CategoryWebsiteJoin);
            categoryWebsiteJoinQuery.include('searchCategory');
            categoryWebsiteJoinQuery.include('website');
            categoryWebsiteJoinQuery.find({
                success: function(categoryWebsiteJoins){

                    for (var i = 0; i < searchProducts.length; i++){

                        for (var j = 0; j < categoryWebsiteJoins.length; j++) {

                            if(searchProducts[i].get('searchCategories').id === categoryWebsiteJoins[j].get('searchCategory').id) {

                                gvSearchProducts.push({// Search Category
                                                       searchCategoryId:  categoryWebsiteJoins[j].get('searchCategory').id,
                                                       categoryName:      categoryWebsiteJoins[j].get('searchCategory').get('categoryName'),
                                                       whyDoWeCare:       categoryWebsiteJoins[j].get('searchCategory').get('whyDoWeCare'),
                                                       // Website
                                                       websiteId:         categoryWebsiteJoins[j].get('website').id,
                                                       websiteURL:        categoryWebsiteJoins[j].get('website').get('websiteURL'),
                                                       isWebsiteOnOrOff:  categoryWebsiteJoins[j].get('website').get('isWebsiteOnOrOff'),
                                                       // Product Group
                                                       productGroupId:    searchProducts[i].get('productGroups').id,
                                                       productGroupName:  searchProducts[i].get('productGroups').get('productGroupName'),
                                                       // Search Product
                                                       searchProductId:   searchProducts[i].id,
                                                       productName:       searchProducts[i].get('productName'),
                                                       brand:             searchProducts[i].get('brand'),
                                                       brand_LC:          searchProducts[i].get('brand_LC'),
                                                       proximity:         searchProducts[i].get('proximity'),
                                                       searchTerm1:       searchProducts[i].get('searchTerm1'),
                                                       searchTerm1_LC:    searchProducts[i].get('searchTerm1_LC'),
                                                       searchTerm2:       searchProducts[i].get('searchTerm2'),
                                                       searchTerm2_LC:    searchProducts[i].get('searchTerm2_LC'),
                                                       searchTerm3:       searchProducts[i].get('searchTerm3'),
                                                       searchTerm3_LC:    searchProducts[i].get('searchTerm3_LC'),
                                                       andOr:             searchProducts[i].get('andOr'),
                                                       sex:               searchProducts[i].get('sex'),
                                                       sex_LC:            searchProducts[i].get('sex_LC')});
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
 * the background script has finished loading the search data from
 * Parse. So we call a recursive wait function instead...
 *
 */
function waitForSearchDataThenInitialiseTab(tab,callback,counter){

    // Every 50 miliseconds, recheck to see whether we have retrieved data

    if(gvWebsites.length > 0 && gvSearchProducts.length > 0){
        log(gvScriptName_BGMain + '.waitForSearchDataThenInitialiseTab: Ending wait: gvWebsites (' + gvWebsites.length + ') and gvSearchProducts (' + gvSearchProducts.length + ') are set','PROCS');
        initialiseTab(tab,callback);
    } else {
        if (counter > 200) { // time out after ten seconds
            log(gvScriptName_BGMain + '.waitForSearchDataThenInitialiseTab: Ending wait: counter reached ' + counter + ' before gvWebsites and gvSearchProducts were set','ERROR');
            return;
        }
        counter++;
        window.setTimeout(function(){return waitForSearchDataThenInitialiseTab(tab,callback,counter);},50);
    }
}

function initialiseTab(tab,callback){

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

   gvTabs[tab.id] = {tab:                           tab, // Chrome's original tab object
                     isBaluShowOrHide_untilRefresh: 'SHOW', // A setting available on every sidebar; will always be SHOW right after refresh
                     isWebsiteOnOrOff:              isWebsiteOnOrOff,
                     website:                       website,
                     recommendationCount:           0};

   var logText =  website ? 'website valid' : 'website not valid';
   log(gvScriptName_BGMain + '.initialiseTab: ' + gvTabs[tab.id].tab.id + ' saved; ' + logText + '; isWebsiteOnOrOff == ' + isWebsiteOnOrOff,' INFO');

   // Finally, pass back the tab to the content_script so it has easy access to its own state
   callback(gvTabs[tab.id]); // Note, the content script will request a page search in this callback
}

/*
 * We are refreshing the tab, usually because a content script has been initialised, or because the user has logged in etc
 */
function refreshTab_allTabs(){
    log(gvScriptName_BGMain + '.refreshTab_allTabs: Start','PROCS');
    for(var tab in gvTabs) {refreshTab(gvTabs[tab].tab.id);}
}
function refreshTab(tabId){

    log(gvScriptName_BGMain + '.refreshTab: Start','PROCS');

    // Only do something if Balu is on and the website is an active website
    if(gvIsBaluOnOrOff === 'ON' && gvTabs[tabId].isWebsiteOnOrOff === 'ON') {

        // Depending whether user is logged in, determines whether we show sign sidebar or run a search
        Parse.initialize(gvAppId, gvJSKey);
        var user = Parse.User.current();
        if(user) {
            sendMessage(tabId,'pleaseSearchThePage',{searchData: gvSearchProducts});
        } else {
            sendMessage(tabId,'pleaseDisplayLogInSidebar');
        }
    } else

    // if the website is on, then we hide the sidebar. It might not be displayed, but this is a catch all
    if(gvTabs[tabId].isWebsiteOnOrOff === 'ON') {
        sendMessage(tabId,'pleaseHideSidebar');
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
function displayRecommendations(tabId,username,userId,recommendationData,productGroupHeaders,searchTerm){

    log(gvScriptName_BGMain + '.displayRecommendations: start','PROCS');

    // Get the rec count and display it on the browser action
    gvTabs[tabId].recommendationCount = recommendationData.length;
    chrome.browserAction.setBadgeText({text: "" + gvTabs[tabId].recommendationCount + "",tabId: tabId});

    // We only want to display the sidebar if:
    //   1) Balu is set to SHOW (gvIsBaluShowOrHide)
    //   2) The sidebar has not been temporarily hidden across all tabs (gvIsBaluShowOrHide_untilRestart)
    //   3) The sidebar has not been temporarily hidden on this tab (tab.isBaluShowOrHide_untilRefresh)
    // OR
    //   3) it is a manual search (use productGroupHeaders as a proxy for identifying a manual search)
    // OR
    //   4) the browser action is forcing the results onto the page (gvIsBaluShowOrHide_tempOverride)

    if((gvIsBaluShowOrHide === 'SHOW' &&
        gvIsBaluShowOrHide_untilRestart === 'SHOW' &&
        gvTabs[tabId].isBaluShowOrHide_untilRefresh === 'SHOW') ||
       productGroupHeaders === null ||
       gvIsBaluShowOrHide_tempOverride === 'SHOW') {
        gvIsBaluShowOrHide_tempOverride = 'HIDE';
        sendMessage(tabId,'pleaseDisplayRecommendations',{recommendationData:  recommendationData,
                                                          productGroupHeaders: productGroupHeaders,
                                                          searchTerm:          searchTerm});
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
 * @productGroupHeaders could be reconstructed here, but it's messy, and since we have to loop through all
 * the searchResults during page search it makes more sense to construct the prodcutGroupHeaders array then
 * (in the content_script) and pass it back here ready-to-go. It is an associative array of arrays of
 * productNames, indexed by ProductGroup
 *
 * We also pull the user's rec ratings here and add them to the recs being returnedso we can correctly order
 * and flag in the sidebar
 */
function getRecommendations(tabId,searchResults,productGroupHeaders,callback_displayRecommendations) {

    log(gvScriptName_BGMain + '.getRecommendations: start','PROCS');

    // To get the recommendations, the only part of searchResults we're interested in is the ProductGroup.
    // If the content_script found products A, B and C on the user's webpage, and products A, B and C belong
    // to ProductGroups X, X and Y respectively, then we need to recommend ALL recommendation products that
    // belong to ProductGroups X & Y.

    // So our first step is to create an array of productGroup IDs

    var productGroupsArray = [];
    for (var i = 0; i < searchResults.length; i++) {
        productGroupsArray.push(searchResults[i].productGroupId);
    }

    // Now we can create a Parse query for these ProductGroups and use that
    // to filter the Recommendation query

    Parse.initialize(gvAppId, gvJSKey);

    var ProductGroup = Parse.Object.extend('ProductGroup');
    var productGroupQuery = new Parse.Query(ProductGroup);
    productGroupQuery.containedIn('objectId',productGroupsArray);

    var Recommendation = Parse.Object.extend('Recommendation');
    var recommendationQuery = new Parse.Query(Recommendation);
    recommendationQuery.matchesQuery('productGroups',productGroupQuery);
    recommendationQuery.include('productGroups');
    recommendationQuery.include('ethicalBrand');

    // The sort order is important, otherwise the ProductGroups will not
    // form up correctly on the sidebar
    recommendationQuery.ascending('productGroup_sort,-ratingScore,productName');

    var recommendationsArray = [];
    var userRecommendationRatingsArray = {};

    recommendationQuery.find({
        success: function(recommendations) {

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
                    // use the array to efficiently add it o the recommendationsArray in the next step
                    for (var k = 0; k < userRecommendationRatings.length; k++){
                        var key = userRecommendationRatings[k].get('recommendation').id;
                        userRecommendationRatingsArray[key] = userRecommendationRatings[k].get('upOrDownOrNull');
                    }

                    // Push each recommendation into
                    for (var j = 0; j < recommendations.length; j++) {
                        // Load the imageURL separately in case there isn't one
                        var imageURL = "";
                        if(recommendations[j].get('image')){
                            imageURL = recommendations[j].get('image').url();
                        }

                        recommendationsArray.push({productGroupId:         recommendations[j].get('productGroups').id,
                                                   productGroupName:       recommendations[j].get('productGroups').get('productGroupName'),
                                                   recommendationId:       recommendations[j].id,
                                                   productName:            recommendations[j].get('productName'),
                                                   pageConfirmationSearch: recommendations[j].get('pageConfirmationSearch'),
                                                   productURL:             recommendations[j].get('productURL'),
                                                   brand:                  recommendations[j].get('ethicalBrand').get('brandName'),
                                                   imageURL:               imageURL,
                                                   twitterHandle:          recommendations[j].get('ethicalBrand').get('twitterHandle'),
                                                   brandSpiel:             recommendations[j].get('ethicalBrand').get('brandSpiel'),
                                                   upOrDownOrNull:         userRecommendationRatingsArray[recommendations[j].id]});
                    }

                    if (recommendationsArray.length > 0){
                        callback_displayRecommendations(tabId,Parse.User.current().get('username'),Parse.User.current().id,recommendationsArray,productGroupHeaders);
                        userLog(tabId,'RECOMMENDATIONS_FOUND',{recommendationsArray: recommendationsArray});
                    } else {
                        userLog(tabId,'RECOMMENDATIONS_NOT_FOUND');
                    }
                },
                error: parseErrorFind
            });
        },
        error: parseErrorFind
    });

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
        displayRecommendations(tabId,Parse.User.current().get('username'),Parse.User.current().id,recommendationsArray, null, searchTerm);
        userLog(tabId,'MANUAL_SEARCH_EMPTY_STRING');
    } else{

        userLog(tabId,'MANUAL_SEARCH',{searchTerm: searchTerm});

        var searchTerm_LC = searchTerm.toLowerCase();

        Parse.initialize(gvAppId, gvJSKey);

        var SearchProduct = Parse.Object.extend('SearchProduct');

        var searchProductQuery_productName  = new Parse.Query(SearchProduct);
        var searchProductQuery_brand  = new Parse.Query(SearchProduct);
        var searchProductQuery_searchTerm1  = new Parse.Query(SearchProduct);
        var searchProductQuery_searchTerm2  = new Parse.Query(SearchProduct);
        var searchProductQuery_searchTerm3  = new Parse.Query(SearchProduct);
        var searchProductQuery_productGroupName = new Parse.Query(SearchProduct);

        searchProductQuery_productName.contains('productName_LC',searchTerm_LC);
        searchProductQuery_brand.contains('brand_LC',searchTerm_LC);
        searchProductQuery_searchTerm1.contains('searchTerm1_LC',searchTerm_LC);
        searchProductQuery_searchTerm2.contains('searchTerm2_LC',searchTerm_LC);
        searchProductQuery_searchTerm3.contains('searchTerm3_LC',searchTerm_LC);
        searchProductQuery_productGroupName.contains('productGroup_sort',searchTerm_LC);

        var searchProductCompoundQuery = Parse.Query.or(searchProductQuery_productName,
                                                        searchProductQuery_brand,
                                                        searchProductQuery_searchTerm1,
                                                        searchProductQuery_searchTerm2,
                                                        searchProductQuery_searchTerm3,
                                                        searchProductQuery_productGroupName);

        searchProductCompoundQuery.find({
            success: function(searchProducts){

                var productGroupsArray = [];
                for (var i = 0; i < searchProducts.length; i++) {
                    productGroupsArray.push(searchProducts[i].get('productGroups').id);
                }

                var ProductGroup = Parse.Object.extend('ProductGroup');
                var productGroupQuery = new Parse.Query(ProductGroup);
                productGroupQuery.containedIn('objectId',productGroupsArray);

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
                recommendationCompoundQuery.ascending('productGroup_sort, productName');

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
                                    recommendationsArray.push({productGroupId:       recommendations[j].get('productGroups').id,
                                                               productGroupName:     recommendations[j].get('productGroups').get('productGroupName'),
                                                               recommendationId:     recommendations[j].id,
                                                               productName:          recommendations[j].get('productName'),
                                                               productURL:           recommendations[j].get('productURL'),
                                                               brand:                recommendations[j].get('ethicalBrand').get('brandName'),
                                                               imageURL:             imageURL,
                                                               twitterHandle:        recommendations[j].get('ethicalBrand').get('twitterHandle'),
                                                               brandSpiel:           recommendations[j].get('ethicalBrand').get('brandSpiel'),
                                                               upOrDownOrNull:       userRecommendationRatingsArray[recommendations[j].id]});
                                }

                                // Note, the content_script will catch no-results and display the empty side bar
                                displayRecommendations(tabId,Parse.User.current().get('username'),Parse.User.current().id,recommendationsArray, null, searchTerm);
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

function showProductLinkWindow(tabId,productURL,recommendationId, pageConfirmationSearch){

    log(gvScriptName_BGMain + '.showProductLinkWindow: start','PROCS');

    userLog(tabId,'REC_CLICK_THROUGH',{recommendationId:       recommendationId,
                                       productURL:             productURL,
                                       pageConfirmationSearch: pageConfirmationSearch});

    chrome.tabs.create({'url': productURL}, function(tab){trackNewTab(tab,productURL,recommendationId,pageConfirmationSearch);});

    // In parallel, register this click on the recommendation's click count
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

function showUserSubmittedRecWindow(tabId){

    log(gvScriptName_BGMain + '.showUserSubmittedRecWindow: start','PROCS');

    userLog(tabId,'SHOW_USER_SUB_REC_WINDOW');

    chrome.windows.create({'url': chrome.extension.getURL('userSubmittedRec.html'), 'type': 'popup', 'width': 450, 'height': 450, 'left': 300,'top': 100}, function(window) {});
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
            refreshTab_allTabs();

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
        refreshTab_allTabs();
        callback();
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
    userLog(tabId,'TRACKED_TAB_ERROR',{originalURL:      trackedTab.originalURL, // the URL that we tried to open, incase there's a redirect etc
                                       recommendationId: trackedTab.recommendationId,
                                       productName:      trackedTab.productName});
}

/******************
 * Error handling *
 ******************/

function parseErrorSave(object,error) {alert("Parse error on .save() request: " + error.code + " " + error.message);}
function parseErrorFind(error) {alert("Parse error on .find() request: " + error.code + " " + error.message);}
function parseErrorUser(user,error) {alert("Parse error on authentication request: " + error.code + " " + error.message);}
function parseErrorGet(user,error) {alert("Parse error on .get() request: " + error.code + " " + error.message);}

// To do: remove these alerts and replace with a more user-friendly error catch.
