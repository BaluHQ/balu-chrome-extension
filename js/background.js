/********
 * Init *
 ********/

/*
 * Global variables
 */
var gvIsBaluOnOrOff;
var gvIsBaluShowOrHide;
var gvWebsites;
var gvProductSearch;
var gvTabs = [];

// Logging control
var gvLogErrors = true;
var gvLogProcs  = true;
var gvLogDebugs = true;
var gvLogInfos  = true;
var gvLogLstnrs = false;
var gvLogTemps  = true;

/*
 *
 */
(function initialise(){

    log('background.initialise: Start','PROCS');

     // Listen for one-off Chrome messages (used by content script to tell us when page has loaded and to access console.log)
    chrome.runtime.onMessage.addListener(chromeMessageListener);

    // Listen for tab closures
    chrome.tabs.onRemoved.addListener(chromeRemovedTabListener);

    // getBaluSettings() will not execute callback if Balu is off
    getBaluSettings({then: getWebsiteAndSearchData});

    // Add listener to storage, so we pick when Balu is turned on / off, show / hide (from the options page)
    chrome.storage.onChanged.addListener(storageChangeListener);


})();

/**********************
 * Listener Functions *
 **********************/

/*
 *
 */
function chromeMessageListener(msg, sender, returnTabToContentScript){

    log('background.chromeMessageListener: Start: Event: chrome.runtime.onMessage','LSTNR');

    switch (msg.sender + ' | ' + msg.subject) {

        case 'content_script | pleaseConnectTab':
            log('background.chromeMessageListener: Request received: pleaseConnectTab','PROCS');
            if (gvIsBaluOnOrOff === 'ON') {
                waitForWebsiteDataThenConnect(sender,returnTabToContentScript);
            }
            break;

        case 'content_script | pleaseLogMessageOnConsole':
            log(msg.message,msg.level);
            break;

        case 'content_script | pleaseLogEventInUserLog':
            userLog(sender.tab.id,msg.eventName,msg.data);
            break;

        case 'content_script | pleaseSetBrowserActionBadge':
            if(gvIsBaluOnOrOff === 'ON') {
                chrome.browserAction.setBadgeText({text: msg.recommendationCount});
            } else {
                chrome.browserAction.setBadgeText({text: ''});
            }
            break;

        default:
            log('background.chromeMessageListener: unknown message received','ERROR');
    }

}

/*
 *
 */
function portMessageListener(msg){

    log('background.portMessageListener: Start: Event: port.onMessage','LSTNR');

    Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');

    switch (msg.sender + ' | ' + msg.subject) {

        case 'content_script | pleaseSearchThePage':
            log('background.portMessageListener: Request received: pleaseSearchThePage','PROCS');
            gvTabs[msg.tabId].isBaluShowOrHide_untilRefresh = 'SHOW';
            searchThePage(msg.tabId);
        break;

        case 'content_script | pleaseRetrieveRecommendations':
            log('background.portMessageListener: Request received: pleaseRetrieveRecommendations','PROCS');
            getRecommendationData(msg.tabId,msg.searchResults,msg.productGroupHeaders,displayResults);
        break;

        case 'content_script | pleaseIncrementRecClickCount':
            log('background.portMessageListener: Request received: pleaseIncrementRecClickCount','PROCS');
            recommendationClickCount_increment(msg.tabId,msg.recommendationId);
        break;

        case 'content_script | pleaseVoteUpThisProduct':
            log('background.portMessageListener: Request received: pleaseVoteUpThisProduct','PROCS');
            userRecommendationRating_createOrUpdate(msg.tabId,msg.recommendationId,'UP');
        break;

        case 'content_script | pleaseVoteDownThisProduct':
            log('background.portMessageListener: Request received: pleaseVoteDownThisProduct','PROCS');
            userRecommendationRating_createOrUpdate(msg.tabId,msg.recommendationId,'DOWN');
        break;

        case 'content_script | pleaseHideBaluUntilRefresh':
            log('background.portMessageListener: Request received: pleaseHideBaluUntilRefresh >>> msg.tabId == ' + msg.tabId,'PROCS');
            gvTabs[msg.tabId].isBaluShowOrHide_untilRefresh = 'HIDE';
            requestHideSideBar(msg.tabId); // without setting any variables or storage, sidebar will display after next refresh
        break;

        case 'content_script | pleaseHideBaluUntilRestart':
            log('background.portMessageListener: Request received: pleaseHideBaluUntilRestart','PROCS');
            gvIsBaluShowOrHide = 'HIDE'; // without setting storage, sidebar will display after next extension load (browser restart)
            requestHideSideBarAllTabs();
        break;

        case 'content_script | pleaseLogThisUserIn':
            log('background.portMessageListener: Request received: pleaseLogThisUserIn >> msg.tabId == ' + msg.tabId,'PROCS');
            logUserIn(msg.tabId,msg.username, msg.password);
        break;

        case 'content_script | pleaseSignThisUserUp':
            log('background.portMessageListener: Request received: pleaseSignThisUserUp','PROCS');
            signUserUp(msg.tabId, msg.username, msg.password, msg.email);
            break;

        case 'content_script | pleaseLogThisUserOut':
            log('background.portMessageListener: Request received: pleaseLogThisUserOut','PROCS');
            logUserOut(msg.tabId);
        break;

        case 'content_script | pleaseRunManualSearch':
            log('background.portMessageListener: Request received: pleaseRunManualSearch','PROCS');
            manualProductSearch(msg.tabId, msg.searchTerm);
        break;

        default:
            log('background.portMessageListener: unknown message received','ERROR');
    }
}

