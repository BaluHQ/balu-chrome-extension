

/********
 * Init *
 ********/

/*
 * Global Variables
 */

var gvScriptName_CSMain = 'CS_main';

var gvIframe;
var gvIsIframeReady = false;

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

    var pageText = document.body.textContent.toLowerCase();

    if(pageText.indexOf(trackedTab.pageConfirmationSearch.toLowerCase()) !== -1){
        sendMessage('BG_main','pleaseRegisterTrackedTabAsOK',{trackedTab: trackedTab});
    } else {
        sendMessage('BG_main','pleaseRegisterTrackedTabAsProblem',{trackedTab: trackedTab});
    }
}

/*****************************
 * Sidebar Display Functions *
 *****************************/

/*
 * Force a sidebar with the given content onto the web page
 */
function createSidebar(thenCreateSidebarContent,recommendationData, searchTerm, showJoyride) {

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

    createSidebarTemplate(thenCreateSidebarContent,recommendationData, searchTerm, showJoyride);

}

/*
 * @searchTerm: optional, passed through from manual search so we can re-populate the search field
 */
function createSidebarTemplate(thenCreateSidebarContent,recommendationData, searchTerm, showJoyride){

    log(gvScriptName_CSMain + '.createSidebarTemplate: Start','PROCS');

    docHeadHTML  = '';
    docHeadHTML += '<meta charset="utf-8" />';
    docHeadHTML += '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
    docHeadHTML += '<title>Balu</title>';

    docHeadHTML += '<link type="text/css" rel="stylesheet" href="' + chrome.extension.getURL('css/foundation.css') + '" />';
    docHeadHTML += '<link type="text/css" rel="stylesheet" href="' + chrome.extension.getURL('css/app.css') + '" />';
    docHeadHTML += '<link type="text/css" rel="stylesheet" href="' + chrome.extension.getURL('css/foundation-icons.css') + '" />';
    docHeadHTML += '<link type="text/css" rel="stylesheet" href="' + chrome.extension.getURL('css/app-icons.css') + '" />';

    // Attach to the iFrame document
    var docHead = gvIframe.contentWindow.document.head;
    docHead.class = 'no-js';
    docHead.lang = 'en';
    docHead.innerHTML = docHeadHTML;

    // Inject modernizr script into page
    var modernizrScript = document.createElement('script');
    modernizrScript.type="text/javascript";
    modernizrScript.src = chrome.extension.getURL('js/externalJS/vendor/modernizr.js');
    docHead.appendChild(modernizrScript);

    // Inject jquery script into page
    var jqueryScript = document.createElement('script');
    jqueryScript.type="text/javascript";
    jqueryScript.src = chrome.extension.getURL('js/externalJS/jquery-2.1.4.min.js');
    docHead.appendChild(jqueryScript);

    // Inject qtip CSS script
    var qtipCSS  = document.createElement('link');
    qtipCSS.type = "text/css";
    qtipCSS.rel  = "stylesheet";
    qtipCSS.href = chrome.extension.getURL('css/jquery.qtip.min.css');
    docHead.appendChild(qtipCSS);

    var topRow = '';

    topRow += '<form>';
    topRow += '<div class="row" style="margin-top: 2px;">';
    topRow += '  <div class="small-12 columns header">';
    topRow += '    <div class="row collapse">';
    topRow += '      <div id="joyrideStop4" class="small-6 columns">';
    if(searchTerm){
        topRow += '        <input type="text" id="fieldManualSearch" value="' + searchTerm + '" placeholder="Search" class="radius">';
    } else{
        topRow += '        <input type="text" id="fieldManualSearch" placeholder="Search" class="radius">';
    }
    topRow += '      </div>';
    topRow += '      <div class="small-2 column text-center">';
    topRow += '        <a id="manualSearchSubmit_icon" class="button postfix searchLinkIcon radius"><i class="fi-magnifying-glass searchIcon"></i></a>';
    topRow += '      </div>';
    topRow += '      <div class="small-2 column text-center">';
    topRow += '        <span title="Account settings">';
    topRow += '        <a id="showOptionsPageWindow_icon" class="button postfix accountLinkIcon"><i class="fi-torso accountIcon"></i></a>';
    topRow += '      </div>';
    topRow += '      <div class="small-2 columns text-center">';
    topRow += '        <span title="Add your favourite ethical retailers to Balu">';
    topRow += '          <a id="showUserSubmittedRecWindow_icon"><i class="fi-plus addNewIcon" id="joyrideStop5"></i></a>';
    topRow += '        </span>';
    topRow += '      </div>';
    topRow += '    </div>';
    topRow += '  </div>';
    topRow += '</div>';
    topRow += '</form>';

    var content = '<div id="contentDiv" class="contentDiv"></div>';

    var bottomRow = '';

    bottomRow += '<div class="row footer"><div class="small-12 columns">';
/*
    bottomRow += '<div class="row collapse">';
    bottomRow += '  <div class="small-12 columns bottomNavDiv">';
    bottomRow += '    <div class="row collapse">';
    bottomRow += '      <div class="small-2 columns text-center" style="background-color: white">';
    //bottomRow += '        <a id=""><i class="fi-home navIcon"></i></a>';
    bottomRow += '        <i class="fi-home navIcon"></i>';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-2 columns text-center">';
    //bottomRow += '        <a id=""><i class="fi-torsos-all navIcon"></i></a>';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-2 columns"></div>';
    bottomRow += '      <div class="small-2 columns"></div>';
    bottomRow += '      <div class="small-2 columns end"></div>';
    bottomRow += '    </div>';
    bottomRow += '  </div>';
    bottomRow += '</div>';
*/
    bottomRow += '<div class="row collapse footerDivs">';
    bottomRow += '  <div class="small-12 columns footerDivs">';
    bottomRow += '    <div class="row collapse">';
    bottomRow += '      <div class="small-3 columns text-left footerDivs">';
    bottomRow += '        <div class="row footerDivs">';
    bottomRow += '          <div class="small-3 columns text-left footerDivs"">';
    bottomRow += '            <a id="hideSidebarUntilRefresh_icon"><i id="joyrideStop3" class="fi-play minimiseBaluIcon" title="Hide Balu on this tab (until page refresh)"></i></a>';
    bottomRow += '          </div>';
    bottomRow += '          <div class="small-3 columns end text-left footerDivs">';
    bottomRow += '            <a id="hideSidebarUntilRestart_icon"><i class="fi-fast-forward minimiseBaluIcon" title="Hide Balu on all tabs (until browser restart)"></i></a>';
    bottomRow += '          </div>';
    bottomRow += '        </div>';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-4 columns text-center footerDivs">';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-5 columns text-right footerDivs">';
    bottomRow += '        <span class="footerText"><a id="showInfoWindow_link">Info</a>&nbsp;|&nbsp;<a id="showFAQWindow_link">FAQs</a>&nbsp;|&nbsp;<a id="showPrivacyWindow_link">Privacy</a></span>';
    bottomRow += '      </div>';
    bottomRow += '    </div>';
    bottomRow += '  </div>';
    bottomRow += '</div>';

    bottomRow += '</div>';

    docBody = gvIframe.contentWindow.document.createElement('body');
    docBody.className = 'iFrameBody';

    docBody.innerHTML  = topRow;
    docBody.innerHTML += content;
    docBody.innerHTML += bottomRow;

    // Joyride content
    if(showJoyride){
        var joyrideHTML = '';
        joyrideHTML += '<ol class="joyride-list" data-joyride>';
        joyrideHTML += '  <li data-id="joyrideStop1" data-text="Next (1 of 5)" data-prev-text="Prev" data-options="tip_location: left; nub_position: right;" class="custom">';
        joyrideHTML += '    <h4>How ethical?</h4>';
        joyrideHTML += '    <p>Hover over the <i class="fi-info joyrideIcon"></i> icon for information about the brand</p>';
        joyrideHTML += '  </li>';
        joyrideHTML += '  <li data-id="joyrideStop2" data-text="Next (2 of 5)" data-prev-text="Prev" data-options="tip_location: left; nub_position: right;" class="custom">';
        joyrideHTML += '    <h4>Block a brand</h4>';
        joyrideHTML += '    <p>Click the <i class="fi-x-circle joyrideIcon"></i> icon to stop seeing recommendations from this brand</p>';
        joyrideHTML += '  </li>';
        joyrideHTML += '  <li data-id="joyrideStop3" data-text="Next (3 of 5)" data-prev-text="Prev" data-options="tip_location: top; nub_position: left;" class="custom">';
        joyrideHTML += '    <h4>Sidebar getting in the way?</h4>';
        joyrideHTML += '    <p>Hide the side bar until refresh <i class="fi-play joyrideIcon"></i>, or until restart <i class="fi-fast-forward joyrideIcon"></i></p>';
        joyrideHTML += '  </li>';
        joyrideHTML += '  <li data-id="joyrideStop4" data-text="Next (4 of 5)" data-prev-text="Prev" data-options="tip_location: left; nub_position: right;" class="custom">';
        joyrideHTML += '    <h4>Search</h4>';
        joyrideHTML += '    <p>Search Balu from the sidebar or from the icon on the toolbar above</i></p>';
        joyrideHTML += '  </li>';
        joyrideHTML += '  <li data-id="joyrideStop5" data-button="End" data-prev-text="Prev" data-options="tip_location: left; nub_position: right;" class="custom">';
        joyrideHTML += '    <h4>Spread the word</h4>';
        joyrideHTML += '    <p>Not seeing your favourite ethical brands on Balu? Click the <i class="fi-plus joyrideIcon"></i> icon to get them added.</p>';
        joyrideHTML += '  </li>';
        joyrideHTML += '</ol>';
        docBody.innerHTML += joyrideHTML;
    }

    // And now attach it to the DOM

    gvIframe.contentWindow.document.body = docBody;

    // Rest of scripts need to go on after content has been added to DOM

    // All listeners for clickable items in the template. These listeners all call back to CS_main

    gvIframe.contentWindow.document.getElementById('fieldManualSearch').addEventListener('keydown',manualSearchSubmit_keydown_listener);
    gvIframe.contentWindow.document.getElementById('manualSearchSubmit_icon').addEventListener('click',manualSearchSubmit_listener);
    gvIframe.contentWindow.document.getElementById('showOptionsPageWindow_icon').addEventListener('click',showOptionsPageWindow_listener);
    gvIframe.contentWindow.document.getElementById('hideSidebarUntilRefresh_icon').addEventListener('click',hideSidebar_untilRefresh_listener);
    gvIframe.contentWindow.document.getElementById('hideSidebarUntilRestart_icon').addEventListener('click',hideSidebar_untilRestart_listener);
    gvIframe.contentWindow.document.getElementById('showUserSubmittedRecWindow_icon').addEventListener('click',showUserSubmittedRecWindow_listener);
    gvIframe.contentWindow.document.getElementById('showInfoWindow_link').addEventListener('click',showInfoWindow_listener);
    gvIframe.contentWindow.document.getElementById('showFAQWindow_link').addEventListener('click',showFAQWindow_listener);
    gvIframe.contentWindow.document.getElementById('showPrivacyWindow_link').addEventListener('click',showPrivacyWindow_listener);

    thenCreateSidebarContent(recommendationData, showJoyride, addFinalScriptsToDOM);
}

