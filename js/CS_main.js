

/********
 * Init *
 ********/

/*
 * Global Variables
 */

var gvScriptName_CSMain = 'CS_main';

var gvIframe;

var gvIsIframeReady = false;
var gvIsJQueryReady = false;
var gvIsFoundationReady = false;
var gvIsQTipsReady = false;

var gvRecommendationCount = '';
var gvRecommendationCount_manual = '';

/*
 * State is maintained by the background page by keeping an array (gvTabs) of all
 * tabs. So as soon as the content_script is injected into a new tab (and
 * hence this initialise() function fires) tell the background page so it
 * can add this tab to the array.
 */
(function initialise(){

    log(gvScriptName_CSMain + '.initialise: Start','INITS');

    // Listen for Chrome runtime messages from background script
    chrome.runtime.onMessage.addListener(chromeMessageListener);

    // Listen for HTML messages from iframe script
    window.addEventListener('message', iFrameListener, false);

    // Tell the background script to initialise this tab. When it's done, it will
    // fire a message back with the tab object and we can kick off a page search (or log in, etc)
    sendMessage('BG_main','pleaseInitialiseThisTab');

    // Track the tab (so if it's one we've created from the extension we can check it's found the product)
    // Check whether the tab is being tracked and, if so, search it. The trackedTab is a record created by BG_main
    sendMessage('BG_main','pleaseTrackThisTab',null,searchTrackedTabForRecommendation);

})();

function searchTrackedTabForRecommendation(trackedTab){

    log(gvScriptName_CSMain + '.searchTrackedTabForRecommendation: start','PROCS');

    if(typeof(trackedTab) !== 'undefined') {
        var pageText = document.body.textContent.toLowerCase();

        if(pageText.indexOf(trackedTab.pageConfirmationSearch.toLowerCase()) !== -1){
            sendMessage('BG_main','pleaseRegisterTrackedTabAsOK',{trackedTab: trackedTab});
        } else {
            sendMessage('BG_main','pleaseRegisterTrackedTabAsProblem',{trackedTab: trackedTab});
        }
    }
}

/*****************************
 * Sidebar Display Functions *
 *****************************/

/*
 * Force a sidebar with the given content onto the web page
 */
function createSidebar(thenCreateSidebarContent,recommendationData, searchTerm, showJoyride, displayChristmasBanner, showTopRow) {

    log(gvScriptName_CSMain + '.createSidebar: Start','PROCS');

    // Check in with some global variable settings

    gvIframe = window.frames.iFrameBaluSidebar;

    if(recommendationData) {
        if(searchTerm){
            gvRecommendationCount_manual = recommendationData.length;
        } else {
            gvRecommendationCount = recommendationData.length;
        }

    } else{
        gvRecommendationCount = 0;
        gvRecommendationCount_manual = 0;
    }

    // Position the user's page on the screen to make room for the sidebar

    // We assume that if the iframe already exists then the page has already been shifted over
    // If iframe is already there then skip straight on to content (end of function)
    if(!gvIframe) {
        var html;
        if(document.documentElement){
            html = document.documentElement;
        } else if (document.getElementsByTagName('html') && document.getElementsByTagName('html')[0]) {
            html = document.getElementsByTagName('html')[0];
        } else {
            log(gvScriptName_CSMain + '.createSidebar: No HTML element found on page','ERROR');
        }

        // If there are any fixed elements on the page (usually headers and footers, e.g. Next.co.uk)
        // then find them and change them to relative. Otherwise we can't push them over.
        /*
        var fixedElements = document.querySelectorAll("div, header, [style]");
        var style;
        for(var i = 0; i < fixedElements.length; i++) {
            style = window.getComputedStyle(fixedElements[i]);
            if(style.position === 'fixed'){
                fixedElements[i].style.position = 'relative';
            }
        }
        */

        // Make sure the entire HTML is relative positioned too
        if(html.style.position === 'static' || html.style.position === '') {
            html.style.position = 'relative';
        }

        // And now shift the HTML element over 300 pixels to the left
        var currentRight = html.style.marginRight;
        if(currentRight === 'auto' || currentRight === '') {
            currentRight = 0;
        } else {
            currentRight = parseFloat(html.style.marginRight); // parseFloat removes any 'px'
        }
        html.style.marginRight = currentRight + 300 + 'px';


        // Create the iFrame

        gvIframe = document.createElement('iframe');

        gvIframe.id = 'iFrameBaluSidebar';
        //gvIframe.src = 'about:blank';
        gvIframe.className = 'sidebar';

        // Style the gvIframe
        gvIframe.style.position = 'fixed';
        gvIframe.style.height = '100%';
        gvIframe.style.zIndex = '2147483647'; // max
        gvIframe.style.right = '0px';
        gvIframe.style.width = '300px';
        gvIframe.style.top = '0px';

        gvIframe.style.display = 'block';
        gvIframe.style.background = 'white';

        gvIframe.style.borderLeftColor = 'black';
        gvIframe.style.borderLeftStyle = 'solid';
        gvIframe.style.borderLeftWidth =  '1px';

        // append gvIframe to document (in doing so, contentWindow etc are created)
        html.appendChild(gvIframe);
        //gvIframe.contentDocument.body.height = '80%';

    }

    createSidebarTemplate(thenCreateSidebarContent,recommendationData, searchTerm, showJoyride, displayChristmasBanner, showTopRow);

}

