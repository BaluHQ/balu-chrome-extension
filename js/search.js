/********
 * Init *
 ********/

/*
 * Global variables
 */
// None

/********************
 * Search Functions *
 ********************/

/*
 * This function searches the HTML of the page for each of the SearchProducts.
 *
 * @searchData is an array of SearchProducts, and also includes each SearchProduct's
 * SearchCategory as well as the corresponding webites that are "active" for that category.
 * Hence, @searchData can hold one SearchProduct multiple times, once for every website it
 * is valid for. (For example, Nescafe Coffee may be listed twice, once for Tesco.com and
 * once for Sainsbury.com.)
 *
 * We are going to loop through the SearchProducts and for every one where the website
 * matches the user's current URL, we're going to search the page. If we find it, we
 * add the searchProduct to a searchResults array.
 *
 * We can ignore the isWebsiteOnOrOff setting here, because this is checked during init
 * and Balu will not get this far for an inactive website.
 *
 */
function searchPage_master(searchData,tabURL,isBaluShowOrHide,websiteURL,callback){

    log('search.searchPage_master: Start','PROCS');

    // eventually we're going to callback to the contentScript, so package this up and keep passing it through the various search functions
    var contentScriptCallback = {searchData:       searchData,
                                 tabURL:           tabURL,
                                 isBaluShowOrHide: isBaluShowOrHide,
                                 callback:         callback};


    // Call getElements, which switches on the websiteURL and pulls the
    // correct DOM elements from the page based on the website we're looking at.
    // Then call, in sequence, the sexSearch, then the productSearch, then the callback
    // to the contentScript (which is requestRetrieveRecommendations)
    getElements(websiteURL,sexSearch,productSearch,contentScriptCallback,1);

}


/*
 *
 */