/*
 *
 */
function storageChangeListener(changes, namespace) {

    log('background.storageChangeListener: Start: Event: storage.onChanged','LSTNR');

    for (var key in changes) {
        if (key === 'isBaluShowOrHide') {
            log('background.storageChangeListener: isBaluShowOrHide changed from ' + changes[key].oldValue + ' to ' + changes[key].newValue,'PROCS');
        }
        if (key === 'isBaluOnOrOff') {
            log('background.storageChangeListener: isBaluOnOrOff changed from ' + changes[key].oldValue + ' to ' + changes[key].newValue,'PROCS');
            if(changes[key].newValue === 'ON'){
                getBaluSettings({then: getWebsiteAndSearchData});
            }
        }
    }
}

/*
 * If a tab is closed we need to remove the tab
 */
function chromeRemovedTabListener(tabId, removeInfo){

    log('background.chromeRemovedTabListener: Start: Event: chrome.runtime.onRemoved >> tabId == ' + tabId,' TEMP');

    gvTabs.splice(tabId,1);
}

/*************
 * Functions *
 *************/

/*
 * Check whether the extension is turned on etc and set the global variables
 */
function getBaluSettings(args){

     log('background.getBaluSettings: Start','PROCS');

     chrome.storage.sync.get('isBaluOnOrOff',function (obj1) {
         if(obj1.isBaluOnOrOff){
             gvIsBaluOnOrOff = obj1.isBaluOnOrOff;
         } else {
             gvIsBaluOnOrOff = 'ON'; // If nothing was found in Chrome storage then assume first use of app and turn on
             chrome.storage.sync.set({'isBaluOnOrOff': gvIsBaluOnOrOff}, function(){
                 log('background.getBaluSettings: storage.sync.isBaluOnOrOff set to ' + gvIsBaluOnOrOff, ' INFO');
             }); // Let this run asynchronously, because we're not going to need it again unless the extension is restarted
         }

         if(gvIsBaluOnOrOff === 'ON') {
             chrome.browserAction.setIcon({path: chrome.extension.getURL('images/icon-browser_action.png')});
         } else {
             chrome.browserAction.setIcon({path: chrome.extension.getURL('images/icon-browser_action-off.png')});
         }

         chrome.storage.sync.get('isBaluShowOrHide',function(obj2){
             if(obj2.isBaluShowOrHide){
                 gvIsBaluShowOrHide = obj2.isBaluShowOrHide;
             } else {
                 gvIsBaluShowOrHide = 'SHOW'; // If nothing was found in Chrome storage then assume first use of app and default to sidebar visible
                 chrome.storage.sync.set({'isBaluShowOrHide':gvIsBaluShowOrHide}, function(){
                     log('background.getBaluSettings: storage.sync.isBaluShowOrHide set to ' + gvIsBaluShowOrHide, ' INFO');
                 }); // Let this run asynchronously, because we're not going to need it again unless the extension is restarted
             }

             log('background.getBaluSettings: gvIsBaluOnOrOff == ' + gvIsBaluOnOrOff + ', gvIsBaluShowOrHide == ' + gvIsBaluShowOrHide,' INFO');
             // If Balu is turned off, execution ends here
             if (args && gvIsBaluOnOrOff === 'ON') {
                 args.then();
             }

         });
     });
 }