function addFinalScriptsToDOM(showJoyride) {

    log(gvScriptName_CSMain + '.addFinalScriptsToDOM: Start','PROCS');

    var docBody = gvIframe.contentWindow.document.body;

    // Append fastclick script to body
    var fastclickScript = document.createElement('script');
    fastclickScript.type="text/javascript";
    fastclickScript.src = chrome.extension.getURL('js/externalJS/vendor/fastclick.js');
    docBody.appendChild(fastclickScript);

    // Append foundation script to body
    var foundationScript = document.createElement('script');
    foundationScript.type="text/javascript";
    foundationScript.src = chrome.extension.getURL('js/externalJS/foundation.min.js');
    docBody.appendChild(foundationScript);

    // Inject qtip script into page
    var qtipScript = document.createElement('script');
    qtipScript.type="text/javascript";
    qtipScript.src = chrome.extension.getURL('js/externalJS/jquery.qtip.min.js');
    docBody.appendChild(qtipScript);

    // Inject iframe script into page
    var iframeScript = document.createElement('script');
    iframeScript.type="text/javascript";
    iframeScript.src = chrome.extension.getURL('js/IF_main.js');
    docBody.appendChild(iframeScript);

    // Tell the iframe script to activate the QTips (tooltips)
    waitForIframeThenExecute(0,function(){
        sendMessage('IF_main','pleaseActivateQTips',{});
    });

    // Tell the iframe script to activate the joyride
    if(showJoyride){
        waitForIframeThenExecute(0,function(){
            sendMessage('IF_main','pleaseActivateJoyride',{});
        });
    }
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
function createResultsSidebarContent(recommendations,showJoyride,callback) {

    log(gvScriptName_CSMain + '.createResultsSidebarContent: Start', 'PROCS');

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
            productGroupHead += '  <div class="row origProductHeaderStrip">';
            productGroupHead += '    <div class="small-8 columns origProductHeaderStripText">' + recommendations[i].productGroupName + '</div>';
            // We won't always have a whydowecare handle for manual search
            if(recommendations[i].whyDoWeCare !== '') {
                productGroupHead += '    <div class="small-4 columns text-right origProductHeaderStripWhyCare">';
                productGroupHead += '      <a class="whyCare_triggers" data-whydowecare="' + recommendations[i].whyDoWeCare + '">why care?</a>';
                productGroupHead += '    </div>';
            }
            productGroupHead += '  </div>';
            productGroupHead += '</div>';
        }

        // Before starting the recommendation block, let's build our twitter content for this recommendation
        var tweetContent =  'Just%20discovered%20' + recommendations[i].productName + '%20from%20';
        if(recommendations[i].twitterHandle){
            tweetContent += recommendations[i].twitterHandle;
        } else {
            tweetContent += recommendations[i].brandName;
        }
        tweetContent += '%20-%20found%20with%20%40BaluHQ. ' + recommendations[i].productURL + '%20%23ShopWithoutTheSideEffects';



        // build the rec itself into a variable that is then assigned to either the top set of responses or the bottom, the bottom
        // being the ones voted down by this user
        var recBlock = '';

        recBlock += '<div class="altProductsBlock">';
        recBlock += '  <div class="row collapse altProductBlock">';
        recBlock += '    <div class="small-5 columns">';
        recBlock += '      <div class="row text-center">';
        recBlock += '        <a class="productLinks" target="_blank" data-url="' + recommendations[i].productURL + '" data-recid="' + recommendations[i].recommendationId + '" data-productname="' + recommendations[i].productName + '" data-pageconfirmationsearch="' + recommendations[i].pageConfirmationSearch + '">';
        recBlock += '          <img class="altImage" src="' + recommendations[i].imageURL + '" />';
        recBlock += '        </a>';
        recBlock += '      </div>';
        recBlock += '    </div>';
        recBlock += '    <div class="small-7 columns altText">';
        recBlock += '      <div class="altText-top">';
        recBlock += '        <a class="productLinks altProductLink" data-url="' + recommendations[i].productURL + '" data-recid="' + recommendations[i].recommendationId + '" data-productname="' + recommendations[i].productName + '" data-pageconfirmationsearch="' + recommendations[i].pageConfirmationSearch + '">';
        recBlock += '          <b>' + recommendations[i].brandName + '</b>';
        recBlock += '        </a>';
        recBlock += '        <br />';
        recBlock += '        <a class="productLinks altProductLink" data-url="' + recommendations[i].productURL + '" data-recid="' + recommendations[i].recommendationId + '" data-productname="' + recommendations[i].productName + '" data-pageconfirmationsearch="' + recommendations[i].pageConfirmationSearch + '">';
        recBlock += '          ' + recommendations[i].productName;
        recBlock += '        </a>';
        recBlock += '      </div>';
        recBlock += '      <div style="position: absolute; top: 0px; right: 0px;">';
        recBlock += '        <div class="qtip_tooltips">';
        recBlock += '          <i class="fi-info brandSpielIcon" id="joyrideStop1"></i>';
        recBlock += '        </div>';
        recBlock += '        <div style="position: fixed" class="brandSpielHidden" data-qtiptitle="' + recommendations[i].brandName + '">' + recommendations[i].brandSpiel + '</div>';
        recBlock += '      </div>';
        recBlock += '    </div>';
        recBlock += '    <div class="altText-bottom">';

        // check whether this product has been voted up or down by the user (passed in to the rec array by getRecommendations) and
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

        recBlock += '      <a class="voteUp_icons" id="voteUp_icon_' + recommendations[i].recommendationId + '" data-recid="' + recommendations[i].recommendationId + '" title="Like this recommendation"><i class="fi-like ' + voteUpClass + '" id="voteUpRec_upArrow_' + recommendations[i].recommendationId + '"></i></a>';
        recBlock += '      <a class="voteDown_icons" id="voteDown_icon_' + recommendations[i].recommendationId + '" data-recid="' + recommendations[i].recommendationId + '" title="Dislike this recommendation"><i class="fi-dislike ' + voteDownClass + '" id="voteDownRec_downArrow_' + recommendations[i].recommendationId + '"></i></a>';
        recBlock += '      <a class="twitterShareIcons" data-tweetcontent="' + tweetContent + '" title="Share on Twitter"><i class="fi-social-twitter twitterIcon"></i></a>';
        recBlock += '      <a class="blockBrand_icons" id="blockBrand_icon_' + recommendations[i].recommendationId + '" data-recid="' + recommendations[i].recommendationId + '" data-brandname="' + recommendations[i].brandName + '" data-brandid="' + recommendations[i].brandId + '" data-productname="' + recommendations[i].productName + '" title="I don\'t want to see this brand again"><i id="joyrideStop2" class="fi-x-circle blockedBrand_notBlocked" id="blockBrand_' + recommendations[i].recommendationId + '"></i></a>';
        //recBlock += '      <a href="#" title="Share..."><i class="fi-share altProdIcon"></i></a>';
        recBlock += '    </div>';
        recBlock += '  </div>';

        if (!lastInProductGroup) {
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
            sidebarContentHTML += '  <hr class="hrClass"/>';
            //sidebarContentHTML += '  <label style="font-size: 11px">Know of other great retailers of <i>' + recommendations[i].productGroupName + '</i>?<br />Get them <a class="showUserSubmittedRecWindow_text">added to Balu</a> so everybody can find them! </label>';
            sidebarContentHTML += '</div>';

            // clear the product loop variables ready for the next iteration
            productGroupHead = '';
            notVotedDownRecs = '';
            votedDownRecs = '';
        }

        prevProductGroupId = thisProductGroupId;

    }

    gvIframe.contentWindow.document.getElementById("contentDiv").innerHTML = sidebarContentHTML;

    // Product link listeners
    var productLinks = gvIframe.contentWindow.document.getElementsByClassName("productLinks");
    for(var x = 0; x < productLinks.length; x++) {
        productLinks[x].addEventListener('click',showProductLinkWindow_listener);
    }

    // Why care listeners
    var whyCareLinks = gvIframe.contentWindow.document.getElementsByClassName("whyCare_triggers");
    for(var a = 0; a < whyCareLinks.length; a++) {
        whyCareLinks[a].addEventListener('click',showWhyDoWeCareWindow_listener);
    }


    // Vote up/down listeners
    var voteUpIcons = gvIframe.contentWindow.document.getElementsByClassName("voteUp_icons");
    var voteDownIcons = gvIframe.contentWindow.document.getElementsByClassName("voteDown_icons");
    for(var z = 0; z < voteUpIcons.length; z++) {
        voteUpIcons[z].addEventListener('click',voteUp_listener);
        voteDownIcons[z].addEventListener('click',voteDown_listener);
    }

    // Twitter share listeners
    var twitterShareIcons = gvIframe.contentWindow.document.getElementsByClassName("twitterShareIcons");
    for(var v = 0; v < twitterShareIcons.length; v++) {
        twitterShareIcons[v].addEventListener('click',twitterShare_listener);
    }

    // Block brand listeners
    var blockBrandIcons = gvIframe.contentWindow.document.getElementsByClassName("blockBrand_icons");
    for(var u = 0; u < blockBrandIcons.length; u++) {
        blockBrandIcons[u].addEventListener('click',blockBrand_listener);
    }

    // User submitted rec link listeners
    var userSubRecLinks = gvIframe.contentWindow.document.getElementsByClassName("showUserSubmittedRecWindow_text");
    for(var w = 0; w < userSubRecLinks.length; w++) {
        userSubRecLinks[w].addEventListener('click',showUserSubmittedRecWindow_listener);
    }

    callback(showJoyride); // will add the final scripts to the bottom of the body.

}