function getElements(websiteURL,sexSearchCallback,productSearchCallback,contentScriptCallback,attemptCount) {

    log('search.getElements: Start >>> attemptCount == ' + attemptCount,'PROCS');

    var runSexSearch = true;
    var foundDOMElement = false; // if we don't find the DOM element we wait a few seconds and try again
    var observer;

    // To do, would like some email alerts sent to me if a DOM elements fails to pull
    var productNameElements;
    var breadcrumbsElements;
    var productNameElement;
    var breadcrumbsElement;
    var spans;
    var productNames = [];
    var breadcrumbs;
    var sexOverride;
    // we want the text after the first forward slash, for searching.
    var URLText = contentScriptCallback.tabURL.substring(contentScriptCallback.tabURL.indexOf('/')).toLowerCase();

    switch(websiteURL){

        /*
         * FASHION
         */

        case 'www.asos.com':

            productNameElement = document.getElementById('ctl00_ContentMainPage_ctlSeparateProduct_lblProductTitle');
            if(productNameElement){
                productNames.push(productNameElement.textContent.toLowerCase());
            }

            breadcrumbsElement = document.getElementById('ctl00_ContentMainPage_ctlBreadCrumbs_lblBreadCrumbs');
            if(breadcrumbsElement){
                breadcrumbs = breadcrumbsElement.innerHTML.toLowerCase();
            }

            // to do: pick up filter tickboxes for sex

            if(productNameElement) {
                foundDOMElement = true;
            }

        break;

        case 'www.debenhams.com':

            productNameElements = document.getElementsByClassName('product-top-info clearfix');
            if(productNameElements[0]){
                productNames.push(productNameElements[0].textContent.toLowerCase());
            }

            breadcrumbsElement = document.getElementById('WC_BreadCrumbTrailDisplay_div_1');
            if(breadcrumbsElement){
                breadcrumbs = breadcrumbsElement.innerHTML.toLowerCase();
            }

            if(productNameElements[0]) {
                foundDOMElement = true;
            }

        break;

        case 'www.very.co.uk':

            productNameElements = document.getElementsByClassName('productHeading');
            if(productNameElements[0]){
                productNames.push(productNameElements[0].textContent.toLowerCase());
            }

            breadcrumbsElement = document.getElementById('breadcrumb');
            if(breadcrumbsElement){
                breadcrumbs = breadcrumbsElement.innerHTML.toLowerCase();
            }

            if(productNameElements[0]) {
                foundDOMElement = true;
            }

        break;

        case 'www.next.co.uk':

            productNameElements = document.getElementsByClassName('StyleCopy');
            if(productNameElements[0]){
                productNames.push(productNameElements[0].textContent.toLowerCase());
            }

            breadcrumbsElements = document.getElementsByClassName('BreadcrumbNavigation');
            if(breadcrumbsElements[0]){
                breadcrumbs = breadcrumbsElements[0].innerHTML.toLowerCase();
            }

            if(productNameElements[0]) {
                foundDOMElement = true;
            }

        break;

        case 'www.newlook.com':

            productNameElements = document.getElementsByClassName('title_container');
            if(productNameElements[0]){
                productNames.push(productNameElements[0].textContent.toLowerCase());
            }

            breadcrumbsElements = document.getElementsByClassName('breadcrumb');
            if(breadcrumbsElements[0]){
                breadcrumbs = breadcrumbsElements[0].innerHTML.toLowerCase();
            }

            if(productNameElements[0]) {
                foundDOMElement = true;
            }

        break;

        case 'www.topshop.com':

            productNameElements = document.getElementsByClassName('sp_10 product_column_2');
            if(productNameElements[0]){
                var subTags = productNameElements[0].getElementsByTagName('h1');
                if(subTags[0]) {
                    productNames.push(subTags[0].innerHTML.toLowerCase());
                }
            }

            breadcrumbsElements = document.getElementsByClassName('breadcrumb');
            if(breadcrumbsElements[0]){
                breadcrumbs = breadcrumbsElements[0].innerHTML.toLowerCase();
            }

            // topshop is women only
            sexOverride = 'women';

            if(productNameElements[0]) {
                foundDOMElement = true;
            }

        break;

        case 'www.tesco.com':

            runSexSearch = false;

            // Two cases, multi-items or single item.
            // Check multi-items first and if no elements found, check single item

            var allProductsGrid = document.getElementsByClassName('allProducts');
            var productDetailsContainer;
            // The allProducts class is the grid containing all search results. It's a div. Inside it are:
               // div: productLists
               //   ul: products grid (or products line for list view)
               //     li: product
               //       div: desc (or descWRap for list view)
               //         h2: (or h3 for list view)
               //           a:
               //             span class=image,
               //             span ... (special offers, price, etc)
               //             span data-title="true"                   <-- This is our product name!

            if(allProductsGrid[0]) {
                spans = allProductsGrid[0].getElementsByTagName('span');
                for (i = 0; i < spans.length; i++) {
                    if(spans[i].getAttribute('data-title') === 'true') {
                        productNames.push(spans[i].innerHTML.toLowerCase());
                    }
                }
            } else {
                productDetailsContainer = document.getElementsByClassName('productDetailsContainer');
                // The productDetailsContainer class is the box containing the product. It's a div. Inside it are:
                   // div: productDescription
                   //   div: productWrapper
                   //     div: descriptionDetails
                   //       div: desc
                   //         h1:
                   //           span data-title="true"    <-- This is our product name!

                if(productDetailsContainer[0]) {
                    spans = productDetailsContainer[0].getElementsByClassName('descriptionDetails')[0].getElementsByTagName('span');
                    for (i = 0; i < spans.length; i++) {
                        if(spans[i].getAttribute('data-title') === 'true') {
                            productNames.push(spans[i].innerHTML.toLowerCase());
                        }
                    }
                }
            }

            if(allProductsGrid[0] || productDetailsContainer[0]) {
                foundDOMElement = true;
            }

        break;

        case 'groceries.asda.com':

            runSexSearch = false;

            // Two cases, multi-items or single item.
            // Check multi-items first and if no elements found, check single item

            var listings = document.getElementsByClassName('listings');
            // The allProducts class is the grid containing all search results. It's a div. Inside it are:
               // div: listings
               //   div: listing
               //     div: container
               //       div: slider
               //         div: product
               //           div: product-contnet
               //             span: title
               //               a:           (Title contains product name)
               //                 span:                        <-- This is our product name!

            if(listings[0]) {

                // First things first, Asda doesn't refresh the page so we need to keep an eye on the listsings DOM from now on

                if(!observeDOM) { // only if we haven't already done this . To do: this won't work if we are opening multiple tabs? :(

                        var observeDOM = (function(){
                        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
                            eventListenerSupported = window.addEventListener;

                        return function(obj, callback){
                            if( MutationObserver ){
                                // define a new observer
                                var obs = new MutationObserver(function(mutations, observer){
                                    if( mutations[0].addedNodes.length || mutations[0].removedNodes.length )
                                        callback();
                                });
                                // have the observer observe foo for changes in children
                                obs.observe( obj, { childList:true, subtree:true });
                            }
                            else if( eventListenerSupported ){
                                obj.addEventListener('DOMNodeInserted', callback, false);
                                obj.addEventListener('DOMNodeRemoved', callback, false);
                            }
                        };
                    })();

                    // Observe a specific DOM element:
                    observeDOM( document.getElementById('listings') ,function(){

                        console.log('search.getElements: ASDA DOM changed',' INFO');
                        getElements(websiteURL,sexSearchCallback,productSearchCallback,contentScriptCallback,attemptCount);
                    });
                }

                // Now go ahead and pull out our spans

                spans = listings[0].getElementsByTagName('span');
                for (i = 0; i < spans.length; i++) {
                    if(spans[i].getAttribute('class') === 'title') {
                        productNames.push(spans[i].textContent.toLowerCase());
                    }
                }
            } /*else {
                var productDetailsContainer = document.getElementsByClassName('productDetailsContainer');
                // The productDetailsContainer class is the box containing the product. It's a div. Inside it are:
                   // div: productDescription
                   //   div: productWrapper
                   //     div: descriptionDetails
                   //       div: desc
                   //         h1:
                   //           span data-title="true"    <-- This is our product name!

                if(productDetailsContainer[0]) {
                    spans = productDetailsContainer[0].getElementsByClassName('descriptionDetails')[0].getElementsByTagName('span');
                    for (i = 0; i < spans.length; i++) {
                        if(spans[i].getAttribute('data-title') === 'true') {
                            productNames.push(spans[i].innerHTML.toLowerCase());
                        }
                    }
                }
            }*/

            if(listings[0] /* || ohter one */) {
                foundDOMElement = true;
            }

        break;

        default:

    }

    if(!foundDOMElement && attemptCount < 10) {
        window.setTimeout(function(){attemptCount++; return getElements(websiteURL,sexSearch,productSearch,contentScriptCallback,attemptCount);},100);
    } else if (foundDOMElement) {
        var pageElements = {productNames: productNames,
                            breadcrumbs:  breadcrumbs,
                            URLText:      URLText,
                            sexOverride:  sexOverride};

        if(runSexSearch) {
            sexSearchCallback(pageElements,websiteURL,productSearchCallback,contentScriptCallback);
        } else {
            productSearchCallback(pageElements,websiteURL,contentScriptCallback);
        }
    } else {
        log('search.getElements: Failed to find DOM elements for websiteURL == ' + websiteURL,'ERROR');
    }
}

