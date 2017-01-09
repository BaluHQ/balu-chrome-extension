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
    Parse.initialize(chrome.extension.getBackgroundPage().gvAppId);
    Parse.serverURL = chrome.extension.getBackgroundPage().gvParseServerURL;
    window.addEventListener('DOMContentLoaded', DOMContentLoadedListener);
})();

function DOMContentLoadedListener(event){
    var lvFunctionName = 'DOMContentLoadedListener';
    log(gvScriptName_OPMain + '.' + lvFunctionName + ': Start','LSTNR');

    var lvPath = window.location.href;
    var lvRoot = 'chrome-extension://' + window.location.hostname + window.location.pathname;
    var lvHash = window.location.hash;

    // If we're not logged in but heading for the settings tab, we force ourselves to the start tab
    var lvUserDetails = chrome.extension.getBackgroundPage().isUserLoggedIn();
    if(!lvUserDetails.isUserLoggedIn && lvHash === '#settings') {
        window.location.href = lvRoot + '#start';
        lvHash = '#start';
    }
    switch(lvHash) {
        case '#start-from-install':
            createOptionsPage('start-from-install',lvUserDetails);
            window.location.href = lvRoot + '#start';
            break;
        case '#start':
            createOptionsPage('start',lvUserDetails);
            break;
        case '#settings':
            createOptionsPage('settings',lvUserDetails);
            break;
        default:
            // If we don't recognise the extension, default to start
            window.location.href = lvRoot + '#start';
            createOptionsPage('start',lvUserDetails);
    }
    userLog('OPTIONS: SHOW_OPTIONS');
}

/**************************
 * Options HTML Functions *
 **************************/

