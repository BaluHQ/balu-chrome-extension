/********
 * Init *
 ********/

/*
 * Global variables
 */

var gvScriptName_OPMain = 'OP_main';
var gvTestWebsiteURL = 'balutestwebsite.html';

/*
 *
 */
(function initialise(){

    log(gvScriptName_OPMain + '.initialise: Start','INITS');
    window.addEventListener('DOMContentLoaded', DOMContentLoadedListener);

})();

function DOMContentLoadedListener(event){

    log(gvScriptName_OPMain + '.DOMContentLoadedListener: Start','LSTNR');
    createOptionsPage();
    userLog('OPTIONS: SHOW_OPTIONS');
}

/**************************
 * Options HTML Functions *
 **************************/

function createOptionsPage(){

    log(gvScriptName_OPMain + '.createOptionsPage: Start','PROCS');

    var settingsDiv = document.getElementById('settingsDiv');
    var blockedBrandsDiv = document.getElementById('blockedBrandsDiv');
    var websitesDiv = document.getElementById('websitesDiv');

    // First half of page is the log in form (log out button, or log in / sign up form) and the settings (if logged in)

    var userFormHTML = '';
    var settingsHTML = '';

    var userLoggedIn = chrome.extension.getBackgroundPage().isUserLoggedIn();

    if(userLoggedIn) {

        userFormHTML += '<br />';
        userFormHTML += '<div class="row">';
        userFormHTML += '  <div class="large-8 columns">';
        userFormHTML += '    <a id="logOutButton" class="button radius tiny">Log Out</a>';
        userFormHTML += '    <a id="resetPasswordButton" class="button radius tiny">Reset Password</a>';
        userFormHTML += '   <span style="visibility: hidden" id="resetPasswordEmailConfirmation">Password reset email sent.</span>';
        userFormHTML += '  </div>';
        userFormHTML += '</div>';

        // Settings //

        // Title

        settingsHTML += '<div class="row">';
        settingsHTML += '  <div class="large-4 columns end">';
        settingsHTML += '    <h3>Settings</h3>';
        settingsHTML += '  </div>';
        settingsHTML += '</div>';

        // Sidebar show/hide

        settingsHTML += '<div class="row">';
        settingsHTML += '  <div class="large-4 columns end">';
        settingsHTML += '    <h4>Default sidebar behaviour</h4>';
        settingsHTML += '  </div>';
        settingsHTML += '</div>';

        settingsHTML += '<div class="row">';
        settingsHTML += '  <div class="large-8 columns end">';
        settingsHTML += '    <input type="radio" name="defaultShowOption" id="alwaysShow" value="alwaysShow"><label for="alwaysShow">Always open sidebar when Balu has recommendations available</label>';
        settingsHTML += '  </div>';
        settingsHTML += '</div>';

        settingsHTML += '<div class="row">';
        settingsHTML += '  <div class="large-8 columns end">';
        settingsHTML += '    <input type="radio" name="defaultShowOption" id="alwaysHide" value="alwaysHide"><label for="alwaysHide">Keep sidebar hidden, display recommendation count on Balu icon instead</label>';
        settingsHTML += '  </div>';
        settingsHTML += '</div>';

        // Balu on/off

        settingsHTML += '<div class="row">';
        settingsHTML += '  <div class="large-4 columns end">';
        settingsHTML += '    <h4>Turn Balu on or off</h4>';
        settingsHTML += '  </div>';
        settingsHTML += '</div>';

        settingsHTML += '<div class="row">';
        settingsHTML += '  <div class="large-8 columns end">';
        settingsHTML += '    <input type="radio" name="turnBaluOnAndOff" id="baluOn" value="on"><label for="baluOn">Balu is active and will alert you when it has recommendations available</label>';
        settingsHTML += '  </div>';
        settingsHTML += '</div>';

        settingsHTML += '<div class="row">';
        settingsHTML += '  <div class="large-8 columns end">';
        settingsHTML += '    <input type="radio" name="turnBaluOnAndOff" id="baluOff" value="off"><label for="baluOff">Balu is off - no recommendations will be shown for any websites</label>';
        settingsHTML += '  </div>';
        settingsHTML += '</div>';

        // Reactivate Joyride

        if(!chrome.extension.getBackgroundPage().gvShowJoyride) {

            settingsHTML += '<div class="row">';
            settingsHTML += '  <div class="large-4 columns end">';
            settingsHTML += '    <h4>Reactivate the Balu sidebar tour</h4>';
            settingsHTML += '  </div>';
            settingsHTML += '</div>';

            settingsHTML += '<div class="row">';
            settingsHTML += '  <div class="large-8 columns end">';
            settingsHTML += '    <a id="reactivateJoyRide_button" class="button radius tiny">Reactivate</a>';
            settingsHTML += '  </div>';
            settingsHTML += '</div>';
        }

    } else {

        // Log in form

        userFormHTML += '<div class="row">';
        userFormHTML += '  <div class="large-4 columns end">';
        userFormHTML += '    <h4>Sign In to Balu</h4>';
        userFormHTML += '  </div>';
        userFormHTML += '</div>';
        userFormHTML += '<form id="logInuserFormHTML">';
        userFormHTML += '  <div class="row">';
        userFormHTML += '    <div class="large-4 columns">';
        userFormHTML += '      <label>Email';
        userFormHTML += '        <input type="text" id="fieldLogInEmail" placeholder="Email" required="yes" />';
        userFormHTML += '      </label>';
        userFormHTML += '    </div>';
        userFormHTML += '    <div class="large-4 columns end">';
        userFormHTML += '      <label>Password';
        userFormHTML += '        <input type="password" id="fieldLogInPassword" placeholder="Password" required="yes" />';
        userFormHTML += '      </label>';
        userFormHTML += '    </div>';
        userFormHTML += '  </div>';
        userFormHTML += '  <div class="row">';
        userFormHTML += '    <div class="large-8 columns end">';
        userFormHTML += '      <input id="logInUserButton" class="button radius" type="button" value="Log In" />';
        userFormHTML += '      <input id="forgotPasswordButton" class="button radius" type="button" value="I\'ve forgotten my password" />';
        userFormHTML += '    </div>';
        userFormHTML += '  </div>';
        userFormHTML += '  <div id="forgotPasswordForm" style="display: none" class="row">';
        userFormHTML += '    <div class="large-8 columns end">';
        userFormHTML += '      <input id="fieldForgotPasswordEmail" placeholder="Enter your email address" type="text" />';
        userFormHTML += '      <input id="submitForgotPasswordButton" class="button radius" type="button" value="Request password reset">';
        userFormHTML += '      <span id="forgotPasswordEmailConfirmation" style="visibility: hidden">Password resent email sent</span>';
        userFormHTML += '    </div>';
        userFormHTML += '  </div>';
        userFormHTML += '</form>';

        // Sign up form

        userFormHTML += '<br />';
        userFormHTML += '<div class="row">';
        userFormHTML += '  <div class="large-4 columns end">';
        userFormHTML += '    <h4>Create a New Account</h4>';
        userFormHTML += '  </div>';
        userFormHTML += '</div>';
        userFormHTML += '<form id="signUserUpForm">';
        userFormHTML += '  <div class="row">';
        userFormHTML += '    <div class="large-4 columns">';
        userFormHTML += '      <label>Email';
        userFormHTML += '        <input type="text" id="fieldSignUpEmail" placeholder="Email" required="yes">';
        userFormHTML += '      </label>';
        userFormHTML += '    </div>';
        userFormHTML += '    <div class="large-4 columns end">';
        userFormHTML += '      <label>Password';
        userFormHTML += '        <input type="password" id="fieldSignUpPassword" placeholder="Password" required="yes">';
        userFormHTML += '      </label>';
        userFormHTML += '    </div>';
        userFormHTML += '  </div>';
        userFormHTML += '  <div class="row">';
        userFormHTML += '    <div class="large-4 columns end">';
        userFormHTML += '      <input id="signUserUpButton" class="button radius" type="button" value="Sign Up">';
        userFormHTML += '    </div>';
        userFormHTML += '  </div>';
        userFormHTML += '</form>';

    }

    var topHalfDiv = document.createElement('DIV');
    topHalfDiv.innerHTML = userFormHTML + settingsHTML;
    settingsDiv.appendChild(topHalfDiv);

    // Now that it's all added to the DOM we can do the last few tasks:

    if(userLoggedIn) {

        // Create listeners

        document.getElementById("logOutButton").addEventListener('click', logOutButton_listener);
        document.getElementById("resetPasswordButton").addEventListener('click', resetPasswordButton_listener);

        document.getElementById("alwaysShow").addEventListener('click', baluShowOrHide_listener);
        document.getElementById("alwaysHide").addEventListener('click', baluShowOrHide_listener);

        document.getElementById("baluOn").addEventListener('click', baluOnOrOff_listener);
        document.getElementById("baluOff").addEventListener('click', baluOnOrOff_listener);

        if(!chrome.extension.getBackgroundPage().gvShowJoyride){
            document.getElementById('reactivateJoyRide_button').addEventListener('click', reactivateJoyRide_listener);
        }

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

    } else {
        // Create listeners
        document.getElementById("logInUserButton").addEventListener('click', logInButton_listener);
        document.getElementById("fieldLogInPassword").addEventListener('keydown', logInPasswordField_keydown_listener);
        document.getElementById("forgotPasswordButton").addEventListener('click', forgotPasswordButton_listener);
        document.getElementById("submitForgotPasswordButton").addEventListener('click', submitForgotPasswordButton_listener);
        document.getElementById("signUserUpButton").addEventListener('click', signUpButton_listener);
        document.getElementById("fieldSignUpPassword").addEventListener('keydown', signUpPasswordField_keydown_listener);
    }

    if(userLoggedIn) {

        Parse.initialize(chrome.extension.getBackgroundPage().gvAppId, chrome.extension.getBackgroundPage().gvJSKey);

        // Blocked Brands

        var blockedBrandsHTML = '';

        var UserBlockedBrand = Parse.Object.extend("UserBlockedBrand");
        var userBlockedBrandQuery = new Parse.Query(UserBlockedBrand);

        userBlockedBrandQuery.include('ethicalBrand');
        userBlockedBrandQuery.ascending('createdAt');

        userBlockedBrandQuery.find({
            success: function(userBlockedBrands){

                blockedBrandsHTML += '<div class="row">';
                blockedBrandsHTML += '  <div class="large-4 columns end">';
                blockedBrandsHTML += '    <h4>Blocked Brands</h4>';

                if(userBlockedBrands.length === 0){

                    blockedBrandsHTML += '<ul><li>You have no blocked brands</li></ul>';

                    blockedBrandsHTML += '  </div>';
                    blockedBrandsHTML += '</div>';

                    blockedBrandsHTML += '<br />';

                } else {
                    blockedBrandsHTML += '    <span>You have blocked the following brands from appearing in your sidebar. To unblock them again, just click the tick next to the brand name.</span>';
                    blockedBrandsHTML += '  </div>';
                    blockedBrandsHTML += '</div>';

                    blockedBrandsHTML += '<div class="row">';
                    blockedBrandsHTML += '  <div class="large-12 columns end">';
                    blockedBrandsHTML += '    <ul>';
                    for (var j = 0; j < userBlockedBrands.length; j++) {
                        blockedBrandsHTML += '    <li><label>' + userBlockedBrands[j].get('ethicalBrand').get('brandName') + '  <a class="unBlockBrandTick_icons" data-brandid="' + userBlockedBrands[j].get('ethicalBrand').id + '"><i class="fi-check unBlockBrandTickIcon"></i></a></label>';
                    }
                    blockedBrandsHTML += '    </ul>';

                    blockedBrandsHTML += '  </div>';
                    blockedBrandsHTML += '</div>';
                }
                // Add to DOM
                blockedBrandsDiv.innerHTML = blockedBrandsHTML;
                var unBlockBrandTick_icons = document.getElementsByClassName('unBlockBrandTick_icons');
                for(x=0; x<unBlockBrandTick_icons.length; x++){
                    unBlockBrandTick_icons[x].addEventListener('click',unBlockBrandTick_listener);
                }

            },
            error: chrome.extension.getBackgroundPage().parseErrorFind
        });

        // Website list

        var websiteListHTML = '';

        websiteListHTML += '<div class="row">';
        websiteListHTML += '  <div class="large-4 columns end">';
        websiteListHTML += '    <h4>Websites</h4>';
        websiteListHTML += '  </div>';
        websiteListHTML += '</div>';

        websiteListHTML += '<div class="row">';
        websiteListHTML += '  <div class="large-8 columns end">';

        var Website = Parse.Object.extend("Website");
        var websiteQuery = new Parse.Query(Website);

        websiteQuery.ascending('websiteURL');
        websiteQuery.notEqualTo('websiteURL',gvTestWebsiteURL);
        websiteQuery.find({
            success: function(websites){
                websiteListHTML += '<ul>';

                for (var i = 0; i < websites.length; i++) {
                    if(websites[i].get('isWebsiteOnOrOff') === 'ON') {
                        websiteListHTML += '  <li><label><a href="http://' + websites[i].get('websiteURL') + '">' + websites[i].get('websiteURL') + '</a></label></li>';
                    }
                }
                websiteListHTML += '</ul>';

/*
        var CategoryWebsiteJoin = Parse.Object.extend("CategoryWebsiteJoin");
        var categoryWebsiteQuery = new Parse.Query(CategoryWebsiteJoin);

        categoryWebsiteQuery.include('searchCategory');
        categoryWebsiteQuery.include('website');

        categoryWebsiteQuery.ascending('categoryName_sort,websiteURL_sort');

        categoryWebsiteQuery.notEqualTo('website',{__type: "Pointer",className: "Website", objectId: 'Z5y6RkdrX1'}); // To do, can I not use dot notation here to filter on the website name?

        categoryWebsiteQuery.find({
            success: function(categoryWebsites){

                websiteListHTML += '<ul>';

                var previousSearchCategory = "-1";
                var currentSearchCategory = "-1";
                var nextSearchCategory = "-1";

                for (var i = 0; i < categoryWebsites.length; i++) {
                    currentSearchCategory = categoryWebsites[i].get('searchCategory').get('categoryName');
                    if(i < categoryWebsites.length-1){
                        nextSearchCategory = categoryWebsites[i+1].get('searchCategory').get('categoryName') ;
                    }
                    if(currentSearchCategory != previousSearchCategory) {
                        websiteListHTML += '   <li><label>' + currentSearchCategory + '</label>';
                        websiteListHTML += '   <ul>';
                    }
                    if(categoryWebsites[i].get('website').get('isWebsiteOnOrOff') === 'ON') {
                        websiteListHTML += '      <li><label><a href="http://' + categoryWebsites[i].get('website').get('websiteURL') + '">' + categoryWebsites[i].get('website').get('websiteURL') + '</a></label></li>';
                    }
                    if(currentSearchCategory != nextSearchCategory) {
                        websiteListHTML += '    </ul>';
                    }
                    previousSearchCategory = currentSearchCategory;
                }
                websiteListHTML += '</ul></ul>';

*/

                websiteListHTML += '  </div>';
                websiteListHTML += '</div>';

                // Add to DOM

                websitesDiv.innerHTML = websiteListHTML;

            },
            error: chrome.extension.getBackgroundPage().parseErrorFind
        });
    }
}


