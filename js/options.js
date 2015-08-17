/********
 * Init *
 ********/

/*
 * Global variables
 */

var gvBackground = chrome.extension.getBackgroundPage();
var gvTestWebsiteURL = 'balutestwebsite.html';

/*
 *
 */
(function initialise(){

    log('options.initialise: Start','PROCS');

    window.addEventListener('DOMContentLoaded', DOMContentLoadedListener);

})();


/**********************
 * Listener Functions *
 **********************/

/*
 *
 */
function DOMContentLoadedListener(event){

    log('options.DOMContentLoadedListener: Start','LSTNR');

    // The popups's
    //if(window.location.href.indexOf('userSubmittedRec') !== -1) {
    //    return;
    //}
    // Set up log in / out form

    var userFormDiv = document.getElementById("userFormDiv");
    var userForm = '';

    var userLoggedIn = gvBackground.isUserLoggedIn();
    if(userLoggedIn) {

        userForm += '<br />';
        userForm += '<div class="row">';
        userForm += '  <div class="large-4 columns end">';
        userForm += '    <a id="logOutButton" href="#" class="button radius tiny">Log Out</a>';
        userForm += '  </div>';
        userForm += '</div>';

        userFormDiv.innerHTML = userForm;
        document.getElementById("logOutButton").addEventListener('click', logOutButtonListener);

    } else {

        // Log in form

        userForm += '<div class="row">';
        userForm += '  <div class="large-4 columns end">';
        userForm += '    <h4>Sign In to Balu</h4>';
        userForm += '  </div>';
        userForm += '</div>';
        userForm += '<form id="signInUserForm">';
        userForm += '  <div class="row">';
        userForm += '    <div class="large-4 columns">';
        userForm += '      <label>Email';
        userForm += '        <input type="text" id="fieldSignInEmail" placeholder="Email" required="yes">';
        userForm += '      </label>';
        userForm += '    </div>';
        userForm += '    <div class="large-4 columns end">';
        userForm += '      <label>Password';
        userForm += '        <input type="password" id="fieldSignInPassword" placeholder="Password" required="yes">';
        userForm += '      </label>';
        userForm += '    </div>';
        userForm += '  </div>';
        userForm += '  <div class="row">';
        userForm += '    <div class="large-4 columns end">';
        userForm += '      <input id="signInUserButton" class="button radius" type="button" value="Log In">';
        userForm += '    </div>';
        userForm += '  </div>';
        userForm += '</form>';

        // Sign up form

        userForm += '<br />';
        userForm += '<div class="row">';
        userForm += '  <div class="large-4 columns end">';
        userForm += '    <h4>Create a New Account</h4>';
        userForm += '  </div>';
        userForm += '</div>';
        userForm += '<form id="signUpUserForm">';
        userForm += '  <div class="row">';
        userForm += '    <div class="large-4 columns">';
        userForm += '      <label>Email';
        userForm += '        <input type="text" id="fieldSignUpEmail" placeholder="Email" required="yes">';
        userForm += '      </label>';
        userForm += '    </div>';
        userForm += '    <div class="large-4 columns end">';
        userForm += '      <label>Password';
        userForm += '        <input type="password" id="fieldSignUpPassword" placeholder="Password" required="yes">';
        userForm += '      </label>';
        userForm += '    </div>';
        userForm += '  </div>';
        userForm += '  <div class="row">';
        userForm += '    <div class="large-4 columns end">';
        userForm += '      <input id="signUpUserButton" class="button radius" type="button" value="Sign Up">';
        userForm += '    </div>';
        userForm += '  </div>';
        userForm += '</form>';

        userFormDiv.innerHTML += userForm;
        document.getElementById("signInUserButton").addEventListener('click', signInButtonListener);
        document.getElementById("signUpUserButton").addEventListener('click', signUpButtonListener);
    }

    if(userLoggedIn) {

        // Settings

        var settingsDiv = document.getElementById("settingsDiv");
        var settings = '';

        //   Title

        settings += '<div class="row">';
        settings += '  <div class="large-4 columns end">';
        settings += '    <h3>Settings</h3>';
        settings += '  </div>';
        settings += '</div>';

        //    Sidebar show/hide

        settings += '<div class="row">';
        settings += '  <div class="large-4 columns end">';
        settings += '    <h4>Default sidebar behaviour</h4>';
        settings += '  </div>';
        settings += '</div>';

        settings += '<div class="row">';
        settings += '  <div class="large-8 columns end">';
        settings += '    <input type="radio" name="defaultShowOption" id="alwaysShow" value="alwaysShow"><label for="alwaysShow">Always open sidebar when Balu has recommendations available</label>';
        settings += '  </div>';
        settings += '</div>';

        settings += '<div class="row">';
        settings += '  <div class="large-8 columns end">';
        settings += '    <input type="radio" name="defaultShowOption" id="alwaysHide" value="alwaysHide"><label for="alwaysHide">Keep sidebar hidden, display recommendation count on Balu icon instead</label>';
        settings += '  </div>';
        settings += '</div>';

        //    Balu on/off

        settings += '<div class="row">';
        settings += '  <div class="large-4 columns end">';
        settings += '    <h4>Turn Balu on or off</h4>';
        settings += '  </div>';
        settings += '</div>';

        settings += '<div class="row">';
        settings += '  <div class="large-8 columns end">';
        settings += '    <input type="radio" name="turnBaluOnAndOff" id="baluOn" value="on"><label for="baluOn">Balu is active and will alert you when it has recommendations available</label>';
        settings += '  </div>';
        settings += '</div>';

        settings += '<div class="row">';
        settings += '  <div class="large-8 columns end">';
        settings += '    <input type="radio" name="turnBaluOnAndOff" id="baluOff" value="off"><label for="baluOff">Balu is off - no recommendations will be shown for any websites</label>';
        settings += '  </div>';
        settings += '</div>';

        //    Website list

        settings += '<div class="row">';
        settings += '  <div class="large-4 columns end">';
        settings += '    <h4>Websites</h4>';
        settings += '  </div>';
        settings += '</div>';


        settings += '<div class="row">';
        settings += '  <div class="large-8 columns end">';

        Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');

        var CategoryWebsiteJoin = Parse.Object.extend("CategoryWebsiteJoin");
        var categoryWebsiteQuery = new Parse.Query(CategoryWebsiteJoin);

        categoryWebsiteQuery.include('searchCategory');
        categoryWebsiteQuery.include('website');

        categoryWebsiteQuery.ascending('categoryName_sort,websiteURL_sort');

        categoryWebsiteQuery.notEqualTo('website',{__type: "Pointer",className: "Website", objectId: 'Z5y6RkdrX1'}); // To do, can I not use dot notation here to filter on the website name?

        categoryWebsiteQuery.find({
            success: function(categoryWebsites){

                settings += '<ul>';

                var previousSearchCategory = "-1";
                var currentSearchCategory = "-1";
                var nextSearchCategory = "-1";

                for (var i = 0; i < categoryWebsites.length; i++) {
                    currentSearchCategory = categoryWebsites[i].get('searchCategory').get('categoryName');
                    if(i < categoryWebsites.length-1){
                        nextSearchCategory = categoryWebsites[i+1].get('searchCategory').get('categoryName') ;
                    }
                    if(currentSearchCategory != previousSearchCategory) {
                        settings += '   <li><label>' + currentSearchCategory + '</label>';
                        settings += '   <ul>';
                    }
                    if(categoryWebsites[i].get('website').get('isWebsiteOnOrOff') === 'ON') {
                        settings += '      <li><label><a href="http://' + categoryWebsites[i].get('website').get('websiteURL') + '">' + categoryWebsites[i].get('website').get('websiteURL') + '</a></label></li>';
                    }
                    if(currentSearchCategory != nextSearchCategory) {
                        settings += '    </ul>';
                    }
                    previousSearchCategory = currentSearchCategory;
                }
                settings += '</ul></ul>';

                settings += '  </div>';
                settings += '</div>';

                // Add to DOM

                settingsDiv.innerHTML += settings;

                // Now that it's all added to the DOM we can do the last few tasks:

                // Add event listeners

                document.getElementById("alwaysShow").addEventListener('click', baluShowOrHideListener);
                document.getElementById("alwaysHide").addEventListener('click', baluShowOrHideListener);

                document.getElementById("baluOn").addEventListener('click', baluOnOrOffListener);
                document.getElementById("baluOff").addEventListener('click', baluOnOrOffListener);

/*
                for (var j = 0; j < websites.length; j++) {
                    if(gvTestWebsiteURL != websites[j].get('websiteURL').toLowerCase()) {
                        document.getElementById("fieldIsWebsiteOnOrOff_On_" + websites[j].id).addEventListener('change', turnWebsiteOnListener);
                        document.getElementById("fieldIsWebsiteOnOrOff_Off_" + websites[j].id).addEventListener('change', turnWebsiteOffListener);
                    }
                }
*/
                // Set radio buttons
                chrome.storage.sync.get('isBaluOnOrOff',function (obj) {
                    if(obj.isBaluOnOrOff === 'ON') {
                        document.getElementById("baluOn").checked = true;
                    } else if (obj.isBaluOnOrOff === 'OFF'){
                        document.getElementById("baluOff").checked = true;
                    }

                    chrome.storage.sync.get('isBaluShowOrHide',function(obj){
                        if(obj.isBaluShowOrHide === 'SHOW') {
                            document.getElementById("alwaysShow").checked = true;
                        } else if (obj.isBaluShowOrHide === 'HIDE'){
                            document.getElementById("alwaysHide").checked = true;
                        }
                    });
                });

            },
            error: gvBackground.parseErrorFind
        });

    }

    userLog('OPTIONS: SHOW_OPTIONS');

}


