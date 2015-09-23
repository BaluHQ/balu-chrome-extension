/********
 * Init *
 ********/

/*
 * Global variables
 */

var gvScriptName_IFMain = 'IF_main';

/*
 *
 */
(function initialise(){

    log(gvScriptName_IFMain + '.initialise: Start','INITS');

    // Listen for messages from the content script
    window.addEventListener("message", contentScriptMessage_listener, false);

    sendMessage('CS_main','pleaseRegisterIframeAsReady',{});
})();

/*************
 * Functions *
 *************/

/*
function waitForScriptsThenExecute(counter,callback){
// To do, this doesn't work - how do I know whether jquery is loaded? Do I need to? The content script
// waits for the message from the iframe (init func, above). Since that doesn't get sent until IF_MAIN is loaded,
// and if_main is not injectred until the end of the iframe's body (and jquery goes in to the head), then perhaps
// it will never send the "im ready" message until jquery is loaded
    var jQueryLoaded = false;

    // force it to wait at least once. Why, don't know! Had a lot of trouble getting this working.
    if(counter > 0) {
        try {
            $('.qtip_tooltips').first().qtip({});
            log(gvScriptName_IFMain + '.waitForScriptsThenExecute: JQuery loaded, counter === ' + counter,' INFO');
            jQueryLoaded = true;
        } catch(error){
            log(gvScriptName_IFMain + '.waitForScriptsThenExecute: JQuery not loaded, counter === ' + counter,' INFO');
            jQueryLoaded = false;
        }
    }

    if(jQueryLoaded || counter > 100){
        log(gvScriptName_IFMain + '.waitForScriptsThenExecute: Ending wait, counter === ' + counter,'PROCS');
        callback();
    } else {
        counter++;
        window.setTimeout(function(){return waitForScriptsThenExecute(counter,callback);},100);
    }
}

*/
function activateQTips(){

    log(gvScriptName_IFMain + '.activateQTips: Start','PROCS');

    $('.qtip_tooltips').each(function(i){
        var brandSpielDiv = $(this).next('div');
        $(this).qtip({
            content: {
                text: $(brandSpielDiv).html(),
                title: function(event, api) {
                            return $(brandSpielDiv).attr('data-qtiptitle');
                        }
            },
            position: {
                my: 'top right',
                at: 'bottom center'
            },
            style: {
                classes: 'brandSpielToolTips'
            }
        });
    });
}

function activateJoyride(){

    log(gvScriptName_IFMain + '.activateJoyride: Start','PROCS');

    $(document).foundation({
        joyride: {
            post_step_callback: postStepJoyride,
            post_ride_callback: postRideJoyride,
            scroll_speed: 0
        }
    });

    /*
      post_ride_callback     : function (){},    // A method to call once the tour closes (canceled or complete) (but not hte top cross, apparently())
      post_step_callback     : function (){},    // A method to call after each step
      pre_step_callback      : function (){},    // A method to call before each step
      pre_ride_callback      : function (){},    // A method to call before the tour starts (passed index, tip, and cloned exposed element)
      post_expose_callback   : function (){},    // A method to call after an element has been exposed
*/
    $(document).foundation('joyride', 'start');
}

function postStepJoyride(joyrideIndex,currentTip){

    log(gvScriptName_IFMain + '.postStepJoyride: Start','PROCS');

    userLog('JOYRIDE_POST_STEP',{joyrideIndex: joyrideIndex});
}

function postRideJoyride(joyrideIndex,currentTip){

    log(gvScriptName_IFMain + '.postStepJoyride: Start','PROCS');
    sendMessage('CS_main','pleaseMarkJoyrideAsDone',{});
    userLog('JOYRIDE_POST_RIDE',{joyrideIndex: joyrideIndex});
}

/*************
 * Listeners *
 *************/


/**************************
 * Error and Log handling *
 **************************/

function userLog(eventName,data) {

    log(gvScriptName_IFMain + '.userLog: Start','PROCS');

    sendMessage('CS_main','pleaseLogEventInUserLog',{eventName: eventName,
                                                     data:      data});

}

function log(message, level) {

    window.parent.postMessage({sender:    'IF_main',
                               subject:   'pleaseLogMessageOnConsole',
                               message:   message,
                               level:     level}, '*');

}

/*****************
 * MESSAGING API *
 *****************/

/*
 * Incoming
 */
function contentScriptMessage_listener(msg) {

    var logMessage = gvScriptName_IFMain + ' >> message <- ' + msg.data.sender + ': ' + msg.data.subject;

    switch (msg.data.sender + " | " + msg.data.subject) {

        case 'CS_main | pleaseActivateQTips':
            log(logMessage,'MESSG');
            activateQTips();
        break;

        case 'CS_main | pleaseActivateJoyride':
            log(logMessage,'MESSG');
            activateJoyride();
        break;

        default:
            if(msg.sender === 'CS_main') {
                log('UNKNOWN MESSAGE >>> ' + logMessage,'ERROR');
            } else {
                // do nothing
            }
      }
}

/*
 * Outgoing
 */
function sendMessage(recipient,subject,data){

    if (recipient === 'CS_main'){

         log(gvScriptName_IFMain + ' >> message -> ' + recipient + ': ' + subject, 'MESSG');

         window.parent.postMessage({sender:    'IF_main',
                                    subject:   subject,
                                    data:      data}, '*');
     } else {
         log(gvScriptName_IFMain + '.sendMessage: UNKOWN RECIPIENT', 'ERROR');
     }

 }