/**********************
 * Listener Functions *
 **********************/


function logOutButton_listener(){
    log(gvScriptName_OPMain + '.logOutButton_listener: Start','PROCS');
    chrome.extension.getBackgroundPage().logUserOut(function(){
        location.reload();
    });
}

function resetPasswordButton_listener(){
    log(gvScriptName_OPMain + '.resetPasswordButton_listener: Start','PROCS');
    chrome.extension.getBackgroundPage().resetPassword(null,function(){
        document.getElementById('resetPasswordEmailConfirmation').style.visibility="visible";
    });
}

function logInPasswordField_keydown_listener(event) {if (event.keyCode == 13) {logInButton_listener();}}
function logInButton_listener(){

    log(gvScriptName_OPMain + '.logInButton_listener: Start','PROCS');

    var email = document.getElementById('fieldLogInEmail').value;
    var password = document.getElementById('fieldLogInPassword').value;

    chrome.extension.getBackgroundPage().logUserIn(null,email,password,function(){
        location.reload();
    });

}

function forgotPasswordButton_listener(){

    log(gvScriptName_OPMain + '.forgotPasswordButton_listener: Start','PROCS');

    document.getElementById('forgotPasswordForm').style.display="block";
}

function submitForgotPasswordButton_listener(){

    log(gvScriptName_OPMain + '.submitForgotPasswordButton_listener: Start','PROCS');

    var email = document.getElementById('fieldForgotPasswordEmail').value;

    chrome.extension.getBackgroundPage().resetPassword(email,function(){
        document.getElementById('forgotPasswordEmailConfirmation').style.visibility="visible";
    });

}


