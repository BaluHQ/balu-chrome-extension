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
var gvLogMessg  = true;
var gvLogDebugs = false;
var gvLogInfos  = true;
var gvLogInits  = false;
var gvLogLstnrs = false;
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

    log(gvScriptName_BGLogging + '.userLog: Start >>> eventName == ' + eventName,' INFO');

    Parse.initialize(gvAppId, gvJSKey);

    var tabURL;
    if(tabId){
        tabURL = gvTabs[tabId].tab.url;
    }

    var user = Parse.User.current();

    // For the UserLog events that require no bespoke code...
    if(eventName === 'USER_LOG_IN' ||
       eventName === 'USER_LOG_OUT' ||
       eventName === 'USER_SIGNED_UP' ||
       eventName === 'HIDE_SIDEBAR_REFRESH' ||
       eventName === 'HIDE_SIDEBAR_RESTART' ||
       eventName === 'SHOW_USER_SUB_REC_WINDOW' ||
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

            case 'REC_CLICK_THROUGH':

                var UserLog_RecClickThrough = Parse.Object.extend("UserLog_RecClickThrough");
                var userLog_RecClickThrough = new UserLog_RecClickThrough({ACL: new Parse.ACL(user)});

                userLog_RecClickThrough.set('eventName',eventName);
                userLog_RecClickThrough.set('tabURL',tabURL);
                userLog_RecClickThrough.set('user',user);
                userLog_RecClickThrough.set('recommendation',{__type: "Pointer",className: "Recommendation",objectId: data.recommendationId});
                userLog_RecClickThrough.set('hyperlinkURL',data.productURL);
                userLog_RecClickThrough.set('recProductName',data.productName);

                userLog_RecClickThrough.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'TRACKED_TAB_ERROR':

                var UserLog_TrackedTabError = Parse.Object.extend("UserLog_TrackedTabError");
                var userLog_TrackedTabError = new UserLog_TrackedTabError({ACL: new Parse.ACL(user)});

                userLog_TrackedTabError.set('eventName',eventName);
                userLog_TrackedTabError.set('tabURL_current',tabURL);
                userLog_TrackedTabError.set('user',user);
                userLog_TrackedTabError.set('originalURL',data.originalURL);
                userLog_TrackedTabError.set('recommendation',{__type: "Pointer",className: "Recommendation",objectId: data.recommendationId});
                userLog_TrackedTabError.set('productName',data.productName);

                userLog_TrackedTabError.save({
                    success: function(){
                    },
                    error: parseErrorSave
                });

            break;

            case 'RECOMMENDATION_RATING':

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

            case 'WHY_CARE_CLICK':

                var UserLog_WhyCare = Parse.Object.extend("UserLog_WhyCare");
                var userLog_WhyCare = new UserLog_WhyCare({ACL: new Parse.ACL(user)});

                userLog_WhyCare.set('eventName',eventName);
                userLog_WhyCare.set('tabURL',tabURL);
                userLog_WhyCare.set('user',user);
                userLog_WhyCare.set('whyDoWeCareURLName',data.whyDoWeCareURLName);

                userLog_WhyCare.save({
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
