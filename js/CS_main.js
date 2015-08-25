

/********
 * Init *
 ********/

/*
 * Global Variables
 */

var gvScriptName_CSMain = 'CS_main';

var gvThisTab;
var gvIframe;

var gvRecommendationCount = '';

/*
 * State is maintained by the background page by keeping an array (gvTabs) of all
 * tabs. So as soon as the content_script is injected into a new tab (and
 * hence this initialise() function fires) tell the background page so it
 * can add this tab to the array.
 *
 * The background script will return this tab's gvTabs record so the tab has easy
 * access to its own state.
 *
 * We wait for that gvTab record to return, then kick off our first page search
 */
(function initialise(){

    log(gvScriptName_CSMain + '.initialise: Start','INITS');

    // Listen for Chrome runtime messages from background script
    chrome.runtime.onMessage.addListener(chromeMessageListener);

    // Tell the background script to initialise this tab, and
    // save the corresponding tab record into gvThisTab. Then kick off our page search (or log in, etc).
    // Also, track the tab (so if it's one we've created from the extension we can check it's found the product)
    sendMessage('pleaseInitialiseThisTab',null,function (tab){
        gvThisTab = tab;sendMessage('pleaseRefreshTab');

        // Check whether the tab is being tracked and, if so, search it. The trackedTab is a record created by BG_main
        sendMessage('pleaseTrackThisTab',null,searchTrackedTabForRecommendation);
    });

})();

function searchTrackedTabForRecommendation(trackedTab){

    log(gvScriptName_CSMain + '.searchTrackedTabForRecommendation: start','PROCS');

    var pageText = document.body.textContent.toLowerCase();

    if(pageText.indexOf(trackedTab.pageConfirmationSearch.toLowerCase()) !== -1){
        sendMessage('pleaseRegisterTrackedTabAsOK',{trackedTab: trackedTab});
    } else {
        sendMessage('pleaseRegisterTrackedTabAsProblem',{trackedTab: trackedTab});
    }
}

/*****************************
 * Sidebar Display Functions *
 *****************************/

/*
 * Force a sidebar with the given content onto the web page
 */
function createSidebar(thenCreateSidebarContent,recommendationData, productGroupHeaders, searchTerm) {

    log(gvScriptName_CSMain + '.createSidebar: Start','PROCS');

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
        log(gvScriptName_CSMain + '.createSidebar: No HTML element found on page','ERROR');
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

    // Create iFrame - if it's not already there. If it is, retrieve it

    gvIframe = window.frames.iFrameBaluSidebar;

    if(!gvIframe) {
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
        gvIframe.contentDocument.body.height = '80%';

    }

    createSidebarTemplate(thenCreateSidebarContent,recommendationData, productGroupHeaders, searchTerm);
}

/*
 * @searchTerm: optional, passed through from manual search so we can re-populate the search field
 */
