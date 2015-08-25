/********
 * Init *
 ********/

/*
 * Global variables
 */

var gvScriptName_CSSearch = 'CS_search';

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
function processSearchResults(searchResults,productGroupHeaders,foundSomething){

      log(gvScriptName_CSSearch + '.processSearchResults: Start','PROCS');

      if (foundSomething) {
          sendMessage('pleaseRetrieveRecommendations',{searchResults:       searchResults,
                                                       productGroupHeaders: productGroupHeaders});
      }
 }

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
function searchPage_master(searchData,tabURL,websiteURL){

    log(gvScriptName_CSSearch + '.searchPage_master: Start','PROCS');

    // Call getElements, which switches on the websiteURL and pulls the
    // correct DOM elements from the page based on the website we're looking at.
    // Then call, in sequence, the sexSearch, then the productSearch, then the callback
    // to the contentScript (which is receiveSearchResults)
    getElements(websiteURL,sexSearch,productSearch,searchData,1);

}


/*
 *
 */
function getElements(websiteURL,sexSearchCallback,productSearchCallback,searchData,attemptCount) {

    log(gvScriptName_CSSearch + '.getElements: Start >>> attemptCount == ' + attemptCount,'PROCS');

    /*************
     * Variables *
     *************/

    // Flow control
    var runSexSearch = true;
    var sexOverride;
    var i;
    var didWeFindEverything = false;

    // pageElements to be searched
    var productNames = [];
    var breadcrumbs;
    var URLText = gvThisTab.tab.url.substring(gvThisTab.tab.url.indexOf('/')).toLowerCase(); // we want the text after the first forward slash, for searching.
    var menFilter = 'NO';
    var womenFilter = 'NO';

    /*****************************************************
     * The Switch statement: one for each active website *
     *****************************************************/

     // In nearly all cases there are two page formats, multi-items or single item.
     // Check multi-items first and if no elements found, check single item
     // Sometimes there are different grid layouts, e.g. list / thumbnail, although
     // if you're lucky the page DOM is the same

    switch(websiteURL){

        /*
         * FASHION
         */

        case 'www.asos.com':

            // Breadcrumbs (same on search result and product page) //

            var asos_lblBreadCrumbs = document.getElementById('ctl00_ContentMainPage_ctlBreadCrumbs_lblBreadCrumbs');
            if(asos_lblBreadCrumbs !== null){
                breadcrumbs = asos_lblBreadCrumbs.innerHTML.toLowerCase();
            }

            // Men/women filter checkboxes //
            // This won't work yet because changing the filters doesn't refresh the page :(
            /*
            var asos_checkboxes = document.getElementsByClassName('checkbox');
            for(i = 0; i < asos_checkboxes.length; i++){
                if(asos_checkboxes[i].getAttribute('data-name') === 'MEN' && asos_checkboxes[i].getAttribute('data-checked') === 'true'){
                    menFilter = 'MEN';
                } else
                if(asos_checkboxes[i].getAttribute('data-name') === 'WOMEN' && asos_checkboxes[i].getAttribute('data-checked') === 'true'){
                    womenFilter = 'WOMEN';
                }
            }
            */

            // Search results page //

            var asos_productList = document.getElementsByClassName('product-list');

            // The product-list class is the grid containing all search results. It's a div. Inside it are:
               // ul:
               //   li:
               //     a:
               //       div: image-wrap
               //       div: name-fade
               //         span: class="name"            <-- This is our product name!

            if(asos_productList.length > 0) {
                var asos_spans = asos_productList[0].getElementsByTagName('span');
                for (i = 0; i < asos_spans.length; i++) {
                    productNames.push(asos_spans[i].innerHTML.toLowerCase());
                }
            }

            // Product page //
            var asos_lblProductTitle;

            if(asos_productList.length === 0) {

                asos_lblProductTitle = document.getElementById('ctl00_ContentMainPage_ctlSeparateProduct_lblProductTitle');

                // The lblProductTitle class is the box containing the product. It's a div. Inside it are:
                   // div: title
                   //   h1
                   //     span           <-- This is our product name!

               if(asos_lblProductTitle !== null){
                   productNames.push(asos_lblProductTitle.textContent.toLowerCase());
               }
            }

            if(asos_lblBreadCrumbs !== null && (asos_productList.length > 0 || asos_lblProductTitle !== null)) {
                didWeFindEverything = true;
            }

        break;

        case 'www.debenhams.com':

            // Breadcrumbs (same on search result and product page) //

            var debenhams_BreadCrumbTrailDisplay = document.getElementById('WC_BreadCrumbTrailDisplay_div_1');
            if(debenhams_BreadCrumbTrailDisplay !== null){
                breadcrumbs = debenhams_BreadCrumbTrailDisplay.innerHTML.toLowerCase();
            }

            // Search results page //

            var debenhams_productSelectionPage = document.getElementById('body_content_ProductSelectionPage');

            // The product-list class is the grid containing all search results. It's a div. Inside it are:
               // ul:
               //   li:
               //     a:
               //       div: image-wrap
               //       div: name-fade
               //         span: class="name"            <-- This is our product name!

            if(debenhams_productSelectionPage !== null) {
                var debenham_divs = debenhams_productSelectionPage.getElementsByClassName('description');
                for (i = 0; i < debenham_divs.length; i++) {
                    productNames.push(debenham_divs[i].textContent.toLowerCase().trim());
                }
            }

            // Product page //

            var debenhams_productTopInfo = [];

            if(debenhams_productSelectionPage === null) {

                debenhams_productTopInfo = document.getElementsByClassName('product-top-info');

                // The product-top-info class is the box containing the product name. It's a div. Inside it are a bunch of other divs, but all
                // empty until the bottom one, which contains two spans: one for the brand, one for the name. We pull them both by just pulling
                // textContent form the top div.
                   // div: pdp-header
                   //   div: content
                   //     div: title
                   //       h1: catalog-link
                   //         span: itemprop=brand
                   //         span: itemprop=name         <-- This is our product name!

               if(debenhams_productTopInfo.length > 0){
                   productNames.push(debenhams_productTopInfo[0].textContent.toLowerCase());
               }
            }

            if(debenhams_BreadCrumbTrailDisplay !== null && (debenhams_productSelectionPage !== null || debenhams_productTopInfo.length > 0)) {
                didWeFindEverything = true;
            }

        break;

        case 'www.very.co.uk':

            // Breadcrumbs (same on search result and product page) //

            var very_breadcrumb = document.getElementById('breadcrumb');
            if(very_breadcrumb !== null){
                breadcrumbs = very_breadcrumb.innerHTML.toLowerCase();
            }

            // Search results page //

            var very_product = document.getElementById('products');

            // The products div is the grid containing all search results. Inside it are:
               // ul: productList
               //   li: product
               //     div: productImages
               //     div: productInfo
               //       div: productTitle
               //         a: productTitle
               //           h3:        some text in a span        <-- This is our product name!

            if(very_product !== null) {
                var very_headers = very_products.getElementsByTagName('h3');
                for (i = 0; i < very_headers.length; i++) {
                    productNames.push(very_headers[i].textContent.toLowerCase());
                }
            }

            // Product page //

            var very_productHeadings = [];

            if(very_product === null) {

                very_productHeadings = document.getElementsByClassName('productHeading');

                // The productHeading class is the box containing the product. It's a div. Inside it is some text, some of
                // which is in a span

               if(very_productHeadings.length > 0){
                   productNames.push(very_productHeadings[0].textContent.toLowerCase());
               }
            }

            if(very_breadcrumb !== null && (very_product !== null || very_productHeadings.length > 0)) {
                didWeFindEverything = true;
            }

            break;

        case 'www.next.co.uk':

            // Breadcrumbs (same on search result and product page) //

            var next_breadcrumbNavigation = document.getElementsByClassName('BreadcrumbNavigation');
            var next_breadcrumb = [];
            if(next_breadcrumbNavigation.length > 0){
                // the li elements after the first (home) element take a while to load
                next_breadcrumbs = next_breadcrumbNavigation[0].getElementsByTagName('li');
                if(next_breadcrumbs.length > 1) {
                    breadcrumbs = next_breadcrumbNavigation[0].innerHTML.toLowerCase();
                }
            }

            // Men/women filter checkboxes //

            var next_gender1 = document.getElementById('gender1');
            var next_gender2 = document.getElementById('gender2');
            if(next_gender1 !== null && next_gender2 !== null) {
                if(next_gender1.value === 'gender:women' && next_gender1.checked === 'checked') {
                    womenFilter = 'WOMEN';
                } else
                if(next_gender1.value === 'gender:men' && next_gender1.checked === 'checked') {
                    menFilter = 'MEN';
                } else
                if(next_gender2.value === 'gender:women' && next_gender1.checked === 'checked') {
                    womenFilter = 'WOMEN';
                } else
                if(next_gender2.value === 'gender:men' && next_gender1.checked === 'checked') {
                    menFilter = 'MEN';
                }
            }

            // Search results page //

            var next_results = document.getElementsByClassName('Results');

            // The results class is the grid containing all search results. It's a div. Inside it are:
            // div: resultsHeader
            //   div: startOfResults
            //     div: page
            //       section: details
            //         div: info
            //           h2: title      <-- This is our product name!

            if(next_results.length > 0) { // the div loads empty first and is then populated by ajax, so we need to check length, not existence
                var next_headers = next_results[0].getElementsByTagName('h2');
                for (i = 0; i < next_headers.length; i++) {
                    productNames.push(next_headers[i].innerHTML.toLowerCase());
                }
            }

            // Product page //

            var next_styleHeaders = [];

            if(next_results.length === 0) {

                next_styleCopys = document.getElementsByClassName('StyleCopy');

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
                // These cases will always go through on the 10th iteration

                if(next_styleCopys.length > 0){
                    for(i = 0; i < next_styleCopys.length; i++){
                        if(next_styleCopys[i].parentElement.className.indexOf('Selected') !== -1) {
                            // if the user has happened to select a product that is displayed first in the list
                            // then they will have to wait nine iterations before we proceed. Why? Because this will
                            // hopefully give the page time to set the selected to a different product when it is, in fact,
                            // not the first item in the list after all
                            if((next_styleCopys[i].parentElement.className.indexOf('FirstItem') !== -1 && attemptCount > 9) ||
                               (next_styleCopys[i].parentElement.className.indexOf('FirstItem') === -1)){
                                next_styleHeaders = next_styleCopys[i].getElementsByClassName('StyleHeader');
                                if(next_styleHeaders.length > 0) {
                                    productNames.push(next_styleHeaders[0].textContent.toLowerCase().trim());
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            if(next_breadcrumbs.length > 1 && (next_results.length > 0 || next_styleHeaders.length > 0)) {
                didWeFindEverything = true;
            }

        break;

        case 'www.newlook.com':

            // Breadcrumbs (same on search result and product page) //

            var newlook_breadcrumbs = document.getElementsByClassName('breadcrumb');
            if(newlook_breadcrumbs.length > 0){
                breadcrumbs = newlook_breadcrumbs[0].innerHTML.toLowerCase();
            }

            // Men/women filter checkboxes //

            var newlook_breadcrumbRemoveTexts = document.getElementsByClassName('breadcrumbRemoveText');
            if(newlook_breadcrumbRemoveTexts.length > 0) {
                for(i = 0; i < newlook_breadcrumbRemoveTexts.length; i++){
                    if(newlook_breadcrumbRemoveTexts[i].innerHTML === 'Mens'){
                        menFilter = 'MEN';
                    } else
                    if(newlook_breadcrumbRemoveTexts[i].innerHTML === 'Womens'){
                        womenFilter = 'WOMEN';
                    }
                }
            }

            // Search results page //

            var newlook_prodOverviews = document.getElementsByClassName('prod_overview');

            // ul
            //   li: product
            //     div: addToWishList
            //     a: some mouse-over thing
            //     a: some hidden stuff
            //     div: prod_overview
            //       span: desc
            //         a:                <-- This is our product name!
            //       span: price

            if(newlook_prodOverviews.length > 0) {
                for(i = 0; i < newlook_prodOverviews.length; i++){
                    var newlook_descs = newlook_prodOverviews[i].getElementsByClassName('desc');
                    if(newlook_descs.length > 0){
                        productNames.push(newlook_descs[0].textContent.toLowerCase());
                    }
                }
            }

            // Product page //

            var newlook_titleContainers = [];

            if(newlook_prodOverviews.length === 0) {

                // The titlecontainer class is contains the product title only
                // h1                 <-- This is our product name!

                newlook_titleContainers = document.getElementsByClassName('title_container');
                if(newlook_titleContainers.length > 0){
                    productNames.push(newlook_titleContainers[0].textContent.toLowerCase());
                }
            }

            if(newlook_breadcrumbs.length > 0 && (newlook_prodOverviews.length > 0 || newlook_titleContainers.length > 0)) {
                didWeFindEverything = true;
            }


        break;

        case 'www.topshop.com':

            // Breadcrumbs (same on search result and product page) //

            var topshop_breadcrumbs = document.getElementsByClassName('breadcrumb');
            if(topshop_breadcrumbs.length > 0){
                breadcrumbs = topshop_breadcrumbs[0].innerHTML.toLowerCase();
            }

            // Search results page //

            topshop_wrapperPageContent = document.getElementById('wrapper_page_content');

            // wrapper_page_content is a div, containing:
            //   div: wrapper_product_list         [one for each row]
            //     div: sp_5 block_5               [example, obvs these are different for each block]
            //       ul: product
            //         li: product_image
            //         li: product_description
            //           a:                          <-- This is our product name!

            if(topshop_wrapperPageContent !== null){
                var topshop_productDescriptions = topshop_wrapperPageContent.getElementsByClassName('product_description');
                for(i = 0; i < topshop_productDescriptions.length; i++){
                    productNames.push(topshop_productDescriptions[i].textContent.toLowerCase());
                }
            }

            // Product page //

            var topshop_productColumn2 = [];

            if(topshop_wrapperPageContent === null){
                topshop_productColumn2 = document.getElementsByClassName('product_column_2');
                if(topshop_productColumn2.length > 0){
                    var topshop_headers = topshop_productColumn2[0].getElementsByTagName('h1');
                    if(topshop_headers.length > 0) {
                        productNames.push(topshop_headers[0].innerHTML.toLowerCase());
                    }
                }
            }

            // topshop is women only
            sexOverride = 'women';

            if(topshop_breadcrumbs.length > 0 && (topshop_wrapperPageContent !== null || topshop_productColumn2.length > 0)) {
                didWeFindEverything = true;
            }

        break;

        /*
         * Groceries
         */
        case 'www.tesco.com':

            runSexSearch = false;
            var tescoSpans = [];

            // Search results page //

            var allProductsGrid = document.getElementsByClassName('allProducts');

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

            if(allProductsGrid.length > 0) {
                tescoSpans = allProductsGrid[0].getElementsByTagName('span');
                for (i = 0; i < tescoSpans.length; i++) {
                    if(tescoSpans[i].getAttribute('data-title') === 'true') {
                        productNames.push(tescoSpans[i].innerHTML.toLowerCase());
                    }
                }
            }

            // Product page //

            if(allProductsGrid.length === 0) {

                var productDetailsContainer = document.getElementsByClassName('productDetailsContainer');

                // The productDetailsContainer class is the box containing the product. It's a div. Inside it are:
                   // div: productDescription
                   //   div: productWrapper
                   //     div: descriptionDetails
                   //       div: desc
                   //         h1:
                   //           span data-title="true"    <-- This is our product name!

                if(productDetailsContainer.length > 0) {
                    tescoSpans = productDetailsContainer[0].getElementsByClassName('descriptionDetails')[0].getElementsByTagName('span');
                    // there should only ever be one, but for good measure we'll loop through
                    for (i = 0; i < tescoSpans.length; i++) {
                        if(tescoSpans[i].getAttribute('data-title') === 'true') {
                            productNames.push(tescoSpans[i].innerHTML.toLowerCase());
                        }
                    }
                }
            }

        break;

        case 'www.sainsburys.co.uk':

            runSexSearch = false;

            // Search results page //

            var productLister = document.getElementById('productLister');

            // The productLister div is the grid containing all search results. Inside it are:
               // div: productLister
               //   ul: productLister (gridview class as well for grid view)
               //     li: gridItem   (no class name for list view)
               //       div: product
               //         for list view: div: productInner, div: productInfoWrapper, div: productInfo
               //         for grid view: div: productNameAndPromotions
               //           h3:
               //             span:
               //             a:
               //               text                   <-- This is our product name!
               //               img:
               //           div: promotion

            if(productLister !== null) {
                var headers = productLister.getElementsByTagName('h3');
                for (i = 0; i < headers.length; i++) {
                    productNames.push(headers[i].innerHTML.toLowerCase());
                }
            }

            // Product page //

            if(productLister !== null){

                var productTitleDescriptionContainers = document.getElementsByClassName('productTitleDescriptionContainer');

                // The productTitleDescriptionContainer class is the box containing the product. It's a div. Inside it are:
                   // h1:                  <-- This is our product name!
                   // div: reviews

                if(productTitleDescriptionContainers.length > 0) {
                    var header = productTitleDescriptionContainers[0].getElementsByTagName('h1');
                    productNames.push(header[0].innerHTML.toLowerCase().trim());
                }
            }

        break;

        //case 'groceries.asda.com':
        // for archived  Asda code, see bottom of script
        //break;

        default:
            log(gvScriptName_CSSearch + '.getElements: no switch statement written for active website: ' + websiteURL,'ERROR');

    }

    /**************************************
     * Call the relevant search functions *
     **************************************/

    if(!didWeFindEverything && attemptCount < 10) {
        // If we don't have any productNames yet then we try the page a few times, in case it has any fancy ajax-esque loading of the search results
        window.setTimeout(function(){attemptCount++; return getElements(websiteURL,sexSearch,productSearch,searchData,attemptCount);},100);
    } else if (productNames.length > 0) {
        var pageElements = {productNames: productNames,
                            breadcrumbs:  breadcrumbs,
                            URLText:      URLText,
                            menFilter:    menFilter,
                            womenFilter:  womenFilter,
                            sexOverride:  sexOverride};

        if(runSexSearch) {
            sexSearchCallback(pageElements,websiteURL,productSearchCallback,searchData);
        } else {
            productSearchCallback(pageElements,websiteURL,searchData);
        }
    } else {
        log(gvScriptName_CSSearch + '.getElements: Failed to pull expected elements from the DOM on websiteURL == ' + websiteURL,'ERROR');
        // No need to call our search functions, just return no search results
        processSearchResults(null,null,false);
    }
}

/*
 * Search the various page elements for the searchProduct sex
 */
function sexSearch(pageElements, websiteURL, productSearchCallback, searchData) {

    log(gvScriptName_CSSearch + '.sexSearch: Start','PROCS');

    var foundMen = false;
    var foundWomen = false;

    if (pageElements.sexOverride === 'women'){
        foundWomen = true;
    } else if (pageElements.sexOverride === 'men'){
        foundMen = true;
    } else {


         // Some of the searchProducts will be sex-specific, so we need to see if we can identify
         // a sex-specific category/search on the current page

         // The first thing to do is see if we have search filters for sex
         if(pageElements.menFilter === 'WOMEN') {
             foundWomen = true;
         }
         if(pageElements.womenFilter === 'MEN') {
             foundMen = true;
         }
         // Next, check the URL for a sex
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
         // say that all products on the page are that sex)
         // To do: this should be better than this. Move this sub-sex search into product search level so it only applies to the relevant product
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

         log(gvScriptName_CSSearch + '.sexSearch: results >>> foundMen == ' + foundMen + ', foundWomen == ' + foundWomen,'DEBUG');

         // If we've found nothing, let's just ignore sex to ensure results come back - even if we return both men and women results
         if(!foundMen && !foundWomen){
             foundMen = true;
             foundWomen = true;
         }
     }

     pageElements.useSex = true;
     pageElements.foundMen = foundMen;
     pageElements.foundWomen = foundWomen;

     productSearchCallback(pageElements,websiteURL,searchData);
}

/*
 * Search the various page elements for the searchProduct product search terms
 */
function productSearch(pageElements,websiteURL,searchData) {

    log(gvScriptName_CSSearch + '.productSearch: Start','PROCS');

    var functionName = 'productSearch';

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
    for (var i = 0; i < searchData.length; i++) {

        position_brand = -1;
        position_searchTerm1 = -1;
        position_searchTerm2 = -1;
        position_searchTerm3 = -1;
        matchedSex = false;

        // Only search for this searchProduct if it belongs to a searchCategory that is valid for the user's current website
        if(searchData[i].websiteURL === websiteURL) {

            // for each product on the users web page (may be single product screen; may be multi product search results etc)
            // Break as soon as we find the current searchProduct - we don't need to search the entire page, we only need to
            // find it once
            var foundThisItem;
            for (j = 0; j < pageElements.productNames.length; j++) {

                if(searchData[i].brand_LC !== 'all') {
                    position_brand = pageElements.productNames[j].indexOf(searchData[i].brand_LC);
                } else {
                    position_brand = -2;
                }

                if(searchData[i].searchTerm1 !== '') {
                    position_searchTerm1  = pageElements.productNames[j].indexOf(searchData[i].searchTerm1_LC);
                } else {
                    position_searchTerm1 = -2;
                }

                if(searchData[i].searchTerm2 !== '') {
                    position_searchTerm2  = pageElements.productNames[j].indexOf(searchData[i].searchTerm2_LC);
                } else{
                    position_searchTerm2 = -2;
                }

                if(searchData[i].searchTerm3 !== '') {
                    position_searchTerm3  = pageElements.productNames[j].indexOf(searchData[i].searchTerm3_LC);
                } else{
                    position_searchTerm3 = -2;
                }

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

                // To do: For fashion I've taken brand out of the equation, because there are so many and I reckon anything on ASOS-proper
                // is worthy of recommendation. All brands for fashion are set to "All"
                // Hence, we're effectively just working at productGroup level, e.g. a searchProduct would be called T-Shirt, or Jeans, etc.
                // Eventually I'd like to build a brands table, mabye work by exception rather than inclusion...?

                // Firsty, see whether we're using OR conditions or AND conditions

                foundThisItem = false;

                // We've set our position vars to -2 if the searchProduct didn't have a searchTerm entered.
                // This way we can ignore blank values for AND (i.e. a product with all blank values will always return)
                // and take them into account for OR (i.e. a product with one blank value will NOT always return!)
                if(searchData[i].andOr === 'AND') {
                    //log(gvScriptName_CSSearch + '.productSearch: determining AND search result >>> position_brand == ' + position_brand + ', position_searchTerm1 == ' + position_searchTerm1 + ', position_searchTerm2 == ' + position_searchTerm2 + ', position_searchTerm3 == ' + position_searchTerm3 + ', matchedSex == ' + matchedSex,' TEMP');
                    if (((position_brand > -1      || position_brand === -2) &&
                        (position_searchTerm1 > -1 || position_searchTerm3 === -2) &&
                        (position_searchTerm2 > -1 || position_searchTerm2 === -2) &&
                        (position_searchTerm3 > -1 || position_searchTerm3 === -2)) && matchedSex) {

                        foundThisItem = true;
                        break;
                    }
                }
                else {
                    //log(gvScriptName_CSSearch + '.productSearch: determining OR search result >>> position_brand == ' + position_brand + ', position_searchTerm1 == ' + position_searchTerm1 + ', position_searchTerm2 == ' + position_searchTerm2 + ', position_searchTerm3 == ' + position_searchTerm3 + ', matchedSex == ' + matchedSex,' INFO');
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
                searchResults.push(searchData[i]);

                 // Save an associative array of arrays of productHeader records {productName, whyDoWeCare}, indexed by ProductGroup, so we can easily
                 // retrieve the SearchProduct.ProductNames when we display the sidebar. Along with the product name
                 // include the whyDoWeCare value

                 var productHeaderRec = {productName: searchData[i].productName,
                                         whyDoWeCare: searchData[i].whyDoWeCare};

                 if(!productGroupHeaders[searchData[i].productGroupName]) {
                     productGroupHeaders[searchData[i].productGroupName] = [productHeaderRec];
                 } else {
                     productGroupHeaders[searchData[i].productGroupName].push(productHeaderRec);
                 }
                 foundSomething = true;
            }
         }
     }

     userLog('SEARCH',{searchWebsite: websiteURL, searchAlgorithmFunction: functionName, searchProductsFound: searchResults.length});

     log(gvScriptName_CSSearch + '.productSearch: results >>> searchResults.length == ' + searchResults.length,'DEBUG');
     // This is usually going to be content_script.receiveSearchResults
     processSearchResults(searchResults,productGroupHeaders,foundSomething);

}




/*
        case 'groceries.asda.com':

            runSexSearch = false;
            var asdaSpans;

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

                        console.log(gvScriptName_CSSearch + '.getElements: ASDA DOM changed',' INFO');
                        getElements(websiteURL,sexSearchCallback,productSearchCallback,searchData,attemptCount);
                    });
                }

                // Now go ahead and pull out our spans

                asdaSpans = listings[0].getElementsByTagName('span');
                for (i = 0; i < asdaSpans.length; i++) {
                    if(asdaSpans[i].getAttribute('class') === 'title') {
                        productNames.push(asdaSpans[i].textContent.toLowerCase());
                    }
                }
            } *//*else {
                var productDetailsContainer = document.getElementsByClassName('productDetailsContainer');
                // The productDetailsContainer class is the box containing the product. It's a div. Inside it are:
                   // div: productDescription
                   //   div: productWrapper
                   //     div: descriptionDetails
                   //       div: desc
                   //         h1:
                   //           span data-title="true"    <-- This is our product name!

                if(productDetailsContainer[0]) {
                    asdaSpans = productDetailsContainer[0].getElementsByClassName('descriptionDetails')[0].getElementsByTagName('span');
                    for (i = 0; i < asdaSpans.length; i++) {
                        if(asdaSpans[i].getAttribute('data-title') === 'true') {
                            productNames.push(asdaSpans[i].innerHTML.toLowerCase());
                        }
                    }
                }
            }*/
/*
        break;
*/
