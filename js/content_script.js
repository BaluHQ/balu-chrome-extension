

/********
 * Init *
 ********/

/*
 * Global Variables
 */

var gvThisTab;
var gvPort;
var gvRecommendationCount = '';

/*
 * As soon as the content_script is injected into a new tab, create a
 * port.onConnect listner and tell the extension to connect
 */
(function initialise(){

    log('content_script.initialise: Start','PROCS');

    try {
         // Listen for port connections from background script
        chrome.runtime.onConnect.addListener(portConnectListener);

        // Listen for DOM messages from iFrame
        window.addEventListener("message",iFrameListener,false);

        chrome.runtime.sendMessage({sender:  'content_script',
                                    subject: 'pleaseConnectTab'},
                                    setThisTab);
    }
    catch (err) {
        createSideBarTemplate(this.document);
    }
})();

/*
 * Save the tab (passed back from Extension) into global variable
 */
function setThisTab(tab){
    log('content_script.setThisTab: Start','PROCS');
    gvThisTab = tab;
}

/**********************
 * Listener Functions *
 **********************/

/*
 * Once the connection with the extension is made, we can display the sidebar
 */
function portConnectListener(port){

    log('content_script.portConnectListener: Start: Event: chrome.runtime.onConnect','LSTNR');

    if(port.name === 'background'){
        log('content_script.portConnectListener: port connection opened','PROCS');
        gvPort = port;
        gvPort.onMessage.addListener(portMessageListener);

        waitForTabIdToComeBackThenRequestPageSearch();
    }
}

/*
 *
 */
function portMessageListener(msg) {

    log('content_script.portMessageListener: Start: Event: port.onMessage','LSTNR');

    switch (msg.sender + " | " + msg.subject) {

        case 'background | pleaseDisplaySignInSideBar':
            log('content_script.portMessageListener: Request received: pleaseDisplaySignInSideBar ','PROCS');
            createSideBar(createSignInSideBarContent);
            break;

        case 'background | pleaseDisplayEmptySideBar':
            log('content_script.portMessageListener: Request received: pleaseDisplayEmptySideBar ','PROCS');
            createSideBar(createEmptySideBarContent,msg.username,msg.userId);
            break;

        case 'background | pleaseSearchThePage':
            log('content_script.portMessageListener: Request received: pleaseSearchThePage','PROCS');
            searchPage_master(msg.searchData,msg.tabURL,msg.isBaluShowOrHide,msg.websiteURL,requestRetrieveRecommendations);
            break;

        case 'background | pleaseDisplayResultsSideBar':
            log('content_script.portMessageListener: Request received: pleaseDisplayResultsSideBar >>> msg.recommendationData.length == ' + msg.recommendationData.length,'PROCS');
            createSideBar(createResultsSideBarContent,msg.username,msg.userId,msg.recommendationData, msg.productGroupHeaders, msg.searchTerm);
            break;

        case 'background | pleaseHideSideBar':
            log('content_script.portMessageListener: Request received: pleaseHideSideBar','PROCS');
            hideSideBar();
            break;

        default:
            log('content_script.portMessageListener: unknown message received','ERROR');
    }
}

/*
 *
 */