/*
 *
 */
function sexSearch(pageElements, websiteURL, productSearchCallback, contentScriptCallback) {

    log('search.sexSearch: Start','PROCS');

    var foundMen = false;
    var foundWomen = false;

    if (pageElements.sexOverride === 'women'){
        foundWomen = true;
    } else if (pageElements.sexOverride === 'men'){
        foundMen = true;
    } else {


         // Some of the searchProducts will be sex-specific, so we need to see if we can identify
         // a sex-specific category/search on the current page

         // The first thing to do is check the URL for a sex
         if (pageElements.URLText.indexOf('women') > -1 || pageElements.URLText.indexOf('female') > -1) {
             foundWomen = true;
         } else if (pageElements.URLText.indexOf('men') > -1 || pageElements.URLText.indexOf('male') > -1) {
             foundMen = true;
         }

         // Next, look in the breadcrumbs in the hope that the user has navigated to the item via a men/women category or included sex in their search term
         if (pageElements.breadcrumbs) {
             if(!foundMen && !foundWomen) {
                 if (pageElements.breadcrumbs.indexOf('women') > -1 ||
                     pageElements.breadcrumbs.indexOf('woman') > -1 ||
                     pageElements.breadcrumbs.indexOf('lady') > -1 ||
                     pageElements.breadcrumbs.indexOf('female') > -1) {
                     foundWomen = true;

                 } else if (pageElements.breadcrumbs.indexOf('men') > -1 ||
                            pageElements.breadcrumbs.indexOf('man') > -1 ||
                            pageElements.breadcrumbs.indexOf('male') > -1) {

                     foundMen = true;
                 }
             }
         }

         // Next, let's see whether the sex is in any of the product name (not that I've built multi-item
         // search for fashion yet, but for now we're assuming that if we find a sex in one product we can
         // say that all products on the page are that sex
         if (pageElements.productNames) {
             for (i = 0; i < pageElements.productNames.length; i++){
                 if(!foundMen && !foundWomen) {
                     if (pageElements.productNames[i].indexOf('women') > -1 ||
                         pageElements.productNames[i].indexOf('woman') > -1 ||
                         pageElements.productNames[i].indexOf('lady') > -1 ||
                         pageElements.productNames[i].indexOf('female') > -1) {
                         foundWomen = true;
                         break;
                     } else if (pageElements.productNames[i].indexOf('men') > -1 ||
                                pageElements.productNames[i].indexOf('man') > -1 ||
                                pageElements.productNames[i].indexOf('male') > -1) {
                         foundMen = true;
                         break;
                     }
                 }
             }
         }

         log('search.sexSearch: results >>> foundMen == ' + foundMen + ', foundWomen == ' + foundWomen,'DEBUG');

         // If we've found nothing, let's just ignore sex to ensure results come back - even if we return both men and women results
         if(!foundMen && !foundWomen){
             foundMen = true;
             foundWomen = true;
         }
     }

     pageElements.useSex = true;
     pageElements.foundMen = foundMen;
     pageElements.foundWomen = foundWomen;

     productSearchCallback(pageElements,websiteURL,contentScriptCallback);
 }