/*
 * @searchTerm: optional, passed through from manual search so we can re-populate the search field
 */
function createSidebarTemplate(thenCreateSidebarContent,recommendationData, searchTerm, showJoyride, displayChristmasBanner, showTopRow){

    log(gvScriptName_CSMain + '.createSidebarTemplate: Start','PROCS');

    docHeadHTML  = '';
    docHeadHTML += '<meta charset="utf-8" />';
    docHeadHTML += '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
    docHeadHTML += '<title>Balu</title>';

    // Attach to the iFrame document
    var docHead = gvIframe.contentWindow.document.head;
    docHead.class = 'no-js';
    docHead.lang = 'en';
    docHead.innerHTML = docHeadHTML;

    // Inject modernizr script into page
    var modernizrScript = document.createElement('script');
    modernizrScript.type="text/javascript";
    modernizrScript.src = chrome.extension.getURL('js/externalJS/modernizr.js');
    docHead.appendChild(modernizrScript);

    // Inject foundation CSS script
    var foundationCSS  = document.createElement('link');
    foundationCSS.type = "text/css";
    foundationCSS.rel  = "stylesheet";
    foundationCSS.href = chrome.extension.getURL('css/foundation.min.css');
    docHead.appendChild(foundationCSS);

    // Inject app CSS script
    var appCSS  = document.createElement('link');
    appCSS.type = "text/css";
    appCSS.rel  = "stylesheet";
    appCSS.href = chrome.extension.getURL('css/app.css');
    docHead.appendChild(appCSS);

    // Inject foundation-icons CSS script
    var foundationIconsCSS  = document.createElement('link');
    foundationIconsCSS.type = "text/css";
    foundationIconsCSS.rel  = "stylesheet";
    foundationIconsCSS.href = chrome.extension.getURL('css/foundation-icons.css');
    docHead.appendChild(foundationIconsCSS);

    // Inject app-icons CSS script
    var appIconsCSS  = document.createElement('link');
    appIconsCSS.type = "text/css";
    appIconsCSS.rel  = "stylesheet";
    appIconsCSS.href = chrome.extension.getURL('css/app-icons.css');
    docHead.appendChild(appIconsCSS);

    // Inject qtip CSS script
    var qtipCSS  = document.createElement('link');
    qtipCSS.type = "text/css";
    qtipCSS.rel  = "stylesheet";
    qtipCSS.href = chrome.extension.getURL('css/jquery.qtip.min.css');
    docHead.appendChild(qtipCSS);

    // Inject jquery script into page
    var jqueryScript = document.createElement('script');
    jqueryScript.type="text/javascript";
    jqueryScript.onload = function() {
        // Before we inject the other scripts (addFinalScriptsToDOM()), we need to make sure
        // jquery has loaded. But we can't inject the other sripts here, because the rest of
        // the page hasn't loaded.
        // So we're going to set a global variable and check it in addFinalScriptsToDOM()
        gvIsJQueryReady = true;
    };
    jqueryScript.src = chrome.extension.getURL('js/externalJS/jquery-3.2.1.min.js');
    docHead.appendChild(jqueryScript);

    var topRow = '';

    if(showTopRow) {

        var searchTermString;
        if(searchTerm){
            searchTermString = 'value="' + searchTerm + '"';
        }
        else {
            searchTermString = '';
        }

        topRow += '<form>';
        topRow += '  <div class="grid-x grid-padding-x sidebar_topRow">';
        topRow += '    <div class="small-12 cell text-center">';
        topRow += '      <span class="sidebarLogoHeader">BALU</span>';
        topRow += '      <a href="' + chrome.extension.getURL("options.html") + '#settings" target="_blank"><i id="settingsCog_icon" class="fi-widget settingsCogIcon"></i></a>';
        topRow += '    </div>';
        topRow += '  </div>'; // Top row
        // topRow += '  <div class="grid-x grid-padding-x sidebar_searchBarRow">';
        // topRow += '    <div class="small-12 cell text-center manualSearchDiv">';
        // topRow += '      <div class="manualSearchDiv" id="joyrideStop4">';
        // topRow += '        <i id="manualSearchSubmit_icon" class="fi-magnifying-glass manualSearchIcon"></i>';
        // topRow += '        <input id="fieldManualSearch" ' + searchTermString + ' class="manualSearchField" />';
        // topRow += '      </div>';
        // topRow += '    </div>';
        // topRow += '  </div>';
        topRow += '</div>';
        topRow += '</form>';

        // If our search results have triggered a banner, display it here
        if(displayChristmasBanner){
            topRow += '<div id="banner_container" class="banner_container">';
            topRow += '  <div class="grid-x grid-padding-x">';
            topRow += '    <div class="small-12 cell banner">';
            topRow += '      <a target="_blank" class="banner_link" href="http://www.getbalu.org/christmas">Balu\'s Guide to Christmas!</a>';
            topRow += '    </div>';
            topRow += '  </div>';
            topRow += '</div>';
        }

    }

    var content = '<div id="contentDiv" class="contentDiv"></div>';

    var bottomRow = '';

/*
    bottomRow += '<div class="grid-x grid-padding-x  sidebarFeedbackRow">';
    bottomRow += '  <div class="small-4 sidebarFeedbackColumn cell">';
    //bottomRow += '    <i class="fi-arrow-down"></i>';
    bottomRow += '    <a id="btsMissingRecs_a" class="qtip_tooltips_feedback"><i id="btsMissingRecs_icon" class="fi-page-delete feedbackIcon"></i></a>';
    bottomRow += '    <div style="position: fixed" class="feedbackTooltipHidden" data-qtiptitle="Feedback..." data-position-my="bottom left" data-position-at="top right">I\'m not seeing the recommendations I expect</div>';
    bottomRow += '  </div>';
    bottomRow += '  <div class="small-4 sidebarFeedbackColumn cell">';
    bottomRow += '    <a id="btsFalsePositives_a" class="qtip_tooltips_feedback"><i id="btsFalsePositives_icon" class="fi-page-multiple feedbackIcon"></i></a>';
    bottomRow += '    <div style="position: fixed" class="feedbackTooltipHidden" data-qtiptitle="Feedback..." data-position-my="bottom center" data-position-at="top center">I\'m seeing products that don\'t make sense</div>';
    bottomRow += '  </div>';
    bottomRow += '  <div class="small-4 sidebarFeedbackColumn cell">';
    bottomRow += '    <a id="btsBangOn_a" class="qtip_tooltips_feedback"><i id="btsBangOn_icon" class="fi-check feedbackIcon"></i></a>';
    bottomRow += '    <div style="position: fixed" class="feedbackTooltipHidden" data-qtiptitle="Feedback..." data-position-my="bottom right" data-position-at="top left">Results look all good to me!</div>';
    bottomRow += '  </div>';
    bottomRow += '</div>';
*/
    bottomRow += '<div class="grid-x grid-padding-x footer"><div class="small-12 cell">';
/*
    bottomRow += '<div class="grid-x grid-padding-x collapse">';
    bottomRow += '  <div class="small-12 cell bottomNavDiv">';
    bottomRow += '    <div class="grid-x grid-padding-x collapse">';
    bottomRow += '      <div class="small-2 cell text-center" style="background-color: white">';
    //bottomRow += '        <a id=""><i class="fi-home navIcon"></i></a>';
    bottomRow += '        <i class="fi-home navIcon"></i>';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-2 cell text-center">';
    //bottomRow += '        <a id=""><i class="fi-torsos-all navIcon"></i></a>';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-2 cell"></div>';
    bottomRow += '      <div class="small-2 cell"></div>';
    bottomRow += '      <div class="small-2 cell end"></div>';
    bottomRow += '    </div>';
    bottomRow += '  </div>';
    bottomRow += '</div>';
*/
    bottomRow += '<div class="grid-x grid-padding-x collapse footerDivs">';
    bottomRow += '  <div class="small-12 cell footerDivs">';
    bottomRow += '    <div class="grid-x grid-padding-x collapse">';
    bottomRow += '      <div class="small-3 cell text-left footerDivs">';
    bottomRow += '        <div class="grid-x grid-padding-x footerDivs">';
    bottomRow += '          <div class="small-3 cell text-left footerDivs"">';
    bottomRow += '            <a id="hideSidebarUntilRefresh_icon"><i id="joyrideStop3" class="fi-play minimiseBaluIcon" title="Hide Balu on this tab (until page refresh)"></i></a>';
    bottomRow += '          </div>';
    bottomRow += '          <div class="small-3 cell end text-left footerDivs">';
    bottomRow += '            <a id="hideSidebarUntilRestart_icon"><i class="fi-fast-forward minimiseBaluIcon" title="Hide Balu on all tabs (until browser restart)"></i></a>';
    bottomRow += '          </div>';
    bottomRow += '        </div>';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-4 cell text-center footerDivs">';
    //bottomRow += '        <p class="feedbackLink">Feedback</p>';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-5 cell text-right footerDivs">';
    bottomRow += '        <span class="footerText"><a id="showInfoWindow_link">Info</a>&nbsp;|&nbsp;<a id="showFAQWindow_link">FAQs</a>&nbsp;|&nbsp;<a id="showPrivacyWindow_link">Privacy</a></span>';
    bottomRow += '      </div>';
    bottomRow += '    </div>';
    bottomRow += '  </div>';
    bottomRow += '</div>';

    bottomRow += '</div>';

    docBody = gvIframe.contentWindow.document.createElement('body');
    docBody.className = 'sidebarBody';

    docBody.innerHTML  = topRow;
    docBody.innerHTML += content;
    docBody.innerHTML += bottomRow;

    // Joyride content
    if(showJoyride){
        var joyrideHTML = '';
        joyrideHTML += '<ol class="joyride-list" data-joyride>';
        joyrideHTML += '  <li data-id="joyrideStop1" data-text="Next (1 of 3)" data-prev-text="Prev" data-options="tip_location: left; nub_position: right;" class="custom">';
        joyrideHTML += '    <h4>How ethical?</h4>';
        joyrideHTML += '    <p>Hover over the <i class="fi-info joyrideIcon"></i> icon for information about the brand</p>';
        joyrideHTML += '  </li>';
        //joyrideHTML += '  <li data-id="joyrideStop2" data-text="Next (2 of 5)" data-prev-text="Prev" data-options="tip_location: left; nub_position: right;" class="custom">';
        //joyrideHTML += '    <h4>Block a brand</h4>';
        //joyrideHTML += '    <p>Click the <i class="fi-x-circle joyrideIcon"></i> icon to stop seeing recommendations from this brand</p>';
        //joyrideHTML += '  </li>';
        joyrideHTML += '  <li data-id="joyrideStop3" data-text="Next (2 of 3)" data-prev-text="Prev" data-options="tip_location: top; nub_position: left;" class="custom">';
        joyrideHTML += '    <h4>Sidebar getting in the way?</h4>';
        joyrideHTML += '    <p>Hide the side bar until refresh <i class="fi-play joyrideIcon"></i>, or until restart <i class="fi-fast-forward joyrideIcon"></i></p>';
        joyrideHTML += '    <p>Hide it permanently from the options page <i class="fi-widget joyrideIcon"></i></p>';
        joyrideHTML += '  </li>';
        joyrideHTML += '  <li data-id="joyrideStop4" data-button="End" data-text="Next (3 of 3)" data-prev-text="Prev" data-options="tip_location: left; nub_position: right;" class="custom">';
        joyrideHTML += '    <h4>Search</h4>';
        joyrideHTML += '    <p>Search Balu from the sidebar or from the Balu icon on the Chrome toolbar</i></p>';
        joyrideHTML += '  </li>';
        //joyrideHTML += '  <li data-id="joyrideStop5" data-button="End" data-prev-text="Prev" data-options="tip_location: left; nub_position: right;" class="custom">';
        //joyrideHTML += '    <h4>Spread the word</h4>';
        //joyrideHTML += '    <p>Not seeing your favourite ethical brands on Balu? Click the Balu icon on the Chrome toolbar to recommend a brand.</p>';
        //joyrideHTML += '  </li>';
        joyrideHTML += '</ol>';
        docBody.innerHTML += joyrideHTML;
    }

    // And now attach it to the DOM

    gvIframe.contentWindow.document.body = docBody;

    // Rest of scripts need to go on after content has been added to DOM

    // All listeners for clickable items in the template. These listeners all call back to CS_main

    if(showTopRow){
        //gvIframe.contentWindow.document.getElementById('fieldManualSearch').addEventListener('keydown',manualSearchSubmit_keydown_listener);
        //gvIframe.contentWindow.document.getElementById('manualSearchSubmit_icon').addEventListener('click',manualSearchSubmit_listener);
        //gvIframe.contentWindow.document.getElementById('showOptionsPageWindow_icon').addEventListener('click',showOptionsPageWindow_listener);
        //gvIframe.contentWindow.document.getElementById('showUserSubmittedRecWindow_icon').addEventListener('click',showUserSubmittedRecWindow_listener);
    }

    //gvIframe.contentWindow.document.getElementById('btsMissingRecs_a').addEventListener('click',btsMissingRecs_listener);
    //gvIframe.contentWindow.document.getElementById('btsFalsePositives_a').addEventListener('click',btsFalsePositives_listener);
    //gvIframe.contentWindow.document.getElementById('btsBangOn_a').addEventListener('click',btsBangOn_listener);

    gvIframe.contentWindow.document.getElementById('hideSidebarUntilRefresh_icon').addEventListener('click',hideSidebar_untilRefresh_listener);
    gvIframe.contentWindow.document.getElementById('hideSidebarUntilRestart_icon').addEventListener('click',hideSidebar_untilRestart_listener);
    gvIframe.contentWindow.document.getElementById('showInfoWindow_link').addEventListener('click',showInfoWindow_listener);
    gvIframe.contentWindow.document.getElementById('showFAQWindow_link').addEventListener('click',showFAQWindow_listener);
    gvIframe.contentWindow.document.getElementById('showPrivacyWindow_link').addEventListener('click',showPrivacyWindow_listener);

    // set the christmas banner background image
    if(displayChristmasBanner) {
        var imgURL = chrome.extension.getURL("images/christmas_banner.jpg");
        gvIframe.contentWindow.document.getElementById("banner_container").style.backgroundImage = "url("+imgURL+")";
    }

    thenCreateSidebarContent(recommendationData, showJoyride, addFinalScriptsToDOM, searchTerm);
}