/*
 *
 */
function waitForWebsiteDataThenConnect(sender,returnTabToContentScript){

    var i = 0;

    if(gvWebsites){
        log('background.waitForWebsiteDataThenConnect: Ending wait: gvWebsites is set','PROCS');
        connectTab(sender.tab,returnTabToContentScript);
    } else {
        log('background.waitForWebsiteDataThenConnect: Waiting: gvWebsites is not set yet',' INFO');
        if (i > 2000) {
            return;
        }
        i++;
        window.setTimeout(function(){return waitForWebsiteDataThenConnect(sender,returnTabToContentScript);},50);
    }
}

/*
 *
 */
function connectTab(tab,returnTabToContentScript){

    log('background.connectTab: Start','PROCS');

    // First, check whether the new URL for this tab is valid for search and
    // save the website URL (the one from the Parse DB, not the user's actual URL)
    // into the tab object
    // Two gvWebsiteURL values should hopefully never match the same URL, but
    // it is possible. In that case, the first one found (assuming it's on) will
    // be taken
    var isWebsiteOnOrOff = 'OFF';
    var websiteId;
    var websiteURL;
    for (i = 0; i < gvWebsites.length; i++) {
        if (tab.url.indexOf(gvWebsites[i].websiteURL) != -1) {
            websiteId = gvWebsites[i].id;
            websiteURL = gvWebsites[i].websiteURL;
            if(gvWebsites[i].isWebsiteOnOrOff === 'ON'){
                isWebsiteOnOrOff = 'ON';
                break;
            }
        }
    }
    if(isWebsiteOnOrOff === 'OFF') {
        chrome.browserAction.setBadgeText({text: ""});
    }

    // Second, create a port
    // We do this on every page load, because the page is disconnected everytime the tab unloads (user navigates))
    var port = chrome.tabs.connect(tab.id, {name:'background'});
    port.onMessage.addListener(portMessageListener);
    log('background.connectTab: ' + tab.id + ' connected',' INFO');

    // Third, save / update the tab in gvTabs
    gvTabs[tab.id] = {tab:              tab,
                      isWebsiteOnOrOff: isWebsiteOnOrOff,
                      isBaluShowOrHide_untilRefresh: 'SHOW',
                      websiteId:        websiteId,
                      websiteURL:       websiteURL,
                      port:             port};

    log('background.connectTab: ' + gvTabs[tab.id].tab.id + ' saved',' INFO');

    // Finally, pass back the tab to the content_script (that originally asked to connect) so it can identify itself in the future
    returnTabToContentScript(gvTabs[tab.id]);
}

/*
 * check whether the extension is turned on and set the global variable
 */
function getWebsiteAndSearchData(){

     log('background.getWebsiteAndSearchData: Start','PROCS');

     getWebsiteData();

     getSearchProductData();
}

/*
 *
 */
 /*
function waitForSearchDataThenSearch(tabId,username){
    var i = 0;
    if(gvProductSearch){
        log('background.waitForSearchDataThenSearch: Ending wait: gvProductSearch is set','PROCS');
        requestPageSearch(tabId,username,user.id);
    } else {
        log('background.waitForSearchDataThenSearch: gvProductSearch is not set yet',' INFO');
        if (i > 2000) {
            return;
        }
        i++;
        window.setTimeout(function(){return waitForSearchDataThenSearch(tabId,username);},50);
    }
}
*/
/*
 *
 */
function displaySignInSideBar_allTabs(){

    log('background.displaySignInSideBar_allTabs: Start','PROCS');

    for(var tab in gvTabs) {
        // just incase the port has disconnected for whatever reason. In theory that's a bug,
        // but I can't commit the time right now to identifying it. So just catch it here.
        if(gvTabs[tab].port !== null && gvTabs[tab].isWebsiteOnOrOff === 'ON'){
            displaySignInSideBar(tab);
        }
    }
}

/*
 *
 */