/*
 * to do: I don't really want to wait here, I just need to "queue" so listeners are set up on home page, but sometimes that doesnt work :s
 */
function waitForIframeThenExecute(counter,callback){

   if(gvIsIframeReady || counter > 1000){
       log(gvScriptName_CSMain + '.waitForScriptsThenExecute: Ending wait, counter === ' + counter,'PROCS');
       callback();
   } else {
       counter++;
       window.setTimeout(function(){return waitForIframeThenExecute(counter,callback);},10);
   }
}

/*
 * Create the content for the sign in / sign up sidebar
 */
function createLogInSidebarContent() {

    log(gvScriptName_CSMain + '.createLogInSidebarContent: Start','PROCS');

    var userForm = '';

    // Log in form

    userForm += '<div class="row" style="margin-left: 10px">';
    userForm += '  <div class="small-8 columns end">';
    userForm += '    <h4>Sign In to Balu</h4>';
    userForm += '  </div>';
    userForm += '</div>';
    userForm += '<form id="logInUserForm">';
    userForm += '  <div class="row" style="margin-left: 10px">';
    userForm += '    <div class="small-4 columns">';
    userForm += '      <label>Email';
    userForm += '        <input type="text" id="fieldLogInEmail" placeholder="Email" required="yes">';
    userForm += '      </label>';
    userForm += '    </div>';
    userForm += '    <div class="small-4 columns end" style="margin-left: 10px">';
    userForm += '      <label>Password';
    userForm += '        <input type="password" id="fieldLogInPassword" placeholder="Password" required="yes">';
    userForm += '      </label>';
    userForm += '    </div>';
    userForm += '  </div>';
    userForm += '  <div class="row" style="margin-left: 10px">';
    userForm += '    <div class="small-12 columns end">';
    userForm += '      <input id="logInUserButton" class="button radius" type="submit" value="Log In">';
    userForm += '      <input id="passwordResetButton" class="button radius" type="submit" value="Reset password">';
    userForm += '    </div>';
    userForm += '  </div>';
    userForm += '</form>';

    // Sign up form

    userForm += '<br />';
    userForm += '<div class="row" style="margin-left: 10px">';
    userForm += '  <div class="small-8 columns end">';
    userForm += '    <h4>Create a New Account</h4>';
    userForm += '  </div>';
    userForm += '</div>';
    userForm += '<form id="signUserUpForm">';
    userForm += '  <div class="row" style="margin-left: 10px">';
    userForm += '    <div class="small-4 columns">';
    userForm += '      <label>Email';
    userForm += '        <input type="text" id="fieldSignUpUsername" placeholder="Email" required="yes">';
    userForm += '      </label>';
    userForm += '    </div>';
    userForm += '    <div class="small-4 columns end">';
    userForm += '      <label>Password';
    userForm += '        <input type="password" id="fieldSignUpPassword" placeholder="Password" required="yes">';
    userForm += '      </label>';
    userForm += '    </div>';
    userForm += '  </div>';
    userForm += '  <div class="row" style="margin-left: 10px">';
    userForm += '    <div class="small-4 columns end">';
    userForm += '      <input id="signUserUpButton" class="button radius" type="submit" value="Sign Up">';
    userForm += '    </div>';
    userForm += '  </div>';
    userForm += '</form>';

    gvIframe.contentWindow.document.getElementById("contentDiv").innerHTML = userForm;

    gvIframe.contentWindow.document.getElementById('logInUserButton').addEventListener('click',logUserIn_listener);
    gvIframe.contentWindow.document.getElementById('passwordResetButton').addEventListener('click',passwordReset_listener);

    gvIframe.contentWindow.document.getElementById('signUserUpButton').addEventListener('click',signUserUp_listener);
}