function createOptionsPage(pvTabName,pvUserDetails){

    var lvFunctionName = 'createOptionsPage';
    log(gvScriptName_OPMain + '.' + lvFunctionName + ': Start (pvTabName == ' + pvTabName + ')','PROCS');

    // Build the HTML

    var lvHtml = '';

    // Open up the tab structure (section/div/div)
    lvHtml +=     '<section class="secondary-tabs">';
    lvHtml +=     '  <div class="row collapse">';
    lvHtml +=     '    <div class="small-12 columns">';

    // Tab headings
    lvHtml +=     '      <ul class="tabs top-tab" data-tab>';
    lvHtml +=     '        <li class="tab-title"><a href="#start"><i class="fi-home"></i>Getting Started</a></li>';
    lvHtml +=     '        <li class="tab-title"><a href="#settings"><i class="fi-widget"></i>Settings</a></li>';
    lvHtml +=     '      </ul>'; // tab headings

    // Tab content (all tabs)
    lvHtml +=     '      <div class="tabs-content top-tab">';

    // Getting Start tab content (two entry points, "#start" and "#start-from-install") -- contains a numbered lists of steps for the user to follow to get started with Balu
    if(pvTabName === 'start' || pvTabName === 'start-from-install') {
        lvHtml += '        <div class="content active top-tab" id="start">';
    } else {
        lvHtml += '        <div class="content top-tab" id="start">';
    }

    // Title
    lvHtml +=     '          <h3 class="subheader" style="margin-bottom: 30px">Balu is connected to your Browser! Now let\'s get started...</h3>';

    // Numberd row
    lvHtml +=     '          <div class="row content top-tab">';
    lvHtml +=     '            <div class="small-1 columns">';
    lvHtml +=     '              <img class="number-images" src="' + chrome.extension.getURL("images/1.svg") + '" />';
    lvHtml +=     '            </div>';
    if(pvUserDetails.isUserLoggedIn) {
        lvHtml += '            <div class="small-11 columns">';
        lvHtml += '              <h3 style="margin-left: 0">You\'re already logged in and ready to go</h3>';
        lvHtml += '              <p>Your username is ' + pvUserDetails.email + '. Head over to the settings tab to manage your account.</p>';
        lvHtml += '            </div>';
        lvHtml += '          </div>'; // numbered row (1)
    } else {
        lvHtml += '            <div class="small-11 columns">';
        // If we've come in from a new install, intro talks about signing up. Otherwse, logging in.
        if(pvTabName === 'start-from-install') {
            lvHtml += '          <h3 style="margin-left: 0;">Sign up to get all the benefits of shopping with Balu</h3>';
        } else {
            lvHtml += '          <h3 style="margin-left: 0;">Log in to get all the benefits of shopping with Balu</h3>';
        }
        lvHtml += '            </div>';
        lvHtml += '          </div>'; // numbered row (1)

        // Sign up / log in form row
        lvHtml += '          <div id="signUpLogInFormDiv" class="row content">';
        lvHtml += '            <div class="small-8 columns small-offset-2 end">';

        // Sign up / log in form (tabs)
        lvHtml += '              <form class="medium-8 columns">';
        lvHtml += '                <ul class="tabs" data-tab="">';

        // If we've come in from a new install, default to the sign up form. Otherwise, log in form.
        if(pvTabName === 'start-from-install') {
            lvHtml += '              <li class="tab-title active"><a href="#panelRegister" target="_self" style="font-family: Noto Sans; color: #35b19c;">Register</a></li>';
        } else {
            lvHtml += '              <li class="tab-title"><a href="#panelRegister" target="_self" style="font-family: Noto Sans; color: #35b19c;">Sign up</a></li>';
        }
        if(pvTabName !== 'start-from-install') {
            lvHtml += '              <li class="tab-title active"><a href="#panelLogin" target="_self" style="font-family: Noto Sans; color: #35b19c;">Login</a></li>';
        } else {
            lvHtml += '              <li class="tab-title"><a href="#panelLogin" target="_self" style="font-family: Noto Sans; color: #35b19c;">Login</a></li>';
        }
        lvHtml += '                </ul>';
        // Tabs content
        lvHtml += '                <div class="tabs-content">';
        // Login tab
        lvHtml += '                  <div class="content active" id="panelLogin">';
        lvHtml += '                    <div class="row">';
        lvHtml += '                      <div id="logInErrorMessageDiv" class="large-12 columns" style="display: none">';
        lvHtml += '                        <span class="authError" id="logInErrorMessageSpan"><span>';
        lvHtml += '                      </div>';
        lvHtml += '                      <div class="large-12 columns">';
        lvHtml += '                        <label style="font-family: Noto Sans; color: #35b19c;">Email';
        lvHtml += '                          <input id="fieldLogInEmail" type="text" name="email" placeholder="somebody@example.com">';
        lvHtml += '                        </label>';
        lvHtml += '                      </div>';
        lvHtml += '                      <div class="large-12 columns">';
        lvHtml += '                        <label style="font-family: Noto Sans; color: #35b19c;">Password';
        lvHtml += '                          <input id="fieldLogInPassword" type="password" name="password" placeholder="">';
        lvHtml += '                        </label>';
        lvHtml += '                      </div>';
        lvHtml += '                      <div class="large-12 columns">';
        lvHtml += '                        <input type="button" id="logInUserButton" class="button expand" value="Login" style="background-color: #6bd3c2">';
        lvHtml += '                      </div>';
        lvHtml += '                      <div class="large-12 columns">';
        lvHtml += '                        <p class="text-center"><a id="forgotPasswordLink">Forgot your password?</a></p>';
        lvHtml += '                      </div>';
        lvHtml += '                    </div>';
        lvHtml += '                  </div>'; // log in tab
        // Sign up tab
        lvHtml += '                  <div class="content" id="panelRegister">';
        lvHtml += '                    <div class="row">';
        lvHtml += '                      <div id="signUpErrorMessageDiv" class="large-12 columns" style="display: none">';
        lvHtml += '                        <span class="authError" id="signUpErrorMessageSpan"><span>';
        lvHtml += '                      </div>';
        lvHtml += '                      <div class="large-12 columns">';
        lvHtml += '                        <label style="font-family: Noto Sans; color: #35b19c;">Email';
        lvHtml += '                          <input id="fieldSignUpEmail" type="text" name="email" placeholder="somebody@example.com">';
        lvHtml += '                        </label>';
        lvHtml += '                      </div>';
        lvHtml += '                      <div class="large-12 columns">';
        lvHtml += '                        <label style="font-family: Noto Sans; color: #35b19c;">Password';
        lvHtml += '                          <input id="fieldSignUpPassword" type="password" name="newPassword" placeholder="">';
        lvHtml += '                        </label>';
        lvHtml += '                      </div>';
        lvHtml += '                      <div class="large-12 columns">';
        lvHtml += '                        <label style="font-family: Noto Sans; color: #35b19c;">Confirm Password';
        lvHtml += '                          <input id="fieldSignUpPasswordConfirm" type="password" name="confirmPassword" placeholder="">';
        lvHtml += '                        </label>';
        lvHtml += '                      </div>';
        lvHtml += '                      <div class="large-12 columns">';
        lvHtml += '                        <input type="button" id="signUserUpButton" class="button expanded" style="background-color: #6bd3c2" value="Sign-Up Now">';
        lvHtml += '                      </div>';
        lvHtml += '                    </div>';
        lvHtml += '                  </div>'; // sign up tab
        lvHtml += '                </div>'; // tabs content
        lvHtml += '              </form>'; // sign up / log in form
        lvHtml += '            </div>';
        lvHtml += '          </div>'; // sign up / log in form row

        // Add in an invisible alterntive to this form, for the password reset. We'll switch these over when the user clicks the "forgot password" link

        // Reset password form row
        lvHtml += '          <div id="resetPasswordFormDiv" class="row content" style="display: none">';
        lvHtml += '            <div class="small-8 columns small-offset-2 end">';
        lvHtml += '              <form class="medium-8 columns">';
        lvHtml += '                <div class="row">';
        lvHtml += '                  <div class="large-12 columns">';
        lvHtml += '                    <span class="authError" style="display: none" id="resetPasswordEmailConfirmation"></span>';
        lvHtml += '                  </div>';
        lvHtml += '                  <div class="large-12 columns">';
        lvHtml += '                    <label style="font-family: Noto Sans; color: #35b19c;">Email';
        lvHtml += '                      <input id="fieldResetPasswordEmail" type="text" name="email" placeholder="somebody@example.com">';
        lvHtml += '                    </label>';
        lvHtml += '                  </div>';
        lvHtml += '                  <div class="large-12 columns">';
        lvHtml += '                    <input type="button" id="resetPasswordButton" class="button expand" value="Reset Password" style="background-color: #6bd3c2">';
        lvHtml += '                  </div>';
        lvHtml += '                  <div class="large-12 columns">';
        lvHtml += '                    <p class="text-center"><a id="backToLoginLink">Back to log in form</a></p>';
        lvHtml += '                  </div>';
        lvHtml += '                </div>';
        lvHtml += '              </form>'; // reset password form
        lvHtml += '            </div>';
        lvHtml += '          </div>'; // reset password form row
    }

    // Numberd row
    lvHtml +=     '          <div class="row content top-tab">';
    lvHtml +=     '            <div class="small-1 columns">';
    lvHtml +=     '              <img class="number-images" src="' + chrome.extension.getURL("images/2.svg") + '" />';
    lvHtml +=     '            </div>';

    // Section to the right of the number 2
    lvHtml +=     '            <div class="small-11 columns">';
    lvHtml +=     '              <div class="row">';
    lvHtml +=     '                <div class="small-12 columns">';
    lvHtml +=     '                  <h3 style="margin-left: 0">Start shopping</h3>';
    lvHtml +=     '                </div>';
    lvHtml +=     '              </div>';
    lvHtml +=     '              <div class="row">';
    lvHtml +=     '                <div class="small-3 columns">';
    lvHtml +=     '                  <a id="asosExampleButton" href="http://www.asos.com/men/t-shirts/cat/?cid=7616" target="_blank" class="button radius medium" style="background-color: #6bd3c2;">Check out Balu on ASOS</a>';
    lvHtml +=     '                </div>';
    lvHtml +=     '                <div class="small-3 columns end">';
    lvHtml +=     '                  <a id="directoryButton" href="http://balu-directory.herokuapp.com/" target="_blank" class="button radius medium" style="background-color: #6bd3c2;">Search the Directory</a>';
    lvHtml +=     '                </div>';
    lvHtml +=     '              </div>';

    // Website list
    lvHtml +=     '              <div class="row">';
    lvHtml +=     '                <div class="small-12 columns">';
    lvHtml +=     '                  <p>Try Balu out on any of these websites...</p>';
    lvHtml +=     '                </div>';
    lvHtml +=     '                <div id="listOfWebsitesDiv" class="small-12 columns" style="padding-right: 150px">';
    // We'll attach the list of websites here later (so as not to slow the page load down)
    lvHtml +=     '                </div>';
    lvHtml +=     '              </div>';

    lvHtml +=     '            </div>'; // Section to the right of the number 2
    lvHtml +=     '          </div>'; // numbered row (2)

    // Numberd row
    lvHtml +=     '          <div class="row content top-tab">';
    lvHtml +=     '            <div class="small-1 columns">';
    lvHtml +=     '              <img class="number-images" src="' + chrome.extension.getURL("images/3.svg") + '" />';
    lvHtml +=     '            </div>';
    lvHtml +=     '            <div class="small-11 columns">';
    lvHtml +=     '              <h3 style="margin-left: 0">Start changing the world!</h3>';
    lvHtml +=     '            </div>';
    lvHtml +=     '          </div>'; // numbered row (3)

    // Some text at the bottom of the tab panel
    lvHtml +=     '          <div style="margin-top: 50px; font-family: Noto Sans; color: #35b19c;">For help or feedback, contact us at info@getbalu.org</div>';

    // Close down the Getting Started tab
    lvHtml +=     '        </div>'; // Getting Started tab content

    // Settings tab content
    if(pvTabName === 'settings') {
        lvHtml += '        <div class="content active top-tab" id="settings">';
    } else {
        lvHtml += '        <div class="content top-tab" id="settings">';
    }
    // Title
    lvHtml +=     '          <h3 class="subheader" style="margin-bottom: 30px">Edit your Balu settings</h3>';

    if(pvUserDetails.isUserLoggedIn) {

        // Log out button
        lvHtml += '           <div class="row content top-tab-thin">';
        lvHtml += '            <div class="small-12 columns end">';
        lvHtml += '              <h3>Account</h3>';
        lvHtml += '            </div>';
        lvHtml += '          </div>';

        lvHtml += '          <div class="row content top-tab-thin">';
        lvHtml += '            <div class="small-12 columns end">';
        lvHtml += '              <p>You\'re logged in as ' + pvUserDetails.email + '</p>';
        lvHtml += '              <p>Don\'t worry, all our logging and analytics is anonymous</p>';
        lvHtml += '              <a id="logOutButton" class="button radius tiny" style="background-color: #6bd3c2;">Log Out</a>';
        lvHtml += '            </div>';
        lvHtml += '          </div>';

        // Sidebar show/hide
        lvHtml += '          <div class="row content top-tab-thin">';
        lvHtml += '            <div class="small-12 columns end">';
        lvHtml += '              <h3>Default sidebar behaviour</h3>';
        lvHtml += '            </div>';
        lvHtml += '          </div>';

        lvHtml += '          <div class="row content top-tab-thin">';
        lvHtml += '            <div class="small-12 columns end">';
        lvHtml += '              <input type="radio" name="defaultShowOption" id="alwaysShow" value="alwaysShow"><label for="alwaysShow">Always open sidebar when Balu has recommendations available</label>';
        lvHtml += '            </div>';
        lvHtml += '          </div>';

        lvHtml += '          <div class="row content top-tab-thin">';
        lvHtml += '            <div class="small-12 columns end">';
        lvHtml += '              <input type="radio" name="defaultShowOption" id="alwaysHide" value="alwaysHide"><label for="alwaysHide">Keep sidebar hidden, display recommendation count on Balu icon instead</label>';
        lvHtml += '            </div>';
        lvHtml += '          </div>';

        // Balu on/off
        lvHtml += '          <div class="row content top-tab-thin">';
        lvHtml += '            <div class="small-12 columns end">';
        lvHtml += '              <h3>Turn Balu on or off</h3>';
        lvHtml += '            </div>';
        lvHtml += '          </div>';

        lvHtml += '          <div class="row content top-tab-thin">';
        lvHtml += '            <div class="small-12 columns end">';
        lvHtml += '              <input type="radio" name="turnBaluOnAndOff" id="baluOn" value="on"><label for="baluOn">Balu is active and will alert you when it has recommendations available</label>';
        lvHtml += '            </div>';
        lvHtml += '          </div>';

        lvHtml += '          <div class="row content top-tab-thin">';
        lvHtml += '            <div class="small-8 columns end">';
        lvHtml += '              <input type="radio" name="turnBaluOnAndOff" id="baluOff" value="off"><label for="baluOff">Balu is off - no recommendations will be shown for any websites</label>';
        lvHtml += '            </div>';
        lvHtml += '          </div>';

        if(!chrome.extension.getBackgroundPage().gvShowJoyride) {

            // Reactivate Joyride

            lvHtml += '      <div class="row content top-tab-thin">';
            lvHtml += '        <div class="small-12 columns end">';
            lvHtml += '          <h3>Reactivate the Balu sidebar tour</h3>';
            lvHtml += '        </div>';
            lvHtml += '      </div>';

            lvHtml += '      <div class="row content top-tab-thin">';
            lvHtml += '        <div class="small-12 columns end">';
            lvHtml += '          <a id="reactivateJoyRide_button" class="button radius tiny" style="background-color: #6bd3c2;">Reactivate</a>';
            lvHtml += '        </div>';
            lvHtml += '      </div>';
        }
    } else { // if user is not logged in
        lvHtml += '          <div class="row content top-tab-thin">';
        lvHtml += '            <div class="small-12 columns end">';
        lvHtml += '              <h5>Log in on the Getting Started tab to change your settings</h5>';
        lvHtml += '            </div>';
        lvHtml += '          </div>';
    }

    // Some text at the bottom of the tab panel
    lvHtml +=     '          <div style="margin-top: 50px; font-family: Noto Sans; color: #35b19c;">For help or feedback, contact us at info@getbalu.org</div>';

    // Close down the settings tab content
    lvHtml +=     '        </div>'; // Settings tab content

    // Close down the tab content
    lvHtml +=     '      </div>'; // Tab content (all tabs)

    // Close down the tab structure (div/div/section)
    lvHtml +=     '    </div>';
    lvHtml +=     '  </div>';
    lvHtml +=     '</section>';

    // Append to DOM
    var lvContentDiv = document.getElementById('contentDiv');
    lvContentDiv.innerHTML = lvHtml;
    $(document).foundation();
    $(document).foundation('tab', 'reflow');

    // Append website list to DOM
    var lvWebsiteListHmtl = '';
    var Website = Parse.Object.extend("Website");
    var websiteQuery = new Parse.Query(Website);
    websiteQuery.ascending('websiteURL');
    websiteQuery.notEqualTo('websiteURL',gvTestWebsiteURL);
    // We don't want to flood this list with the website-level recs. Unfortunatley, for now, it's just easier to hardcode some IDs :(
    websiteQuery.containedIn('objectId',['oP7HiJWoYm','ywtqZEts1Z','4HT1XJ5wJA','9d35Fvstfi','F6dt1RRTVO','rp5hruJH3E','qroSmnHwT1','cW3RTvOuEl','9NPYVKQ5pa','QtF5WJmtk8','sON2FJIqwT','yiK5CEFikh','30LBvKbG4Z','7VqH5Qi93R']);
    websiteQuery.find({
        success: function(websites){
            for (var i = 0; i < websites.length; i++) {
                if(websites[i].get('isWebsiteOnOrOff') === 'ON') {
                    lvWebsiteListHmtl += '  <a class="website-tag" href="http://' + websites[i].get('websiteURL') + '" target="_blank">' + websites[i].get('websiteURL').replace('www.','') + '</a>';
                }
            }
            document.getElementById('listOfWebsitesDiv').innerHTML = lvWebsiteListHmtl;
        },
        error: chrome.extension.getBackgroundPage().parseErrorFind
    });

    // Create listeners and settings field values

    if(pvUserDetails.isUserLoggedIn) {
        document.getElementById("logOutButton").addEventListener('click', logOutButton_listener);

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
        document.getElementById("logInUserButton").addEventListener('click', logInButton_listener);
        document.getElementById("fieldLogInPassword").addEventListener('keydown', logInPasswordField_keydown_listener);
        document.getElementById("forgotPasswordLink").addEventListener('click', forgotPasswordLink_listener);
        document.getElementById("resetPasswordButton").addEventListener('click', resetPasswordButton_listener);
        document.getElementById("backToLoginLink").addEventListener('click', backToLoginLink_listener);
        document.getElementById("signUserUpButton").addEventListener('click', signUpButton_listener);
        document.getElementById("fieldSignUpPasswordConfirm").addEventListener('keydown', signUpPasswordField_keydown_listener);
    }
}

    /*
    if(userDetails.isUserLoggedIn) {

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


    }
    */


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
    chrome.extension.getBackgroundPage().resetPassword(document.getElementById('fieldResetPasswordEmail').value,function(pvErrorMessage){
        document.getElementById('resetPasswordEmailConfirmation').style.display="block";
        if(pvErrorMessage !== null && typeof pvErrorMessage !== 'undefined') {
            document.getElementById('resetPasswordEmailConfirmation').innerHTML = pvErrorMessage;
        } else { // successfully sent reset email
            document.getElementById('resetPasswordEmailConfirmation').innerHTML = 'Password reset email sent';
        }
    });
}