function createSidebarTemplate(thenCreateSidebarContent,recommendationData, productGroupHeaders, searchTerm){

    log(gvScriptName_CSMain + '.createSidebarTemplate: Start','PROCS');

    var foundationCSSUrl = chrome.extension.getURL('css/foundation.css');
    var appCSSUrl = chrome.extension.getURL('css/app.css');
    var foundationIconsCSSUrl = chrome.extension.getURL('css/foundation-icons.css');
    var appIconsCSSUrl = chrome.extension.getURL('css/app-icons.css');
    var openTipCSSUrl = chrome.extension.getURL('css/opentip.css');

    var openTipJS = chrome.extension.getURL('js/externalJS/opentip-native.js');

    var docHead = gvIframe.contentWindow.document.head;

    docHead.class = 'no-js';
    docHead.lang = 'en';
    docHead.innerHTML = '<meta charset="utf-8" />';
    docHead.innerHTML += '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
    docHead.innerHTML += '<title>Balu</title>';
    docHead.innerHTML += '<link rel="stylesheet" href="' + foundationCSSUrl + '" />';
    docHead.innerHTML += '<link rel="stylesheet" href="' + appCSSUrl + '">';
    docHead.innerHTML += '<link rel="stylesheet" href="' + foundationIconsCSSUrl + '">';
    docHead.innerHTML += '<link rel="stylesheet" href="' + appIconsCSSUrl + '">';
    docHead.innerHTML += '<link rel="stylesheet" href="' + openTipCSSUrl + '">';

    var topRow = '';

    topRow += '<form>';
    topRow += '<div class="row" style="margin-top: 2px;">';
    topRow += '  <div class="small-12 columns header">';
    topRow += '    <div class="row collapse">';
    topRow += '      <div class="small-8 columns">';
    if(searchTerm){
        topRow += '        <input type="text" id="fieldManualSearch" value="' + searchTerm + '" placeholder="Search" class="radius">';
    } else{
        topRow += '        <input type="text" id="fieldManualSearch" placeholder="Search" onkeydown="if (event.keyCode == 13) document.getElementById(\'manualSearchSubmit_icon\').click()" class="radius">';
    }
    topRow += '      </div>';
    topRow += '      <div class="small-2 column text-center">';
    topRow += '        <a id="manualSearchSubmit_icon" class="button postfix searchLinkIcon radius"><i class="fi-magnifying-glass searchIcon"></i></a>';
    topRow += '      </div>';
    topRow += '      <div class="small-2 column text-center">';
    topRow += '        <a id="showOptionsPageWindow_icon" class="button postfix accountLinkIcon"><i class="fi-torso accountIcon"></i></a>';
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
    //bottomRow += '        <a id=""><i class="fi-home navIcon"></i></a>';
    bottomRow += '        <i class="fi-home navIcon"></i>';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-2 columns text-center">';
    //bottomRow += '        <a id=""><i class="fi-torsos-all navIcon"></i></a>';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-2 columns"></div>';
    bottomRow += '      <div class="small-2 columns"></div>';
    bottomRow += '      <div class="small-2 columns"></div>';
    bottomRow += '      <div class="small-2 columns text-center">';
    bottomRow += '        <span data-tooltip aria-haspopup="true" class="has-tip" title="Add your favourite ethical retailers to Balu">';
    bottomRow += '          <a id="showUserSubmittedRecWindow_icon"><i class="fi-plus addNewIcon"></i></a>';
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
    bottomRow += '            <a id="hideSidebarUntilRefresh_icon"><i class="fi-play minimiseBaluIcon" title="Hide Balu on this tab (until page refresh)"></i></a>';
    bottomRow += '          </div>';
    bottomRow += '          <div class="small-3 columns end text-left">';
    bottomRow += '            <a id="hideSidebarUntilRestart_icon"><i class="fi-fast-forward minimiseBaluIcon" title="Hide Balu on all tabs (until browser restart)"></i></a>';
    bottomRow += '          </div>';
    bottomRow += '        </div>';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-6 columns text-center">';
    bottomRow += '      </div>';
    bottomRow += '      <div class="small-3 columns text-right">';
    bottomRow += '        <span class="footerText"><a id="showFAQWindow_link">FAQs</a>&nbsp;|&nbsp;<a id="showPrivacyWindow_link">PRIVACY</a></span>';
    bottomRow += '      </div>';
    bottomRow += '    </div>';
    bottomRow += '  </div>';
    bottomRow += '</div></div>';

    body = gvIframe.contentWindow.document.createElement('body');

    body.innerHTML  = topRow;
    body.innerHTML += content;
    body.innerHTML += bottomRow;

    //body.innerHTML += '<script src="' + jqueryJS + '"></script>';
    //body.innerHTML += '<script src="' + foundationMinJS + '"></script>';
    body.innerHTML += '<script src="' + openTipJS + '"></script>';

    //body.innerHTML += '<script>$(document).foundation();</script>';

    gvIframe.contentWindow.document.body = body;
    gvIframe.contentWindow.document.body.className = 'iFrameBody';
    gvIframe.contentWindow.document.body.paddingBottom = '10px !important';

    // All listeners for clickable items in the template. These listeners all call back to CS_main

    gvIframe.contentWindow.document.getElementById('fieldManualSearch').addEventListener('keydown',manualSearchSubmit_keydown_listener);
    gvIframe.contentWindow.document.getElementById('manualSearchSubmit_icon').addEventListener('click',manualSearchSubmit_listener);
    gvIframe.contentWindow.document.getElementById('showOptionsPageWindow_icon').addEventListener('click',showOptionsPageWindow_listener);
    gvIframe.contentWindow.document.getElementById('hideSidebarUntilRefresh_icon').addEventListener('click',hideSidebar_untilRefresh_listener);
    gvIframe.contentWindow.document.getElementById('hideSidebarUntilRestart_icon').addEventListener('click',hideSidebar_untilRestart_listener);
    gvIframe.contentWindow.document.getElementById('showUserSubmittedRecWindow_icon').addEventListener('click',showUserSubmittedRecWindow_listener);
    gvIframe.contentWindow.document.getElementById('showFAQWindow_link').addEventListener('click',showFAQWindow_listener);
    gvIframe.contentWindow.document.getElementById('showPrivacyWindow_link').addEventListener('click',showPrivacyWindow_listener);

    thenCreateSidebarContent(recommendationData, productGroupHeaders);
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
 *
 * @productGroupHeaders is an associative array of productHeader records {productName, whyDoWeCare}
 * The associative array is indexed by productGroup.productGroupName.
 * It is conveninently constructed during the search to avoid having to re-loop through the searchResults later just to
 * populate the SearchProduct names in the ProductGroup headers. It is also optional, used only for the sidebar results; the
 * manual search won't populate or pass it
 */
function createResultsSidebarContent(recommendations, productGroupHeaders) {

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
                productGroupHead += '      <span data-tooltip aria-haspopup="true" class="has-tip whyDoWeCare" title="Learn more about the harmful side effects of the ' + productGroupHeaders[recommendations[i].productGroupName][lastJ].whyDoWeCare + ' industry">';
                productGroupHead += '        <a class="whyDoWeCare_link" data-urlname="' + productGroupHeaders[recommendations[i].productGroupName][lastJ].whyDoWeCare + '" id="showWhyDoWeCareWindow_link_' + productGroupHeaders[recommendations[i].productGroupName][lastJ].whyDoWeCare + '">why care?&nbsp;</a>';
                productGroupHead += '      </span>';
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
        recBlock += '        <a class="productLinks" data-url="' + recommendations[i].productURL + '" data-recid="' + recommendations[i].recommendationId + '" data-pageconfirmationsearch="' + recommendations[i].pageConfirmationSearch + '">';
        recBlock += '          <img class="altImage" src="' + recommendations[i].imageURL + '" />';
        recBlock += '        </a>';
        recBlock += '      </div>';
        recBlock += '    </div>';
        recBlock += '    <div class="small-7 columns altText">';
        recBlock += '      <div class="altText-top">';
        recBlock += '        <a class="productLinks altProductLink" data-url="' + recommendations[i].productURL + '" data-recid="' + recommendations[i].recommendationId + '" data-pageconfirmationsearch="' + recommendations[i].pageConfirmationSearch + '">';
        recBlock += '          <b>' + recommendations[i].brand + '</b>';
        recBlock += '        </a>';
        recBlock += '        <br />';
        recBlock += '        <a class="productLinks altProductLink" data-url="' + recommendations[i].productURL + '" data-recid="' + recommendations[i].recommendationId + '" data-pageconfirmationsearch="' + recommendations[i].pageConfirmationSearch + '">';
        recBlock += '          ' + recommendations[i].productName;
        recBlock += '        </a>';
        recBlock += '        <br />';
        recBlock += '        <span data-tooltip aria-haspopup="true" class="has-tip" style="font-size: 11px" title="' + recommendations[i].brand + '\r\r' + recommendations[i].brandSpiel + '">why care?<span>';
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

        recBlock += '      <a class="voteUp_icons" id="voteUp_icon_' + recommendations[i].recommendationId + '" data-recid="' + recommendations[i].recommendationId + '" title="Vote up this recommendation"><i class="fi-arrow-up ' + voteUpClass + '" id="voteUpRec_upArrow_' + recommendations[i].recommendationId + '"></i></a>';
        recBlock += '      <a class="voteDown_icons" id="voteDown_icon_' + recommendations[i].recommendationId + '" data-recid="' + recommendations[i].recommendationId + '" title="Vote down this recommendation"><i class="fi-arrow-down ' + voteDownClass + '" id="voteDownRec_downArrow_' + recommendations[i].recommendationId + '"></i></a>';
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
            sidebarContentHTML += '  <label style="font-size: 11px">Know of other great retailers of <i>' + recommendations[i].productGroupName + '</i>?<br ?>Get them <a href="' + chrome.extension.getURL('userSubmittedRec.html') + '">added to Balu</a> so everybody can find them! </label>';
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
    // Why do we care listeners
    var whyDoWeCareLinks = gvIframe.contentWindow.document.getElementsByClassName("whyDoWeCare_link");
    for(var y = 0; y < whyDoWeCareLinks.length; y++) {
        whyDoWeCareLinks[y].addEventListener('click',showWhyDoWeCareWindow_listener);
    }

    // Vote up/down listeners
    var voteUpIcons = gvIframe.contentWindow.document.getElementsByClassName("voteUp_icons");
    var voteDownIcons = gvIframe.contentWindow.document.getElementsByClassName("voteDown_icons");
    for(var z = 0; z < voteUpIcons.length; z++) {
        voteUpIcons[z].addEventListener('click',voteUp_listener);
        voteDownIcons[z].addEventListener('click',voteDown_listener);
    }

}

/*
 * Create the content for the sign in / sign up sidebar
 */
function createLogInSidebarContent() {

    log(gvScriptName_CSMain + '.createLogInSidebarContent: Start','PROCS');

    var userForm = '';

    // Log in form

    userForm += '<div class="row">';
    userForm += '  <div class="small-8 columns end">';
    userForm += '    <h4>Sign In to Balu</h4>';
    userForm += '  </div>';
    userForm += '</div>';
    userForm += '<form id="logInUserForm">';
    userForm += '  <div class="row">';
    userForm += '    <div class="small-4 columns">';
    userForm += '      <label>Email';
    userForm += '        <input type="text" id="fieldLogInEmail" placeholder="Email" required="yes">';
    userForm += '      </label>';
    userForm += '    </div>';
    userForm += '    <div class="small-4 columns end">';
    userForm += '      <label>Password';
    userForm += '        <input type="password" id="fieldLogInPassword" placeholder="Password" required="yes">';
    userForm += '      </label>';
    userForm += '    </div>';
    userForm += '  </div>';
    userForm += '  <div class="row">';
    userForm += '    <div class="small-4 columns end">';
    userForm += '      <input id="logInUserButton" class="button radius" type="submit" value="Log In">';
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
    userForm += '<form id="signUserUpForm">';
    userForm += '  <div class="row">';
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
    userForm += '  <div class="row">';
    userForm += '    <div class="small-4 columns end">';
    userForm += '      <input id="signUserUpButton" class="button radius" type="submit" value="Log In">';
    userForm += '    </div>';
    userForm += '  </div>';
    userForm += '</form>';

    gvIframe.contentWindow.document.getElementById("contentDiv").innerHTML = userForm;

    gvIframe.contentWindow.document.getElementById('logInUserButton').addEventListener('click',logUserIn_listener);
    gvIframe.contentWindow.document.getElementById('signUserUpButton').addEventListener('click',signUserUp_listener);
}

function hideSidebar() {
    log(gvScriptName_CSMain + '.hideSidebar: Start','PROCS');
     // Move the user's webpage back to equal width on screen
     var html = document.getElementsByTagName('html')[0];
     html.style.position = 'absolute';
     html.style.right = '0px';
     html.style.left = '0px';

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
    var searchTerm = gvIframe.contentWindow.document.getElementById('fieldManualSearch').value;
    sendMessage('pleaseRunManualSearch',{searchTerm: searchTerm});
}

function showOptionsPageWindow_listener() {
    log(gvScriptName_CSMain + '.showOptionsPageWindow_listener: Start','PROCS');
    sendMessage('pleaseShowOptionsPageWindow');
}

function showWhyDoWeCareWindow_listener() {
    log(gvScriptName_CSMain + '.showWhyDoWeCareWindow_listener: Start','PROCS');
    var whyDoWeCareURLName = this.getAttribute('data-urlname');
    sendMessage('pleaseShowWhyDoWeCareWindow',{whyDoWeCareURLName: whyDoWeCareURLName});

}

function showProductLinkWindow_listener() {
    log(gvScriptName_CSMain + '.productLink_listener: Start','PROCS');
    var productURL = this.getAttribute('data-url');
    var recommendationId = this.getAttribute('data-recid');
    var pageConfirmationSearch = this.getAttribute('data-pageconfirmationsearch');
    sendMessage('pleaseShowProductLinkWindow',{productURL:             productURL,
                                               recommendationId:       recommendationId,
                                               pageConfirmationSearch: pageConfirmationSearch});
}

function voteUp_listener() {

    log(gvScriptName_CSMain + '.voteUp_listener: Start','PROCS');

    var recommendationId = this.getAttribute('data-recid');

    // Set the arrow class correctly so the vote is reflected immediatly to the user
    var voteDownArrow = gvIframe.contentWindow.document.getElementById('voteDownRec_downArrow_' + recommendationId);
    var voteUpArrow = gvIframe.contentWindow.document.getElementById('voteUpRec_upArrow_' + recommendationId);
    if(voteUpArrow.className === 'fi-arrow-up voteClass_voted') {
        voteDownArrow.className = 'fi-arrow-down voteClass_nothing';
        voteUpArrow.className = 'fi-arrow-up voteClass_nothing';
    } else {
        voteDownArrow.className = 'fi-arrow-down voteClass_notVoted';
        voteUpArrow.className = 'fi-arrow-up voteClass_voted';
    }

    // Message extension to update DB
    sendMessage('pleaseVoteProductUp',{recommendationId: recommendationId});
}

function voteDown_listener() {

    log(gvScriptName_CSMain + '.voteDown_listener: Start','PROCS');

    var recommendationId = this.getAttribute('data-recid');

    // Set the arrow class correctly so the vote is reflected immediatly to the user
    var voteDownArrow = gvIframe.contentWindow.document.getElementById('voteDownRec_downArrow_' + recommendationId);
    var voteUpArrow = gvIframe.contentWindow.document.getElementById('voteUpRec_upArrow_' + recommendationId);
    if(voteDownArrow.className === 'fi-arrow-down voteClass_voted') {
        voteDownArrow.className = 'fi-arrow-down voteClass_nothing';
        voteUpArrow.className = 'fi-arrow-up voteClass_nothing';
    } else {
        voteDownArrow.className = 'fi-arrow-down voteClass_voted';
        voteUpArrow.className = 'fi-arrow-up voteClass_notVoted';
    }

    // Message extension to update DB
    sendMessage('pleaseVoteProductDown',{recommendationId: recommendationId});

}

function showUserSubmittedRecWindow_listener() {
    log(gvScriptName_CSMain + '.showUserSubmittedRecWindow_listener: Start','PROCS');
    sendMessage('pleaseShowUserSubmittedRecWindow');
}

function hideSidebar_untilRefresh_listener() {
    log(gvScriptName_CSMain + '.hideSidebar_untilRefresh_listener: Start','PROCS');
    gvThisTab.isBaluShowOrHide_untilRefresh = 'HIDE';
    sendMessage('pleaseHideSidebar_untilRefresh');
}

function hideSidebar_untilRestart_listener() {
    log(gvScriptName_CSMain + '.hideSidebar_untilRestart_listener: Start','PROCS');
    sendMessage('pleaseHideSidebar_untilRestart');
}

function showFAQWindow_listener() {
    log(gvScriptName_CSMain + '.showFAQWindow_listener: Start','PROCS');
    sendMessage('pleaseShowFAQWindow');
}

function showPrivacyWindow_listener() {
    log(gvScriptName_CSMain + '.showPrivacyWindow_listener: Start','PROCS');
    sendMessage('pleaseShowPrivacyWindow');
}

// Log in sidebar

function logUserIn_listener() {
    log(gvScriptName_CSMain + '.logUserIn_listener: Start','PROCS');
    var username    = gvIframe.contentWindow.document.getElementById('fieldLogInEmail').value;
    var password = gvIframe.contentWindow.document.getElementById('fieldLogInPassword').value;
    sendMessage('pleaseLogUserIn',{username: username,password: password});
}

function signUserUp_listener() {
    log(gvScriptName_CSMain + '.signUserUp_listener: Start','PROCS');
    var username    = gvIframe.contentWindow.document.getElementById('fieldSignUpUsername').value;
    var password = gvIframe.contentWindow.document.getElementById('fieldSignUpPassword').value;
    sendMessage('pleaseSignUserUp',{username: username, password: password});
}