function hideSidebar() {
    log(gvScriptName_CSMain + '.hideSidebar: Start','PROCS');

    // Move the user's webpage back to equal width on screen
    var html = document.getElementsByTagName('html')[0];
    html.style.marginRight = '0px';

    // remove the iframe
    if(window.frames.iFrameBaluSidebar) {
        var iframe = window.frames.iFrameBaluSidebar;
        iframe.parentNode.removeChild(iframe);
    }
}

/******************************
 * Sidebar Listener Functions *
 ******************************/

// Main sidebar listeners

function manualSearchSubmit_keydown_listener(event) {if (event.keyCode == 13) {manualSearchSubmit_listener();}}
function manualSearchSubmit_listener() {
    log(gvScriptName_CSMain + '.manualSearchSubmit_listener: Start','PROCS');
    // we're about to refresh the iframe, so set the iFrame ready variable back to false
    gvIsIframeReady = false;
    var searchTerm = gvIframe.contentWindow.document.getElementById('fieldManualSearch').value;
    sendMessage('BG_main','pleaseRunManualSearch',{searchTerm: searchTerm});
}

function showOptionsPageWindow_listener() {
    log(gvScriptName_CSMain + '.showOptionsPageWindow_listener: Start','PROCS');
    sendMessage('BG_main','pleaseShowOptionsPageWindow');
}