/*
 *
 */
function baluShowOrHideListener(){

    log('options.baluShowOrHideListener: Start','PROCS');

    if (document.getElementById("alwaysShow").checked) {
        gvBackground.gvIsBaluShowOrHide = 'SHOW';
        gvBackground.searchThePage_allTabs();
        chrome.storage.sync.set({'isBaluShowOrHide':'SHOW'}, function(){
            log('options.baluShowOrHideListener: alwaysShow checked, storage.sync.isBaluShowOrHide set to SHOW',' INFO');
        });
        userLog('OPTIONS: BALU_SET_TO_SHOW');
    }
    if (document.getElementById("alwaysHide").checked) {
        gvBackground.gvIsBaluShowOrHide = 'HIDE';
        gvBackground.requestHideSideBarAllTabs();
        chrome.storage.sync.set({'isBaluShowOrHide':'HIDE'}, function(){
            log('options.baluShowOrHideListener: alwaysHide checked, storage.sync.isBaluShowOrHide set to HIDE',' INFO');
        });
        userLog('OPTIONS: BALU_SET_TO_HIDE');
    }
}


/*
 *
 */
function baluOnOrOffListener(){

    log('options.baluOnOrOffListener: Start','PROCS');

    if (document.getElementById("baluOn").checked) {
        gvBackground.gvIsBaluOnOrOff = 'ON';
        chrome.storage.sync.set({'isBaluOnOrOff': 'ON'}, function(){
            chrome.browserAction.setIcon({path: chrome.extension.getURL('images/icon-browser_action.png')});
            log('options.baluOnOrOffListener: baluOn checked, storage.sync.isBaluOnOrOff set to ON','DEBUG');
        });
        userLog('OPTIONS: BALU_TURNED_ON');
    }
    if (document.getElementById("baluOff").checked) {
        gvBackground.gvIsBaluOnOrOff = 'OFF';
        chrome.storage.sync.set({'isBaluOnOrOff': 'OFF'}, function(){
            chrome.browserAction.setIcon({path: chrome.extension.getURL('images/icon-browser_action-off.png')});
            log('options.baluOnOrOffListener: baluOff checked, storage.sync.isBaluOnOrOff set to OFF','DEBUG');
        });
        userLog('OPTIONS: BALU_TURNED_OFF');
    }
}