function iFrameListener(msg) {

    log('content_script.iFrameListener: Start: Event: window.onMessage','LSTNR');

    switch (msg.data.sender + " | " + msg.data.subject) {

        case 'inject_script | pleaseSignThisUserUp':
            log('background.iFrameListener: Request received: pleaseSignThisUserUp','PROCS');
            gvPort.postMessage({tabId:    gvThisTab.tab.id,
                                sender:  'content_script',
                                subject: 'pleaseSignThisUserUp',
                                username: msg.data.username,
                                password: msg.data.password,
                                email:    msg.data.email,});
            break;

        case 'inject_script | pleaseLogThisUserIn':
            log('content_script.iFrameListener: Request received: pleaseLogThisUserIn >> gvThisTab.tab.id == ' + gvThisTab.tab.id,'PROCS');
            gvPort.postMessage({tabId:    gvThisTab.tab.id,
                                sender:  'content_script',
                                subject: 'pleaseLogThisUserIn',
                                username: msg.data.username,
                                password: msg.data.password});
            break;

        case 'inject_script | pleaseLogThisUserOut':
            log('content_script.iFrameListener: Request received: pleaseLogThisUserOut','PROCS');
            gvPort.postMessage({tabId:    gvThisTab.tab.id,
                                sender:  'content_script',
                                subject: 'pleaseLogThisUserOut'});
            break;

        case 'inject_script | pleaseRunManualSearch':
            log('content_script.iFrameListener: Request received: pleaseRunManualSearch','PROCS');
            gvPort.postMessage({tabId:      gvThisTab.tab.id,
                                sender:    'content_script',
                                subject:   'pleaseRunManualSearch',
                                searchTerm: msg.data.searchTerm});
        break;

        case 'inject_script | pleaseIncrementRecClickCount':
            log('content_script.iFrameListener: Request received: pleaseIncrementRecClickCount','PROCS');
            gvPort.postMessage({tabId:      gvThisTab.tab.id,
                                sender:    'content_script',
                                subject:   'pleaseIncrementRecClickCount',
                                recommendationId: msg.data.recommendationId});
        break;

        case 'inject_script | pleaseVoteUpThisProduct':
            log('content_script.iFrameListener: Request received: pleaseVoteUpThisProduct','PROCS');

            // to do: this could probably be done better / in a better place
            // Set the arrow class correctly so the vote is reflected immediatly to the user
            var voteDownArrow = window.frames.iFrameBaluSideBar.contentWindow.document.getElementById('voteDownRec_downArrow_' + msg.data.recommendationId);
            var voteUpArrow = window.frames.iFrameBaluSideBar.contentWindow.document.getElementById('voteUpRec_upArrow_' + msg.data.recommendationId);
            if(voteUpArrow.className === 'fi-arrow-up voteClass_voted') {
                voteDownArrow.className = 'fi-arrow-down voteClass_nothing';
                voteUpArrow.className = 'fi-arrow-up voteClass_nothing';
            } else {
                voteDownArrow.className = 'fi-arrow-down voteClass_notVoted';
                voteUpArrow.className = 'fi-arrow-up voteClass_voted';
            }
            gvPort.postMessage({tabId:      gvThisTab.tab.id,
                                sender:    'content_script',
                                subject:   'pleaseVoteUpThisProduct',
                                recommendationId: msg.data.recommendationId});
        break;

        case 'inject_script | pleaseVoteDownThisProduct':
                log('content_script.iFrameListener: Request received: pleaseVoteDownThisProduct','PROCS');

                // to do: this could probably be done better / in a better place
                // Set the arrow class correctly so the vote is reflected immediatly to the user
                var voteDownArrow2 = window.frames.iFrameBaluSideBar.contentWindow.document.getElementById('voteDownRec_downArrow_' + msg.data.recommendationId);
                var voteUpArrow2 = window.frames.iFrameBaluSideBar.contentWindow.document.getElementById('voteUpRec_upArrow_' + msg.data.recommendationId);
                if(voteDownArrow2.className === 'fi-arrow-down voteClass_voted') {
                    voteDownArrow2.className = 'fi-arrow-down voteClass_nothing';
                    voteUpArrow2.className = 'fi-arrow-up voteClass_nothing';
                } else {
                    voteDownArrow2.className = 'fi-arrow-down voteClass_voted';
                    voteUpArrow2.className = 'fi-arrow-up voteClass_notVoted';
                }

                gvPort.postMessage({tabId:      gvThisTab.tab.id,
                                    sender:    'content_script',
                                    subject:   'pleaseVoteDownThisProduct',
                                    recommendationId: msg.data.recommendationId});
        break;

        case 'inject_script | pleaseHideBaluUntilRefresh':
                log('content_script.iFrameListener: Request received: pleaseHideBaluUntilRefresh >>> gvThisTab.id == ' + gvThisTab.id,'PROCS');
                gvPort.postMessage({tabId:      gvThisTab.tab.id,
                                    sender:    'content_script',
                                    subject:   'pleaseHideBaluUntilRefresh'});
        break;

        case 'inject_script | pleaseHideBaluUntilRestart':
                log('content_script.iFrameListener: Request received: pleaseHideBaluUntilRestart','PROCS');
                gvPort.postMessage({tabId:      gvThisTab.tab.id,
                                    sender:    'content_script',
                                    subject:   'pleaseHideBaluUntilRestart'});
        break;

        case 'inject_script | pleaseLogEventInUserLog':
                log('content_script.iFrameListener: Request received: pleaseLogEventInUserLog >>> msg.data.eventName == ' + msg.data.eventName,'PROCS');
                userLog(msg.data.eventName,msg.data.data);
        break;

        case 'inject_script | pleaseLogMessageOnConsole':
                log(msg.data.message,msg.data.level);
        break;

        default:
            if (msg.data.sender === 'inject_script') {
                log('content_script.iFrameListener: unknown message received >>> msg.data.subject == ' + msg.data.subject,'ERROR');
            } else {
                // No error handling here, because lots of DOM messages are fired off by some pages and we don't want to clutter up the logs
            }
    }
}