function showProductLinkWindow_listener() {
    log(gvScriptName_CSMain + '.productLink_listener: Start','PROCS');
    var productURL = this.getAttribute('data-url');
    var recommendationId = this.getAttribute('data-recid');
    var productName = this.getAttribute('data-productname');
    var pageConfirmationSearch = this.getAttribute('data-pageconfirmationsearch');

    sendMessage('BG_main','pleaseShowProductLinkWindow',{productURL:             productURL,
                                                         recommendationId:       recommendationId,
                                                         pageConfirmationSearch: pageConfirmationSearch,
                                                         recProductName:         productName});
}

function showWhyDoWeCareWindow_listener() {
    log(gvScriptName_CSMain + '.showWhyDoWeCareWindow_listener: Start','PROCS');
    var whyDoWeCare = this.getAttribute('data-whydowecare');
    sendMessage('BG_main','pleaseShowWhyDoWeCareWindow',{whyDoWeCare: whyDoWeCare});
}

function voteUp_listener() {

    log(gvScriptName_CSMain + '.voteUp_listener: Start','PROCS');

    var recommendationId = this.getAttribute('data-recid');

    // Set the arrow class correctly so the vote is reflected immediatly to the user
    var voteDownArrow_container = gvIframe.contentWindow.document.getElementById('voteDown_icon_' + recommendationId);
    var voteDownArrow = voteDownArrow_container.childNodes[0];
    var voteUpArrow_container = gvIframe.contentWindow.document.getElementById('voteUp_icon_' + recommendationId);
    var voteUpArrow = voteUpArrow_container.childNodes[0];
    if(voteUpArrow.className === 'fi-like voteClass_voted') {
        voteDownArrow.className = 'fi-dislike voteClass_nothing';
        voteUpArrow.className = 'fi-like voteClass_nothing';
    } else {
        voteDownArrow.className = 'fi-dislike voteClass_notVoted';
        voteUpArrow.className = 'fi-like voteClass_voted';
    }

    // Message extension to update DB
    sendMessage('BG_main','pleaseVoteProductUp',{recommendationId: recommendationId});
}