function displaySignInSideBar(tabId){

    log('background.displaySignInSideBar: Start >>> tabId == ' + tabId,'PROCS');

    if(gvIsBaluOnOrOff === 'ON') {
        if(gvTabs[tabId].isWebsiteOnOrOff === 'ON') {
            if (gvIsBaluShowOrHide === 'SHOW'){
                log('background.displaySignInSideBar: URL is ON, gvIsBaluShowOrHide == SHOW, so displaying sign in side bar >>> ',' INFO');
                    requestDisplaySignInSideBar(tabId);
            } else {
                log('background.displaySignInSideBar: URL is ON, gvIsBaluShowOrHide == HIDE, so displaying alert on browser_action',' INFO');
            }
        } else {
            log('background.displaySignInSideBar: URL is OFF, so displaying alert on browser_action',' INFO');
        }
    } else {
        log('background.displaySignInSideBar: Balu is off, so doing nothing',' INFO');
        // do nothing
    }
}

/*
 *
 */
function searchThePage_allTabs(){
    log('background.searchThePage_allTabs: Start','PROCS');
    for(var tab in gvTabs) {
        if(gvTabs[tab].tab.url.indexOf('chrome-extension://') === -1) {
            searchThePage(tab);
        }
    }
}

/*
 *
 */
function searchThePage(tabId){

    log('background.searchThePage: Start','PROCS');

    if(gvIsBaluOnOrOff === 'ON') {
        Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');
        var user = Parse.User.current();

        if(user) {
            requestPageSearch(tabId,user.get('username'),user.id);
        } else {
            if(gvIsBaluShowOrHide === 'SHOW'){
                displaySignInSideBar(tabId);
                chrome.browserAction.setBadgeText({text: "!"});
            } else{
                chrome.browserAction.setBadgeText({text: "!"});
            }

        }
    }
}

/************************
 * Parse Data Retrieval *
 ************************/

/*
 *
 */
function getWebsiteData(){

    log('background.getWebsiteData: Start','PROCS');

    Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');

    var Website = Parse.Object.extend("Website");
    var websiteQuery = new Parse.Query(Website);

    websiteQuery.find({
        success: function(websites){
            gvWebsites = [];
            for (var i = 0; i < websites.length; i++) {
                gvWebsites.push({websiteURL:       websites[i].get('websiteURL'),
                                 isWebsiteOnOrOff: websites[i].get('isWebsiteOnOrOff'),
                                 websiteId:        websites[i].id});
            }
            log('background.getWebsiteData: Finish >>> gvWebsites.length == ' + gvWebsites.length, ' INFO');
        },
        error: parseErrorFind
    });
}

/*
 * This function populates a global variable with all the necessary data to search
 * users' webpages for "unethical" products. That means we need:
 *   - The SearchProduct name and search terms
 *   - The SearchProduct's SearchCategory
 *   - The active websites for the SearchCategorys
 * One SearchProduct can only have one SearchCategory [so far, this probably needs to change] but one
 * SearchCategory can be active on many websites. Hence the resulting SearchProduct dataset
 * will contain duplicates, one for every active website.
 *
 * In addition to the above, we also need the ProductGroup. This will allow us to identify
 * matching recommendations after the page search is complete
 *
 * This function is run as part of the app initialisation - i.e. the ProductSearch dataset will
 * not refresh without a browser or extension restart.
 *
 */
function getSearchProductData() {

    log('background.getSearchProductData: Start','PROCS');

    // gvProductSearch is our global variable that we need to populate
    gvProductSearch = [];

    Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');

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

                                gvProductSearch.push({// Search Category
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

                    log('background.getSearchProductData: Finish >>> gvProductSearch.length == ' + gvProductSearch.length,' INFO');
                },
                error: parseErrorFind
            });
        },
        error: parseErrorFind
    });
}

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
function getRecommendationData(tabId,searchResults,productGroupHeaders,displayResults) {

    log("background.getRecommendationData: Start",'PROCS');

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

    Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');

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

                    if (recommendationsArray.length > 0){
                        displayResults(tabId,Parse.User.current().get('username'),Parse.User.current().id,recommendationsArray,productGroupHeaders);
                        userLog(tabId,'RECOMMENDATIONS_FOUND',{recommendationsArray: recommendationsArray});
                    } else {
                        chrome.browserAction.setBadgeText({text: ""});
                        userLog(tabId,'RECOMMENDATIONS_NOT_FOUND');
                    }
                },
                error: parseErrorFind
            });
        },
        error: parseErrorFind
    });

}