/*************
 * Functions *
 *************/

/*
 *
 */
function waitForTabIdToComeBackThenRequestPageSearch(){

    if(gvThisTab){

        log('content_script.waitForTabIdToComeBackThenRequestPageSearch: Ending wait: gvThisTab is set','PROCS');

            // Inject form handler script into page
            var formHandlerScript = document.createElement('script');
            formHandlerScript.type="text/javascript";
            formHandlerScript.src = chrome.extension.getURL('js/inject_script.js');
            document.getElementsByTagName('head')[0].appendChild(formHandlerScript);

            if(gvThisTab.isWebsiteOnOrOff === 'ON') {
                // Request background script displays the side bar and searches the page (in parallel)
                gvPort.postMessage({tabId:    gvThisTab.tab.id,
                                    sender:   'content_script',
                                    subject:  'pleaseSearchThePage'});
            }
    } else {
        log('content_script.waitForTabIdToComeBackThenRequestPageSearch: Waiting: gvThisTab is not set yet',' INFO');
        window.setTimeout(function(){return waitForTabIdToComeBackThenRequestPageSearch();},50);
    }
}

/*
 *
 */
function requestRetrieveRecommendations(searchResults,productGroupHeaders,foundSomething, isBaluShowOrHide){

     log('content_script.requestRetrieveRecommendations: Start','PROCS');

     if (foundSomething) {
         gvPort.postMessage({tabId:               gvThisTab.tab.id,
                             sender:              'content_script',
                             subject:             'pleaseRetrieveRecommendations',
                             searchResults:       searchResults,
                             productGroupHeaders: productGroupHeaders});
     } else {
         // Remove count from browser action
         chrome.runtime.sendMessage({sender:  'content_script',
                                     subject: 'pleaseSetBrowserActionBadge',
                                     recommendationCount: '' + gvRecommendationCount + ''});
     }
 }

/*
 * Force a sidebar with the given content onto the web page
 */
function createSideBar(thenCreateSideBarContent,username,userId,recommendationData, productGroupHeaders, searchTerm) {

    log('content_script.createSideBar: Start','PROCS');

    if(recommendationData) {
        gvRecommendationCount = recommendationData.length;
    } else{
        gvRecommendationCount = 0;
    }

    // Move the user's webpage to the left to create room for the sidebar
    var html;
    if(document.documentElement){
        html = document.documentElement;
    } else if (document.getElementsByTagName('html') && document.getElementsByTagName('html')[0]) {
        html = document.getElementsByTagName('html')[0];
    } else {
        log('content_script.createSideBar: No HTML element found on page','ERROR');
    }

    if(html.style.position === 'static') {
        html.style.position = 'relative';
    }

    var currentRight = html.style.right;
    if(currentRight === 'auto') {
        currentRight = 0;
    } else {
        currentRight = parseFloat(html.style.right); // parseFloat removes any 'px'
    }

    html.style.right = currentRight + 300 + 'px';
    /*
    html.style.position = 'absolute';
    html.style.right = '300px';
    html.style.left = '0px';
    */
    // Create iFrame - if it's not already there. If it is, retrieve it

    var iframe = window.frames.iFrameBaluSideBar;

    if(!iframe) {
        iframe = document.createElement('iframe');

        iframe.id = 'iFrameBaluSideBar';
        //iframe.src = 'about:blank';
        iframe.className = 'sideBar';

        // Style the iframe
        iframe.style.position = 'fixed';
        iframe.style.height = '100%';
        iframe.style.zIndex = '2147483647'; // max
        iframe.style.right = '0px';
        iframe.style.width = '300px';
        iframe.style.top = '0px';

        iframe.style.display = 'block';
        iframe.style.background = 'white';

        iframe.style.borderLeftColor = 'black';
        iframe.style.borderLeftStyle = 'solid';
        iframe.style.borderLeftWidth =  '1px';

        // append iFrame to document (in doing so, contentWindow etc are created)
        html.appendChild(iframe);
        iframe.contentDocument.body.height = '80%';

    }

    createSideBarTemplate(iframe.contentWindow.document,thenCreateSideBarContent,username,userId,recommendationData, productGroupHeaders, searchTerm);
}