/*
 *
 */
function productSearch(pageElements,websiteURL,contentScriptCallback) {

    log('search.productSearch: Start','PROCS');

    var functionName = 'productSearch';

    if(pageElements.productNames) {

        var searchResults = [];
        var productGroupHeaders = {};
        var productGroupNamesArray = [];

        var foundSomething = false;
        var position_brand;
        var position_searchTerm1;
        var position_searchTerm2;
        var position_searchTerm3;
        var matchedSex;

        // for each searchProduct
        for (var i = 0; i < contentScriptCallback.searchData.length; i++) {

            position_brand = -1;
            position_searchTerm1 = -1;
            position_searchTerm2 = -1;
            position_searchTerm3 = -1;
            matchedSex = false;

            // Only search for this searchProduct if it belongs to a searchCategory that is valid for the user's current website
            if(contentScriptCallback.searchData[i].websiteURL === websiteURL) {

                // for each product on the users web page (may be single product screen; may be multi product search results etc)
                // Break as soon as we find the current searchProduct - we don't need to search the entire page, we only need to
                // find it once
                var foundThisItem;
                for (j = 0; j < pageElements.productNames.length; j++) {

                    if(contentScriptCallback.searchData[i].brand_LC !== 'all') {
                        position_brand = pageElements.productNames[j].indexOf(contentScriptCallback.searchData[i].brand_LC);
                    } else {
                        position_brand = -2;
                    }

                    if(contentScriptCallback.searchData[i].searchTerm1 !== '') {
                        position_searchTerm1  = pageElements.productNames[j].indexOf(contentScriptCallback.searchData[i].searchTerm1_LC);
                    } else {
                        position_searchTerm1 = -2;
                    }

                    if(contentScriptCallback.searchData[i].searchTerm2 !== '') {
                        position_searchTerm2  = pageElements.productNames[j].indexOf(contentScriptCallback.searchData[i].searchTerm2_LC);
                    } else{
                        position_searchTerm2 = -2;
                    }

                    if(contentScriptCallback.searchData[i].searchTerm3 !== '') {
                        position_searchTerm3  = pageElements.productNames[j].indexOf(contentScriptCallback.searchData[i].searchTerm3_LC);
                    } else{
                        position_searchTerm3 = -2;
                    }

                    // If we're doing a search that requires a match on sex then pageElements.useSex will have been set by the sexSearch function
                    // Otherwise, skip sex entirely and call it a pass
                    if (pageElements.useSex) {
                        // if this SearchProduct has no sex specified, then we want to pass
                        if (contentScriptCallback.searchData[i].sex === ''){
                            matchedSex = true;
                        } else {
                            // If we found mention of both man and woman item, then this is a pass regardless of what's on the searchProduct
                            if(pageElements.foundMen && pageElements.foundWomen) {
                                matchedSex = true;
                            } else {
                                if (contentScriptCallback.searchData[i].sex_LC === 'men' && pageElements.foundMen) {
                                    matchedSex = true;
                                } else if (contentScriptCallback.searchData[i].sex_LC === 'women' && pageElements.foundWomen) {
                                    matchedSex = true;
                                } else {
                                    matchedSex = false;
                                }
                            }
                        }
                    } else {
                        matchedSex = true; // this avoids failing the final condition of the function in cases where we don't need to match a sex.
                    }

                    // To do: For fashion I've taken brand out of the equation, because there are so many and I reckon anything on ASOS-proper
                    // is worthy of recommendation. All brands for fashion are set to "All"
                    // Hence, we're effectively just working at productGroup level, e.g. a searchProduct would be called T-Shirt, or Jeans, etc.
                    // Eventually I'd like to build a brands table, mabye work by exception rather than inclusion...?

                    // Firsty, see whether we're using OR conditions or AND conditions

                    foundThisItem = false;

                    // We've set our position vars to -2 if the searchProduct didn't have a searchTerm entered.
                    // This way we can ignore blank values for AND (i.e. a product with all blank values will always return)
                    // and take them into account for OR (i.e. a product with one blank value will NOT always return!)
                    if(contentScriptCallback.searchData[i].andOr === 'AND') {
                        //log('search.productSearch: determining AND search result >>> position_brand == ' + position_brand + ', position_searchTerm1 == ' + position_searchTerm1 + ', position_searchTerm2 == ' + position_searchTerm2 + ', position_searchTerm3 == ' + position_searchTerm3 + ', matchedSex == ' + matchedSex,' TEMP');
                        if (((position_brand > -1      || position_brand === -2) &&
                            (position_searchTerm1 > -1 || position_searchTerm3 === -2) &&
                            (position_searchTerm2 > -1 || position_searchTerm2 === -2) &&
                            (position_searchTerm3 > -1 || position_searchTerm3 === -2)) && matchedSex) {

                            foundThisItem = true;
                            break;
                        }
                    }
                    else {
                        //log('search.productSearch: determining OR search result >>> position_brand == ' + position_brand + ', position_searchTerm1 == ' + position_searchTerm1 + ', position_searchTerm2 == ' + position_searchTerm2 + ', position_searchTerm3 == ' + position_searchTerm3 + ', matchedSex == ' + matchedSex,' INFO');
                        if ((position_brand > -1 || position_brand === -2) &&
                            (position_searchTerm1 > -1 ||
                             position_searchTerm2 > -1 ||
                             position_searchTerm3 > -1) && matchedSex) {
                            foundThisItem = true;
                            break;
                        }
                    }
                }

                if (foundThisItem) {
                    searchResults.push(contentScriptCallback.searchData[i]);

                     // Save an associative array of arrays of productHeader records {productName, whyDoWeCare}, indexed by ProductGroup, so we can easily
                     // retrieve the SearchProduct.ProductNames when we display the sidebar. Along with the product name
                     // include the whyDoWeCare value

                     var productHeaderRec = {productName: contentScriptCallback.searchData[i].productName,
                                             whyDoWeCare: contentScriptCallback.searchData[i].whyDoWeCare};

                     if(!productGroupHeaders[contentScriptCallback.searchData[i].productGroupName]) {
                         productGroupHeaders[contentScriptCallback.searchData[i].productGroupName] = [productHeaderRec];
                     } else {
                         productGroupHeaders[contentScriptCallback.searchData[i].productGroupName].push(productHeaderRec);
                     }
                     foundSomething = true;
                }
             }
         }

         userLog('SEARCH',{searchWebsite: websiteURL, searchAlgorithmFunction: functionName, searchProductsFound: searchResults.length});

         log('search.productSearch: results >>> searchResults.length == ' + searchResults.length,'DEBUG');
         if(searchResults.length > 0) {
             // This is usually going to be content_script.requestRetrieveRecommendations
             contentScriptCallback.callback(searchResults,productGroupHeaders,foundSomething,contentScriptCallback.isBaluShowOrHide);
         }
     } else{
         log('search.productSearch: results >>> productName element not found','DEBUG');
     }
}
