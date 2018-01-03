/********
 * Init *
 ********/

/*
 * Global variables
 */

var gvScriptName_CSSearch = 'CS_search';
var gvIsTestExecution = false;
/*
 *
 */
(function initialise(){
    log(gvScriptName_CSSearch + '.initialise: Start','INITS');
})();

/********************
 * Search Functions *
 ********************/

/*
 * When all searching is finished, this is the function that's called
 * to pass the results back to the extension
 */
function processSearchResults(pvProductSearchResults, pvWebsiteSearchResults, foundSomethingInProductSearch){

    var lvFunctionName = 'processSearchResults';
    log(gvScriptName_CSSearch + '.' + lvFunctionName + ': Start','PROCS');

    // Do some INFO logging for the search results that we're returning to the extension
    if(pvProductSearchResults !== null) {
        log(gvScriptName_CSSearch + '.' + lvFunctionName + ': pvProductSearchResults.length == ' + pvProductSearchResults.length,' INFO');
    } else{
        log(gvScriptName_CSSearch + '.' + lvFunctionName + ': pvProductSearchResults is null',' INFO');
    }
    if(pvWebsiteSearchResults !== null) {
        log(gvScriptName_CSSearch + '.' + lvFunctionName + ': pvWebsiteSearchResults.length == ' + pvWebsiteSearchResults.length,' INFO');
    } else{
        log(gvScriptName_CSSearch + '.' + lvFunctionName + ': pvWebsiteSearchResults is null)',' INFO');
    }

    if (foundSomethingInProductSearch || pvWebsiteSearchResults.length > 0) {
        if(!gvIsTestExecution) {
            sendMessage('BG_main','pleaseRetrieveRecommendations',{productSearchResults: pvProductSearchResults, websiteSearchResults: pvWebsiteSearchResults});
        }
        else {
            gvBTSconfig.callback(pvProductSearchResults,gvBTSconfig); // to do: plug in website search to BTS
        }
    } else {
        if(gvIsTestExecution) {
            gvBTSconfig.callback(pvProductSearchResults,gvBTSconfig); // to do: plug in website search to BTS
        }
    }
}

/*
 * This function searches the HTML of the page for each of the SearchProducts.
 *
 * @pvArgs.productSearchData is an array of SearchProducts (from gvSearchProducts), and also
 * includes each SearchProduct's SearchCategory as well as the corresponding webites that
 * are "active" for that category. Hence, @pvArgs.productSearchData can hold one SearchProduct
 * multiple times, once for every website it is valid for. (For example, Nescafe Coffee may be
 * listed twice, once for Tesco.com and once for Sainsbury.com.)
 *
 * @pvArgs.websiteSearchData is an array of categoryWebsiteJoins (from gvSearchWebsites),
 * and again has repeats (a searchCategory/website conbo can be configured for website-level and
 * product-level search)
 *
 * We can ignore the isWebsiteOnOrOff setting here, because this is checked during init
 * and Balu will not get this far for an inactive website.
 *
 */
function searchPage_master(pvArgs){

    lvFunctionName = 'searchPage_master';
    log(gvScriptName_CSSearch + '.' + lvFunctionName + ': Start','PROCS');

    // To avoid too much disruption to extension code, use global vars to store objects passed through
    // from Balu Test System (BTS). We pick these up again right at the end, in processSearchResults
    if(typeof pvArgs.bts_config !== 'undefined') {
        gvIsTestExecution = pvArgs.bts_config.isTestExecution;
        gvBTSconfig = pvArgs.bts_config;
    }

    /*************************************************************
     * Log which type of searches we should be doing on this tab *
     *************************************************************/

    if(pvArgs.tab.isProductLevelRec) {
        log(gvScriptName_CSSearch + '.' + lvFunctionName + ': This website (' + pvArgs.tab.website.websiteURL + ') is configured for productLevelSearch',' INFO');
    } else {
        log(gvScriptName_CSSearch + '.' + lvFunctionName + ': This website (' + pvArgs.tab.website.websiteURL + ') is NOT configured for productLevelSearch',' INFO');
    }
    if(pvArgs.tab.isWebsiteLevelRec) {
        if(pvArgs.tab.hasUserVisitedWebsiteRecently) {
            log(gvScriptName_CSSearch + '.' + lvFunctionName + ': This website (' + pvArgs.tab.website.websiteURL + ') is configured for websiteLevelSearch and has been visited recently',' INFO');
        } else {
            log(gvScriptName_CSSearch + '.' + lvFunctionName + ': This website (' + pvArgs.tab.website.websiteURL + ') is configured for websiteLevelSearch',' INFO');
        }
    }
    if(!pvArgs.tab.isProductLevelRec && !pvArgs.tab.isWebsiteLevelRec) {
        log(gvScriptName_CSSearch + '.' + lvFunctionName + ': This website (' + pvArgs.tab.website.websiteURL + ') is NOT configured for websiteLevelSearch or productLevelSearch',' INFO');
    }

    /************************
     * Website-level Search *
     ************************/

    // We know whether the current tab is valid for websiteLevelSearch or not, but if it is valid we don't yet know
    // what searchCategories it's valid for. That's what the next loop is for. We need to save out any valid search
    // categories, which will be used to determine the website-level recs that will get returned.
    var lvWebsiteSearchResults = [];
    if(pvArgs.tab.isWebsiteLevelRec) {
        for(var j = 0; j < pvArgs.websiteSearchData.length; j++){
            if(pvArgs.tab.tab.url.indexOf(pvArgs.websiteSearchData[j].websiteURL) !== -1) {
                if(pvArgs.websiteSearchData[j].isWebsiteLevelRec) {
                    log(gvScriptName_CSSearch + '.' + lvFunctionName + ': This website (' + pvArgs.tab.website.websiteURL + ') is configured for websiteLevelSearch for "' + pvArgs.websiteSearchData[j].searchCategoryName + '"','DEBUG');
                    lvWebsiteSearchResults.push({searchCategoryId:   pvArgs.websiteSearchData[j].searchCategoryId,
                                                 searchCategoryName: pvArgs.websiteSearchData[j].searchCategoryName});
                }
            }
        }
    }

    /***********************
     * Product-level Search *
     ***********************/

    // We are going to loop through the SearchProducts and for every one where the website
    // matches the user's current URL, we're going to pass it through to getElements, to pull data
    // off the page and search it for the searchProducts we just passed through.

    // If we find a match, we add the matchign searchProduct to a searchResults array and pass
    // that on to the getRecs functions
    var lvArgs = {tabURL: pvArgs.tab.tab.url,
                  websiteURL: pvArgs.tab.website.websiteURL,
                  DOM: pvArgs.dom,
                  productSearchData: pvArgs.productSearchData,
                  sexSearchCallback: sexSearch,
                  productSearchCallback: productSearch,
                  attemptCount: 1,
                  websiteSearchResults: lvWebsiteSearchResults, // Pass in our websiteSearchResults retrieved from the previous function so it all ends up in processSearchResults at the end
                  isTabActive_productLevel: pvArgs.tab.isProductLevelRec,
                  isTabActive_websiteLevel: pvArgs.tab.isWebsiteLevelRec};

    getElements(lvArgs);
}

/*
 *
 */