/*
 * @searchTerm: optional, passed through from manual search so we can re-populate the search field
 */
function createSideBarTemplate(doc,thenCreateSideBarContent,username,userId,recommendationData, productGroupHeaders, searchTerm){

    log('content_script.createSideBarTemplate: Start','PROCS');

    var foundationCSSUrl;
    var appCSSUrl;
    var foundationIconsCSSUrl;
    var appIconsCSSUrl;
    var modernizrJS;
    var jqueryJS;
    var foundationMinJS;

    try {
        foundationCSSUrl = chrome.extension.getURL('css/foundation.css');
        appCSSUrl = chrome.extension.getURL('css/app.css');
        foundationIconsCSSUrl = chrome.extension.getURL('css/foundation-icons.css');
        appIconsCSSUrl = chrome.extension.getURL('css/app-icons.css');
        //modernizrJS = chrome.extension.getURL('js/vendor/modernizr.js');
        //jqueryJS = chrome.extension.getURL('js/vendor/jquery.js');
        foundationMinJS = chrome.extension.getURL('js/foundation.min.js');
    } catch(error){
        foundationCSSUrl = '../ChromeExtension/css/foundation.css';
        appCSSUrl = '../ChromeExtension/css/app.css';
        foundationIconsCSSUrl = '../ChromeExtension/css/foundation-icons.css';
        appIconsCSSUrl = '../ChromeExtension/css/app-icons.css';
        //modernizrJS = '../ChromeExtension/js/vendor/modernizr.js';
        //jqueryJS = '../ChromeExtension/js/vendor/jquery.js';
        foundationMinJS = '../ChromeExtension/js/foundation.min.js';
    }

    doc.head.class = 'no-js';
    doc.head.lang = 'en';
    doc.head.innerHTML = '<meta charset="utf-8" />';
    doc.head.innerHTML += '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
    doc.head.innerHTML += '<title>Balu</title>';
    doc.head.innerHTML += '<link rel="stylesheet" href="' + foundationCSSUrl + '" />';
    doc.head.innerHTML += '<link rel="stylesheet" href="' + appCSSUrl + '">';
    doc.head.innerHTML += '<link rel="stylesheet" href="' + foundationIconsCSSUrl + '">';
    doc.head.innerHTML += '<link rel="stylesheet" href="' + appIconsCSSUrl + '">';
    doc.head.innerHTML += '<script src="' + modernizrJS + '"></script>';

    var topRow = '';

    topRow += '<form>';
    topRow += '<div class="row" style="margin-top: 2px;">';
    topRow += '  <div class="small-12 columns header">';
    topRow += '    <div class="row collapse">';
    topRow += '      <div class="small-8 columns">';
    if(searchTerm){
        topRow += '        <input type="text" id="fieldManualProductSearch" value="' + searchTerm + '" placeholder="Search" onkeydown="if (event.keyCode == 13) document.getElementById(\'manualProductSearchSubmitButton\').click()" class="radius">';
    } else{
        topRow += '        <input type="text" id="fieldManualProductSearch" placeholder="Search" onkeydown="if (event.keyCode == 13) document.getElementById(\'manualProductSearchSubmitButton\').click()" class="radius">';
    }
    topRow += '      </div>';
    topRow += '      <div class="small-2 column text-center">';
    topRow += '        <a id="manualProductSearchSubmitButton" href="javascript:window.parent.manualProductSearch();" class="button postfix searchLinkIcon radius"><i class="fi-magnifying-glass searchIcon"></i></a>';
    topRow += '      </div>';
    topRow += '      <div class="small-2 column text-center">';
    topRow += '        <a id="manualProductSearchSubmitButton" href="' + chrome.extension.getURL("/options.html") + '" target="_blank" class="button postfix accountLinkIcon"><i class="fi-torso accountIcon"></i></a>';
    topRow += '      </div>';
    topRow += '    </div>';
    topRow += '  </div>';
    topRow += '</div>';
    topRow += '</form>';

    var content = '<div id="contentDiv" class="contentDiv"></div>';

    var bottomRow = '';

    bottomRow += '<div class="row footer"><div class="small-12 columns">';

    bottomRow += '<div class="row collapse">';
    bottomRow += '  <div class="small-12 columns bottomNavDiv">';
    bottomRow += '    <div class="row collapse">';
    bottomRow += '      <div class="small-2 columns text-center" style="background-color: white">';
    //bottomRow += '        <a href=""><i class="fi-home navIcon"></i></a>';
    bottomRow += '        <i class="fi-home navIcon"></i>';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-2 columns text-center">';
    //bottomRow += '        <a href="#"><i class="fi-torsos-all navIcon"></i></a>';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-2 columns"></div>';
    bottomRow += '      <div class="small-2 columns"></div>';
    bottomRow += '      <div class="small-2 columns"></div>';
    bottomRow += '      <div class="small-2 columns text-center">';
    bottomRow += '        <span data-tooltip aria-haspopup="true" class="has-tip" title="Add your favourite ethical retailers to Balu">';
    bottomRow += '          <a href="javascript:window.parent.showAddRecommendationWindow(\'' + userId + '\');"><i class="fi-plus addNewIcon"></i></a>';
    bottomRow += '        </span>';
    bottomRow += '      </div>';
    bottomRow += '    </div>';
    bottomRow += '  </div>';
    bottomRow += '</div>';

    bottomRow += '<div class="row collapse">';
    bottomRow += '  <div class="small-12 columns footerDiv">';
    bottomRow += '    <div class="row collapse">';
    bottomRow += '      <div class="small-3 columns text-left">';
    bottomRow += '        <div class="row">';
    bottomRow += '          <div class="small-3 columns text-left">';
    bottomRow += '            <a href="javascript:window.parent.hideBaluUntilRefresh();"><i class="fi-play minimiseBaluIcon" title="Hide Balu (until page refresh)"></i></a>';
    bottomRow += '          </div>';
    bottomRow += '          <div class="small-3 columns end text-left">';
    bottomRow += '            <a href="javascript:window.parent.hideBaluUntilRestart();"><i class="fi-fast-forward minimiseBaluIcon" title="Hide Balu (until browser restart)"></i></a>';
    bottomRow += '          </div>';
    bottomRow += '        </div>';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-6 columns text-center">';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-3 columns text-right">';
    bottomRow += '        <span class="footerText"><a href="javascript:window.parent.showFAQWindow();">FAQs</a>&nbsp;|&nbsp;<a href="javascript:window.parent.showPrivacyWindow()">PRIVACY</a></span>';
    bottomRow += '      </div>';
    bottomRow += '    </div>';
    bottomRow += '  </div>';
    bottomRow += '</div></div>';

    body = doc.createElement('body');

    body.innerHTML  = topRow;
    body.innerHTML += content;
    body.innerHTML += bottomRow;

    body.innerHTML += '<script src="' + jqueryJS + '"></script>';
    body.innerHTML += '<script src="' + foundationMinJS + '"></script>';
    body.innerHTML += '<script>$(document).foundation();</script>';

    doc.body = body;
    doc.body.className = 'iFrameBody';
    doc.body.paddingBottom = '10px !important';
    thenCreateSideBarContent(doc,username,userId,recommendationData, productGroupHeaders);
}