function signUpPasswordField_keydown_listener(event) {if (event.keyCode == 13) {signUpButton_listener();}}
function signUpButton_listener(){

    log(gvScriptName_OPMain + '.signUpButton_listener: Start','PROCS');

    var email = document.getElementById('fieldSignUpEmail').value;
    var password = document.getElementById('fieldSignUpPassword').value;

    chrome.extension.getBackgroundPage().signUserUp(null,email,password,function(){
        location.reload();
    });
}

function baluShowOrHide_listener(){

    log(gvScriptName_OPMain + '.baluShowOrHide_listener: Start','PROCS');

    if (document.getElementById("alwaysShow").checked) {
        chrome.extension.getBackgroundPage().gvIsBaluShowOrHide = 'SHOW';
        chrome.storage.sync.set({'isBaluShowOrHide':'SHOW'}, function(){chrome.extension.getBackgroundPage().refreshTab_allTabs();});
        userLog('OPTIONS: BALU_SET_TO_SHOW');
    }
    if (document.getElementById("alwaysHide").checked) {
        chrome.extension.getBackgroundPage().gvIsBaluShowOrHide = 'HIDE';
        chrome.storage.sync.set({'isBaluShowOrHide':'HIDE'}, function(){chrome.extension.getBackgroundPage().refreshTab_allTabs();});
        userLog('OPTIONS: BALU_SET_TO_HIDE');
    }
}