function addFinalScriptsToDOM(showJoyride) {

    waitForScriptsThenExecute('jquery',0,function(){
        log(gvScriptName_CSMain + '.addFinalScriptsToDOM: Start','PROCS');

        var docBody = gvIframe.contentWindow.document.body;

        // Append fastclick script to body
        var fastclickScript = document.createElement('script');
        fastclickScript.type="text/javascript";
        fastclickScript.src = chrome.extension.getURL('js/externalJS/fastclick.js');
        docBody.appendChild(fastclickScript);

        // Append foundation script to body
        var foundationScript = document.createElement('script');
        foundationScript.type="text/javascript";
        foundationScript.onload = function() {
            gvIsFoundationReady = true;
        };
        foundationScript.src = chrome.extension.getURL('js/externalJS/foundation.min.js');
        docBody.appendChild(foundationScript);

        // Inject qtip script into page
        var qtipScript = document.createElement('script');
        qtipScript.type="text/javascript";
        qtipScript.onload = function() {
            gvIsQTipsReady = true;
        };
        qtipScript.src = chrome.extension.getURL('js/externalJS/jquery.qtip.min.js');
        docBody.appendChild(qtipScript);

        // Inject iframe script into page
        var iframeScript = document.createElement('script');
        iframeScript.type="text/javascript";
        iframeScript.onload = function() {
            gvIsIframeReady = true;
        };
        iframeScript.src = chrome.extension.getURL('js/IF_main.js');
        docBody.appendChild(iframeScript);

        // Tell the iframe script to activate the QTips (tooltips)
        waitForScriptsThenExecute('qtips',0,function(){
            waitForScriptsThenExecute('iframe',0,function(){
                sendMessage('IF_main','pleaseActivateQTips',{});
            });
        });

        // Tell the iframe script to activate the joyride
        if(showJoyride){
            waitForScriptsThenExecute('foundation',0,function(){
                waitForScriptsThenExecute('iframe',0,function(){
                    sendMessage('IF_main','pleaseActivateJoyride',{});
                });
            });
        }
    });
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
 * See background.getRecommendations() for the data structure of @recommendations
 */
function createResultsSidebarContent(recommendations,showJoyride,callback,searchTerm) {

    log(gvScriptName_CSMain + '.createResultsSidebarContent: Start', 'PROCS');

    // variable to hold html as we build it
    var lvSidebarContentHTML = '';

    // Vars to control the flow through the ProductGroup loop

    lvSidebarContentHTML += '<div class="altProductsBlock">';
    lvSidebarContentHTML += '  <div class="grid-x grid-padding-x collapse altProductBlock productLinks">';

    lvSidebarContentHTML += '<b>Balu is shutting down!</b><br />';
    lvSidebarContentHTML += 'Thank you SO MUCH for using Balu.<br /><br />';
    lvSidebarContentHTML += 'Sadly, Balu is no more.<br /><br />';
    lvSidebarContentHTML += 'In 2019 we joined forces with CoGo, an incredible app doing the same thing as Balu - but better :)<br /><br  />';
    lvSidebarContentHTML += 'And so we made the difficult decision to close Balu down - allowing us to focus solely on CoGo<br /><br  />';
    lvSidebarContentHTML += 'Read more about our decision <a href="http://www.getbalu.org/goodbye-balu/" target="_blank">here</a> <br />';
    lvSidebarContentHTML += 'If you have enjoyed using Balu we strongly recommend you check out <a href="https://cogo-uk.app.link/aR5CmqdgS1" target="_blank">CoGo</a><br /><br />';
    lvSidebarContentHTML += '</div>';
    lvSidebarContentHTML += '</div>';

    lvSidebarContentHTML += '<div class="altProductsBlock">';
    lvSidebarContentHTML += '  <div class="grid-x grid-padding-x collapse altProductBlock productLinks" style="font-size: large; color: #6bd3c2; font-family: Noto Sans; text-transform: uppercase">';
    lvSidebarContentHTML += '<a href="https://cogo-uk.app.link/aR5CmqdgS1" target="_blank">Get CoGo</a>';
    lvSidebarContentHTML += '</div>';
    lvSidebarContentHTML += '</div>';

    gvIframe.contentWindow.document.getElementById("contentDiv").innerHTML = lvSidebarContentHTML;

    callback(showJoyride); // will add the final scripts to the bottom of the body.

}

/*
 *
 */
function waitForScriptsThenExecute(whatAreWeWaitingFor,counter,callback){

    var areWeDone = false;
    if (whatAreWeWaitingFor === 'jquery') {
        areWeDone = gvIsJQueryReady;
    } else if (whatAreWeWaitingFor === 'qtips') {
        areWeDone = gvIsQTipsReady;
    } else if (whatAreWeWaitingFor === 'iframe') {
        areWeDone = gvIsIframeReady;
    } else if (whatAreWeWaitingFor === 'foundation') {
        areWeDone = gvIsFoundationReady;
    }
    if(areWeDone){
        log(gvScriptName_CSMain + '.waitForScriptsThenExecute (' + whatAreWeWaitingFor + '): Ending wait sucessfully!, counter === ' + counter,'PROCS');
        callback();
    } else if (counter > 1000) {
        log(gvScriptName_CSMain + '.waitForScriptsThenExecute (' + whatAreWeWaitingFor + '): Ending wait UNSUCCESSFULLY, counter === ' + counter,'PROCS');
    } else {
        log(gvScriptName_CSMain + '.waitForScriptsThenExecute (' + whatAreWeWaitingFor + '): Still waiting, counter === ' + counter,'DEBUG');
        counter++;
        window.setTimeout(function(){return waitForScriptsThenExecute(whatAreWeWaitingFor,counter,callback);},10);
    }
}

/*
 * Create the content for the sign in / sign up sidebar
 * This used to be a full log in screen, but now it's all contained within the
 * options page, so the sidebar merely appears and points users towards the
 * options page to login
 * To do: Parameters are there because this function is called as a callback, where in other
 * scenarios the callback could be a function that does need 4 params [!]
 */
function createLogInSidebarContent(a,b,c,d) {
    var lvFunctionName = 'createLogInSidebarContent';
    log(gvScriptName_CSMain + '.' + lvFunctionName + ': Start','PROCS');

    var lvHtml = '';
    lvHtml += '<div class="grid-x grid-padding-x text-center" style="margin-top: 70px">';
    lvHtml += '  <div class="small-10 small-centered cell">';
    lvHtml += '    <p class="logInSideBarText">Log back in to Balu to see amazing ethical products while you shop</p>';
    lvHtml += '    <a id="showLogInPageButton" class="button radius signInScreenButtons">Log in</a>';
    lvHtml += '  </div>';
    lvHtml += '</div>';

    gvIframe.contentWindow.document.getElementById("contentDiv").innerHTML = lvHtml;
    gvIframe.contentWindow.document.getElementById('showLogInPageButton').addEventListener('click',showOptionsLogInPageWindow_listener);

}

function hideSidebar(callback) {
    log(gvScriptName_CSMain + '.hideSidebar: Start','PROCS');

    // Move the user's webpage back to equal width on screen
    var html = document.getElementsByTagName('html')[0];
    html.style.marginRight = '0px';

    // remove the iframe, if it exists (we could have called this function as a precautionary measure, regardless of whether sidebar is displayed)
    if(window.frames.iFrameBaluSidebar) {
        var iframe = window.frames.iFrameBaluSidebar;
        iframe.parentNode.removeChild(iframe);
    }
    if(callback){
        callback();
    }
}

/******************************
 * Sidebar Listener Functions *
 ******************************/

// Main sidebar listeners

function manualSearchSubmit_keydown_listener(event) {if (event.keyCode == 13) {manualSearchSubmit_listener();}}
function manualSearchSubmit_listener() {
    log(gvScriptName_CSMain + '.manualSearchSubmit_listener: Start','LSTNR');
    // we're about to refresh the iframe, so set the iFrame ready variable back to false
    gvIsIframeReady = false;
    var searchTerm = gvIframe.contentWindow.document.getElementById('fieldManualSearch').value;
    sendMessage('BG_main','pleaseRunManualSearch',{searchTerm: searchTerm});
}

function showOptionsLogInPageWindow_listener() {
    var lvFunctionName = 'showOptionsLogInPageWindow_listener';
    log(gvScriptName_CSMain + '.' + lvFunctionName + ': Start','LSTNR');
    sendMessage('BG_main','pleaseShowOptionsLogInPageWindow',{page: 'options.html#start'});
}

function showOptionsPageWindow_listener() {
    log(gvScriptName_CSMain + '.showOptionsPageWindow_listener: Start','LSTNR');
    sendMessage('BG_main','pleaseShowOptionsPageWindow',{page: 'options.html#settings'});
}

function showProductLinkWindow_listener() {
    log(gvScriptName_CSMain + '.productLink_listener: Start','LSTNR');
    var productURL = this.getAttribute('data-url');
    var recommendationId = this.getAttribute('data-recid');
    var productName = this.getAttribute('data-productname');
    var pageConfirmationSearch = this.getAttribute('data-pageconfirmationsearch');
    var isManualSearch = this.getAttribute('data-fromsearch');

    sendMessage('BG_main','pleaseShowProductLinkWindow',{productURL:             productURL,
                                                         recommendationId:       recommendationId,
                                                         pageConfirmationSearch: pageConfirmationSearch,
                                                         recProductName:         productName,
                                                         isManualSearch:         isManualSearch});
}

/*
function twitterShare_listener() {

    log(gvScriptName_CSMain + '.twitterShare_listener: Start','LSTNR');

    var tweetContent = this.getAttribute('data-tweetcontent');

    // Message extension to open tweet window
    sendMessage('BG_main','pleaseShowTweetWindow',{tweetContent: tweetContent});
}
*/

function blockBrand_listener(event) {

    log(gvScriptName_CSMain + '.blockBrand_listener: Start','LSTNR');

    event.stopPropagation();

    var recommendationId = this.getAttribute('data-recid');
    var productName = this.getAttribute('data-productname');
    var brandId = this.getAttribute('data-brandid');
    var brandName = this.getAttribute('data-brandname');

    // Message extension to open block brand window
    sendMessage('BG_main','pleaseShowBlockBrandWindow',{recommendationId: recommendationId,
                                                        productName:      productName,
                                                        brandName:        brandName,
                                                        brandId:          brandId,
                                                        reason:           '',
                                                        tabURL:           ''});
}

function showUserSubmittedRecWindow_listener() {
    log(gvScriptName_CSMain + '.showUserSubmittedRecWindow_listener: Start','LSTNR');
    sendMessage('BG_main','pleaseShowUserSubmittedRecWindow');
}

function btsMissingRecs_listener(){

    log(gvScriptName_CSMain + '.btsMissingRecs_listener: Start','LSTNR');
    sendMessage('BG_main','pleaseAddFeedbackPage',{pageHTML:  document.all[0].outerHTML,
                                                   feedback:  'MISSING'});
    gvIframe.contentWindow.document.getElementById('btsMissingRecs_icon').style.color = 'black';
    gvIframe.contentWindow.document.getElementById("btsMissingRecs_a").removeEventListener("click", btsMissingRecs_listener);
    gvIframe.contentWindow.document.getElementById("btsFalsePositives_a").removeEventListener("click", btsFalsePositives_listener);
    gvIframe.contentWindow.document.getElementById("btsBangOn_a").removeEventListener("click", btsBangOn_listener);
}

function btsFalsePositives_listener(){

    log(gvScriptName_CSMain + '.btsFalsePositives_listener: Start','LSTNR');
    sendMessage('BG_main','pleaseAddFeedbackPage',{pageHTML:  document.all[0].outerHTML,
                                                   feedback:  'FALSE +VE'});
    gvIframe.contentWindow.document.getElementById('btsFalsePositives_icon').style.color = 'black';
    gvIframe.contentWindow.document.getElementById("btsMissingRecs_a").removeEventListener("click", btsMissingRecs_listener);
    gvIframe.contentWindow.document.getElementById("btsFalsePositives_a").removeEventListener("click", btsFalsePositives_listener);
    gvIframe.contentWindow.document.getElementById("btsBangOn_a").removeEventListener("click", btsBangOn_listener);
}

function btsBangOn_listener(){

    log(gvScriptName_CSMain + '.btsBangOn_listener: Start','LSTNR');
    sendMessage('BG_main','pleaseAddFeedbackPage',{pageHTML:  document.all[0].outerHTML,
                                                   feedback:  'BANG ON'});
    gvIframe.contentWindow.document.getElementById('btsBangOn_icon').style.color = 'black';
    gvIframe.contentWindow.document.getElementById("btsMissingRecs_a").removeEventListener("click", btsMissingRecs_listener);
    gvIframe.contentWindow.document.getElementById("btsFalsePositives_a").removeEventListener("click", btsFalsePositives_listener);
    gvIframe.contentWindow.document.getElementById("btsBangOn_a").removeEventListener("click", btsBangOn_listener);
}

function hideSidebar_untilRefresh_listener() {
    log(gvScriptName_CSMain + '.hideSidebar_untilRefresh_listener: Start','LSTNR');
    sendMessage('BG_main','pleaseHideSidebar_untilRefresh');
}

function hideSidebar_untilRestart_listener() {
    log(gvScriptName_CSMain + '.hideSidebar_untilRestart_listener: Start','LSTNR');
    sendMessage('BG_main','pleaseHideSidebar_untilRestart');
}

function showInfoWindow_listener() {
    log(gvScriptName_CSMain + '.showInfoWindow_listener: Start','LSTNR');
    sendMessage('BG_main','pleaseShowInfoWindow');
}

function showFAQWindow_listener() {
    log(gvScriptName_CSMain + '.showFAQWindow_listener: Start','LSTNR');
    sendMessage('BG_main','pleaseShowFAQWindow');
}

function showPrivacyWindow_listener() {
    log(gvScriptName_CSMain + '.showPrivacyWindow_listener: Start','LSTNR');
    sendMessage('BG_main','pleaseShowPrivacyWindow');
}