function voteDown_listener() {

    log(gvScriptName_CSMain + '.voteDown_listener: Start','PROCS');

    var recommendationId = this.getAttribute('data-recid');

    // Set the arrow class correctly so the vote is reflected immediatly to the user
    var voteDownArrow_container = gvIframe.contentWindow.document.getElementById('voteDown_icon_' + recommendationId);
    var voteDownArrow = voteDownArrow_container.childNodes[0];
    var voteUpArrow_container = gvIframe.contentWindow.document.getElementById('voteUp_icon_' + recommendationId);
    var voteUpArrow = voteUpArrow_container.childNodes[0];
    if(voteDownArrow.className === 'fi-dislike voteClass_voted') {
        voteDownArrow.className = 'fi-dislike voteClass_nothing';
        voteUpArrow.className = 'fi-like voteClass_nothing';
    } else {
        voteDownArrow.className = 'fi-dislike voteClass_voted';
        voteUpArrow.className = 'fi-like voteClass_notVoted';
    }

    // Message extension to update DB
    sendMessage('BG_main','pleaseVoteProductDown',{recommendationId: recommendationId});

}

function twitterShare_listener() {

    log(gvScriptName_CSMain + '.twitterShare_listener: Start','PROCS');

    var tweetContent = this.getAttribute('data-tweetcontent');

    // Message extension to open tweet window
    sendMessage('BG_main','pleaseShowTweetWindow',{tweetContent: tweetContent});
}