/*

function turnWebsiteOnListener(){

    log('options.turnWebsiteOnListener: Start','PROCS');

    var radioButton = event.target;

    Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');

    var Website = Parse.Object.extend("Website");
    var websiteQuery = new Parse.Query(Website);
    websiteQuery.get(radioButton.value,{
        success: function(website){
            website.set('isWebsiteOnOrOff','ON');
            website.save();
        },
        error: parseError
    });
}


function turnWebsiteOffListener(){

    log('options.turnWebsiteOffListener: Start','PROCS');

    var radioButton = event.target;

    Parse.initialize('mmhyD9DKGeOanjpRLHCR3bX8snue22oOd3NGfWKu', 'IRfKgjMWYJqaHhgK3AUFNu2KsXrNnorzRZX1hmuY');

    var Website = Parse.Object.extend("Website");
    var websiteQuery = new Parse.Query(Website);
    websiteQuery.get(radioButton.value,{
        success: function(website){
            website.set('isWebsiteOnOrOff','OFF');
            website.save();
        },
        error: parseError
    });
}
*/
/*
 *
 */

function logOutButtonListener(){
    log('options.logOutButtonListener: Start','LSTNR');

    signOutUser();
}

/*
 *
 */

function signInButtonListener(){
    log('options.signInButtonListener: Start','LSTNR');

    var email = document.getElementById('fieldSignInEmail').value;
    var password = document.getElementById('fieldSignInPassword').value;

    signInUser(email,password);
}
/*
 *
 */

function signUpButtonListener(){
    log('options.signUpButtonListener: Start','LSTNR');

    var email = document.getElementById('fieldSignUpEmail').value;
    var password = document.getElementById('fieldSignUpPassword').value;

    signUpUser(email,password);
}


/*************
 * Functions *
 *************/


/*
 *
 */

function signInUser(email,password){

    log('options.signInUser: Start','PROCS');

    gvBackground.logUserIn(null,email,password);

    setTimeout(function(){location.reload();}, 2000);


}

/*
 *
 */

function signUpUser(email,password){

    log('options.signUpUser: Start','PROCS');

    gvBackground.signUserUp(null,email,password,email);

    setTimeout(function(){location.reload();}, 2000);

}

/*
 *
 */

 function signOutUser(){

     log('options.signOutUser: Start','PROCS');

     gvBackground.logUserOut();

     setTimeout(function(){location.reload();}, 2000);
 }


 /**************************
  * Error and Log handling *
  **************************/

 function log(message, level) {
     gvBackground.log(message, level);
 }


function userLog(eventName, data) {
    var noTabId;
    gvBackground.userLog(noTabId, eventName, data);
}