function logInPasswordField_keydown_listener(event) {if (event.keyCode == 13) {logInButton_listener();}}
function logInButton_listener(){

    log(gvScriptName_OPMain + '.logInButton_listener: Start','PROCS');

    var email = document.getElementById('fieldLogInEmail').value;
    var password = document.getElementById('fieldLogInPassword').value;

    chrome.extension.getBackgroundPage().logUserIn(null,email,password,function(pvErrorMessage){
        if(pvErrorMessage !== null && typeof pvErrorMessage !== 'undefined') {
            document.getElementById('logInErrorMessageDiv').style.display = "block";
            document.getElementById('logInErrorMessageSpan').innerHTML = pvErrorMessage;
        } else { // successful log in
            location.reload();
        }
    });

}

function forgotPasswordLink_listener(){

    log(gvScriptName_OPMain + '.forgotPasswordLink_listener: Start','PROCS');
    document.getElementById('signUpLogInFormDiv').style.display="none";
    document.getElementById('resetPasswordFormDiv').style.display="block";
    // if they get the password wrong and switch to password reset form, they'll want to already have the email filled in
    document.getElementById('fieldResetPasswordEmail').value = document.getElementById('fieldLogInEmail').value;
}

function backToLoginLink_listener(){

    log(gvScriptName_OPMain + '.backToLoginLink_listener: Start','PROCS');
    document.getElementById('signUpLogInFormDiv').style.display="block";
    document.getElementById('resetPasswordFormDiv').style.display="none";
    // if they've just reset a password, makes sense to have the email address ready to log in
    document.getElementById('fieldLogInEmail').value = document.getElementById('fieldResetPasswordEmail').value;
}

function signUpPasswordField_keydown_listener(event) {if (event.keyCode == 13) {signUpButton_listener();}}
function signUpButton_listener(){

    log(gvScriptName_OPMain + '.signUpButton_listener: Start','PROCS');

    var email = document.getElementById('fieldSignUpEmail').value;
    var password = document.getElementById('fieldSignUpPassword').value;
    var passwordConfirm = document.getElementById('fieldSignUpPasswordConfirm').value;

    if(password !== passwordConfirm){
        document.getElementById('signUpErrorMessageDiv').style.display = "block";
        document.getElementById('signUpErrorMessageSpan').innerHTML = 'Passwords do not match';
    } else {
        chrome.extension.getBackgroundPage().signUserUp(null,email,password,function(pvErrorMessage){
            if(pvErrorMessage !== null && typeof pvErrorMessage !== 'undefined') {
                document.getElementById('signUpErrorMessageDiv').style.display = "block";
                document.getElementById('signUpErrorMessageSpan').innerHTML = pvErrorMessage;
            } else { // successful sign up in
                location.reload();
            }
        });
    }
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