/*
 *
 */
function signUserUp(tabId,username,password,email){

    log("background.signUserUp: Start",'PROCS');

    var user = new Parse.User();
    user.set("username", username.toLowerCase());
    user.set("password", password);
    user.set("email",    email.toLowerCase());

    // If we got a sign up request then sign them up and log them in, and ask the content_script to search the page
    user.signUp(null, {
        success: function(user) {
            logUserIn(tabId,username,password);
            userLog(tabId,'USER_SIGNED_UP',{user: user});
        },
        error: parseErrorUser
    });
}

/*
 *
 */
function logUserIn(tabId,username,password){

    log("background.logUserIn: Start",'PROCS');

    Parse.User.logIn(username,password, {
        success: function(user) {
            log("background.logUserIn: User logged in, calling searchThePage_allTabs",' INFO');
            userLog(tabId,'USER_LOG_IN',{user: user});
            searchThePage_allTabs();
        },
        error: parseErrorUser
    });
}

/*
 *
 */
function logUserOut(){

    log("background.logUserOut: Start",'PROCS');

    Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');
    var user = Parse.User.current();

    userLog(null,'USER_LOG_OUT',{user: user});

    Parse.User.logOut();
    displaySignInSideBar_allTabs();

}

/*
 *
 */
function isUserLoggedIn(){
    Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');
    if(Parse.User.current()){
        return true;
    } else{
        return false;
    }
}

/*
 *
 */