/*
 * Create the content for the sign in / sign up sidebar
 */
function createSignInSideBarContent() {

    log('content_script.createSignInSideBarContent: Start','PROCS');

    var userForm = '';

    // Log in form

    userForm += '<div class="row">';
    userForm += '  <div class="small-8 columns end">';
    userForm += '    <h4>Sign In to Balu</h4>';
    userForm += '  </div>';
    userForm += '</div>';
    userForm += '<form id="signInUserForm" action="javascript:window.parent.signInUser()">';
    userForm += '  <div class="row">';
    userForm += '    <div class="small-4 columns">';
    userForm += '      <label>Email';
    userForm += '        <input type="text" id="fieldSignInEmail" placeholder="Email" required="yes">';
    userForm += '      </label>';
    userForm += '    </div>';
    userForm += '    <div class="small-4 columns end">';
    userForm += '      <label>Password';
    userForm += '        <input type="password" id="fieldSignInPassword" placeholder="Password" required="yes">';
    userForm += '      </label>';
    userForm += '    </div>';
    userForm += '  </div>';
    userForm += '  <div class="row">';
    userForm += '    <div class="small-4 columns end">';
    userForm += '      <input id="signInUserButton" class="button radius" type="submit" value="Log In">';
    userForm += '    </div>';
    userForm += '  </div>';
    userForm += '</form>';

    // Sign up form

    userForm += '<br />';
    userForm += '<div class="row">';
    userForm += '  <div class="small-8 columns end">';
    userForm += '    <h4>Create a New Account</h4>';
    userForm += '  </div>';
    userForm += '</div>';
    userForm += '<form id="signUpUserForm" action="javascript:window.parent.signUpUser()">';
    userForm += '  <div class="row">';
    userForm += '    <div class="small-4 columns">';
    userForm += '      <label>Email';
    userForm += '        <input type="text" id="fieldSignUpEmail" placeholder="Email" required="yes">';
    userForm += '      </label>';
    userForm += '    </div>';
    userForm += '    <div class="small-4 columns end">';
    userForm += '      <label>Password';
    userForm += '        <input type="password" id="fieldSignUpPassword" placeholder="Password" required="yes">';
    userForm += '      </label>';
    userForm += '    </div>';
    userForm += '  </div>';
    userForm += '  <div class="row">';
    userForm += '    <div class="small-4 columns end">';
    userForm += '      <input id="signUpUserButton" class="button radius" type="submit" value="Sign Up">';
    userForm += '    </div>';
    userForm += '  </div>';
    userForm += '</form>';

    window.frames.iFrameBaluSideBar.contentWindow.document.getElementById("contentDiv").innerHTML = userForm;
}

