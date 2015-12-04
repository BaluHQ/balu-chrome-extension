/********
 * Init *
 ********/

/*
 * Global Variables
 */

gvScriptName_BGLogging = 'BG_logging';

// Logging control
var gvLogErrors = true;
var gvLogProcs  = true;
var gvLogSearch = true;
var gvLogMessg  = true;
var gvLogDebugs = true;
var gvLogInfos  = true;
var gvLogInits  = true;
var gvLogLstnrs = true;
var gvLogTemps  = true;

/*
 *
 */
(function initialise(){
    log(gvScriptName_BGLogging + '.initialise: Start','INITS');
})();

/*************
 * Functions *
 *************/

/*
 *
 */
function userLog(tabId, eventName, data) {

    log(gvScriptName_BGLogging + '.userLog: Start >>> eventName == ' + eventName + ', tabId == ' + tabId,' INFO');

    Parse.initialize(gvAppId, gvJSKey);

    acl = new Parse.ACL();
    acl.setRoleReadAccess("Analytics",true);

    var tabURL;
    var tabURL_anonymised;
    if(gvTabs[tabId]){
        tabURL = gvTabs[tabId].tab.url;
        tabURL_anonymised = tabURL.substring(0,tabURL.indexOf('/',tabURL.indexOf('/')+2));
    }

    var user = Parse.User.current();

    // don't log for the dev / test user
    if(user){
        if(user.get('username') === 'dev.baluhq@gmail.com'){
            return;
        }
    }
    // For the UserLog events that require no bespoke code...
    if(eventName === 'USER_LOG_IN' ||
       eventName === 'USER_LOG_OUT' ||
       eventName === 'USER_PASSWORD_RESET' ||
       eventName === 'USER_SIGNED_UP' ||
       eventName === 'HIDE_SIDEBAR_REFRESH' ||
       eventName === 'HIDE_SIDEBAR_RESTART' ||
       eventName === 'SHOW_USER_SUB_REC_WINDOW' ||
       eventName === 'SHOW_USER_SUB_WEB_REC_WINDOW' ||
       eventName === 'SHOW_INFO_WINDOW' ||
       eventName === 'SHOW_FAQ_WINDOW' ||
       eventName === 'SHOW_PRIVACY_WINDOW' ||
       eventName === 'OPTIONS: SHOW_OPTIONS' ||
       eventName === 'OPTIONS: BALU_SET_TO_HIDE' ||
       eventName === 'OPTIONS: BALU_SET_TO_SHOW' ||
       eventName === 'OPTIONS: BALU_TURNED_ON' ||
       eventName === 'OPTIONS: BALU_TURNED_OFF') {

        var UserLogOb = Parse.Object.extend("UserLog");
        // to do: test, could user ever be null here?
        var userLogOb = new UserLogOb();

        userLogOb.set('eventName',eventName);
        userLogOb.set('tabURL',tabURL_anonymised);
        userLogOb.set('user',user);

        userLogOb.setACL(acl);

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

        // for SEARCH
        var searchProductIds = [];

        switch (eventName) {
            case ('SEARCH'):


                for (i = 0; i < data.searchResults.length; i++){
                    searchProductIds.push(data.searchResults[i].searchProductId);
                }

                var UserLog_Search = Parse.Object.extend("UserLog_Search");
                var userLog_Search = new UserLog_Search();

                userLog_Search.set('eventName',eventName);
                userLog_Search.set('tabURL',tabURL_anonymised);
                userLog_Search.set('websiteURL',data.websiteURL);
                userLog_Search.set('searchProductsFound',data.searchProductsFound);
                userLog_Search.set('searchProductIds',searchProductIds);
                userLog_Search.set('user',user);

                userLog_Search.setACL(acl);

                userLog_Search.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'RECOMMENDATIONS_FOUND':

                // Build up our arrays
                for (i = 0; i < data.recommendationsArray.length; i++){
                    productGroupIds.push(data.recommendationsArray[i].productGroupId);
                    productGroupNames.push(data.recommendationsArray[i].productGroupName);
                    recommendationIds.push(data.recommendationsArray[i].recommendationId);
                    productNames.push(data.recommendationsArray[i].productName);
                    productURLs.push(data.recommendationsArray[i].productURL);
                    twitterHandles.push(data.recommendationsArray[i].twitterHandle);
                }

                // Save the user log, with anonymisd tabURL

                var UserLog_Recommendations = Parse.Object.extend("UserLog_Recommendations");
                var userLog_Recommendations = new UserLog_Recommendations();

                userLog_Recommendations.set('eventName',eventName);
                userLog_Recommendations.set('tabURL',tabURL_anonymised);
                userLog_Recommendations.set('user',user);
                userLog_Recommendations.set('productGroupIds',productGroupIds);
                userLog_Recommendations.set('productGroupNames',productGroupNames);
                userLog_Recommendations.set('recommendationIds',recommendationIds);
                userLog_Recommendations.set('productNames',productNames);
                userLog_Recommendations.set('productURLs',productURLs);
                userLog_Recommendations.set('twitterHandles',twitterHandles);

                userLog_Recommendations.setACL(acl);

                userLog_Recommendations.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

                // Save a full record of the recommendation results, without the user

                var Stats_Recommendations = Parse.Object.extend("Stats_Recommendations");
                var stats_Recommendations = new Stats_Recommendations();

                stats_Recommendations.set('eventName',eventName);
                stats_Recommendations.set('tabURL',tabURL);
                stats_Recommendations.set('productGroupIds',productGroupIds);
                stats_Recommendations.set('productGroupNames',productGroupNames);
                stats_Recommendations.set('recommendationIds',recommendationIds);
                stats_Recommendations.set('productNames',productNames);
                stats_Recommendations.set('productURLs',productURLs);
                stats_Recommendations.set('twitterHandles',twitterHandles);

                stats_Recommendations.setACL(acl);

                stats_Recommendations.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'RECOMMENDATIONS_NOT_FOUND':

                var UserLog_NoRecommendations = Parse.Object.extend("UserLog_Recommendations");
                var userLog_NoRecommendations = new UserLog_NoRecommendations();

                userLog_NoRecommendations.set('eventName',eventName);
                userLog_NoRecommendations.set('tabURL',tabURL_anonymised);
                userLog_NoRecommendations.set('user',user);

                userLog_NoRecommendations.setACL(acl);

                userLog_NoRecommendations.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;


            case ('MANUAL_SEARCH' || 'MANUAL_SEARCH_EMPTY_STRING'):

                var UserLog_ManualSearch = Parse.Object.extend("UserLog_ManualSearch");
                var userLog_ManualSearch = new UserLog_ManualSearch();

                userLog_ManualSearch.set('eventName',eventName);
                // We don't log tabURL for manual search, because they could be on any website
                userLog_ManualSearch.set('user',user);
                userLog_ManualSearch.set('searchTerm',data.searchTerm);

                userLog_ManualSearch.setACL(acl);

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
                var userLog_ManualSearch_Results = new UserLog_ManualSearch_Results();

                userLog_ManualSearch_Results.set('eventName',eventName);
                // We don't log tabURL for manual search, because they could be on any website
                userLog_ManualSearch_Results.set('user',user);
                userLog_ManualSearch_Results.set('searchTerm',data.searchTerm);
                userLog_ManualSearch_Results.set('productGroupIds',productGroupIds);
                userLog_ManualSearch_Results.set('productGroupNames',productGroupNames);
                userLog_ManualSearch_Results.set('recommendationIds',recommendationIds);
                userLog_ManualSearch_Results.set('productNames',productNames);
                userLog_ManualSearch_Results.set('productURLs',productURLs);
                userLog_ManualSearch_Results.set('twitterHandles',twitterHandles);

                userLog_ManualSearch_Results.setACL(acl);

                userLog_ManualSearch_Results.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'REC_CLICK_THROUGH':

                // Save the user log, with anonymisd tabURL
                var UserLog_RecClickThrough = Parse.Object.extend("UserLog_RecClickThrough");
                var userLog_RecClickThrough = new UserLog_RecClickThrough();
                userLog_RecClickThrough.set('eventName',eventName);
                userLog_RecClickThrough.set('tabURL',tabURL_anonymised);
                userLog_RecClickThrough.set('user',user);
                userLog_RecClickThrough.set('recommendation',{__type: "Pointer",className: "Recommendation",objectId: data.recommendationId});
                userLog_RecClickThrough.set('hyperlinkURL',data.productURL);
                userLog_RecClickThrough.set('recProductName',data.recProductName);
                if(data.isManualSearch === 'true'){
                    userLog_RecClickThrough.set('isManualSearch',true);
                }

                userLog_RecClickThrough.setACL(acl);

                userLog_RecClickThrough.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

                // Save a full record of the click through, without the user
                var Stats_RecClickThrough = Parse.Object.extend("Stats_RecClickThrough");
                var stats_RecClickThrough = new Stats_RecClickThrough();
                stats_RecClickThrough.set('eventName',eventName);
                stats_RecClickThrough.set('tabURL',tabURL);
                stats_RecClickThrough.set('recommendation',{__type: "Pointer",className: "Recommendation",objectId: data.recommendationId});
                stats_RecClickThrough.set('hyperlinkURL',data.productURL);
                stats_RecClickThrough.set('recProductName',data.recProductName);

                stats_RecClickThrough.setACL(acl);

                stats_RecClickThrough.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'TRACKED_TAB_ERROR':

                var UserLog_TrackedTabError = Parse.Object.extend("UserLog_TrackedTabError");
                var userLog_TrackedTabError = new UserLog_TrackedTabError();

                userLog_TrackedTabError.set('eventName',eventName);
                userLog_TrackedTabError.set('tabURL_current',tabURL); // This is ok non-anonymised, because this is the URL they've ended up on having clicked through from the app, not the one they were browsing
                userLog_TrackedTabError.set('user',user);
                userLog_TrackedTabError.set('originalURL',data.originalURL); // As above, except this is what they originally clicked on (i.e. they should be the same, but both are stored to pick up auto redirects on the target website)
                userLog_TrackedTabError.set('recommendation',{__type: "Pointer",className: "Recommendation",objectId: data.recommendationId});
                userLog_TrackedTabError.set('productName',data.productName);
                userLog_TrackedTabError.set('pageConfirmationSearch',data.pageConfirmationSearch);

                userLog_TrackedTabError.setACL(acl);

                userLog_TrackedTabError.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'RECOMMENDATION_RATING':

                var UserLog_RecRatings = Parse.Object.extend("UserLog_RecRatings");
                var userLog_RecRatings = new UserLog_RecRatings();

                userLog_RecRatings.set('eventName',eventName);
                userLog_RecRatings.set('tabURL',tabURL_anonymised);
                userLog_RecRatings.set('user',user);
                userLog_RecRatings.set('recommendation',{__type: "Pointer",className: "Recommendation",objectId: data.recommendationId});
                userLog_RecRatings.set('upOrDownOrNull',data.upOrDownOrNull);

                userLog_RecRatings.setACL(acl);

                userLog_RecRatings.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'WHY_CARE_CLICK':

                var UserLog_WhyCare = Parse.Object.extend("UserLog_WhyCare");
                var userLog_WhyCare = new UserLog_WhyCare();

                userLog_WhyCare.set('eventName',eventName);
                userLog_WhyCare.set('tabURL',tabURL_anonymised);
                userLog_WhyCare.set('user',user);
                userLog_WhyCare.set('whyDoWeCareURLName',data.whyDoWeCareURLName);

                userLog_WhyCare.setACL(acl);

                userLog_WhyCare.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'SHOW_TWEET_WINDOW':

                var UserLog_TweetWindow = Parse.Object.extend("UserLog_TweetWindow");
                var userLog_TweetWindow = new UserLog_TweetWindow();

                userLog_TweetWindow.set('eventName',eventName);
                userLog_TweetWindow.set('tabURL',tabURL_anonymised);
                userLog_TweetWindow.set('user',user);
                userLog_TweetWindow.set('tweetContent',data.tweetContent);

                userLog_TweetWindow.setACL(acl);

                userLog_TweetWindow.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'USER_BLOCK_BRAND':

                var UserLog_BlockBrand = Parse.Object.extend("UserLog_BlockBrand");
                var userLog_BlockBrand = new UserLog_BlockBrand();

                userLog_BlockBrand.set('eventName',eventName);
                userLog_BlockBrand.set('user',user);
                userLog_BlockBrand.set('ethicalBrand',{__type: "Pointer",className: "EthicalBrand",objectId: data.brandId});
                userLog_BlockBrand.set('brandName',data.brandName);
                userLog_BlockBrand.set('recommendation',{__type: "Pointer",className: "Recommendation",objectId: data.recommendationId});
                userLog_BlockBrand.set('productName',data.productName);
                userLog_BlockBrand.set('reason',data.reason);

                userLog_BlockBrand.setACL(acl);

                userLog_BlockBrand.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'USER_UNBLOCK_BRAND':

                UserLog_BlockBrand = Parse.Object.extend("UserLog_BlockBrand");
                userLog_BlockBrand = new UserLog_BlockBrand();

                userLog_BlockBrand.set('eventName',eventName);
                userLog_BlockBrand.set('tabURL',tabURL_anonymised);
                userLog_BlockBrand.set('user',user);
                userLog_BlockBrand.set('ethicalBrand',{__type: "Pointer",className: "EthicalBrand",objectId: data.brandId});
                userLog_BlockBrand.set('brandName','');
                userLog_BlockBrand.set('recommendation',null);
                userLog_BlockBrand.set('productName',data.productName);
                userLog_BlockBrand.set('reason',data.reason);

                userLog_BlockBrand.setACL(acl);

                userLog_BlockBrand.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'JOYRIDE_POST_STEP':
            case 'JOYRIDE_POST_RIDE':
            case 'JOYRIDE_REACTIVATE':

                UserLog_Joyride = Parse.Object.extend("UserLog_Joyride");
                userLog_Joyride = new UserLog_Joyride();

                userLog_Joyride.set('eventName',eventName);
                userLog_Joyride.set('tabURL',tabURL_anonymised);
                userLog_Joyride.set('joyrideIndex',data.joyrideIndex);
                userLog_Joyride.set('user',user);

                userLog_Joyride.setACL(acl);

                userLog_Joyride.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });
            break;

            default:
                log(gvScriptName_BGLogging + '.userLog: ERROR, unhandled event name (' + eventName + ') passed to UserLog','ERROR');

        }
    }
}

function logError(eventName,data){

    log(gvScriptName_BGLogging + '.logError: Start >>> eventName == ' + eventName,' INFO');

    var ErrorLog = Parse.Object.extend("ErrorLog");
    var errorLog = new ErrorLog();

    errorLog.set('eventName',eventName);
    errorLog.set('message',data.message);

    errorLog.setACL(acl);

    errorLog.save({
        success: function(){

        },
        error: parseErrorSave
    });
}


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

        case 'SERCH':
            if (gvLogSearch)  console.log(level + ': ' + message);
        break;

        case 'MESSG':
            if (gvLogMessg)  console.log('    > ' + level + ': ' + message);
        break;

        case 'DEBUG':
            if (gvLogDebugs) console.log(level + ': ' + message);
        break;

        case ' INFO':
            if (gvLogInfos) console.log(level + ': ' + message);
        break;

        case 'INITS':
            if (gvLogInits) console.log(level + ': ' + message);
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