function blockBrand_listener() {

    log(gvScriptName_CSMain + '.blockBrand_listener: Start','PROCS');

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
    log(gvScriptName_CSMain + '.showUserSubmittedRecWindow_listener: Start','PROCS');
    sendMessage('BG_main','pleaseShowUserSubmittedRecWindow');
}

function hideSidebar_untilRefresh_listener() {
    log(gvScriptName_CSMain + '.hideSidebar_untilRefresh_listener: Start','PROCS');
    sendMessage('BG_main','pleaseHideSidebar_untilRefresh');
}

function hideSidebar_untilRestart_listener() {
    log(gvScriptName_CSMain + '.hideSidebar_untilRestart_listener: Start','PROCS');
    sendMessage('BG_main','pleaseHideSidebar_untilRestart');
}

function showInfoWindow_listener() {
    log(gvScriptName_CSMain + '.showInfoWindow_listener: Start','PROCS');
    sendMessage('BG_main','pleaseShowInfoWindow');
}

function showFAQWindow_listener() {
    log(gvScriptName_CSMain + '.showFAQWindow_listener: Start','PROCS');
    sendMessage('BG_main','pleaseShowFAQWindow');
}

function showPrivacyWindow_listener() {
    log(gvScriptName_CSMain + '.showPrivacyWindow_listener: Start','PROCS');
    sendMessage('BG_main','pleaseShowPrivacyWindow');
}

// Log in sidebar

function logUserIn_listener() {
    log(gvScriptName_CSMain + '.logUserIn_listener: Start','PROCS');
    var username    = gvIframe.contentWindow.document.getElementById('fieldLogInEmail').value;
    var password = gvIframe.contentWindow.document.getElementById('fieldLogInPassword').value;
    sendMessage('BG_main','pleaseLogUserIn',{username: username,password: password});
}

function passwordReset_listener() {
    log(gvScriptName_CSMain + '.passwordReset_listener: Start','PROCS');
    sendMessage('BG_main','pleaseShowOptionsPageWindow');
}

function signUserUp_listener() {
    log(gvScriptName_CSMain + '.signUserUp_listener: Start','PROCS');
    var username    = gvIframe.contentWindow.document.getElementById('fieldSignUpUsername').value;
    var password = gvIframe.contentWindow.document.getElementById('fieldSignUpPassword').value;
    sendMessage('BG_main','pleaseSignUserUp',{username: username, password: password});
}