/*
 * Create the content for the "empty" sidebar
 */
function createEmptySideBarContent(username) {

    log('content_script.createEmptySideBarContent: Start','PROCS');

    var text = '';
    text += '<div class="row">';
    text += '  <div class="small-4 columns small-centered text-center">';
    text += '    <img class="searchingIcon" src="' + chrome.extension.getURL('images/icon-browser_action.png') + '" />';
    text += '  </div>';
    text += '</div>';

    window.frames.iFrameBaluSideBar.contentWindow.document.getElementById("contentDiv").innerHTML = text;
}

/*
 *
 */
function createNoResultsSideBarContent() {

    log('content_script.createNoResultsSideBarContent: Start','PROCS');

    var text = '';
    text += '<div class="row">';
    text += '  <div class="small-12 columns end text-left">';
    text += '    <span style="margin-left: 10px" class="warning label">No recommendations found</span>';
    text += '  </div>';
    text += '</div>';

    window.frames.iFrameBaluSideBar.contentWindow.document.getElementById("contentDiv").innerHTML = text;

}

/*
 * Create the content for the search result sidebar
 *
 * @recommendations contains one element for every recommendation that matched the ProductGroups of the searchResults.
 * It is ordered by ProductGroup (then productName), which is important otherwise we will not be able to correctly group
 * Recommendations by ProductGroup in the sidebar as we iterate through the array
 *
 * Note that we are driving with the recommendation data and hence will ignore any ProductGroups that - for whatever
 * reason - did not bring back a recommendation from Parse DB. This is because there's no point showing
 * empty ProductGroup sections on the sidebar.
 *
 * See background.getRecommendationData() for the data structure of @recommendations
 *
 * @productGroupHeaders is an associative array of productHeader records {productName, whyDoWeCare}
 * The associative array is indexed by productGroup.productGroupName.
 * It is conveninently constructed during the search to avoid having to re-loop through the searchResults later just to
 * populate the SearchProduct names in the ProductGroup headers. It is also optional, used only for the sidebar results; the
 * manual search won't populate or pass it
 */