function getElements(pvArgs) {

    // This function was first written without the pvArgs notation, so to
    // avoid replacing params throughout we're repopulating the old params here:
    // There are other params, new ones, which don't get pushed out like this and are referenced from pvArgs
    var tabURL = pvArgs.tabURL;
    var websiteURL = pvArgs.websiteURL;
    var pvDOM = pvArgs.DOM;
    var searchData = pvArgs.productSearchData;
    var sexSearchCallback = pvArgs.sexSearchCallback;
    var productSearchCallback = pvArgs.productSearchCallback;
    var attemptCount = pvArgs.attemptCount;

    log(gvScriptName_CSSearch + '.getElements: pvArgs.isTabActive_productLevel == ' + pvArgs.isTabActive_productLevel,' INFO');

    if(pvArgs.isTabActive_productLevel) {

        log(gvScriptName_CSSearch + '.getElements: Starting product-level getElements for ' + websiteURL + '. attemptCount == ' + attemptCount,' INFO');

        /*************
         * Variables *
         *************/

        // Flow control
        var runSexSearch = true;
        var sexOverride;
        var departmentOverride = false;
        var i;
        var j;
        var lvFoundEverything = false;

        // pageElements to be searched
        var lvDepartments = [];
        var lvBreadcrumbs = '';
        var lvMenFilter = 'NO';
        var lvWomenFilter = 'NO';
        var lvProductNames = [];
        var lvNumberOfResultsToConsider = 15; // For a results page with over ten results returned, Balu will only look at the first X. This increases the relevancy of the Balu results returned

        var lvFoundDepartments = false;
        var lvFoundBreadcrumbs = false;
        var lvFoundGender = false;
        var lvFoundResults = false; // search result grid/list pages
        var lvFoundProduct = false; // individual product pages

        var URLText =  tabURL.substring(tabURL.indexOf('/')).toLowerCase(); // we want the text after the first forward slash, for searching.

        // Logging
        var logMessage = '\n\nWebsite: ' + websiteURL + ', iteration ' + attemptCount + '\n\n';
        var logMessage_extra = '';
        var logMessage_elementsNotFound = '';
        logMessage += '** Collect Page Elements ** ' + '\n\n';

        /*****************************************************
         * The Switch statement: one for each active website *
         *****************************************************/

        // General order for each website:
        //  - lvDepartments: usually from lvBreadcrumbs at the top (the department you're currently in) and categories on the LHS (refinement options)
        //  - Breadcrumbs:
        //  - Results page: can sometimes have different pvDOMs for list / grid views
        //  - Product page: if multi-item pvDOM elements weren't found, then check assume it's a product page

        switch(websiteURL){

            case 'www.amazon.co.uk':

                // to do: Amazon search changes the URL but not the page, so we probably need listen for URL changes to trigger a re-search

                runSexSearch = true;

                /***************
                 * Departments *
                 ***************/

                // Amazon has different text options for each department, depending on the location
                // I.e. Home & Garden and Kitchen & Home are the same department, but one is used
                // for the categories and the other in the top left of the nav bar.
                // When adding new Search Categories, make sure all possible values are included.

                /* categories */

                var amazon_dep_cat_parent = pvDOM.getElementById('refinements');
                // It's the first UL in this div, then for each LI the text we want is in the <a> element at the start of the LI
                // or, sometimes, in the <strong> element
                if(amazon_dep_cat_parent !== null) {
                    var amazon_dep_cat_firstUL = amazon_dep_cat_parent.querySelector('ul');
                    var amazon_dep_cat_listItems = amazon_dep_cat_firstUL.getElementsByTagName('li');
                    for(i = 0; i < amazon_dep_cat_listItems.length; i++) {
                        var amazon_dep_cat_listItems_firstA = amazon_dep_cat_listItems[i].querySelector('a');
                        if (amazon_dep_cat_listItems_firstA === null) {
                            // When there's only one department suggested it's not a link
                            amazon_dep_cat_listItems_firstA = amazon_dep_cat_listItems[i].querySelector('strong');
                        }
                        if (amazon_dep_cat_listItems_firstA !== null) {
                            lvDepartments.push(amazon_dep_cat_listItems_firstA.textContent.toLowerCase().trim());
                        }
                    }
                    if(amazon_dep_cat_listItems.length > 0){
                        logMessage_extra += '  Departments:  found in id="refinements"' + '\n';
                        lvFoundDepartments = true;
                    }
                }

                /* navBar */

                // The navBar is the leading department. If we're in a department, this will not be
                // "Amazon.co.uk"
                var amazon_dep_navBar_parent = pvDOM.getElementById('nav-subnav');
                var amazon_dep_navBar_text = '';

                if(amazon_dep_navBar_parent !== null){
                    var amazon_dep_navBar_firstElement = amazon_dep_navBar_parent.firstElementChild;
                    if(amazon_dep_navBar_firstElement !== null) {
                        amazon_dep_navBar_text = amazon_dep_navBar_firstElement.textContent.toLowerCase().trim();
                        if(amazon_dep_navBar_text !== 'amazon.co.uk') {
                            lvDepartments.push(amazon_dep_navBar_text);
                            logMessage_extra += '  Departments: navBar department found in id="nav-subnav"' + '\n';
                            lvFoundDepartments = true;
                        }
                        // we don't need to log a failure here, because we have a second attempt below with the categories
                    }
                }

                /* Search field drop down */

                var amazon_dep_searchDropDown_spans = pvDOM.getElementsByClassName('nav-search-label');
                if(amazon_dep_searchDropDown_spans.length > 0) {
                    lvDepartments.push(amazon_dep_searchDropDown_spans[0].textContent.toLowerCase().trim());
                    logMessage_extra += '  Departments: search DropDown department found in class="nav-subnav-label"' + '\n';
                    lvFoundDepartments = true;
                }

                /* Category image for Amazon Fashion */

                var amazon_dep_categoryImage_img = pvDOM.getElementsByClassName('nav-categ-image');
                if(amazon_dep_categoryImage_img.length > 0) {
                    if(amazon_dep_categoryImage_img[0].src.includes('amazon-fashion-store')) {
                        lvDepartments.push('amazon fashion');
                        logMessage_extra += '  Departments: Category Image identified as "amazon-fashion-store"' + '\n';
                        lvFoundDepartments = true;
                    }
                }

                // did we find a department somewhere?
                if(!lvFoundDepartments) {
                    logMessage_extra += '  Departments: FAILED to find first element in id="nav-subnav"' + '\n';
                }

                /***************
                 * Breadcrumbs *
                 ***************/

                var amazon_bc = pvDOM.getElementById('s-result-info-bar-content');
                if(amazon_bc === null) {
                    amazon_bc = pvDOM.getElementById('wayfinding-breadcrumbs_container');
                }
                if(amazon_bc !== null) {
                    lvBreadcrumbs = amazon_bc.textContent.toLowerCase();
                    logMessage_extra += '  Breadcrumbs: found in id="s-result-info-bar-content"' + '\n';
                    lvFoundBreadcrumbs = true;
                }

                if(!lvFoundBreadcrumbs){
                    logMessage_extra += '  Breadcrumbs: FAILED to find in id="s-result-info-bar-content"' + '\n';
                }

                /************
                 * Products *
                 ************/

                /* Results page */

                // The resultsCol div is the grid that (usually) contains all search results
                // What's inside it depends on the view, so if resultsCol is not there, try
                // searchResults div.

                var amazon_pn_results_parent_resultsCol;
                var amazon_pn_results_parent_searchResults;
                var amazon_pn_results_parent_search_results;

                var amazon_first_result_element_to_watch;
                var test2;

                amazon_pn_results_parent_resultsCol = pvDOM.getElementById('resultsCol');

                if(amazon_pn_results_parent_resultsCol !== null) {
                    test2 = amazon_pn_results_parent_resultsCol;
                    var amazon_pn_results_links1 = amazon_pn_results_parent_resultsCol.querySelectorAll('a.s-access-detail-page');
                    for (i = 0; i < amazon_pn_results_links1.length; i++) {
                        lvProductNames.push(amazon_pn_results_links1[i].textContent.toLowerCase().trim());
                        if(i===1){
                            amazon_first_result_element_to_watch = amazon_pn_results_links1[i].parentNode;
                        }
                    }
                    if(amazon_pn_results_links1.length > 0){
                        logMessage_extra += 'Results Page: found in id="resultsCol"' + '\n';
                        lvFoundResults = true;
                    }
                } else {
                    amazon_pn_results_parent_searchResults = pvDOM.getElementById('searchResults');
                    if(amazon_pn_results_parent_searchResults !== null) {
                        var amazon_pn_results_h3s = amazon_pn_results_parent_searchResults.querySelectorAll('h3.newaps');
                        for (i = 0; i < amazon_pn_results_h3s.length; i++) {
                            lvProductNames.push(amazon_pn_results_h3s[i].textContent.toLowerCase().trim());
                            if(i===1){
                                amazon_first_result_element_to_watch = amazon_pn_results_h3s[i];
                            }
                        }
                        if(amazon_pn_results_h3s.length > 0){
                            logMessage_extra += 'Results Page: found in id="searchResults"' + '\n';
                            lvFoundResults = true;
                        }
                    } else {
                        amazon_pn_results_parent_search_results = pvDOM.getElementById('search-results');
                        if(amazon_pn_results_parent_search_results !== null) {
                            var amazon_pn_results_links2 = amazon_pn_results_parent_search_results.querySelectorAll('a.s-access-detail-page');
                            for (i = 0; i < amazon_pn_results_links2.length; i++) {
                                lvProductNames.push(amazon_pn_results_links2[i].textContent.toLowerCase().trim());
                                if(i===1){
                                    amazon_first_result_element_to_watch = amazon_pn_results_links2[i];
                                }
                            }
                            if(amazon_pn_results_links2.length > 0){
                                logMessage_extra += 'Results Page: found in id="search-results"' + '\n';
                                lvFoundResults = true;
                            }
                        }
                    }
                }

                if(!lvFoundResults){
                    logMessage_extra += 'Results Page: FAILED to find in id="resultsCol" or id="searchResults" or id="search-results"' + '\n';
                } else {
                    // To do:
                    // If we are on a results page, we need to set up a listener to detect changes to the first item in the
                    // search results. This is because searching on Amazon does not referesh the entire page, just AJAXes into
                    // the results grid
                    // select the target node
                }

                /* Product Page */

                // There are multiple types of product page

                if(!lvFoundResults){

                    var amazon_pn_prod_titleSection; // #1
                    var amazon_pn_prod_productTitle; // #2
                    var amazon_pn_prod_btAsinTitle;  // #3

                    // #1

                    amazon_pn_prod_titleSection = pvDOM.getElementById('titleSection');
                    if(amazon_pn_prod_titleSection !== null) {
                        lvProductNames.push(amazon_pn_prod_titleSection.textContent.toLowerCase().trim());
                        logMessage_extra += '  Product Page: found in id="titleSection"' + '\n';
                        lvFoundProduct = true;
                    }


                    // #2

                    if(!lvFoundProduct){
                        amazon_pn_prod_productTitle = pvDOM.getElementById('productTitle');
                        if(amazon_pn_prod_productTitle !== null) {
                            lvProductNames.push(amazon_pn_prod_productTitle.textContent.toLowerCase().trim());
                            logMessage_extra += '  Product Page: found in id="productTitle"' + '\n';
                            lvFoundProduct = true;
                        }
                    }

                    // #3

                    if(!lvFoundProduct){
                        amazon_pn_prod_btAsinTitle = pvDOM.getElementById('btAsinTitle');
                        if(amazon_pn_prod_btAsinTitle !== null) {
                            lvProductNames.push(amazon_pn_prod_btAsinTitle.textContent.toLowerCase().trim());
                            logMessage_extra += '  Product Page: found in id="btAsinTitle"' + '\n';
                            lvFoundProduct = true;
                        }
                    }
                }

                // not found

                if (!lvFoundProduct) {
                    logMessage_extra += '  Product Page: FAILED To find in id="titleSection" or id="productTitle" or id="btAsinTitle"' + '\n';
                }

                /***********
                 * Wrap Up *
                 ************/

                // Did we find what we needed
                if(lvFoundDepartments && lvFoundBreadcrumbs && (lvFoundResults || lvFoundProduct)) {
                    lvFoundEverything = true;
                }

            break;

            case 'www.ebay.co.uk':

                // eBay website is a mess! Many different ways various components can be displayed

                runSexSearch = true;

                /***************
                 * Departments *
                 ***************/

                /* Categories */

                // cat-t class appears to be the top level departments in the cat list,
                // but the last one is often "see all categories"
                // There's also a case where it's a ptCat div

                var ebay_dep_cat = pvDOM.getElementsByClassName('cat-t');
                if(ebay_dep_cat.length === 0) {
                    ebay_dep_cat = pvDOM.getElementsByClassName('ptCat');
                }
                var ebay_dep_cat_links;
                if(ebay_dep_cat.length > 0) {
                    for(i = 0; i < ebay_dep_cat.length; i++) {
                        ebay_dep_cat_links = ebay_dep_cat[i].querySelectorAll('a');
                        for(j = 0; j < ebay_dep_cat_links.length; j++) {
                            var ebay_dep_cat_link_text = ebay_dep_cat_links[j].textContent.toLowerCase().trim();
                            if(ebay_dep_cat_link_text !== 'See all categories'){
                                lvDepartments.push(ebay_dep_cat_links[j].textContent.toLowerCase().trim());
                            }
                        }
                        if(ebay_dep_cat_links.length > 0){
                            logMessage_extra += '  Departments: found in classes="cat-t" or "ptCat"' + '\n';
                            lvFoundDepartments = true;
                        }
                    }
                }
                /* Breadcrumbs */

                var ebay_dep_bc = pvDOM.getElementById('vi-VR-brumb-lnkLst');
                if(ebay_dep_bc === null) {
                    ebay_dep_bc2 = pvDOM.getElementsByClassName('bc-cat');
                    if(ebay_dep_bc2.length > 0){
                        ebay_dep_bc = ebay_dep_bc2[0];
                    }
                }

                if(ebay_dep_bc !== null){
                    var ebay_dep_bc_listItems = ebay_dep_bc.getElementsByTagName('li');
                    for(i = 0; i < ebay_dep_bc_listItems.length; i++) {
                        lvDepartments.push(ebay_dep_bc_listItems[i].textContent.toLowerCase().replace('>','').trim());
                    }
                    if(ebay_dep_bc_listItems.length > 0){
                        logMessage_extra += '  Departments: found in id="vi-VR-brumb-lnkLst" or class="bc-cat"' + '\n';
                        lvFoundDepartments = true;
                    }
                }

                if(!lvFoundDepartments){
                    logMessage_extra += '  Departments: FAILED to find in id="vi-VR-brumb-lnkLst" and class="cat-t" and class="ptCat"' + '\n';
                }

                /***************
                * Breadcrumbs *
                ***************/

                var ebay_bc = ebay_dep_bc;
                if(ebay_bc !== null) {
                    lvBreadcrumbs = ebay_bc.textContent.toLowerCase().trim();
                    logMessage_extra += '  Breadcrumbs: found in id="vi-VR-brumb-lnkLst"' + '\n';
                    lvFoundBreadcrumbs = true;
                } else {
                    ebay_bc = pvDOM.getElementById('RelatedSearchesContainer');
                    if(ebay_bc !== null) {
                        lvBreadcrumbs = ebay_bc.textContent.toLowerCase().trim();
                        logMessage_extra += '  Breadcrumbs: found in id="vi-VR-brumb-lnkLst"' + '\n';
                        lvFoundBreadcrumbs = true;
                    }
                }

                if(!lvFoundBreadcrumbs){
                    logMessage_extra += '  Breadcrumbs: FAILED to find in id="vi-VR-brumb-lnkLst"' + '\n';
                }

                /************
                 * Products *
                 ************/

                /* Results page */

                // Two views: GalleryViewInner, and ListViewInner

                var ebay_pn_results_gallery_parent = pvDOM.getElementById('GalleryViewInner');
                if(ebay_pn_results_gallery_parent !== null) {
                    ebay_pn_results_gallery_h3s = ebay_pn_results_gallery_parent.querySelectorAll('div.gvtitle > h3');
                    for(i = 0; i < ebay_pn_results_gallery_h3s.length; i++){
                        lvProductNames.push(ebay_pn_results_gallery_h3s[i].textContent.toLowerCase().trim());
                    }
                    if(ebay_pn_results_gallery_h3s.length > 0) {
                        logMessage_extra += '  Search Results: found in id="GalleryViewInner"' + '\n';
                        lvFoundResults = true;
                    }
                } else {
                    var ebay_pn_results_list_parent = pvDOM.getElementById('ListViewInner');
                    if(ebay_pn_results_list_parent !== null) {
                        ebay_pn_results_list_h3s = ebay_pn_results_list_parent.querySelectorAll('h3.lvtitle');
                        for(i = 0; i < ebay_pn_results_list_h3s.length; i++){
                            lvProductNames.push(ebay_pn_results_list_h3s[i].textContent.toLowerCase().trim());
                        }
                        if(ebay_pn_results_list_h3s.length > 0) {
                            logMessage_extra += '  Search Results: found in id="ListViewInner"' + '\n';
                            lvFoundResults = true;
                        }
                    }
                }

                if(!lvFoundResults){
                    logMessage_extra += 'Results Page: FAILED to find in id=""' + '\n';
                }

                /* Product Page */

                // This is quite tidy compared to the rest: there's always a department in
                // the breadcrumbs (I think) and only one page display format

                if(!lvFoundResults){
                    var ebay_pn_prod = pvDOM.querySelector('h1#itemTitle');

                    if(ebay_pn_prod !== null) {
                        lvProductNames.push(ebay_pn_prod.textContent.toLowerCase().trim());
                        logMessage_extra += '  Product Page: found in #itemTitle' + '\n';
                        lvFoundProduct = true;
                    }
                }

                if(!lvFoundProduct){
                    logMessage_extra += '  Product Page: FAILED to find in #itemTitle' + '\n';
                }

                /***********
                 * Wrap Up *
                 ************/

                // Did we find what we needed
                if(lvFoundDepartments && lvFoundBreadcrumbs && (lvFoundResults || lvFoundProduct)) {
                    lvFoundEverything = true;
                }

            break;

            case 'www.argos.co.uk':

                //

                runSexSearch = true;

                /***************
                 * Departments *
                 ***************/

                // Breadcrumbs are usually useful, but after a user search, they
                // only display the search term. Categories are good though.

                /* Categories */

                var argos_dep_cat = pvDOM.getElementById('categoryList');

                if(argos_dep_cat !== null) {
                    var argos_dep_cat_listItems = argos_dep_cat.getElementsByTagName('li');
                    for(i = 0; i < argos_dep_cat_listItems.length; i++) {
                        // The text on the page has a (n) after each catgory, denoting how many products
                        // fall into the category. We need to remove this.
                        var argos_dep_cat_listItems_text = argos_dep_cat_listItems[i].textContent.toLowerCase().trim();
                        lvDepartments.push(argos_dep_cat_listItems_text.substring(0,argos_dep_cat_listItems_text.indexOf('(')-1));
                    }
                    if(argos_dep_cat_listItems.length > 0){
                        logMessage_extra += '  Departments: found in id="categoryList"' + '\n';
                        lvFoundDepartments = true;
                    }
                }

                /* Breadcrumbs */

                var argos_dep_bc = pvDOM.getElementById('breadcrumb');

                if(argos_dep_bc !== null){
                    var argos_dep_bc_listItems = argos_dep_bc.getElementsByTagName('li');
                    for(i = 0; i < argos_dep_bc_listItems.length; i++) {
                        argos_dep_bc_listItems_text = argos_dep_bc_listItems[i].textContent.toLowerCase().trim();
                        argos_dep_bc_listItems_text = argos_dep_bc_listItems_text.replace('>',' ');
                        argos_dep_bc_listItems_text = argos_dep_bc_listItems_text.trim();
                        if(argos_dep_bc_listItems_text !== 'you searched for' && argos_dep_bc_listItems_text.indexOf('results found') === -1) {
                            lvDepartments.push(argos_dep_bc_listItems_text);
                        }
                    }
                    if(argos_dep_bc_listItems.length > 0) {
                        logMessage_extra += '  Departments: found in id="breadcrumb"' + '\n';
                        lvFoundDepartments = true;
                    }
                }

                if(!lvFoundDepartments){
                    logMessage_extra += '  Departments: FAILED to find in id="breadcrumb" and id="categoryList"' + '\n';
                }

                /***************
                 * Breadcrumbs *
                 ***************/

                var argos_bc = argos_dep_bc;

                if(argos_bc !== null) {
                    lvBreadcrumbs = argos_bc.textContent.toLowerCase().trim();
                    logMessage_extra += '  Breadcrumbs: found in id="breadcrumb"' + '\n';
                    lvFoundBreadcrumbs = true;
                }

                if(!lvFoundBreadcrumbs) {
                    logMessage_extra += '  Breadcrumbs: FAILED to find in id="breadcrumb"' + '\n';
                }

                /************
                 * Products *
                 ************/

                /* Results page */

                var argos_pn_results = pvDOM.getElementById('products');

                if(argos_pn_results !== null) {
                    var argos_pn_results_dts = argos_pn_results.querySelectorAll('dt.title');
                    for (i = 0; i < argos_pn_results_dts.length; i++) {
                        lvProductNames.push(argos_pn_results_dts[i].textContent.toLowerCase().trim());
                    }
                    if(argos_pn_results_dts.length > 0){
                        logMessage_extra += '  Search Results: found in id="products"' + '\n';
                        lvFoundResults = true;
                    }
                }

                if(!lvFoundResults){
                    logMessage_extra += '  Search Results: FAILED to find in id="products"' + '\n';
                }

                /* Product Page */

                if(!lvFoundResults){
                    var argos_pn_prod_pdpProduct = pvDOM.getElementById('pdpProduct');

                    if(argos_pn_prod_pdpProduct !== null) {
                        lvProductNames.push(argos_pn_prod_pdpProduct.textContent.toLowerCase().trim());
                        logMessage_extra += '  Product Page: found in id="pdpProduct"' + '\n';
                        lvFoundProduct = true;
                    }
                }

                if(!lvFoundProduct){
                    logMessage_extra += '  Product Page: FAILED to find in pdpProduct' + '\n';
                }

                /***********
                 * Wrap Up *
                 ************/

                // Did we find what we needed
                if(lvFoundDepartments && lvFoundBreadcrumbs && (lvFoundResults || lvFoundProduct)) {
                    lvFoundEverything = true;
                }

            break;

            case 'www.asos.com':

                runSexSearch = true;

                /***************
                 * Departments *
                 ***************/

                // No departments needed. ASOS does fashion only.

                /***************
                 * Breadcrumbs *
                 ***************/

                var asos_bc = pvDOM.getElementById('chrome-breadcrumb');
                if(asos_bc !== null){
                    lvBreadcrumbs = asos_bc.textContent.toLowerCase().trim();
                    logMessage_extra += '  Breadcrumbs: found in id="chrome-breadcrumb"' + '\n';
                    lvFoundBreadcrumbs = true;
                }
                if(!lvFoundBreadcrumbs){
                    logMessage_extra += '  Breadcrumbs: FAILED to find in id="chrome-breadcrumb"' + '\n';
                }

                /**********
                 * Gender *
                 **********/

                // There are no gender filters on ASOS anymore. There is a top-level menu that is always selected
                // as one or the other, but we ignore this because it doesn't change when you search
                // But sex appears neatly in the URL a lot, and in the breadcrumbs, so the search functions at the
                // end should pick it up easily.


                /************
                 * Products *
                 ************/

                /* Results page */

                // There are two page types: categories and search results
                // Both have the same structure
                var asos_pn_results = pvDOM.querySelectorAll('[data-auto-id="productList"]');

                if(asos_pn_results.length > 0) {
                    var asos_pn_titles_divs = asos_pn_results[0].querySelectorAll('[data-auto-id="productTileDescription"]');
                    for (i = 0; i < asos_pn_titles_divs.length; i++) {
                        lvProductNames.push(asos_pn_titles_divs[i].querySelectorAll('p')[0].innerHTML.toLowerCase().trim());
                    }
                    if(asos_pn_titles_divs.length > 0) {
                        logMessage_extra += '  Search Results: found in data-auto-id="productList"' + '\n';
                        lvFoundResults = true;
                    }
                }

                if(!lvFoundResults){
                    logMessage_extra += '  Search Results: FAILED to find in class="product-list" or class="category-items"' + '\n';
                }

                /***********
                 * Wrap Up *
                 ************/

                // Did we find what we needed (remember, no departments and no gender checkboxes)
                if(lvFoundBreadcrumbs && lvFoundResults) {
                    lvFoundEverything = true;
                }

            break;

            case 'boohoo.com':

                runSexSearch = true;

                /***************
                 * Departments *
                 ***************/

                 // No departments on boohoo

                /**********
                 * Gender *
                 **********/

                // Gender is not always there, if you go through menu it doesn't show tick boxes

                var boohoo_dep_womenCheckbox = $(pvDOM).find('a[data-value="Women"][data-checked="true"]');
                var boohoo_dep_menCheckbox = $(pvDOM).find('a[data-value="Men"][data-checked="true"]');
                if(boohoo_dep_womenCheckbox.length > 0){
                    lvWomenFilter = 'WOMEN';
                    lvFoundGender = true;
                }
                if(boohoo_dep_menCheckbox.length > 0){
                    lvMenFilter = 'MEN';
                    lvFoundGender = true;
                }
                if(lvFoundGender) {
                    logMessage_extra += '  Gender: found in find(a[data-value="Women/Men"][data-checked="true"]' + '\n';
                }
                if(!lvFoundGender){
                    logMessage_extra += '  Gender: FAILED to find in find(a[data-value="Women/Men"][data-checked="true"]' + '\n';
                }

                /***************
                 * Breadcrumbs *
                 ***************/

                 // FYI, breadcrumbs only appear on product pages

                 var boohoo_bc = $(pvDOM).find('p.crumbtrail a').each(function(){
                     lvBreadcrumbs += $(this).text().toLowerCase() + ' ';
                     lvFoundBreadcrumbs = true;
                 });

                if(lvFoundBreadcrumbs){
                    logMessage_extra += '  Breadcrumbs: found in find(p.crumbtrail a)' + '\n';
                } else if(!lvFoundBreadcrumbs){
                    logMessage_extra += '  Breadcrumbs: failed to find in find(p.crumbtrail a) (Note, Boohoo doesn\'t have breadcrumbs on results page)' + '\n';
                }

                /************
                 * Products *
                 ************/

                /* Results page */

                $(pvDOM).find('ul#fsm-prod-list h3.prod-name a').each(function() {
                    lvProductNames.push($(this).html().toLowerCase().trim());
                    lvFoundResults = true;
                });

                if(lvFoundResults) {
                    logMessage_extra += '  Search Results: found in find(ul#fsm-prod-list h3.prod-name a)' + '\n';
                } else if(!lvFoundResults){
                    logMessage_extra += '  Search Results: FAILED to find in find(ul#fsm-prod-list h3.prod-name a)' + '\n';
                }

                /* Product page */

                if(!lvFoundResults) {
                    $(pvDOM).find('.productdetail h1.show-for-small').each(function(){
                        lvProductNames.push($(this).text().toLowerCase().trim());
                        lvFoundProduct = true;
                    });
                    if(lvFoundProduct){
                        logMessage_extra += '  Product Page: found in first(#productdetail h1)' + '\n';
                    }
                }
                if(!lvFoundProduct){
                   logMessage_extra += '  Product Page: failed to find in first(#productdetail h1)' + '\n';
                }

                /***********
                 * Wrap Up *
                 ************/

                // Did we find what we needed (remember, no departments, gender not always there, breadcrumbs only on product page)
                if(lvFoundResults || (lvFoundProduct && lvFoundBreadcrumbs)) {
                    lvFoundEverything = true;
                }

            break;

            case 'www.debenhams.com':

                runSexSearch = true;

                /***************
                 * Departments *
                 ***************/

                /* Categories */

                var debenhams_dep_cat = pvDOM.getElementById('categoryFacetDiv_categories');
                if(debenhams_dep_cat !== null){
                    var debenhams_dep_cat_list = debenhams_dep_cat.getElementsByTagName('li');
                    for(i = 0; i < debenhams_dep_cat_list.length; i++) {
                        var debenhams_dep_cat_list_text = debenhams_dep_cat_list[i].textContent.toLowerCase().trim();
                        debenhams_dep_cat_list_text = debenhams_dep_cat_list_text.substring(0,debenhams_dep_cat_list_text.indexOf('(')-1).trim();
                        lvDepartments.push(debenhams_dep_cat_list_text);
                    }
                    if(debenhams_dep_cat_list.length > 0) {
                        logMessage_extra += '  Departments: found in id="categoryFacetDiv_categories"' + '\n';
                        lvFoundDepartments = true;
                    }
                }

                /* Breadcrumbs */

                var debenhams_dep_bc = pvDOM.getElementsByClassName('breadcrumb_links');
                if(debenhams_dep_bc.length > 0){
                    var debenhams_dep_bc_spans = debenhams_dep_bc[0].getElementsByTagName('span');
                    for(i = 0; i < debenhams_dep_bc_spans.length; i++) {
                        var debenhams_dep_bc_span_text = debenhams_dep_bc_spans[i].textContent.toLowerCase().trim();
                        if(debenhams_dep_bc_span_text !== 'home' && debenhams_dep_bc_span_text.length > 0) {
                            lvDepartments.push(debenhams_dep_bc_span_text);
                            lvFoundDepartments = true;
                        }
                    }
                    if(lvFoundDepartments) {
                        logMessage_extra += '  Departments: found in class="breadcrumb_links"' + '\n';
                    }
                }

                if(!lvFoundDepartments){
                    logMessage_extra += '  Departments: FAILED to find in class="breadcrumb_links" and id="categoryFacetDiv_categories"' + '\n';
                }

                /***************
                 * Breadcrumbs *
                 ***************/

                debenhams_bc = debenhams_dep_bc;
                if(debenhams_bc.length > 0){
                    lvBreadcrumbs = debenhams_bc[0].innerHTML.toLowerCase().trim();
                    logMessage_extra += '  Breadcrumbs: found in class="breadcrumb_links"' + '\n';
                    lvFoundBreadcrumbs = true;
                }

                if(!lvFoundBreadcrumbs) {
                    logMessage_extra += '  Breadcrumbs: FAILED to find in class="breadcrumb_links"' + '\n';
                }

                /************
                 * Products *
                 ************/

                /* Results Page */

                var debenhams_pn_results = pvDOM.getElementById('body_content_ProductSelectionPage');

                if(debenhams_pn_results !== null) {
                    var debenhams_pn_results_description = debenhams_pn_results.getElementsByClassName('description');
                    for (i = 0; i < debenhams_pn_results_description.length; i++) {
                        lvProductNames.push(debenhams_pn_results_description[i].textContent.toLowerCase().trim());
                    }
                    if(debenhams_pn_results_description.length > 0) {
                        lvFoundResults = true;
                    }
                }

                if(!lvFoundResults) {
                    logMessage_extra += '  Search Results: FAILED to find in class="description"' + '\n';
                }

                /* Product page */

                if(!lvFoundResults) {

                    var debenhams_pn_prod = pvDOM.getElementsByClassName('product-top-info');

                    if(debenhams_pn_prod.length > 0){
                        lvProductNames.push(debenhams_pn_prod[0].textContent.toLowerCase().trim());
                        logMessage_extra += '  Product Page: found in class="product-top-info"' + '\n';
                        lvFoundProduct = true;
                    }
                }

                if(!lvFoundProduct){
                    logMessage_extra += '  Product Page: FAILED To find in class="product-top-info"' + '\n';
                }

                /***********
                * Wrap Up *
                ************/

               // Did we find what we needed
               if(lvFoundDepartments && lvFoundBreadcrumbs && (lvFoundResults || lvFoundProduct)) {
                   lvFoundEverything = true;
               }

            break;

            case 'www.very.co.uk':

                runSexSearch = true;

                /***************
                 * Departments *
                 ***************/

                // There is no department info on product page for a user search. So in this case we override
                // the department match and just pull the user's search term. This is done below, in Product Page section
                var very_userSearch = false;

                /* Categories */

                var very_dep_cat_navigation = pvDOM.getElementById('navigation');
                if(very_dep_cat_navigation !== null){
                    very_dep_cat_navigation_firstUL = very_dep_cat_navigation.querySelector('ul');
                    if(very_dep_cat_navigation_firstUL !== null) {
                        var very_dep_cat_navigation_firstUL_listItems = very_dep_cat_navigation_firstUL.getElementsByTagName('li');
                        for(i = 0; i < very_dep_cat_navigation_firstUL_listItems.length; i++) {
                            // The text on the page has a (n) after each catgory, denoting how many products
                            // fall into the category. We need to remove this.
                            var very_dep_cat_navigation_firstUL_listItem_text = very_dep_cat_navigation_firstUL_listItems[i].textContent.toLowerCase().trim();
                            very_dep_cat_navigation_firstUL_listItem_text = very_dep_cat_navigation_firstUL_listItem_text.substring(0,very_dep_cat_navigation_firstUL_listItem_text.indexOf('(')-1).trim();
                            if(very_dep_cat_navigation_firstUL_listItem_text.length > 0) {
                                lvDepartments.push(very_dep_cat_navigation_firstUL_listItem_text);
                                lvFoundDepartments = true;
                            }
                        }
                        if(lvFoundDepartments) {
                            logMessage_extra += '  Departments: LIs found in first UL of id="navigation"' + '\n';
                        }
                    }
                }

                /* Breadcrumbs */

                var very_dep_bc = pvDOM.getElementById('breadcrumb');

                if(very_dep_bc !== null){
                    var very_dep_bc_listItems = very_dep_bc.getElementsByTagName('li');
                    for(i = 0; i < very_dep_bc_listItems.length; i++) {
                        var very_dep_bc_listItems_text = very_dep_bc_listItems[i].textContent.toLowerCase().replace('/','').trim();

                        // Make a note if this is a search result - we'll need to know this further down
                        if(very_dep_bc_listItems_text.indexOf('search') !== -1){
                            very_userSearch = true;
                        }

                        if(very_dep_bc_listItems_text.length > 0 && very_dep_bc_listItems_text !== 'home' && very_dep_bc_listItems_text.indexOf('search') === -1 && very_dep_bc_listItems_text !== 'previous') {
                            lvDepartments.push(very_dep_bc_listItems_text);
                        }
                    }
                    if(very_dep_bc_listItems.length > 0) {
                        logMessage_extra += '  Departments: found in id="breadcrumb"' + '\n';
                        lvFoundDepartments = true;
                    }
                }

                if(!lvFoundDepartments){
                    logMessage_extra += '  Departments: FAILED to find div id="breadcrumb" and id="navigation"' + '\n';
                }

                /***************
                 * Breadcrumbs *
                 ***************/

                var very_bc = very_dep_bc;
                if(very_bc !== null){
                    lvBreadcrumbs = very_bc.innerHTML.toLowerCase();
                    logMessage_extra += '  Breadcrumbs: found in id="breadcrumb"' + '\n';
                    lvFoundBreadcrumbs = true;
                }

                if(!lvFoundBreadcrumbs) {
                    logMessage_extra += '  Breadcrumbs: FAILED to find in id="breadcrumb"' + '\n';
                }

                /************
                 * Products *
                 ************/

                /* Results Page */

                var very_pn_results_products = pvDOM.getElementById('products');

                if(very_pn_results_products !== null) {
                    var very_pn_results_h3s = very_pn_results_products.getElementsByTagName('h3');
                    for (i = 0; i < very_pn_results_h3s.length; i++) {
                        lvProductNames.push(very_pn_results_h3s[i].textContent.toLowerCase().trim());
                    }
                    if(very_pn_results_h3s.length > 0) {
                        logMessage_extra += '  Search Results: found in id="products"' + '\n';
                        lvFoundResults = true;
                    }
                }

                if(!lvFoundResults) {
                    logMessage_extra += '  Search Results: FAILED to find in id="products"' + '\n';
                }

                /* Product page */

                // So we're on a product page, which means, if the user came here from a search, there will be no categories
                // anywhere on the page. That means, before we go ahead and pull the product name, we need to override the
                // department match.
                // Not perfect. In fact, rubbish! But it will do for now.

                if(!lvFoundResults) {

                    if(very_userSearch){
                        departmentOverride = true;
                    }

                    var very_pn_results_productHeadings = pvDOM.getElementsByClassName('productHeading');

                    if(very_pn_results_productHeadings.length > 0){
                        lvProductNames.push(very_pn_results_productHeadings[0].textContent.toLowerCase().trim());
                        logMessage_extra += '  Product Page: found in class="productHeading"' + '\n';
                        lvFoundProduct = true;
                    }
                }

                if(!lvFoundProduct) {
                    logMessage_extra += '  Product Page: FAILED To find in class="productHeading"' + '\n';
                }

                /***********
                 * Wrap Up *
                 ************/

                // Did we find what we needed
                if(lvFoundDepartments && lvFoundBreadcrumbs && (lvFoundResults || lvFoundProduct)) {
                    lvFoundEverything = true;
                }

            break;

            case 'www.next.co.uk':

                // Next doesn't give you categories when you search.
                // The breadcrumbs display the catgory on results pages, but some grid pages
                // condense the breadcrumbs down, e.g. home > men's jeans, removing the upper categories.
                // To avoid entering the detailed sub categories into the search, I will do some custom code
                // to pick up the "men's" / "women's" part of the sub category and assume that means clothes

                // Sometimes when you click through to a product, it will brings up the full path in the breadcrumbs
                // You do, however, get an underline on the main menu at this point, although unfortunately shoes/bags just
                // go under Men, Women. But at least it differentiates for chistmas cards, etcH

                runSexSearch = true;

                /***************
                 * Departments *
                 ***************/

                /* Breadcrumbs */

                var next_dep_bc = pvDOM.getElementsByClassName('BreadcrumbNavigation');
                if(next_dep_bc.length > 0){
                    var next_dep_bc_listItems = next_dep_bc[0].getElementsByTagName('li');
                    for(i = 0; i < next_dep_bc_listItems.length; i++) {
                        var next_dep_bc_link_text = next_dep_bc_listItems[i].textContent.toLowerCase().trim();
                        if(next_dep_bc_link_text !== 'home' && next_dep_bc_link_text.length > 0) {
                            // Top-level categories are excluded from the breadcrumbs, so to make fashion work we're going
                            // to look for "men's" and "women's" in the sub category, and push that into the lvDepartments
                            // array instead.
                            // Also, we want to override department on user search, so pick out the "" in the breadcrumbs
                            // (only if there are only two items, because when you go to the product page from a search
                            // it sticks the actual department on after the search term) and push men/women into lvDepartments
                            // To do: this leaves one case not dealt with, where the search term defaults to a category, e.g.
                            // Coat -> Coats and Jackets. In these cases, there are no "" around the search term (in fact, the
                            // search term is not displayed, the category is displayed. )
                            if(next_dep_bc_link_text.indexOf('women\'s') !== -1) {
                                lvDepartments.push('women\'s');
                            } else if(next_dep_bc_link_text.indexOf('men\'s') !== -1) {
                                lvDepartments.push('men\'s');
                            } else if(next_dep_bc_link_text.indexOf('"') !== -1 && next_dep_bc_listItems.length === 2) {
                                lvDepartments.push('men\'s');
                                lvDepartments.push('women\'s');
                            } else {
                                // for the other departments, e.g. christmas stuff, which needs much finer-grain
                                // departments defined in the search terms
                                lvDepartments.push(next_dep_bc_link_text);
                            }
                        }
                    }
                    if(next_dep_bc_listItems.length > 0) {
                        logMessage_extra += '  Departments: found in class="BreadcrumbNavigation"' + '\n';
                        lvFoundDepartments = true;
                    }
                }

                /* Menu */

                var next_dep_menu = pvDOM.querySelector('li.currentDepartment');
                if(next_dep_menu !== null){
                    lvDepartments.push(next_dep_menu.getAttribute('data-department').toLowerCase().trim());
                    lvFoundDepartments = true;
                }

                if(!lvFoundDepartments) {
                    logMessage_extra += '  Departments: FAILED to find in class="BreadcrumbNavigation"' + '\n';
                }

                /***************
                 * Breadcrumbs *
                 ***************/

                var next_bc = next_dep_bc;
                if(next_bc.length > 0){
                    next_bc_listItems = next_bc[0].getElementsByTagName('li');
                    if(next_bc_listItems.length > 1) {
                        lvBreadcrumbs = next_bc_listItems[0].textContent.toLowerCase();
                        logMessage_extra += '  Breadcrumbs: found in class="BreadcrumbNavigation"' + '\n';
                        lvFoundBreadcrumbs = true;
                    }
                }

                if(!lvFoundBreadcrumbs) {
                    logMessage_extra += '  Breadcrumbs: FAILED to find in class="BreadcrumbNavigation"' + '\n';
                }

                // Men/women filter checkboxes //

                var next_gender1 = pvDOM.getElementById('gender1');
                var next_gender2 = pvDOM.getElementById('gender2');
                if(next_gender1 !== null && next_gender2 !== null) {
                    if(next_gender1.value === 'gender:women' && next_gender1.checked) {
                        lvWomenFilter = 'WOMEN';
                        lvFoundGender = true;
                    }
                    if(next_gender1.value === 'gender:men' && next_gender1.checked) {
                        lvMenFilter = 'MEN';
                        lvFoundGender = true;
                    }
                    if(next_gender2.value === 'gender:women' && next_gender2.checked) {
                        lvWomenFilter = 'WOMEN';
                        lvFoundGender = true;
                    }
                    if(next_gender2.value === 'gender:men' && next_gender2.checked) {
                        lvMenFilter = 'MEN';
                        lvFoundGender = true;
                    }
                    if(lvFoundGender){
                        logMessage_extra += '  Gender: found in id="gender1" or id="gender2"' + '\n';
                    }

                }

                if(!lvFoundGender) {
                    logMessage_extra += '  Gender: FAILED to find in id="gender1" or id="gender2"' + '\n';
                }

                /************
                 * Products *
                 ************/

                /* Results Page */

                var next_pn_results = pvDOM.getElementsByClassName('Results');

                if(next_pn_results.length > 0) {
                    var next_pn_results_h2s = next_pn_results[0].getElementsByTagName('h2');
                    for (i = 0; i < next_pn_results_h2s.length; i++) {
                        lvProductNames.push(next_pn_results_h2s[i].textContent.toLowerCase().trim());
                    }
                    if(next_pn_results_h2s.length > 0){
                        logMessage_extra += '  Search Results: found in class="Results"' + '\n';
                        lvFoundResults = true;
                    }
                }

                if(!lvFoundResults){
                    logMessage_extra += '  Search Results: FAILED to find in class="Results"' + '\n';
                }

                /* Product page */

                // The StyleCopy class is the box containing the product. It's a div. Inside it are:
                // div: StyleHeader
                //   div: Title
                //     h2             <-- This is our product name!

                // But there can be many styleCopys on the page, because Next do this thing where the whole outfit
                // of the model is itemised from head to toe. After the page finishes loading the RHS scrolls to the
                // appropriate item, which is identified by the styleCopy's parent element (<article>) having the
                // selected class. Except... the selected class is always set initially to the first item, and then
                // updates a few miliseconds later. So we are going to always delay a little if we end up with the
                // selected item also being the first item.

                // Note, it's not every product that does this, but the page structure of single-item products is the same.
                // These cases will always go through on the 10th iteration, which creates an unfortunate delay.

                if(!lvFoundResults){

                    var next_pn_prod_styleCopys = pvDOM.getElementsByClassName('StyleCopy');

                    if(next_pn_prod_styleCopys.length > 0){
                        for(i = 0; i < next_pn_prod_styleCopys.length; i++){
                            if(next_pn_prod_styleCopys[i].parentElement.className.indexOf('Selected') !== -1) {
                                // if the user has happened to select a product that is displayed first in the list
                                // then they will have to wait nine iterations before we proceed. Why? Because this will
                                // hopefully give the page time to set the selected to a different product when it is, in fact,
                                // not the first item in the list after all
                                if((next_pn_prod_styleCopys[i].parentElement.className.indexOf('FirstItem') !== -1 && attemptCount > 5) ||
                                   (next_pn_prod_styleCopys[i].parentElement.className.indexOf('FirstItem') === -1)){
                                    var next_pn_prod_styleHeaders = next_pn_prod_styleCopys[i].getElementsByClassName('StyleHeader');
                                    if(next_pn_prod_styleHeaders.length > 0) {
                                        lvProductNames.push(next_pn_prod_styleHeaders[0].textContent.toLowerCase().trim());
                                        logMessage_extra += '  Product Page: found in class="StyleCopy"' + '\n';
                                        lvFoundProduct = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                if(!lvFoundProduct){
                    logMessage_extra += '  Product Page: FAILED to find in class="StyleCopy" (nine iterations expected)' + '\n';
                }

                /***********
                 * Wrap Up *
                 ***********/

               // Did we find what we needed
               if(lvFoundDepartments && lvFoundBreadcrumbs && (lvFoundResults || lvFoundProduct)) {
                   lvFoundEverything = true;
               } else {
                   if(!lvFoundDepartments){
                       logMessage_elementsNotFound += 'departments, ';
                   }
                   if(!lvFoundBreadcrumbs){
                       logMessage_elementsNotFound += 'breadcrumbs, ';
                   }
                   if(!lvFoundResults && !lvFoundProduct){
                       logMessage_elementsNotFound += 'product names, ';
                   }
               }

            break;

            case 'www.newlook.com':

                runSexSearch = true;

                /***************
                 * Departments *
                 ***************/

                // Not required, newlook is fashion only. Could split out shoes, but probably not worth it

                /***************
                 * Breadcrumbs *
                 ***************/

                var newlook_bc = pvDOM.getElementsByClassName('breadcrumb');
                if(newlook_bc.length > 0){
                    lvBreadcrumbs = newlook_bc[0].textContent.toLowerCase().trim();
                    logMessage_extra += '  Breadcrumbs: found in class="breadcrumb"' + '\n';
                    lvFoundBreadcrumbs = true;
                }

                if(!lvFoundBreadcrumbs) {
                    logMessage_extra += '  Breadcrumbs: FAILED to find in class="breadcrumb"' + '\n';
                }

                /**********
                 * Gender *
                 **********/

                var newlook_gender_bc = pvDOM.getElementsByClassName('breadcrumbRemoveText');
                if(newlook_gender_bc.length > 0) {
                    for(i = 0; i < newlook_gender_bc.length; i++){
                        if(newlook_gender_bc[i].innerHTML === 'Mens'){
                            lvMenFilter = 'MEN';
                        } else
                        if(newlook_gender_bc[i].innerHTML === 'Womens'){
                            lvWomenFilter = 'WOMEN';
                        }
                    }
                    if(newlook_gender_bc.length > 0){
                        logMessage_extra += '  Gender: found in class="breadcrumbRemoveText"' + '\n';
                        lvFoundGender = true;
                    }
                }

                if(!lvFoundGender){
                    logMessage_extra += '  Gender: FAILED to find in class="breadcrumbRemoveText"' + '\n';
                }

                /************
                 * Products *
                 ************/

                /* Results Page */

                var newlook_pn_results = pvDOM.getElementsByClassName('prod_overview');

                if(newlook_pn_results.length > 0) {
                    for(i = 0; i < newlook_pn_results.length; i++){
                        var newlook_pn_results_descs = newlook_pn_results[i].getElementsByClassName('desc');
                        if(newlook_pn_results_descs.length > 0){
                            lvProductNames.push(newlook_pn_results_descs[0].textContent.toLowerCase().trim());
                            lvFoundResults = true;
                        }
                    }
                    if(lvFoundResults){
                        logMessage_extra += '  Search Results: found in class="prod_overview"' + '\n';
                    }
                }

                if(!lvFoundResults){
                    logMessage_extra += '  Search Results: FAILED to find in class="prod_overview"' + '\n';
                }

                /* Product Page */

                if(!lvFoundResults){

                    newlook_pn_prod = pvDOM.getElementsByClassName('title_container');
                    if(newlook_pn_prod.length > 0){
                        lvProductNames.push(newlook_pn_prod[0].textContent.toLowerCase().trim());
                        logMessage_extra += '  Product Page: found in class="title_container"' + '\n';
                        lvFoundProduct = true;
                    }

                    if(!lvFoundProduct){
                        logMessage_extra += '  Product Page: FAILED to find in class="title_container"' + '\n';
                    }
                }

                /***********
                 * Wrap Up *
                 ***********/

                // Did we find what we needed
                if(lvFoundBreadcrumbs && (lvFoundResults || lvFoundProduct)) {
                    lvFoundEverything = true;
                } else {
                    if(!lvFoundBreadcrumbs){
                        logMessage_elementsNotFound += 'breadcrumbs, ';
                    }
                    if(!lvFoundResults && !lvFoundProduct){
                        logMessage_elementsNotFound += 'product names, ';
                    }
                }

            break;

            case 'www.topshop.com':

                runSexSearch = true;

                /***************
                 * Departments *
                 ***************/

                // Not required, topshop is fashion only

                /***************
                 * Breadcrumbs *
                 ***************/

                // Not required: Topshop is women only

                /**********
                 * Gender *
                 **********/

                // Topshop is women only
                sexOverride = 'women';

                /************
                 * Products *
                 ************/

                /* Results Page */

                // There's a wrapper_page_conent on the search and product page, but the one on the search page
                // has a class of category_products

                var topshop_pn_results = null;
                topshop_pn_results = pvDOM.getElementsByClassName('products');

                if(topshop_pn_results.length > 0){
                    var topshop_pn_results_productDescriptions = topshop_pn_results[0].getElementsByClassName('product_name');
                    for(i = 0; i < topshop_pn_results_productDescriptions.length; i++){
                        lvProductNames.push(topshop_pn_results_productDescriptions[i].textContent.toLowerCase().trim());
                    }
                    if(topshop_pn_results_productDescriptions.length > 0){
                        logMessage_extra += '  Search Results: found in class="products" (inside id="wrapper_page_content" div with class="category_products")' + '\n';
                        lvFoundResults = true;
                    }
                }

                if(!lvFoundResults){
                    logMessage_extra += '  Search Results: FAILED to find in id="wrapper_content" (inside id="wrapper_content" div with class="results_container")' + '\n';
                }

                /* Product page */

                if(!lvFoundResults){
                    var topshop_pn_prod = pvDOM.getElementsByClassName('product_details');
                    if(topshop_pn_prod.length > 0){
                        logMessage_extra += '  Product Page: found in class="product_details"' + '\n';
                        var topshop_pn_prod_1hs = topshop_pn_prod[0].getElementsByTagName('h1');
                        if(topshop_pn_prod_1hs.length > 0) {
                            lvProductNames.push(topshop_pn_prod_1hs[0].textContent.toLowerCase().trim());
                            lvFoundProduct = true;
                        }
                    }
                }

                if(lvFoundProduct) {
                    logMessage_extra += '  Product Page: FAILED to find in class="product_column_2"' + '\n';
                }

                /***********
                * Wrap Up *
                ***********/

               // Did we find what we needed
               if(lvFoundResults || lvFoundProduct) {
                   lvFoundEverything = true;
               } else {
                  if(!lvFoundResults && !lvFoundProduct){
                        logMessage_elementsNotFound += 'product names, ';
                  }
              }

            break;

            case 'www.tesco.com':

                runSexSearch = false;

                /***************
                 * Departments *
                 ***************/

                // It's all groceries (cleaning, toiletries, etc), everything else is turned off

                /***************
                 * Breadcrumbs *
                 ***************/

                // Not required - no gender

                /************
                 * Products *
                 ************/

                /* Results Page */

                var tesco_pn_results = pvDOM.getElementsByClassName('allProducts');

                if(tesco_pn_results.length > 0) {

                    tesco_pn_results_spans = tesco_pn_results[0].getElementsByTagName('span');
                    for (i = 0; i < tesco_pn_results_spans.length; i++) {
                        if(tesco_pn_results_spans[i].getAttribute('data-title') === 'true') {
                            lvProductNames.push(tesco_pn_results_spans[i].textContent.toLowerCase().trim());
                            lvFoundResults = true;
                        }
                    }
                    if(lvFoundResults) {
                        logMessage_extra += '  Search Results: found in class="allProducts"' + '\n';
                    }
                }

                if(!lvFoundResults){
                    logMessage_extra += '  Search Results: FAILED to find in class="allProducts"' + '\n';
                }

                /* Product Page */

                if(!lvFoundResults){

                    var tesco_pn_prod = pvDOM.getElementsByClassName('productDetailsContainer');

                    if(tesco_pn_prod.length > 0) {
                        var tesco_pn_prod_spans = tesco_pn_prod[0].getElementsByClassName('descriptionDetails')[0].getElementsByTagName('span');
                        // there should only ever be one, but for good measure we'll loop through
                        for (i = 0; i < tesco_pn_prod_spans.length; i++) {
                            if(tesco_pn_prod_spans[i].getAttribute('data-title') === 'true') {
                                lvProductNames.push(tesco_pn_prod_spans[i].textContent.toLowerCase().trim());
                                lvFoundProduct = true;
                            }
                        }
                        if(lvFoundProduct){
                            logMessage_extra += '  Product Page: found in class="productDetailsContainer"' + '\n';
                        }
                    }
                }

                if(!lvFoundProduct){
                    logMessage_extra += '  Product Page: FAILED to find in class="productDetailsContainer"' + '\n';
                }

                /***********
                 * Wrap Up *
                 ***********/

                // Did we find what we needed
                if(lvFoundResults || lvFoundProduct) {
                    lvFoundEverything = true;
                } else {
                   if(!lvFoundResults && !lvFoundProduct){
                       logMessage_elementsNotFound += 'product names, ';
                   }
               }

            break;

            case 'www.sainsburys.co.uk':

                runSexSearch = false;

                /***************
                 * Departments *
                 ***************/

                // It's all groceries (cleaning, toiletries, etc), everything else is turned off

                /***************
                 * Breadcrumbs *
                 ***************/

                // Not required - no gender

                /************
                 * Products *
                 ************/

                /* Results Page */

                var sainsbury_pn_results = pvDOM.getElementById('productLister');

                if(sainsbury_pn_results !== null) {
                    var sainsbury_pn_results_h3s = sainsbury_pn_results.getElementsByTagName('h3');
                    for (i = 0; i < sainsbury_pn_results_h3s.length; i++) {
                        lvProductNames.push(sainsbury_pn_results_h3s[i].textContent.toLowerCase().trim());
                    }
                    if(sainsbury_pn_results_h3s.length > 0){
                        logMessage_extra += '  Search Results: found in id="productLister"' + '\n';
                        lvFoundResults = true;
                    }
                }

                if(!lvFoundResults){
                    logMessage_extra += '  Search Results: FAILED to find in id="productLister"' + '\n';
                }

                /* Product Page */

                if(!lvFoundResults){

                    var sainsbury_pn_prod = pvDOM.getElementsByClassName('productTitleDescriptionContainer');

                    if(sainsbury_pn_prod.length > 0) {
                        var sainsbury_pn_prod_h1s = sainsbury_pn_prod[0].getElementsByTagName('h1');
                        lvProductNames.push(sainsbury_pn_prod_h1s[0].textContent.toLowerCase().trim());
                        logMessage_extra += '  Product Page: found in class="productTitleDescriptionContainer"' + '\n';
                        lvFoundProduct = true;
                    }
                }
                if(!lvFoundProduct){
                    logMessage_extra += '  Product Page: FAILED to find in class="productTitleDescriptionContainer"' + '\n';
                }

                /***********
                 * Wrap Up *
                 ***********/

                // Did we find what we needed
                if(lvFoundResults || lvFoundProduct) {
                    lvFoundEverything = true;
                } else {
                    if(!lvFoundResults && !lvFoundProduct){
                        logMessage_elementsNotFound += 'product names, ';
                    }
                }

            break;

            case 'www.waitrose.com':

                // only works on grid pages

                runSexSearch = false;

                /***************
                 * Departments *
                 ***************/

                /* Breadcrumbs */

                var waitrose_dep_bc = pvDOM.querySelector('.breadcrumb');
                if(waitrose_dep_bc !== null){
                    var waitrose_dep_bc_listItems = waitrose_dep_bc.getElementsByTagName('li');
                    for(i = 0; i < waitrose_dep_bc_listItems.length; i++) {
                        var waitrose_dep_bc_listItem_text = waitrose_dep_bc_listItems[i].textContent.toLowerCase().trim();
                        if(waitrose_dep_bc_listItem_text !== 'home' && waitrose_dep_bc_listItem_text.length > 0) {
                            lvDepartments.push(waitrose_dep_bc_listItem_text);
                            lvFoundDepartments = true;
                        }
                    }
                    if(lvFoundDepartments){
                        logMessage_extra += '  Departments: found in class="breadcrumb"' + '\n';
                    }
                }
                if(!lvFoundDepartments) {
                    logMessage_extra += '  Departments: FAILED to find in class="breadcrumbs"' + '\n';
                }

                /* Breadcrumbs */

                // The categories we want are in <ul> elements, direclty under the
                // .refinement <nav> element. There are <ul>s nested within <ul>s.
                // After the last of these top level <ul> elements we get another div, which contains its own
                // <ul>s. We don't want these.

                var waitrose_dep_cat = pvDOM.querySelector('.refinement');
                if(waitrose_dep_cat !== null){

                    // First get the ul's that are directly inside the nav
                    var waitrose_dep_cat_uls = waitrose_dep_cat.querySelectorAll('nav > ul');

                    // For each ul, pull all the <a>s into an array
                    var waitrose_dep_cat_links = [];
                    for(i = 0; i < waitrose_dep_cat_uls.length; i++) {
                        var waitrose_dep_cat_ul_link = waitrose_dep_cat_uls[i].querySelectorAll('a');
                        for(j = 0; j < waitrose_dep_cat_ul_link.length; j++) {
                            waitrose_dep_cat_links.push(waitrose_dep_cat_ul_link[j].textContent);
                        }
                    }

                    // And now pull it all together
                    for(i = 0; i < waitrose_dep_cat_links.length; i++) {
                        var waitrose_a_text;
                        if(waitrose_dep_cat_links[i].indexOf('(') > -1) {
                            waitrose_dep_cat_links_text = waitrose_dep_cat_links[i].substring(0,waitrose_dep_cat_links[i].indexOf('(')-1).trim();
                        } else {
                            waitrose_dep_cat_links_text = waitrose_dep_cat_links[i].trim();
                        }
                        if(waitrose_dep_cat_links_text !== 'home' && waitrose_dep_cat_links_text.length > 0) {
                            lvDepartments.push(waitrose_dep_cat_links_text.toLowerCase());
                            lvFoundDepartments = true;
                        }
                    }
                    if(lvFoundDepartments){
                        logMessage_extra += '  Departments: found in class="refinement"' + '\n';
                    }
                }

                if(!lvFoundDepartments){
                    logMessage_extra += '  Departments: FAILED to find in class="refinement"' + '\n';
                }

                /***************
                 * Breadcrumbs *
                 ***************/

                var waitrose_bc = waitrose_dep_bc;
                if(waitrose_bc !== null){
                    lvBreadcrumbs = waitrose_bc.textContent.toLowerCase().trim();
                    logMessage_extra += '  Breadcrumbs: found in class="breadcrumbs"' + '\n';
                    lvFoundBreadcrumbs = true;
                }

                if(!lvFoundBreadcrumbs){
                    logMessage_extra += '  Breadcrumbs: FAILED to find in class="BreadcrumbNavigation"' + '\n';
                }

                /************
                 * Products *
                 ************/

                /* Results Page */

                var waitrose_pn_results = pvDOM.getElementsByClassName('products-grid');

                if(waitrose_pn_results.length > 0) {
                    var waitrose_pn_results_container = waitrose_pn_results[0].querySelectorAll('div.m-product-details-container > a');
                    for (i = 0; i < waitrose_pn_results_container.length; i++) {
                        lvProductNames.push(waitrose_pn_results_container[i].textContent.toLowerCase().trim());
                    }
                    if(waitrose_pn_results_container.length > 0){
                        logMessage_extra += '  Search Results: found in class="products-grid" > div.m-product-details-container' + '\n';
                        lvFoundResults = true;
                    }
                }

                if(!lvFoundResults){
                    logMessage_extra += '  Search Results: FAILED to find any div.m-product-details-container' + '\n';
                }

                /* Product Page */

                // there are no breadcrumbs or categories on product pages, so let's not display results for these pages

                /***********
                 * Wrap Up *
                 ************/

                // Did we find what we needed
                if(lvFoundDepartments && lvFoundBreadcrumbs && lvFoundResults) {
                    lvFoundEverything = true;
                } else {
                   if(!lvFoundDepartments){
                       logMessage_elementsNotFound += 'departments, ';
                   }
                   if(!lvFoundBreadcrumbs){
                       logMessage_elementsNotFound += 'breadcrumbs, ';
                   }
                   if(!lvFoundResults){
                       logMessage_elementsNotFound += 'product names, ';
                   }
               }

            break;

            case 'www.notonthehighstreet.com':

                runSexSearch = true;

                /***************
                 * Departments *
                 ***************/

                // Breadcrumbs do not display for search (all deps) or sale links, so if we spot "search"
                // or "sale" in the breadcrumb, set the departmental override.
                // We do categories first because, if we've got it from categories, we don't wan to
                // override

                /* Categories */

                noth_dep_cat = pvDOM.getElementById('categories_filterbox');
                if(noth_dep_cat !== null){
                    noth_dep_cat_selectedLink = noth_dep_cat.querySelector('a.selected.top_level_category');
                    if(noth_dep_cat_selectedLink !== null){
                        lvDepartments.push(noth_dep_cat_selectedLink.textContent.toLowerCase().trim());
                        lvFoundDepartments = true;
                    }
                }

                /* Breadcrumbs */

                var noths_dep_bc = pvDOM.getElementById('breadcrumb');
                if(noths_dep_bc !== null){

                    // We need to take all the links, and the non-link (span) at the end
                    var noth_dep_bc_array = [];
                    var noth_dep_bc_links = noths_dep_bc.getElementsByTagName('a');
                    for(i = 0; i < noth_dep_bc_links.length; i++){
                        noth_dep_bc_array.push(noth_dep_bc_links[i].textContent.toLowerCase().trim());
                    }
                    noth_dep_bc_array.push(noths_dep_bc.querySelector('span.current').textContent.toLowerCase().trim());

                    for(i = 0; i < noth_dep_bc_array.length; i++) {
                        if(noth_dep_bc_array[i] !== 'homepage' && noth_dep_bc_array[i].indexOf("search") === -1 && noth_dep_bc_array[i].indexOf("sale") === -1) {
                            lvDepartments.push(noth_dep_bc_array[i]);
                            lvFoundDepartments = true;
                        }
                        if(!lvFoundDepartments && noth_dep_bc_array[i].indexOf("search") !== -1 || noth_dep_bc_array[i].indexOf("sale") !== -1){
                            departmentOverride = true;
                            lvFoundDepartments = true;
                            lvNumberOfResultsToConsider = 5; // reduce this so we are less likely to display weird results
                        }
                    }
                }

                if(lvFoundDepartments) {
                    logMessage_extra += '  Departments: found in id="breadcrumb"' + '\n';
                }

                /***************
                 * Breadcrumbs *
                 ***************/

                 var noths_bc = noths_dep_bc;
                 if(noths_bc !== null){
                     lvBreadcrumbs = noths_bc.textContent.toLowerCase().trim();
                     logMessage_extra += '  Breadcrumbs: found in id="breadcrumb"' + '\n';
                     lvFoundBreadcrumbs = true;
                 }

                 if(!lvFoundBreadcrumbs){
                     logMessage_extra += '  Breadcrumbs: FAILED to find in id="breadcrumb"' + '\n';
                 }

                /************
                 * Products *
                 ************/

                /* Results Page */

                var noths_pn_results = pvDOM.getElementsByClassName('categories_content_container');
                if(noths_pn_results.length === 0){
                    noths_pn_results = pvDOM.getElementsByClassName('featured_content');
                }
                if(noths_pn_results.length > 0) {
                    var noths_pn_results_productDetails = noths_pn_results[0].getElementsByClassName('product_details');
                    for (i = 0; i < noths_pn_results_productDetails.length; i++) {
                        lvProductNames.push(noths_pn_results_productDetails[i].textContent.toLowerCase().trim());
                    }
                    if(noths_pn_results_productDetails.length > 0){
                        logMessage_extra += '  Search Results: found in class="categories_content_container" or "featured_content"' + '\n';
                        lvFoundResults = true;
                    }
                }

                if(!lvFoundResults){
                    logMessage_extra += '  Search Results: FAILED to find in class="categories_content_container" and "featured_content"' + '\n';
                }

                /* Product Page */

                if(!lvFoundResults) {

                    var noths_pn_prod = pvDOM.querySelectorAll('h1.product_title');

                    if(noths_pn_prod.length > 0) {
                        lvProductNames.push(noths_pn_prod[0].textContent.toLowerCase().trim());
                        logMessage_extra += '  Product Page: found in h1.product_title' + '\n';
                        lvFoundProduct = true;
                    }
                }

                if(!lvFoundProduct){
                    logMessage_extra += '  Product Page: FAILED to find in h1.product_title' + '\n';
                }

                /***********
                 * Wrap Up *
                 ***********/

                // Did we find what we needed
                if(lvFoundDepartments && lvFoundBreadcrumbs && (lvFoundResults || lvFoundProduct)) {
                    lvFoundEverything = true;
                } else {
                    if(!lvFoundDepartments){
                        logMessage_elementsNotFound += 'departments, ';
                    }
                    if(!lvFoundBreadcrumbs){
                        logMessage_elementsNotFound += 'breadcrumbs, ';
                    }
                    if(!lvFoundResults && !lvFoundProduct){
                        logMessage_elementsNotFound += 'product names, ';
                    }
                }

            break;

            case 'www.johnlewis.com':

                // reliable breadcrumbs, except on results page from search. Use categories in this case
                // The categories aren't as good as the breadrumbs, e.g. "shoes" does not appear in categories, just "men" and "women"

                runSexSearch = true;

                /***************
                 * Departments *
                 ***************/

                // Only look 4 items down the categories otherwise random rubbish appears

                /* breadcrumbs */

                var johnlewis_dep_bc = pvDOM.getElementById('breadcrumbs');
                if(johnlewis_dep_bc !== null){
                    johnlewis_dep_bc_listItems = johnlewis_dep_bc.getElementsByTagName('li');
                    for(i = 0; i < johnlewis_dep_bc_listItems.length; i++){
                        johnlewis_dep_bc_listItem_text = johnlewis_dep_bc_listItems[i].textContent.toLowerCase().trim();
                        if(johnlewis_dep_bc_listItem_text !== 'Home Page') {
                            lvDepartments.push(johnlewis_dep_bc_listItem_text);
                            lvFoundDepartments = true;
                        }
                    }
                }

                var johnlewis_dep_cat = pvDOM.getElementById('facet-department');
                if(johnlewis_dep_cat !== null){
                    johnlewis_dep_cat_listItems = johnlewis_dep_cat.getElementsByTagName('li');
                    for(i = 0; i < johnlewis_dep_cat_listItems.length && i < 5; i++){
                        johnlewis_dep_cat_listItem_text = johnlewis_dep_cat_listItems[i].textContent.toLowerCase().trim();
                        johnlewis_dep_cat_listItem_text = johnlewis_dep_cat_listItem_text.substring(0,johnlewis_dep_cat_listItem_text.indexOf('(')-1);
                        lvDepartments.push(johnlewis_dep_cat_listItem_text.trim());
                        lvFoundDepartments = true;
                    }
                }

                if(lvFoundDepartments){
                    logMessage += 'Departments: found in id=""' + '\r';
                }

                if(!lvFoundDepartments) {
                    logMessage += 'Departments: FAILED to find first element in id=""' + '\r';
                }

                /***************
                 * Breadcrumbs *
                 ***************/

                var johnlewis_bc = johnlewis_dep_bc;
                if(johnlewis_bc !== null){
                    lvBreadcrumbs = johnlewis_bc.textContent.toLowerCase().trim();
                    logMessage += 'Breadcrumbs: found in id="breadcrumbs"' + '\r';
                    lvFoundBreadcrumbs = true;
                }

                if(!lvFoundBreadcrumbs){
                    logMessage += 'Breadcrumbs: FAILED to find in id=""' + '\r';
                }

                /************
                 * Products *
                 ************/

                /* Results Page */

                var johnlewis_pn_results = pvDOM.getElementById('product-grid');

                if(johnlewis_pn_results !== null) {
                    var johnlewis_pn_results_links = johnlewis_pn_results.querySelectorAll('article > a');
                    for (i = 0; i < johnlewis_pn_results_links.length; i++) {
                        lvProductNames.push(johnlewis_pn_results_links[i].textContent.toLowerCase().trim());
                    }
                    if(johnlewis_pn_results_links.length > 0){
                        logMessage_extra += '  Search Results: found in article tags of div with class="product-grid"' + '\n';
                        lvFoundResults = true;
                    }
                }
                if(!lvFoundResults){
                    logMessage_extra += '  Search Results: FAILED to find class="product-grid"' + '\n';
                }

                /* Product Page */

                if(!lvFoundResults){

                    var johnlewis_pn_prod = pvDOM.getElementById('prod-title');

                    if(johnlewis_pn_prod !== null) {
                        lvProductNames.push(johnlewis_pn_prod.textContent.toLowerCase().trim());
                        logMessage_extra += '  Product Page: found in id="prod-title"' + '\n';
                        lvFoundProduct = true;
                    }
                }

                if(!lvFoundProduct){
                     logMessage_extra += '  Product Page: FAILED to find in id="prod-title"' + '\n';
                }

                /***********
                 * Wrap Up *
                 ***********/

               // Did we find what we needed
               if(lvFoundDepartments && lvFoundBreadcrumbs && (lvFoundResults || lvFoundProduct)) {
                   lvFoundEverything = true;
               } else {
                  if(!lvFoundDepartments){
                      logMessage_elementsNotFound += 'departments, ';
                  }
                  if(!lvFoundBreadcrumbs){
                      logMessage_elementsNotFound += 'breadcrumbs, ';
                  }
                  if(!lvFoundResults && !lvFoundProduct){
                      logMessage_elementsNotFound += 'product names, ';
                  }

              }

            break;

            case 'www.paperchase.co.uk':

                runSexSearch = false;

                /***************
                 * Departments *
                 ***************/

                // Not bothering with this. It only displays after clicking from a menu,
                // (i.e. no categories from search) and it's all fairly similar departments anyway

                /************
                 * Products *
                 ************/

                /* Results Page */

                var paperchase_pn_results = pvDOM.getElementsByClassName('category-products');

                if(paperchase_pn_results.length > 0) {
                    var paperchase_pn_results_h2s = paperchase_pn_results[0].querySelectorAll('h2.product-name');
                    for (i = 0; i < paperchase_pn_results_h2s.length; i++) {
                        lvProductNames.push(paperchase_pn_results_h2s[i].textContent.toLowerCase().trim());
                    }
                    if(paperchase_pn_results_h2s.length > 0){
                        logMessage_extra += '  Search Results: found in article tags of div with class="category-products"' + '\n';
                        lvFoundResults = true;
                    }
                }

                if(!lvFoundResults){
                    logMessage_extra += '  Search Results: FAILED to find class="category-products"' + '\n';
                }

                /* Product Page */

                if(!lvFoundResults){

                    var paperchase_pn_prod = pvDOM.querySelectorAll('div.product-name');

                    if(paperchase_pn_prod.length > 0) {
                        lvProductNames.push(paperchase_pn_prod[0].textContent.toLowerCase().trim());
                        logMessage_extra += '  Product Page: found in div.product-name' + '\n';
                        lvFoundProduct = true;
                    }

                    if(!lvFoundProduct) {
                        logMessage_extra += '  Product Page: FAILED to find in div.product-name' + '\n';
                    }
                }

                /***********
                 * Wrap Up *
                 ***********/

                // Did we find what we needed
                if(lvFoundResults || lvFoundProduct) {
                    lvFoundEverything = true;
                } else {
                   if(!lvFoundResults && !lvFoundProduct){
                       logMessage_elementsNotFound += 'product names, ';
                   }
               }

            break;

            //case 'groceries.asda.com':
            // for archived  Asda code, see bottom of script
            //break;

            default:
                logMessage += 'NO SWITCH STATEMENT EXISTS FOR THIS WEBSITE' + '\n';
                log(gvScriptName_CSSearch + '.getElements: no switch statement written for active website: ' + websiteURL,'ERROR');
        }

        /********************************************************************
         * Tidy up the page element arrays before passing them on to search *
         ********************************************************************/

        // We can't let any blank elements get through, otherwise they will match on everything
        // And we dont want to look at every single search result - just the top x

        for(i = 0; i < lvDepartments.length; i++){
            if(lvDepartments[i].trim() === '' || lvDepartments[i] === null){
                lvDepartments.splice(i,1);
                i--;
            }
        }

        // Strip out carriage returns and extra spaces (more useful for logging than anything else)
        lvBreadcrumbs = lvBreadcrumbs.replace(/[\n\r]+/g, '');
        lvBreadcrumbs = lvBreadcrumbs.replace(/\s{2,10}/g, ' ');
        lvBreadcrumbs = lvBreadcrumbs.trim();
        if(lvBreadcrumbs === ''){ // if we end up with nothing, make it null otherwise it will return false positives.
            lvBreadcrumbs = null;
        }

        var lvProductNames_clean = [];
        for(i = 0; i < Math.min(lvProductNames.length,lvNumberOfResultsToConsider); i++){
            if(lvProductNames[i].trim() !== '' && lvDepartments[i] !== null){
                lvProductNames_clean.push(lvProductNames[i]);
            }
        }
        lvProductNames = lvProductNames_clean;

        /*********************************************************************
         * Comprehensively log the results of the page search, for debugging *
         *********************************************************************/

        if(lvFoundEverything){
            logMessage += 'SUCCESS: Found necessary pvDOM elements to run search.' + '\n';
            logMessage += '\n' + 'Extra detail: ' + '\n' + logMessage_extra + '\n';
        } else {
            logMessage += 'FAILURE: Did not find necessary pvDOM elements to run search.' + '\n';
            logMessage += '\n' + 'Failed to find: ' + logMessage_elementsNotFound + '\n';
            logMessage += 'Extra detail: ' + logMessage_extra + '\n';
        }

        // If we did find everything we needed, then we're going to run the search. So let's
        // output to the console all the page elements that will be passed through to the search.
        if(lvFoundEverything){

            logMessage += '\n' + 'Page Elements:' + '\n';

            var i_counter;

            if(lvFoundDepartments){
                logMessage += '\n' + '    Departments (' + lvDepartments.length + '):' + '\n';
                for(i = 0; i < lvDepartments.length; i++){
                    i_counter = i + 1;
                    logMessage += '      ' + i_counter + '. ' + lvDepartments[i] + '\n';
                }
            }
            if(lvFoundBreadcrumbs){
                logMessage += '\n' + '    Breadcrumbs:' + '\n';
                logMessage += '      ' + lvBreadcrumbs + '\n';
            }
            if(lvFoundGender){
                logMessage += '\n' + '    Gender:' + '\n';
                logMessage += '      Women Filter:' + lvWomenFilter + '\n';
                logMessage += '      Men Filter:' + lvMenFilter + '\n';
            }
            if(lvFoundResults) {
                logMessage += '\n' + '    Product Names from Results Page (' + lvProductNames.length + '):' + '\n';
                for(i = 0; i < lvProductNames.length; i++){
                    i_counter = i + 1;
                    logMessage += '      ' + i_counter + '. ' + lvProductNames[i] + '\n';
                }
            }
            if(lvFoundProduct) {
                logMessage += '\n' + '    Product Page:' + '\n';
                for(i = 0; i < lvProductNames.length; i++){
                    i_counter = i + 1;
                    logMessage += '      ' + i_counter + '. ' + lvProductNames[i] + '\n';
                }
            }
            logMessage += '\n';
        }

        /**************************************
         * Call the relevant search functions *
         **************************************/

        // To do, move this out to the master function and use
        // callbacks/promises to pass on to the appropriate next functions.

        if(!lvFoundEverything && attemptCount < 10) {
            // If we don't have any productNames yet then we try the page a few times, in case it has any fancy ajax-esque loading of the search results
            var delayMS = 1000;
            logMessage += '\n' + 'Attempt count (' + attemptCount + ') < 10, waiting ' + delayMS + 'ms and retrying' + '\n';
            log(gvScriptName_CSSearch + logMessage,'SERCH');
            logMessage = '';
            window.setTimeout(function(){pvArgs.attemptCount++; return getElements(pvArgs);},delayMS);
        } else if (lvFoundEverything) {

            logMessage += '** Search Page Elements **' + '\n\n';

            var pageElements = {productNames: lvProductNames,
                                departments:  lvDepartments,
                                breadcrumbs:  lvBreadcrumbs,
                                URLText:      URLText,
                                menFilter:    lvMenFilter,
                                womenFilter:  lvWomenFilter,
                                sexOverride:  sexOverride};

            if(runSexSearch) {
                sexSearchCallback(pageElements,websiteURL,productSearchCallback,searchData,logMessage, departmentOverride, pvArgs.websiteSearchResults);
            } else {
                productSearchCallback(pageElements,websiteURL,searchData,logMessage, departmentOverride, pvArgs.websiteSearchResults);
            }
        } else { // if we havne't found every page element we need
            log(gvScriptName_CSSearch + '.getElements: Failed to pull expected elements from the pvDOM on websiteURL == ' + websiteURL,'ERROR');
            // No need to call our search functions, just return no search results (although there might be websiteSearchResults)
            logMessage += '\n' + 'FAILED to pull any productNames from pvDOM elements, skipping search and returning no results' + '\n';
            processSearchResults(null,pvArgs.websiteSearchResults,false);
        }
    } // if this tab is configured for product-level search
    else {
        // If it's not configured for product-level search, then it must be website level search
        processSearchResults(null,pvArgs.websiteSearchResults,false);
    }
}

/*
 * Search the various page elements for the searchProduct sex
 */
function sexSearch(pageElements, websiteURL, productSearchCallback, searchData, logMessage, departmentOverride, pvWebsiteSearchResults) {

    var isSexOverrideSet = false;
    var tempLogMsg = '';
    var foundMen = false;
    var foundWomen = false;

    if (pageElements.sexOverride === 'women'){
        tempLogMsg += 'sexOverride === "women"';
        foundWomen = true;
        isSexOverrideSet = true;
    } else if (pageElements.sexOverride === 'men'){
        tempLogMsg += 'sexOverride === "men"';
        foundMen = true;
        isSexOverrideSet = true;
    } else {
        tempLogMsg += 'sexOverride not set';
        isSexOverrideSet = false;
    }

    logMessage += 'Sex search (' + tempLogMsg + '):' + '\n\n';

    if(!isSexOverrideSet){

         // Some of the searchProducts will be sex-specific, so we need to see if we can identify
         // a sex-specific category/search on the current page

         // The first thing to do is see if we have search filters for sex
         if(pageElements.womenFilter === 'WOMEN') {
             logMessage += '    Identified a women filter on page' + '\n';
             foundWomen = true;
         }
         if(pageElements.menFilter === 'MEN') {
             logMessage += '    Identified a men filter on page' + '\n';
             foundMen = true;
         }
         // Next, check the URL for a sex
         if ((new RegExp('\\b' + 'women' + '\\b','i').test(pageElements.URLText)) ||
                    (new RegExp('\\b' + 'female' + '\\b','i').test(pageElements.URLText))){
             logMessage += '    Identified a women filter in URL' + '\n';
             foundWomen = true;
         } else if ((new RegExp('\\b' + 'men' + '\\b','i').test(pageElements.URLText)) ||
                    (new RegExp('\\b' + 'male' + '\\b','i').test(pageElements.URLText))){
             logMessage += '    Identified a men filter in URL' + '\n';
             foundMen = true;
         }

         // Next, look in the breadcrumbs in the hope that the user has navigated to the item via a men/women category or included sex in their search term
         if (pageElements.breadcrumbs) {
             if(!foundMen && !foundWomen) {
                 if ((new RegExp('\\b' + 'women' + '\\b','i').test(pageElements.breadcrumbs)) ||
                     (new RegExp('\\b' + 'womens' + '\\b','i').test(pageElements.breadcrumbs)) ||
                     (new RegExp('\\b' + 'woman' + '\\b','i').test(pageElements.breadcrumbs)) ||
                     (new RegExp('\\b' + 'lady' + '\\b','i').test(pageElements.breadcrumbs)) ||
                     (new RegExp('\\b' + 'female' + '\\b','i').test(pageElements.breadcrumbs))) {

                     logMessage += '    Identified a women filter in breadcrumbs' + '\n';
                     foundWomen = true;

                 } else if ((new RegExp('\\b' + 'men' + '\\b','i').test(pageElements.breadcrumbs)) ||
                            (new RegExp('\\b' + 'mens' + '\\b','i').test(pageElements.breadcrumbs)) ||
                            (new RegExp('\\b' + 'man' + '\\b','i').test(pageElements.breadcrumbs)) ||
                            (new RegExp('\\b' + 'male' + '\\b','i').test(pageElements.breadcrumbs))) {

                     logMessage += '    Identified a men filter in breadcrumbs' + '\n';
                     foundMen = true;
                 }
             }
         }

         // Next, let's see whether there's a sex in the department list
         // We check them all, otherwise Men's Shoes followed by Women's Shoes would end up with no women's results being displayed
         if (pageElements.departments.length > 0) {
             for (i = 0; i < pageElements.departments.length; i++){
                 if(!foundMen || !foundWomen) {
                     if ((new RegExp('\\b' + 'women' + '\\b','i').test(pageElements.departments[i])) ||
                         (new RegExp('\\b' + 'woman' + '\\b','i').test(pageElements.departments[i])) ||
                         (new RegExp('\\b' + 'lady' + '\\b','i').test(pageElements.departments[i])) ||
                         (new RegExp('\\b' + 'ladies' + '\\b','i').test(pageElements.departments[i])) ||
                         (new RegExp('\\b' + 'lady\'s' + '\\b','i').test(pageElements.departments[i])) ||
                         (new RegExp('\\b' + 'female' + '\\b','i').test(pageElements.departments[i]))) {
                         logMessage += '    Identified a women indicator in a department (' + pageElements.departments[i] + ')' + '\n';
                         foundWomen = true;
                     } else if ((new RegExp('\\b' + 'men' + '\\b','i').test(pageElements.departments[i])) ||
                                (new RegExp('\\b' + 'men\'s' + '\\b','i').test(pageElements.departments[i])) ||
                                (new RegExp('\\b' + 'man' + '\\b','i').test(pageElements.departments[i])) ||
                                (new RegExp('\\b' + 'male' + '\\b','i').test(pageElements.departments[i]))) {
                         logMessage += '    Identified a men indicator in a department (' + pageElements.departments[i] + ')' + '\n';
                         foundMen = true;
                     }
                 }
             }
         }

         // Next, let's see whether the sex is in the product name. Don't run this for multi item pages otherwise a single word containing "men" on a women's items list can prevent the sidebar showing at all (asos, skirts)
         // To do: this should be better than this. Move this sub-sex search into product search level so it only applies to the relevant product
         if (pageElements.productNames.length === 1) {
             for (i = 0; i < pageElements.productNames.length; i++){
                 if(!foundMen && !foundWomen) {
                     if ((new RegExp('\\b' + 'women' + '\\b','i').test(pageElements.productNames[i])) ||
                         (new RegExp('\\b' + 'woman' + '\\b','i').test(pageElements.productNames[i])) ||
                         (new RegExp('\\b' + 'ladies' + '\\b','i').test(pageElements.productNames[i])) ||
                         (new RegExp('\\b' + 'lady\'s' + '\\b','i').test(pageElements.productNames[i])) ||
                         (new RegExp('\\b' + 'female' + '\\b','i').test(pageElements.productNames[i]))) {

                         logMessage += '    Identified a women indicator in the product name' + '\n';
                         foundWomen = true;

                         break;
                     } else if ((new RegExp('\\b' + 'men' + '\\b','i').test(pageElements.productNames[i])) ||
                                (new RegExp('\\b' + 'men\'s' + '\\b','i').test(pageElements.productNames[i])) ||
                                (new RegExp('\\b' + 'man' + '\\b','i').test(pageElements.productNames[i])) ||
                                (new RegExp('\\b' + 'male' + '\\b','i').test(pageElements.productNames[i]))) {

                         logMessage += '    Identified a men indicator in the product name' + '\n';
                         foundMen = true;

                         break;
                     }
                 }
             }
         }

         log(gvScriptName_CSSearch + '.sexSearch: results >>> foundMen == ' + foundMen + ', foundWomen == ' + foundWomen,'DEBUG');

         // If we've found nothing, let's just ignore sex to ensure results come back - even if we return both men and women results
         if(!foundMen && !foundWomen){
             logMessage += '    Did not identify a gender filter, so will return all genders from searchProducts' + '\n';
             foundMen = true;
             foundWomen = true;
         }
     }

     pageElements.useSex = true;
     pageElements.foundMen = foundMen;
     pageElements.foundWomen = foundWomen;

     productSearchCallback(pageElements,websiteURL,searchData,logMessage, departmentOverride, pvWebsiteSearchResults);
}

/*
 * Search the various page elements for the searchProduct product search terms
 */
function productSearch(pageElements,websiteURL,searchData,logMessage, departmentOverride, pvWebsiteSearchResults) {

    log(gvScriptName_CSSearch + '.productSearch: Start','PROCS');

    var lvProductSearchResults = [];
    var productGroupNamesArray = [];

    var foundSomething = false;
    var position_brand;
    var searchTermPositionsArray = [];
    var negativeSearchTermPositionsArray = [];
    var matchedSex;

    logMessage += '\n' + 'Product Name search:' + '\n\n';

    // for each searchProduct
    var tempLogMsg_searchProduct = '';
    for (var i = 0; i < searchData.length; i++) {

        matchedSex = false;

        // Only search for this searchProduct if it belongs to a searchCategory that is valid for the user's current website
        if(searchData[i].websiteURL === websiteURL) {

            tempLogMsg_searchProduct += '    ' + searchData[i].productName + ' (Product Group = ' + searchData[i].productGroupName + ')' + '\n';

            /*****************************************************
             * Match the web page's department(s) to the active  *
             * departments for this website/searchCategory combo *
             *****************************************************/

            var departmentMatch = false;
            if(departmentOverride){
                departmentMatch = true;
                tempLogMsg_searchProduct += '        departmentOverride set, skipping department search' + '\n';
            }
            if(searchData[i].departments === 'all'){
                departmentMatch = true;
                tempLogMsg_searchProduct += '        Website/searchCategory set to ALL departments, skipping department search' + '\n';
            }
            if(!departmentMatch){
                // To do: if the searchProducts are grouped by category, you could confirm this once for a set of searchProducts
                for(var k = 0; k < pageElements.departments.length; k++) {
                    if(searchData[i].departments.indexOf(pageElements.departments[k]) !== -1){
                        // This is a messy bit of custom code to deal with productGroups that appear only by matching to department,
                        // never by productName match. E.g. Books and Toys.
                        // The issue is, if, say, "Toys (1)" appears right at the bottom of the department list, Toy recs will all appear,
                        // possibly at the top ("Toys" comes before "Women's --").
                        // So for these department-only matches, they must be the first department listed.
                        // Note, requires the category departments to be pushed into the array first, in the getPageElements function
                        if(searchData[i].productGroupName === 'Toys' || searchData[i].productGroupName === 'Books') {
                            if(k !== 0 && k !== 1) {
                                // Not counted as a match, do nothing
                                break;
                            } else {
                                departmentMatch = true;
                                tempLogMsg_searchProduct += '        Matched Department: "' + pageElements.departments[k] + '" (' + searchData[i].departments + ')' + ' -- NB. this is a department-only match -- ' + '\n';
                                break;
                            }
                        } else {
                            departmentMatch = true;
                            tempLogMsg_searchProduct += '        Matched Department: "' + pageElements.departments[k] + '" (' + searchData[i].departments + ')' + '\n';
                            break;
                        }
                    }
                }
                if(!departmentMatch){
                    tempLogMsg_searchProduct += '        Failed to match department (' + searchData[i].departments + ')' + '\n';
                }
            }

            /************************************************************************
             * Match the web page's product names to the searchProduct search terms *
             * (searchTerms 1 to x, negative search terms 1 to y, and sex search)   *
             ************************************************************************/

            if(departmentMatch) {

                var foundThisItemInThisElement = false;
                var excludeThisItemInThisElement = false;
                var howManyTimesHaveWeMatchedSearchProduct = 0;

                var tempLogMsg_productNameMatches = '';
                for (var j = 0; j < pageElements.productNames.length; j++) {

                    /* Before we start, reset our search result vars */
                    position_brand = -1;
                    for (var a = 0; a < searchData[i].searchTermsArray.length; a++){
                        searchTermPositionsArray[a] = -1;
                    }
                    for (var b = 0; b < searchData[i].negativeSearchTermsArray.length; b++){
                        negativeSearchTermPositionsArray[b] = -1;
                    }

                    /* Firstly, check whether we have a match on each searchTerm (brand, then postive and negative searchTerms) */

                    // Brand
                    if(searchData[i].brand_LC !== 'all') {
                        //position_brand = pageElements.productNames[j].indexOf(searchData[i].brand_LC);
                        if(new RegExp('\\b' + searchData[i].brand_LC  + '\\b','i').test(pageElements.productNames[j])){
                            position_brand = 1;
                        }
                    } else {
                        position_brand = -2;
                    }

                    // Positive search terms
                    for(a = 0; a < searchData[i].searchTermsArray.length; a++){
                        if(searchData[i].searchTermsArray[a] !== '') {
                        //    log(gvScriptName_CSSearch + '.productSearch: ' + searchData[i].productName + ' - Positive search term ' + a + ' = ' + searchData[i].searchTermsArray[a] + ' - pageElement.productNames[j] = ' + pageElements.productNames[j],'DEBUG');

                            if(new RegExp('\\b' + searchData[i].searchTermsArray[a].toLowerCase() + '\\b','i').test(pageElements.productNames[j] + '.')){
                                searchTermPositionsArray[a] = 1;
                                //log(gvScriptName_CSSearch + '.productSearch: ' + searchData[i].productName + ' - Positive search term ' + a + ' = ' + searchData[i].searchTermsArray[a] + ' - pageElement.productNames[j] = ' + pageElements.productNames[j],'DEBUG');
                            }
                        } else {
                            searchTermPositionsArray[a] = -2;
                        }
                    }

                    // negative search terms
                    for(b = 0; b < searchData[i].negativeSearchTermsArray.length; b++){
                        if(searchData[i].negativeSearchTermsArray[b] !== '') {
                            if(new RegExp('\\b' + searchData[i].negativeSearchTermsArray[b] + '\\b','i').test(pageElements.productNames[j])){
                                negativeSearchTermPositionsArray[b] = 1;
                            }
                        } else {
                            negativeSearchTermPositionsArray[b] = -2;
                        }
                    }

                    /* Secondly, check whether we have a match on sex */

                    // If we're doing a search that requires a match on sex then pageElements.useSex will have been set by the sexSearch function
                    // Otherwise, skip sex entirely and call it a pass
                    if (pageElements.useSex) {

                        // if this SearchProduct has no sex specified, then we want to set this to a successful match and move on
                        if (searchData[i].sex === ''){
                            matchedSex = true;
                        } else {
                            // If we found mention of both man and woman item, then this is a pass regardless of what's on the searchProduct
                            if(pageElements.foundMen && pageElements.foundWomen) {
                                matchedSex = true;
                            } else {
                                if (searchData[i].sex_LC === 'men' && pageElements.foundMen) {
                                    matchedSex = true;
                                } else if (searchData[i].sex_LC === 'women' && pageElements.foundWomen) {
                                    matchedSex = true;
                                } else {
                                    matchedSex = false;
                                }
                            }
                        }
                    } else {
                        matchedSex = true; // this avoids failing the final condition of the function in cases where we don't need to match a sex.
                    }

                    /* Now do the actual condition to see whether the matches constitute a pass or a failing */

                    foundThisItemInThisElement = false;
                    excludeThisItemInThisElement = false;

                    // Logic depends on whether searchProduct is set to OR conditions or AND conditions
                    // We've set our position vars to -2 if the searchProduct didn't have a searchTerm entered.
                    // This way we can ignore blank values for AND (i.e. a product with all blank values will always return)
                    // and take them into account for OR (i.e. a product with one blank value will NOT always return!)

                    // AND condition, positive search terms
                    if(searchData[i].andOr === 'AND') {
                        var searchTermsMatch_AND = true;
                        for(a = 0; a < searchTermPositionsArray.length; a++){
                            if(searchTermPositionsArray[a] === -1){
                                searchTermsMatch_AND = false;
                            }
                        }

                        if(searchTermsMatch_AND && (position_brand > -1 || position_brand === -2) && matchedSex) {
                            foundThisItemInThisElement = true;
                        }
                    }

                    // AND condition, negative search terms //
                    if(searchData[i].negativeAndOr === 'AND') {
                        var negativeSearchTermsMatch_AND = true, negativeSearchTermsMatch_AND_allBlank = true;
                        for(b = 0; b < negativeSearchTermPositionsArray.length; b++){
                            if(negativeSearchTermPositionsArray[b] === -1){
                                negativeSearchTermsMatch_AND = false;
                            }
                            // It's possible they are all blank (-2), in which case, negativeSearchTermsMatch_AND will still be true.
                            if(negativeSearchTermPositionsArray[b] !== -2){
                                negativeSearchTermsMatch_AND_allBlank = false;
                            }
                        }
                        if(negativeSearchTermsMatch_AND && !negativeSearchTermsMatch_AND_allBlank) {
                            excludeThisItemInThisElement = false;
                        }
                    }

                    // OR condition, positive search terms //
                    if(searchData[i].andOr === 'OR') {
                        var searchTermsMatch_OR = false;
                        for(a = 0; a < searchTermPositionsArray.length; a++){
                            if(searchTermPositionsArray[a] > -1 ){
                                searchTermsMatch_OR = true;
                            }
                        }

                        if (searchTermsMatch_OR && (position_brand > -1 || position_brand === -2) && matchedSex) {
                            foundThisItemInThisElement = true;
                        }
                    }

                    // OR condition, negative search terms //
                    if(searchData[i].negativeAndOr === 'OR') {
                        var negativeSearchTermsMatch_OR = false;
                        for(b = 0; b < negativeSearchTermPositionsArray.length; b++){
                            if(negativeSearchTermPositionsArray[b] > -1 ){
                                negativeSearchTermsMatch_OR = true;
                            }
                        }

                        if(negativeSearchTermsMatch_OR) {
                                excludeThisItemInThisElement = true;
                        }
                    }

                    /* Count up a tally of successful hits, so we can order our results. And build log message */
                    if (foundThisItemInThisElement && !excludeThisItemInThisElement) {
                        howManyTimesHaveWeMatchedSearchProduct++;
                        tempLogMsg_productNameMatches += '            "' + pageElements.productNames[j] + '"' + '\n';
                    }

                } // This is the end of the loop that cycles through the page elements
                tempLogMsg_searchProduct += '        Matched Product Names: ' + '\n';
                tempLogMsg_searchProduct += tempLogMsg_productNameMatches;
                tempLogMsg_productNameMatches = '';

                /**************************************
                 * Register the results of the search *
                 **************************************/

                searchData[i].numberOfSearchHits = howManyTimesHaveWeMatchedSearchProduct;

                if (howManyTimesHaveWeMatchedSearchProduct > 0) {
                    lvProductSearchResults.push(searchData[i]);
                    foundSomething = true;
                }

                // only log this searchProduct if we matched it, or if we're debugging a particular searchProduct
                if (howManyTimesHaveWeMatchedSearchProduct > 0 || searchData[i].productName === '') {
                    logMessage += tempLogMsg_searchProduct;
                    /*
                    logMessage += '        Detail:' + '\n';
                    logMessage += '            howManyTimesHaveWeMatchedSearchProduct = ' + howManyTimesHaveWeMatchedSearchProduct + '\n';
                    logMessage += '            foundThisItemInThisElement = ' + foundThisItemInThisElement + '\n';
                    logMessage += '            excludeThisItemInThisElement = ' + excludeThisItemInThisElement + '\n';
                    */
                }

            } // this is the end of the if statement that checks the department matched, before we went on to search for products

        } // this is the end of the if statement that checks the searchProduct is valid on this website

        tempLogMsg_searchProduct = ''; // we've either added this to logMessage, or we didn't get a match so we want to discard it.

    } // This is the end of the loop that cycles through the searchData array (i.e. a blown out list of searchProducts)

    /***********
     * Logging *
     ***********/

    if(!foundSomething){
        logMessage += '    No products were matched';
    }
    // UserLog, save to Parse for Balu analytics
    userLog('SEARCH',{searchWebsite: websiteURL, searchProductsFound: lvProductSearchResults.length, searchResults: lvProductSearchResults});

    // Console logging, for debugging
    log(gvScriptName_CSSearch + '.productSearch: results >>> lvProductSearchResults.length == ' + lvProductSearchResults.length,'DEBUG');
    log(gvScriptName_CSSearch + logMessage + '\n\n','SERCH');
    logMessage = '';

    /************
     * Callback *
     ************/

    // This is usually going to be content_script.processSearchResults
    processSearchResults(lvProductSearchResults, pvWebsiteSearchResults, foundSomething);
}