function recommendationClickCount_increment(tabId,recommendationId){

    log("background.recommendationClickCount_increment: Start",'PROCS');

    Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');

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

/*
 *
 */
function userRecommendationRating_createOrUpdate(tabId,recommendationId,upOrDown){

    log("background.userRecommendationRating_createOrUpdate: Start",'PROCS');

    var ratingScore = 0;

    // We save upOrDown for good measure, but also a rating score to make retrieving the score easier
    if(upOrDown === 'UP'){
        ratingScore = 1;
    } else if (upOrDown === 'DOWN'){
        ratingScore = -1;
    }

    Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');

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
                                userLog(tabId,'USER_RECOMMENDATION_RATING',{recommendationId: userRecommendationRatings[0].get('recommendation').id,
                                                                            upOrDownOrNull: upOrDown});
                                log("background.userRecommendationRating_createOrUpdate: updated existing userRecommendationRating object",'DEBUG');
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
                                userLog(tabId,'USER_RECOMMENDATION_RATING',{recommendationId: recommendation.id,
                                                                            upOrDownOrNull: upOrDown});
                                log("background.userRecommendationRating_createOrUpdate: created new userRecommendationRating object",'DEBUG');

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

/*
 * I can't see an obvious way to integrate this with the existing search functions,
 * so repeating the code here.
 */
function manualProductSearch(tabId, searchTerm) {

    log("background.manualProductSearch: Start >>> tabId == " + tabId + ", searchTerm == " + searchTerm,'PROCS');

    var recommendationsArray = [];

    if(searchTerm === ''){
        displayResults(tabId,Parse.User.current().get('username'),Parse.User.current().id,recommendationsArray, null, searchTerm);
        userLog(tabId,'MANUAL_SEARCH_EMPTY_STRING');
    } else{

        userLog(tabId,'MANUAL_SEARCH',{searchTerm: searchTerm});

        var searchTerm_LC = searchTerm.toLowerCase();

        Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');

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
                                displayResults(tabId,Parse.User.current().get('username'),Parse.User.current().id,recommendationsArray, null, searchTerm);
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

/************************************
 * Content Script Request Functions *
 ************************************/

/*
 *
 */
function requestDisplayEmptySideBar(tabId,username,userId){

    log("background.requestDisplayEmptySideBar: Start >>> tabId == " + tabId + ', on port ' + gvTabs[tabId].port.name,'PROCS');

    gvTabs[tabId].port.postMessage({sender:   'background',
                                    subject:  'pleaseDisplayEmptySideBar',
                                    username: username,
                                    userId:   userId});
}

/*
 *
 */
function requestPageSearch(tabId,username,userId){

    log("background.requestPageSearch: Start >> tabId == " + tabId,'PROCS');

    gvTabs[tabId].port.postMessage({sender:          'background',
                                    subject:         'pleaseSearchThePage',
                                    searchData:       gvProductSearch,
                                    tabURL:           gvTabs[tabId].tab.url,
                                    websiteURL:       gvTabs[tabId].websiteURL,
                                    isBaluShowOrHide: gvIsBaluShowOrHide});
}

/*
 *
 */
function requestDisplaySignInSideBar(tabId){

    log("background.requestDisplaySignInSideBar: Start",'PROCS');

    gvTabs[tabId].port.postMessage({sender:  'background',
                                    subject: 'pleaseDisplaySignInSideBar'});
}

/*
 * @productGroupHeaders: optional
 */
function displayResults(tabId,username,userId,recommendationData,productGroupHeaders,searchTerm){

    log("background.displayResults: Start",'PROCS');

    // use productGroupHeaders as a proxy for identifying a manual search
    if (productGroupHeaders === null) {
        requestDisplayResultsSideBar(tabId,username,userId,recommendationData,productGroupHeaders,searchTerm);
    } else if(gvIsBaluShowOrHide === 'SHOW') {
        chrome.browserAction.setBadgeText({text: ""});
        requestDisplayResultsSideBar(tabId,username,userId,recommendationData,productGroupHeaders,searchTerm);
    } else {
        chrome.browserAction.setBadgeText({text: '' + recommendationData.length + ''});
    }

}

/*
 * @productGroupHeaders: optional
 */
function requestDisplayResultsSideBar(tabId,username,userId,recommendationData,productGroupHeaders,searchTerm){

    log("background.requestDisplayResultsSideBar: Start",'PROCS');

    gvTabs[tabId].port.postMessage({sender:             'background',
                                    subject:            'pleaseDisplayResultsSideBar',
                                    username:            username,
                                    userId:              userId,
                                    recommendationData:  recommendationData,
                                    productGroupHeaders: productGroupHeaders,
                                    searchTerm:          searchTerm});
}

/*
 *
 */
function requestHideSideBarAllTabs(){

    log("background.requestHideSideBarAllTabs: Start",'PROCS');

    for(var tabId in gvTabs) {
        try {
            requestHideSideBar(tabId);
        } catch(error){
            log('background.requestHideSideBarAllTabs: Error for tabId == ' + tabId + '. Error message: ' + error,'ERROR');
        }
    }
}

/*
 *
 */
function requestHideSideBar(tabId){

    log("background.requestHideSideBar: Start >>> tabId == " + tabId,'PROCS');

    gvTabs[tabId].port.postMessage({sender:  'background',
                                    subject: 'pleaseHideSideBar'});
}

/*
 *
 */
function getUserId(){
    Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');
    if(Parse.User.current()){
        return Parse.User.current().id;
    } else {
        return null;
    }

}
/**************************
 * Error and Log handling *
 **************************/

/*
 *
 */
 function log(message, levelP) {

     var level = levelP || 'NOTHING PASSED';

     switch(level) {
        case 'ERROR':
            if (gvLogErrors) console.log(level + ': ' + message);
            break;
        case 'PROCS':
            if (gvLogProcs)  console.log(level + ': ' + message);
            break;
        case 'DEBUG':
            if (gvLogDebugs) console.log(level + ': ' + message);
            break;
        case ' INFO':
            if (gvLogInfos) console.log(level + ': ' + message);
            break;
        case 'LSTNR':
            if (gvLogLstnrs) console.log(level + ': ' + message);
            break;
        case ' TEMP':
            if (gvLogTemps) console.log(level + ': ' + message);
            break;
        default:
            console.log('UNKWN' + ': ' + message);
    }
 }

/*
 *
 */
function userLog(tabId, eventName, data) {

    log("background.userLog: Start >>> eventName == " + eventName,'DEBUG');

    Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');

    var tabURL;
    if(tabId){
        tabURL = gvTabs[tabId].tab.url;
    }

    var user = Parse.User.current();

    // For the UserLog events that require no bespoke code...
    if(eventName === 'USER_LOG_IN' ||
       eventName === 'USER_LOG_OUT' ||
       eventName === 'USER_SIGNED_UP' ||
       eventName === 'SHOW_ADD_REC_WINDOW' ||
       eventName === 'SHOW_FAQ_WINDOW' ||
       eventName === 'SHOW_PRIVACY_WINDOW' ||
       eventName === 'OPTIONS: SHOW_OPTIONS' ||
       eventName === 'OPTIONS: BALU_SET_TO_HIDE' ||
       eventName === 'OPTIONS: BALU_SET_TO_SHOW' ||
       eventName === 'OPTIONS: BALU_TURNED_ON' ||
       eventName === 'OPTIONS: BALU_TURNED_OFF') {

           var UserLogOb = Parse.Object.extend("UserLog");
           // to do: test, could user ever be null here?
           var userLogOb = new UserLogOb({ACL: new Parse.ACL(user)});

           userLogOb.set('eventName',eventName);
           userLogOb.set('tabURL',tabURL);
           userLogOb.set('user',user);

           userLogOb.save({
               success: function(){
               },
               error: parseErrorSave
           });

    } else {

        // for either RECOMMENDATIONS_FOUND or MANUAL_SEARCH_RECOMMENDATIONS_RETURNED
        var productGroupIds = [];
        var productGroupNames = [];
        var recommendationIds = [];
        var productNames = [];
        var productURLs = [];
        var twitterHandles = [];

        switch (eventName) {
            case ('SEARCH'):

                var UserLog_Search = Parse.Object.extend("UserLog_Search");
                var userLog_Search = new UserLog_Search({ACL: new Parse.ACL(user)});

                userLog_Search.set('eventName',eventName);
                userLog_Search.set('tabURL',tabURL);
                userLog_Search.set('user',user);
                userLog_Search.set('websiteURL',data.websiteURL);
                userLog_Search.set('searchAlgorithmFunction',data.searchAlgorithmFunction);
                userLog_Search.set('searchProductsFound',data.searchProductsFound);

                userLog_Search.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case ('SEARCH_FAIL'):

                var UserLog_SearchFail = Parse.Object.extend("UserLog_Search");
                var userLog_SearchFail = new UserLog_SearchFail({ACL: new Parse.ACL(user)});

                userLog_SearchFail.set('eventName',eventName);
                userLog_SearchFail.set('tabURL',tabURL);
                userLog_SearchFail.set('user',user);
                userLog_SearchFail.set('websiteURL',data.websiteURL);
                userLog_SearchFail.set('searchAlgorithmFunction',data.searchAlgorithmFunction);
                userLog_SearchFail.set('message',data.message);

                userLog_Search.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'RECOMMENDATIONS_FOUND':

                for (i = 0; i < data.recommendationsArray.length; i++){
                    productGroupIds.push(data.recommendationsArray[i].productGroupId);
                    productGroupNames.push(data.recommendationsArray[i].productGroupName);
                    recommendationIds.push(data.recommendationsArray[i].recommendationId);
                    productNames.push(data.recommendationsArray[i].productName);
                    productURLs.push(data.recommendationsArray[i].productURL);
                    twitterHandles.push(data.recommendationsArray[i].twitterHandle);
                }

                var UserLog_Recommendations = Parse.Object.extend("UserLog_Recommendations");
                var userLog_Recommendations = new UserLog_Recommendations({ACL: new Parse.ACL(user)});

                userLog_Recommendations.set('eventName',eventName);
                userLog_Recommendations.set('tabURL',tabURL);
                userLog_Recommendations.set('user',user);
                userLog_Recommendations.set('productGroupIds',productGroupIds);
                userLog_Recommendations.set('productGroupNames',productGroupNames);
                userLog_Recommendations.set('recommendationIds',recommendationIds);
                userLog_Recommendations.set('productNames',productNames);
                userLog_Recommendations.set('productURLs',productURLs);
                userLog_Recommendations.set('twitterHandles',twitterHandles);

                userLog_Recommendations.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'RECOMMENDATIONS_NOT_FOUND':

                var UserLog_NoRecommendations = Parse.Object.extend("UserLog_Recommendations");
                var userLog_NoRecommendations = new UserLog_NoRecommendations({ACL: new Parse.ACL(user)});

                userLog_NoRecommendations.set('eventName',eventName);
                userLog_NoRecommendations.set('tabURL',tabURL);
                userLog_NoRecommendations.set('user',user);

                userLog_NoRecommendations.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;


            case ('MANUAL_SEARCH' || 'MANUAL_SEARCH_EMPTY_STRING'):

                var UserLog_ManualSearch = Parse.Object.extend("UserLog_ManualSearch");
                var userLog_ManualSearch = new UserLog_ManualSearch({ACL: new Parse.ACL(user)});

                userLog_ManualSearch.set('eventName',eventName);
                userLog_ManualSearch.set('tabURL',tabURL);
                userLog_ManualSearch.set('user',user);
                userLog_ManualSearch.set('searchTerm',data.searchTerm);

                userLog_ManualSearch.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'MANUAL_SEARCH_RECOMMENDATIONS_RETURNED':

                for (i = 0; i < data.recommendationsArray.length; i++){
                    productGroupIds.push(data.recommendationsArray[i].productGroupId);
                    productGroupNames.push(data.recommendationsArray[i].productGroupName);
                    recommendationIds.push(data.recommendationsArray[i].recommendationId);
                    productNames.push(data.recommendationsArray[i].productName);
                    productURLs.push(data.recommendationsArray[i].productURL);
                    twitterHandles.push(data.recommendationsArray[i].twitterHandle);
                }

                var UserLog_ManualSearch_Results = Parse.Object.extend("UserLog_ManualSearch_Results");
                var userLog_ManualSearch_Results = new UserLog_ManualSearch_Results({ACL: new Parse.ACL(user)});

                userLog_ManualSearch_Results.set('eventName',eventName);
                userLog_ManualSearch_Results.set('tabURL',tabURL);
                userLog_ManualSearch_Results.set('user',user);
                userLog_ManualSearch_Results.set('searchTerm',data.searchTerm);
                userLog_ManualSearch_Results.set('productGroupIds',productGroupIds);
                userLog_ManualSearch_Results.set('productGroupNames',productGroupNames);
                userLog_ManualSearch_Results.set('recommendationIds',recommendationIds);
                userLog_ManualSearch_Results.set('productNames',productNames);
                userLog_ManualSearch_Results.set('productURLs',productURLs);
                userLog_ManualSearch_Results.set('twitterHandles',twitterHandles);

                userLog_ManualSearch_Results.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'HYPERLINK':

                var UserLog_Hyperlinks = Parse.Object.extend("UserLog_Hyperlinks");
                var userLog_Hyperlinks = new UserLog_Hyperlinks({ACL: new Parse.ACL(user)});

                userLog_Hyperlinks.set('eventName',eventName);
                userLog_Hyperlinks.set('tabURL',tabURL);
                userLog_Hyperlinks.set('user',user);
                userLog_Hyperlinks.set('recommendation',{__type: "Pointer",className: "Recommendation",objectId: data.recommendationId});
                userLog_Hyperlinks.set('hyperlinkURL',data.url);

                userLog_Hyperlinks.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'USER_RECOMMENDATION_RATING':

                var UserLog_RecRatings = Parse.Object.extend("UserLog_RecRatings");
                var userLog_RecRatings = new UserLog_RecRatings({ACL: new Parse.ACL(user)});

                userLog_RecRatings.set('eventName',eventName);
                userLog_RecRatings.set('tabURL',tabURL);
                userLog_RecRatings.set('user',user);
                userLog_RecRatings.set('recommendation',{__type: "Pointer",className: "Recommendation",objectId: data.recommendationId});
                userLog_RecRatings.set('upOrDownOrNull',data.upOrDownOrNull);

                userLog_RecRatings.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            default:
                log("background.userLog: ERROR, unhandled event name passed to UserLog",'ERROR');

        }
    }
}

/*
 * To do: remove these alerts and replace with a more user-friendly error catch.
 */
 function parseErrorSave(object,error) {
     alert("Parse error on .save() request: " + error.code + " " + error.message);
 }

/*
 *
 */
 function parseErrorFind(error) {
     alert("Parse error on .find() request: " + error.code + " " + error.message);
 }

 /*
  *
  */
  function parseErrorUser(user,error) {
      alert("Parse error on authentication request: " + error.code + " " + error.message);
  }

  /*
   *
   */
   function parseErrorGet(user,error) {
       alert("Parse error on .get() request: " + error.code + " " + error.message);
   }