function createResultsSideBarContent(doc, username, userId, recommendations, productGroupHeaders) {

    log('content_script.createResultsSideBarContent: Start >>> recommendations.length == ' + recommendations.length, 'PROCS');

    // variables to hold html as we build it
    var sidebarContentHTML = '';
    var productGroupHead = '';
    var notVotedDownRecs = '';
    var votedDownRecs = '';

    // Vars to control the flow through the ProductGroup loop
    var firstInProductGroup = true;
    var lastInProductGroup = false;
    var prevProductGroupId = "";
    var thisProductGroupId = "";


    if(!recommendations || recommendations.length === 0) {
        sidebarContentHTML += '<div class="origProductBlock">';
        sidebarContentHTML += '  No products found. Try making your search term simpler - For example, "shoes" would be better than "men\'s shoes"';
        sidebarContentHTML += '</div>';
    }
    for (var i = 0; i < recommendations.length; i++) {

        // Set our vars to control flow through the loop
        thisProductGroupId  = recommendations[i].productGroupId;
        if (prevProductGroupId != thisProductGroupId) {
            firstInProductGroup = true;
        }

        if (i < recommendations.length-1){
            if(thisProductGroupId != recommendations[i+1].productGroupId) {
                lastInProductGroup = true;
            } else{
                lastInProductGroup = false;
            }
        } else{
            lastInProductGroup = true;
        }

        // For the first recommendation in a new ProductGroup, set up a new ProductGroup header
        if (firstInProductGroup) {
            firstInProductGroup = false;

            productGroupHead += '<div class="origProductBlock">';
            productGroupHead += '  <span data-tooltip aria-haspopup="true" class="has-tip" title="' + recommendations[i].productGroupName + '">';
            productGroupHead += '  <div class="row origProductHeaderStrip" tooltip>';
            productGroupHead += '    <div class="origProductHeaderStripText">';

            // productGroupHeaders is populated by the auto page search to pass back
            // the comma-separated lists of searchProduct names (one csl per productGroup) to display in
            // the header of each product group.
            // For manual search, though, we don't do this: we just want to display
            // productGroupName itself
            var lastJ = 0;
            if (productGroupHeaders) {
                productGroupHead += '      <div style="margin-right: 30px">';
                for (j = 0; j < productGroupHeaders[recommendations[i].productGroupName].length; j++){
                    if (j === productGroupHeaders[recommendations[i].productGroupName].length-1) {
                        // last in group, don't put a comma at the end
                        productGroupHead += productGroupHeaders[recommendations[i].productGroupName][j].productName;
                    } else {
                        productGroupHead += productGroupHeaders[recommendations[i].productGroupName][j].productName + ', ';
                    }
                    lastJ = j;
                }
                productGroupHead += '      </div>';
                productGroupHead += '      <span data-tooltip aria-haspopup="true" class="has-tip whyDoWeCare" title="Learn more about the harmful side effects of the ' + productGroupHeaders[recommendations[i].productGroupName][lastJ].whyDoWeCare + ' industry"><a class="whyDoWeCare_link" target="_blank" href="http://www.getbalu.org/why-do-we-care/' + productGroupHeaders[recommendations[i].productGroupName][lastJ].whyDoWeCare + '">why care?&nbsp;</a></span>';
            } else {
                productGroupHead += recommendations[i].productGroupName;
            }

            // The "why do we care" is imperfect.
            // We identify it during page search, because very search product has a designated search category, therefore a
            // whyDoWeCare as well. But we're not grouping these productGroupHeaders by search category, we're just grouping
            // by product group. So if you had one product group name in two categories (Coffee in food and in drink) then which
            // whyDoWeCare do we use? Food or Drink? Logic a few lines above just takes the random last one.

            productGroupHead += '    </div>';
            productGroupHead += '  </div>';
            productGroupHead += '  </span>';
            productGroupHead += '</div>';

        }

        // Before starting the recommendation block, let's build our twitter link HTML for this recommendation

        var twitterLink =  'https://twitter.com/home?status=%23ShoppingWithoutTheSideEffects%20with%20getbalu.org:%20';
        twitterLink += recommendations[i].productName + '%20from%20';
        if(recommendations[i].twitterHandle){
            twitterLink += recommendations[i].twitterHandle;
        } else {
            twitterLink += recommendations[i].productURL;
        }
        twitterLink += '%20%40BaluHQ%20';


        // build the rec itself into a variable that is then assigned to either the top set of responses or the bottom, the bottom
        // being the ones voted down by this user
        var recBlock = '';

        recBlock += '<div class="altProductsBlock">';
        recBlock += '  <div class="row collapse altProductBlock">';
        recBlock += '    <div class="small-5 columns">';
        recBlock += '      <div class="row text-center">';
        recBlock += '        <a href="javascript:window.parent.hyperlink_Rec(\'' + recommendations[i].productURL + '\',\'' + recommendations[i].recommendationId + '\');">';
        recBlock += '          <img class="altImage" src="' + recommendations[i].imageURL + '" />';
        recBlock += '        </a>';
        recBlock += '      </div>';
        recBlock += '    </div>';
        recBlock += '    <div class="small-7 columns altText">';
        recBlock += '      <div class="altText-top">';
        recBlock += '        <b><a href="javascript:window.parent.hyperlink_Rec(\'' + recommendations[i].productURL + '\',\'' + recommendations[i].recommendationId + '\');" class="altProductLink" target="_blank">' + recommendations[i].brand + '</a>';// <span data-tooltip aria-haspopup="true" class="has-tip" title="' + recommendations[i].brand + '\r\r' + recommendations[i].brandSpiel + '"><i class="fi-info infoIcon"></i></b>';
        recBlock += '        <br />';
        recBlock += '        <a href="javascript:window.parent.hyperlink_Rec(\'' + recommendations[i].productURL + '\',\'' + recommendations[i].recommendationId + '\');" class="altProductLink" target="_blank">' + recommendations[i].productName + '</a>';
        recBlock += '        <br />';
        recBlock += '        <span data-tooltip aria-haspopup="true" class="has-tip" style="font-size: 11px" title="' + recommendations[i].brand + '\r\r' + recommendations[i].brandSpiel + '">why care?<span>';
        recBlock += '      </div>';
        recBlock += '    </div>';
        recBlock += '    <div class="altText-bottom">';

        // check whether this product has been voted up or down by the user (passed in to the rec array by getRecommendationData) and
        // style the arrows accordingly
        var voteUpClass = 'voteClass_nothing';
        var voteDownClass = 'voteClass_nothing';

        if(recommendations[i].upOrDownOrNull === 'UP') {
            voteUpClass = 'voteClass_voted';
            voteDownClass = 'voteClass_notVoted';
        } else if (recommendations[i].upOrDownOrNull === 'DOWN') {
            voteUpClass = 'voteClass_notVoted';
            voteDownClass = 'voteClass_voted';
        }

        var left = (screen.width/4)*3;
        var top = (screen.height/4)*1;

        recBlock += '      <a href="javascript:window.parent.voteUpRec(&apos;' + recommendations[i].recommendationId + '&apos;)" title="Vote up this recommendation"><i class="fi-arrow-up ' + voteUpClass + '" id="voteUpRec_upArrow_' + recommendations[i].recommendationId + '"></i></a>';
        recBlock += '      <a href="javascript:window.parent.voteDownRec(&apos;' + recommendations[i].recommendationId + '&apos;)" title="Vote down this recommendation"><i class="fi-arrow-down ' + voteDownClass + '" id="voteDownRec_downArrow_' + recommendations[i].recommendationId + '"></i></a>';
        recBlock += '      <a href="#" onclick="window.open(&apos;' + twitterLink + '&apos;, &apos;newwindow&apos;, &apos;width=300, height=250,top='+top+',left='+left+',&apos;); return false;" target="_blank" title="Share on Twitter"><i class="fi-social-twitter altProdIcon"></i></a>';
        //recBlock += '      <a href="#" title="Share..."><i class="fi-share altProdIcon"></i></a>';
        recBlock += '    </div>';
        recBlock += '  </div>';

        if (!lastInProductGroup) {
            recBlock += '  <hr style="margin: 2px 2px" />';
            recBlock += '</div>';
        }

        if(recommendations[i].upOrDownOrNull === 'DOWN') {
            votedDownRecs += recBlock;
        } else {
            notVotedDownRecs += recBlock;
        }

         if(lastInProductGroup) {
            sidebarContentHTML += productGroupHead;
            sidebarContentHTML += notVotedDownRecs;
            sidebarContentHTML += votedDownRecs;
            sidebarContentHTML += '  <label style="font-size: 11px">Know of other great retailers of <i>' + recommendations[i].productGroupName + '</i>?<br ?>Get them <a href="javascript:window.parent.showAddRecommendationWindow(\'' + userId + '\');">added to Balu</a> so everybody can find them! </label>';
            sidebarContentHTML += '</div>';

            // clear the product loop variables ready for the next iteration
            productGroupHead = '';
            notVotedDownRecs = '';
            votedDownRecs = '';
        }

        prevProductGroupId = thisProductGroupId;

    }

    doc.getElementById("contentDiv").innerHTML = sidebarContentHTML;

}

/*
 *
 */
function hideSideBar() {

    log('content_script.hideSideBar: Start','PROCS');

     // Display the browser icon count
     chrome.runtime.sendMessage({sender:  'content_script',
                                 subject: 'pleaseSetBrowserActionBadge',
                                 recommendationCount: '' + gvRecommendationCount + ''});

     // Move the user's webpage back to equal width on screen

     var html = document.getElementsByTagName('html')[0];
     html.style.position = 'absolute';
     html.style.right = '0px';
     html.style.left = '0px';

     // remove the iframe
     var iframe = window.frames.iFrameBaluSideBar;
     iframe.parentNode.removeChild(iframe);

}

/**************************
 * Error and Log handling *
 **************************/

/*
 *
 */
function log(message, level) {
    chrome.runtime.sendMessage({sender:  'content_script',
                                subject: 'pleaseLogMessageOnConsole',
                                message:  message,
                                level:    level});

}

/*
 *
 */
function userLog(eventName, data) {
    chrome.runtime.sendMessage({sender:     'content_script',
                                subject:    'pleaseLogEventInUserLog',
                                eventName:  eventName,
                                data:       data});

}