function baluOnOrOff_listener(){

    log(gvScriptName_OPMain + '.baluOnOrOff_listener: Start','PROCS');

    if (document.getElementById("baluOn").checked) {
        chrome.extension.getBackgroundPage().gvIsBaluOnOrOff = 'ON';
        chrome.storage.sync.set({'isBaluOnOrOff': 'ON'}, function(){
            chrome.browserAction.setIcon({path: chrome.extension.getURL('images/icon-browser_action.png')});
            chrome.extension.getBackgroundPage().turnBaluOn();
            chrome.extension.getBackgroundPage().waitForExtensionInitThenInitialiseTab(null,1);
            log(gvScriptName_OPMain + '.baluOnOrOffListener: baluOn checked, storage.sync.isBaluOnOrOff set to ON','DEBUG');
        });
        userLog('OPTIONS: BALU_TURNED_ON');
    }
    if (document.getElementById("baluOff").checked) {
        chrome.extension.getBackgroundPage().gvIsBaluOnOrOff = 'OFF';
        chrome.storage.sync.set({'isBaluOnOrOff': 'OFF'}, function(){
            chrome.browserAction.setIcon({path: chrome.extension.getURL('images/icon-browser_action-off.png')});
            chrome.extension.getBackgroundPage().refreshTab_allTabs();
            log(gvScriptName_OPMain + '.baluOnOrOffListener: baluOff checked, storage.sync.isBaluOnOrOff set to OFF','DEBUG');
        });
        userLog('OPTIONS: BALU_TURNED_OFF');
    }
}

function reactivateJoyRide_listener(){

    log(gvScriptName_OPMain + '.reactivateJoyRide_listener: Start','PROCS');

    chrome.extension.getBackgroundPage().markJoyrideAsNotDone(function(){
        document.getElementById('reactivateJoyRide_button').textContent = 'Done!';
    });
}

function unBlockBrandTick_listener(){

    log(gvScriptName_OPMain + '.unBlockBrandTickIcon: Start','PROCS');

    var brandId = this.getAttribute('data-brandid');

    chrome.extension.getBackgroundPage().unBlockBrand(brandId,function(){
        location.reload();
    });

}

/**************************
 * Error and Log handling *
 **************************/

function log(message, level) {
    chrome.extension.getBackgroundPage().log(message, level);
}

function userLog(eventName, data) {
    var noTabId;
    chrome.extension.getBackgroundPage().userLog(noTabId, eventName, data);
}
