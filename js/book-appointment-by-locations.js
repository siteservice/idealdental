var isThreeStepForm = ["6754"].includes(
  "{{wf {&quot;path&quot;:&quot;locations:jarvis-scheduler-office-id&quot;,&quot;type&quot;:&quot;PlainText&quot;} }}"
);
$(document).ready(function () {
  const email =
    `{{wf {&quot;path&quot;:&quot;locations:office-email&quot;,&quot;type&quot;:&quot;Email&quot;\} }}`.replace(
      "@",
      "|"
    );
  $("#Location-Email").val(email);
});
var new_layout = ["/uptown"];
var is_new_layout = new_layout.includes(
  "{{wf {&quot;path&quot;:&quot;locations:test-link&quot;,&quot;type&quot;:&quot;Link&quot;} }}"
);
// get variant query param
const urlParams = new URLSearchParams(window.location.search);
const variant = urlParams.has("variant") || urlParams.has("confirmation");
if (!variant) {
  //if variant or confirmation are there
  is_new_layout = false;
}
if (urlParams.get("confirmation")) {
  const urlObj = new URL(window.location.href);
  urlObj.searchParams.delete("confirmation");
  urlObj.searchParams.set("variant", 1);
  window.history.pushState({}, "", urlObj.toString());
}
if (is_new_layout) {
  document
    .querySelector("body")
    .classList.add(
      "{{wf {&quot;path&quot;:&quot;slug&quot;,&quot;type&quot;:&quot;PlainText&quot;} }}"
    );
}

function onShadowReady(root, selector, callback) {
  const existing = root.querySelector(selector);
  if (existing) return callback(existing);

  const observer = new MutationObserver(() => {
    const el = root.querySelector(selector);
    if (el) {
      observer.disconnect();
      callback(el);
    }
  });

  observer.observe(root, { childList: true, subtree: true });
}

function jarvisGoBack() {
  if (!window.$shedulerShadowRoot) return;

  onShadowReady(
    window.$shedulerShadowRoot,
    "#app > div.flex.flex-col.flex-grow.mt-6 > form > div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl > div > div > div a",
    (backButton) => {
      console.log("Back button clicked by script:", backButton);
      backButton.click();
    }
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

var load_jarvis = () => {
  function getCommentFromURL() {
    // Get the full URL
    const url = window.location.href;

    // Create a URL object
    const urlObj = new URL(url);

    // Get the search parameters
    const searchParams = new URLSearchParams(urlObj.search);

    // Get the 'comment' parameter if it exists
    const comment = searchParams.get("comment");

    // Return the decoded comment or null if not present
    return comment ? decodeURIComponent(comment) : null;
  }

  var LocationName =
    "{{wf {&quot;path&quot;:&quot;locations:jarvis-scheduler-office-id&quot;,&quot;type&quot;:&quot;PlainText&quot;} }}"; // Change as needed

  var bookingForm = document.getElementById("booking-form");
  if (
    LocationName === "" ||
    LocationName === null ||
    LocationName === undefined
  ) {
    bookingForm.style.display = "block";
    var loading_icon_temp = document.getElementById("loading-spinner-tmp");
    loading_icon_temp.style.display = "none"; //hide when form shows
  } else {
    bookingForm.style.display = "none";

    try {
      /*
              const urlParams = new URLSearchParams(window.location.search);
              var commentPrefill = "";
              if (urlParams.has("comment")) {
                 = urlParams.get("comment");
              }*/
      // var $shedulerShadowRoot; //now window.$shedulerShadowRoot
      var phoneNumber;

      /* intercept XHR to get submitted phone number */
      const originalXhrSend = XMLHttpRequest.prototype.send;
      const originalXhrOpen = XMLHttpRequest.prototype.open;

      // Intercept the open method to capture the URL
      XMLHttpRequest.prototype.open = function (
        method,
        url,
        async,
        user,
        password
      ) {
        this._url = url; // Store the URL for logging
        return originalXhrOpen.apply(this, arguments);
      };

      // Function to extract the mobile phone from the variables object
      function extractMobilePhone(variables) {
        return variables?.input?.mobile_phone ?? null;
      }

      // Intercept the send method to capture and log the payload
      XMLHttpRequest.prototype.send = function (body) {
        //console.log('Intercepted XHR request:');
        //console.log('URL:', this._url);

        try {
          const parsedBody = JSON.parse(body);

          // Check if it's a GraphQL query
          if (!parsedBody.query) {
            return originalXhrSend.apply(this, arguments); // Not a GraphQL request
          }
          console.log("GraphQL Query:", parsedBody.variables);
          // Extract the mobile phone if present
          const mobilePhone = extractMobilePhone(parsedBody.variables);
          if (mobilePhone) {
            phoneNumber = mobilePhone;
            console.log("Extracted phone number:", phoneNumber);
          }
        } catch (e) {
          // Log the raw payload if it's not JSON
          //console.log('Payload:', body);
        }
        // Proceed with the normal submission
        return originalXhrSend.apply(this, arguments);
      };
      /* end of interception */

      /* Intercept fetch function */ LocationName;
      window.fetch = new Proxy(window.fetch, {
        apply: async function (target, thisArg, argumentsList) {
          const [url, options = {}] = argumentsList;
          if (
            url == "https://schedule.jarvisanalytics.com/graphql" &&
            options.body
          ) {
            try {
              const parsedBody = JSON.parse(options.body);
              const mobilePhone = parsedBody.variables.input.mobile_phone;
              if (mobilePhone) {
                phoneNumber = mobilePhone;
                console.log("Extracted phone number:", phoneNumber);
                const urlObj = new URL(window.location.href);
                urlObj.searchParams.delete("comment");
                urlObj.searchParams.delete("variant");
                //if(is_new_layout){ confirmation page should be the same as control and variant page
                urlObj.searchParams.set("confirmation", "1");
                //}
                window.history.pushState({}, "", urlObj.toString());
                //window.history.replaceState({}, '', urlObj.toString());
              }
            } catch (e) {
              // do nothing
            }
          }

          // You can also log the response by handling the promise
          const response = await target.apply(thisArg, argumentsList);
          //console.log('Response Status:', response.status);

          return response;
        },
      });

      const winShadowRoot = window.$shedulerShadowRoot;

      /* end of interception */
      //var canUpdatePhoneNumberListener = isThreeStepForm || false; //onThreestep form, we can update the phonenumber listener at start
      var canObservePolicyRadio = isThreeStepForm || false;
      var canUpdateComment = false;
      var hasGoneStepTwoOnce = false;
      window.jarvis = new window.JarvisAnalyticsScheduler({
        //now window.jarvis and window.JarvisAnalyticsScheduler
        token: "46138|hKPVSp7yX5m83JP4qdrNFI82ui91fp4yvJteVf3e",
        companyId: 3,
        locationId:
          "{{wf {&quot;path&quot;:&quot;locations:jarvis-scheduler-office-id&quot;,&quot;type&quot;:&quot;PlainText&quot;} }}",
      });
      const dataLayerPush = (event) => {
        window.scrollTo(0, 0);
        (window.dataLayer || []).push(event);
        try {
          parent.postMessage(event, "*");
          setTimeout(() => {
            console.log("Attempting to prefill comment");
            const comment = getCommentFromURL();
            if (
              winShadowRoot.querySelector("textarea") &&
              comment &&
              winShadowRoot
            ) {
              console.log("Comment:", comment);
              const textarea = winShadowRoot.querySelector("textarea");
              if (textarea) {
                textarea.value = `Offer: ${comment}`;
              }
            }

            // Attach
            var emailInput = document
              .querySelector("jarvis-scheduler-v2")
              .shadowRoot.querySelector("#email");

            if (emailInput) {
              console.log("Email input found");

              emailInput.addEventListener("blur", function () {
                document.getElementById("Booking-Email").value =
                  emailInput.value;

                var event = new Event("change");
                document.getElementById("Booking-Email").dispatchEvent(event);
              });
            }
          }, 1000);
        } catch (e) {
          window.console && window.console.log(e);
        }
      };
      window.jarvis.title = "";
      window.jarvis.colors.activeNavItemBackground = "#6AC64B";
      window.jarvis.colors.primaryOptionColor = "#6AC64B";
      window.jarvis.colors.primaryButtonBackground = "#6AC64B";
      window.jarvis.colors.primaryButtonBorderColor = "#6AC64B";
      window.jarvis.colors.bodyBackground = "#FBFEFF";
      window.jarvis.colors.headerBackground = "#FBFEFF";
      window.jarvis.colors.nearestCardSubtitleColor = "#B7BCC2";
      window.jarvis.colors.inactiveNavItemBackground = "#B7BCC2";
      window.jarvis.colors.samedayCardSubtitlesColor = "#B7BCC2";
      window.jarvis.colors.availabilityBackground = "#FBFEFF";
      window.jarvis.colors.availabilityPaginationBackground = "#EEF2F6";
      window.jarvis.colors.availabilityPaginationColor = "#767F87";
      window.jarvis.colors.availabilityColumnHeaderBackground = "#EEF2F6";
      window.jarvis.colors.availabilityColumnHeaderColor = "#767F87";
      window.jarvis.colors.nearestCardColumnHeaderBackground = "#EEF2F6";
      window.jarvis.colors.nearestCardColumnHeaderColor = "#767F87";
      //window.jarvis.onSubmittedhandlers.push(function () {
      //console.log("submitted");
      //});
      window.jarvis.onBookSuccesshandlers.push(function () {
        //console.log("booked")
        // run after 100ms just to be safe and the DOM is in place
        setTimeout(() => {
          const el = winShadowRoot.querySelector(
            "#app > div.flex.flex-col.flex-grow.mt-6 > div.flex.flex-col.flex-grow > div > div > div"
          );

          if (el) {
            el.style.visibility = "hidden";
            el.style.margin = "64px 16px";
            el.style.maxWidth = "396px";
            el.style.width = "auto";
          }

          window.$shedulerShadowRoot.appendChild(buttonArrowStyle);

          const p3 = root.querySelector(
            "#app > div.flex.flex-col.flex-grow.mt-6 > div.flex.flex-col.flex-grow > div > div > div > p:nth-child(3)"
          );
          if (p3)
            p3.textContent =
              "Confirm your appointment within the next 90 minutes to secure your spot.";

          const p4 = root.querySelector(
            "#app > div.flex.flex-col.flex-grow.mt-6 > div.flex.flex-col.flex-grow > div > div > div > p:nth-child(4)"
          );
          if (p4) p4.textContent = "We've sent an email and text to:";

          const h3 = root.querySelector(
            "#app>div.flex.flex-col.flex-grow.mt-6>div.flex.flex-col.flex-grow>div>div>div>h3"
          );
          if (h3) h3.textContent = "Last step!";
          /* end update success modal text */

          /* update phone number in success modal */
          const phoneTarget = root.querySelector(
            "#app > div.flex.flex-col.flex-grow.mt-6 > div.flex.flex-col.flex-grow > div > div > div > p.text-lg.md\\:text-2xl"
          );
          if (phoneTarget) {
            phoneTarget.insertAdjacentHTML(
              "afterend",
              `<p class="phone-number text-lg md:text-2xl">${phoneNumber}</p>`
            );
          }
          /* end update phone number in success modal */

          /* .book-an-appointment-container { padding: 0 } */
          document
            .querySelectorAll(".book-an-appointment-container")
            .forEach((el) => {
              el.style.padding = "0px 0px 0px 0px";
            });

          /* hide multiple selectors */
          document
            .querySelectorAll(
              ".book-an-appointement-container-mobile, .office-info-mobile, .white-bg-left.desktop"
            )
            .forEach((el) => {
              el.style.display = "none";
            });

          /* change background color */
          document
            .querySelectorAll(
              ".book-an-appointment-main, .book-an-appointement-bg-wrapper, body"
            )
            .forEach((el) => {
              el.style.backgroundColor = "#6AC64B";
            });

          /* .book-an-appointement-bg-wrapper { padding: 0 } */
          document
            .querySelectorAll(".book-an-appointement-bg-wrapper")
            .forEach((el) => {
              el.style.padding = "0";
            });

          /* hide success modal container */
          const container = root.querySelector(
            "#app > div.flex.flex-col.flex-grow.mt-6 > div.container.mx-auto"
          );
          if (container) container.style.display = "none";

          /* .book-an-appointment-main { width: 100% } */
          document
            .querySelectorAll(".book-an-appointment-main")
            .forEach((el) => {
              el.style.width = "100%";
            });

          /* make the success modal visible */
          const modal = root.querySelector(
            "#app > div.flex.flex-col.flex-grow.mt-6 > div.flex.flex-col.flex-grow > div > div > div"
          );
          if (modal) modal.style.visibility = "visible";
        }, 100);
      });
      window.jarvis.onloadhandlers.push(function () {
        //console.log("loaded");
      });
      window.jarvis.onNextStep(dataLayerPush);
      window.jarvis.onNextStephandlers.push(function (e) {
        //canUpdatePhoneNumberListener = true;
        canObservePolicyRadio = true;
        canUpdateComment = true;
        if (!hasGoneStepTwoOnce) {
          hasGoneStepTwoOnce = true;
        }
      });

      document
        .querySelector("#wf-back-button-mobile")
        ?.setAttribute("onclick", "jarvisGoBack()");

      document
        .querySelector("#back-button-sticky-mobile")
        ?.setAttribute("onclick", "jarvisGoBack()");

      document
        .querySelector("#back-button-sticky")
        ?.setAttribute("onclick", "jarvisGoBack()");

      document
        .querySelector("#next-button-sticky")
        ?.addEventListener("click", () => {
          winShadowRoot.querySelector(".continue-btn")?.click();
        });

      window.addEventListener("load", async function () {
        try {
          const jarvis_location = document.querySelector("#jarvis-location");
          //setTimeout( function () {
          let $jarvisComponent = document.querySelector("jarvis-scheduler-v2");
          window.$shedulerShadowRoot = $jarvisComponent.shadowRoot;
          const shadowApp = window.$shedulerShadowRoot.querySelector("#app");
          if (shadowApp) {
            shadowApp.style.position = "relative";
          }
          const closeButton =
            window.$shedulerShadowRoot.querySelector("button");
          if (closeButton) {
            closeButton.style.display = "none";
          }
          jarvis_location.insertAdjacentElement("afterend", $jarvisComponent);
          // the lengthy css was moved to a file but we can still add additional css via the style below;
          // If we really need to override the file content, we can change, repload on webflow and replace the link, webflow natively support only txt and image files for now that's why the style is in txt format
          // Create and insert a <style> element into the shadow DOM
          const response = await fetch(
            "https://uploads-ssl.webflow.com/66a29d804d1aff27a2f2ea9e/66bbb60b515a3aeee8c6d75e_jarvis-styles.txt"
          );
          const cssContent = await response.text();
          const style = document.createElement("style");
          style.textContent = "";
          style.textContent += cssContent;
          style.textContent += `#app.first-visit>div.flex.flex-col.flex-grow.mt-6>form>div.container.pt-6.mx-auto.sm\\:p-6.flex-grow>div>div>div:nth-child(3)>div>div>div>div:nth-child(2)>div>div:nth-child(2){display:none}`;
          style.textContent += `#app.first-visit>div.flex.flex-col.flex-grow.mt-6>form>div.container.pt-6.mx-auto.sm\\:p-6.flex-grow>div>div>div:nth-child(3)>div>div>div>div:nth-child(2)>div>div.relative.flex.items-center.justify-center.pb-2.mb-4.border-b.border-gray-300.cursor-pointer.select-none>svg path{d:path("M20 12H4")}`;
          style.textContent += `
                        @media screen and (max-width : 640px) {
                            div:has(> fieldset > div > label > input#true-insurance){
                                display: flex;
                                flex-direction: column;
                            }
                        }
                        .button-color {
                            color: unset !important;
                        }
                        div:has(> label > input[type="radio"]){
                            display:flex;
                        }
                        @media (min-width: 1280px) {
                            .xl\:grid-cols-5 {
                                grid-template-columns: repeat(3, minmax(0, 1fr));
                            }
                        }
                        @media (min-width: 1024px) and (max-width: 1280px) {
                            #app>div.flex.flex-col.flex-grow.mt-6>form>div.z-50.flex-grow.py-6.mt-6.bg-color>div>div>button{
                                max-width : none;
                            }
                        }
                        @media all and ( 1024px > width > 991px){
                            #app > div.flex.flex-col.flex-grow.mt-6 > form > div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl.md\\:sticky.md\\:bottom-0.md\\:mt-24 > div > div{
                                display:flex;
                            }
                        }
                        @media all and (991px > width > 767px){
                            #app > div.flex.flex-col.flex-grow.mt-6 > form > div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl.md\\:sticky.md\\:bottom-0.md\\:mt-24 > div > div{
                                display : grid;
                            }
                        }
                        @media all and (min-width : 767px ){
                         #app > div.flex.flex-col.flex-grow.mt-6 > form > div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl.md\\:sticky.md\\:bottom-0.md\\:mt-24 > div > div{
                            grid-template-columns: repeat(3, minmax(0, 1fr));
                         }
                        }
                        #app>div.flex.flex-col.flex-grow.mt-6>div.flex.flex-col.flex-grow>div:has(>svg + p ){
                        flex-direction: column;
                        }
                       #app>div.flex.flex-col.flex-grow.mt-6>form>div.container.pt-6.mx-auto>div>div>div:nth-child(3)>div>div>div>div:nth-child(2)>div>div.relative.flex.items-center.justify-center.pb-2.mb-4.border-b.border-gray-300.cursor-pointer.select-none:has(h3 + svg){
                        margin-top : -15px;
                        }
                        @media all and (min-width : 991px){
                        	#app>div.flex.flex-col.flex-grow.mt-6>form h3,
                          #app>div.flex.flex-col.flex-grow.mt-6>form>div.container>div>div>div:nth-child(1)>div>fieldset:nth-child(2)>legend{
                            font-size : 18px;
                          }}
                          #app>div.flex.flex-col.flex-grow.mt-6>div.flex.flex-col.flex-grow>div>div>div>svg{
                            transform: translateX(-22px) !important;
                          }
                          #app>div.flex.flex-col.flex-grow.mt-6>div.flex.flex-col.flex-grow>div>div>div>p.phone-number.text-lg.md\\:text-2xl::before {
                            content: "";
                            display: inline-block;
                            width: 28px;
                            height: 30px;
                            background: url(https://uploads-ssl.webflow.com/663a58dfb423eff3639562f6/6696de4b113ee3fa34570e3b_phone-icon.svg) no-repeat left 40%;
                            background-size: 20px;
                            transform: translateY(10px);
                          }

                          #app > div.flex.flex-col.flex-grow.mt-6 > div.flex.flex-col.flex-grow > div > div > div > p:nth-child(5)::before {
                            content: "";
                            display: inline-block;
                            width: 28px;
                            height: 30px;
                            background: url(https://uploads-ssl.webflow.com/663a58dfb423eff3639562f6/669032579a5afe63cc467ddf_envelope-icon.svg) no-repeat left 40%;
                            background-size: 20px;
                            transform: translateY(10px);
                          }

                          @media all and (1023px < width < 1281px){
                            .continue-btn{
                              max-width : none;
                            }
                          }
                          .separator-line-3steps-1,
                          .separator-line-3steps-2{
                            width: 75px;
                            background-color: #EEF2F6;
                            height: 2px;
                            margin-top: 15px;
                            position: absolute;
                          }
                          .separator-line-3steps-1{
                            left: 14%;
                          }
                          .separator-line-3steps-2{
                            left: 60%;
                          }
                          @media screen and (max-width: 767px) {
                            #app>div.flex.flex-col.flex-grow.mt-6>div>div>div.flex.justify-center:has(.separator-line-3steps-1) a span.text-xs.text-color{
                              text-align : left;
                              margin-left : 0px;
                            }
                          }
                          #app>div.flex.flex-col.flex-grow.mt-6>div>div:has(.separator-line-3steps-1) >div.hidden{
                            right : 135px;
                          }
                          #app>div.flex.flex-col.flex-grow.mt-6>div>div:has(.separator-line-3steps-1) button.continue-btn{
                            min-width : 128px;
                          }
                          @media screen and (max-width: 991px) {
                            #app>div.flex.flex-col.flex-grow.mt-6>div>div:has(.separator-line-3steps-1) button.continue-btn{
                              min-width : 196px;
                            }
                          }
                          
                          @media screen and (1290px > width > 767px){
                            #app>div.flex.flex-col.flex-grow.mt-6>div>div:has(.separator-line-3steps-1) >div.hidden {
                                right: 0px !important;
                                bottom: -60px;
                            }
                          }
                          @media screen and (max-width: 420px) {
                            #app>div.flex.flex-col.flex-grow.mt-6>div>div>div.flex.justify-center:has(.separator-line-3steps-1){
                              gap : 50px;
                            }    
                            .separator-line-3steps-1,
                            .separator-line-3steps-2{
                              width: 48px;
                            }
                            .separator-line-3steps-2{
                              left: 54%;
                            }
                          }
                          #app > div.flex.flex-col.flex-grow.mt-6 > div.flex.flex-col.flex-grow > div > div > div > p:nth-child(7){
                            display:none;
                          }
                            #app>div.flex.flex-col.flex-grow.mt-6>div.flex.flex-col.flex-grow>div>div:has(iframe){
                              padding: 0px;
                              max-width: none !important;
                              width : 800px !important;
                              margin: 0 auto !important;
                          }
                          @media (max-width: 848px) {
                              #app>div.flex.flex-col.flex-grow.mt-6>div.flex.flex-col.flex-grow>div>div:has(iframe){
                                  width: 600px !important;
                              }
                          }
                          @media (max-width: 640px) {
                              #app>div.flex.flex-col.flex-grow.mt-6>div.flex.flex-col.flex-grow>div>div:has(iframe){
                                  width: 85vw !important;
                              }
                          }
                          #app>div.flex.flex-col.flex-grow.mt-6>div.flex.flex-col.flex-grow>div>div>div:has(iframe){
                              padding: 32px 16px;
                              max-width: none !important;
                              margin-left: -16px;
                          }

                          #app>div.flex.flex-col.flex-grow.mt-6>div.flex.flex-col.flex-grow>div:has(iframe){
                              padding: 0px;
                              max-width: none;
                              width: 100% !important;
                          }

                        `;
          if (is_new_layout) {
            style.textContent += `
                #app>div.flex.flex-col.flex-grow.mt-6>form>div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl{
                  background-color: white;
                  box-shadow: 0 0 7px 3px #b2aea3;
                  position : fixed;
                  left : 0;
                  width : 100%;
                  bottom : 0;
                  padding : 24px;
                }

                #app>div.flex.flex-col.flex-grow.mt-6>form>div.z-50.flex-grow.py-6.mt-6.bg-color>div>div>button{
                    background-color: #6AC64B;
                    color: #FBFEFF;
                }

                #app>div.flex.flex-col.flex-grow.mt-6>form>div.z-50.flex-grow.py-6.mt-6.bg-color>div>div>button:hover{
                    background-color: #2ba900;
                }
                @media screen and (min-width : 768px){
                    #app > div.flex.flex-col.flex-grow.mt-6 > form > div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl.md\\:sticky.md\\:bottom-0.md\\:mt-24 > div > div{
                      display : flex;
                      flex-direction : row-reverse;
                      justify-content : space-between;
                      width : 100%;
                      max-width : 1024px;
                      margin : 0 auto;
                    }
                    
                   #app > div.flex.flex-col.flex-grow.mt-6 > form > div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl.md\\:sticky.md\\:bottom-0.md\\:mt-24 > div > div > div{
                        width : 100%;
                        display : flex !important;
                        max-width : 300px;
                    }
                    #app>div.flex.flex-col.flex-grow.mt-6>form>div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl>div>div>button{
                      width : 100%;
                      max-width : 300px;
                    }
                  }
              `;
            $("footer").css("padding-bottom", "110px");
          }
          window.$shedulerShadowRoot.appendChild(style);

          // var hasUpdatedText = false;
          var hasAddedContinueBtn = false;
          // var hasChangedForm1 = false;
          // var hasChangedForm2 = false;
          // var hasChangedForm3 = false;
          var hasAddedBackBtn = false;
          // var hasAddedPhoneNumber = false;
          var hasClosedAvailDropdown = false;

          const script = document.createElement("script");
          script.textContent = `
                            function continueAction(){
                                $(window.$shedulerShadowRoot.querySelector("#app > div.flex.flex-col.flex-grow.mt-6 > form > div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl > div > div > button")).click();
                            }
                            function refresh_page(){
                                window.location.href="/location{{wf {&quot;path&quot;:&quot;locations:test-link&quot;,&quot;type&quot;:&quot;Link&quot;\} }}"
                            }
                            `;
          window.$shedulerShadowRoot.appendChild(script);

          //if (!isIOS()) {
          const observer = new MutationObserver((mutationsList, observer) => {
            for (const mutation of mutationsList) {
              if (mutation.type === "childList") {
                const selectors = [
                  {
                    selector:
                      "#app > div.flex.flex-col.flex-grow.mt-6 > div > div > div.flex.justify-center > a:nth-child(1) > span.text-xs.text-color",
                    text_1: "Booking Information", //text to apply on step 1
                    originalText_1: "Details", //original text on step 1 from jarvis
                    text_2: "Booking Information", //text to apply on next step
                    skip: isThreeStepForm, // skip text update if threeStepForm
                  },
                  {
                    selector:
                      "#app > div.flex.flex-col.flex-grow.mt-6 > div > div > div.flex.justify-center > a:nth-child(2) > span.text-xs.text-color",
                    text_1: "Patient Information",
                    originalText_1: "Schedule",
                    text_2: "Patient Information",
                    skip: false,
                  },
                  {
                    selector:
                      "#app > div.flex.flex-col.flex-grow.mt-6 > form > div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl > div > div > div a",
                    text_1: "Back",
                    originalText_1: "BACK",
                    text_2: "Back",
                    skip: false,
                  },
                  {
                    selector:
                      "#app > div.flex.flex-col.flex-grow.mt-6 > div > div > div.hidden > a",
                    text_1: "Back",
                    originalText_1: "< previous step",
                    text_2: "Back",
                    skip: false,
                  },
                ];

                requestAnimationFrame(() => {
                  selectors.forEach(
                    ({ selector, text_1, originalText_1, text_2, skip }) => {
                      const element =
                        window.$shedulerShadowRoot.querySelector(selector);
                      if (element && !skip) {
                        // if skip we dont want to change the text
                        let currentText = element.textContent.trim();
                        if (currentText === originalText_1) {
                          element.textContent = text_1;
                        } else {
                          element.textContent = text_2;
                        }
                      } else {
                        // console.warn(
                        //   `Element not found for selector: ${selector}`
                        // );
                      }
                    }
                  );

                  const winShadowRoot = window.$shedulerShadowRoot;

                  if (
                    !isThreeStepForm &&
                    !window.$shedulerShadowRoot.querySelector(".separator-line")
                  ) {
                    const link = winShadowRoot.querySelector(
                      "#app > div.flex.flex-col.flex-grow.mt-6 > div > div > div.flex.justify-center > a:nth-child(1)"
                    );

                    if (link) {
                      link.insertAdjacentHTML(
                        "afterend",
                        "<div class='separator-line'></div>"
                      );
                    }
                  }

                  if (
                    isThreeStepForm &&
                    winShadowRoot.querySelector(
                      "#app>div.flex.flex-col.flex-grow.mt-6>div>div>div.flex.justify-center"
                    ) &&
                    !winShadowRoot.querySelector(".separator-line-3steps-1")
                  ) {
                    const link = winShadowRoot.querySelector(
                      "#app > div.flex.flex-col.flex-grow.mt-6 > div > div > div.flex.justify-center > a:nth-child(2)"
                    );

                    if (link) {
                      link.insertAdjacentHTML(
                        "afterend",
                        "<div class='separator-line-3steps-2'></div>"
                      );
                      link.insertAdjacentHTML(
                        "beforebegin",
                        "<div class='separator-line-3steps-1'></div>"
                      );
                    }

                    const container = winShadowRoot.querySelector(
                      "#app>div.flex.flex-col.flex-grow.mt-6>div>div>div.flex.justify-center"
                    );
                    if (container) {
                      container.style.alignItems = "baseline";
                    }
                  }

                  if (
                    winShadowRoot.querySelector(
                      "#app > div.flex.flex-col.flex-grow.mt-6 > div > div"
                    ) &&
                    !hasAddedContinueBtn
                  ) {
                    const container = winShadowRoot.querySelector(
                      "#app > div.flex.flex-col.flex-grow.mt-6 > div > div"
                    );

                    if (container) {
                      container.insertAdjacentHTML(
                        "beforeend",
                        "<div class='flex items-center'><button onclick='continueAction()' class='continue-btn'>Continue</button></div>"
                      );
                    }
                    hasAddedContinueBtn = true;
                  }

                  const nextButton = winShadowRoot.querySelector(
                    "#next-button-sticky"
                  );

                  if (
                    winShadowRoot.querySelector(
                      "#app > div.flex.flex-col.flex-grow.mt-6 > form > div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl > div > div > button"
                    )
                  ) {
                    if (
                      winShadowRoot.querySelector(
                        "#app > div.flex.flex-col.flex-grow.mt-6 > form > div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl > div > div > button"
                      ).textContent == " Next "
                    ) {
                      winShadowRoot.querySelector(".continue-btn").textContent =
                        "Next";

                      if (nextButton) {
                        nextButton.textContent = "Next";
                      }
                    } else {
                      winShadowRoot.querySelector(".continue-btn").textContent =
                        isThreeStepForm ? "Submit" : "Book Appointment";

                      if (nextButton) {
                        nextButton.textContent = isThreeStepForm
                          ? "Submit"
                          : "Book Appointment";
                      }
                    }
                  }

                  if (
                    winShadowRoot.querySelector(
                      'form > div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl > div > div > button[disabled="disabled"]'
                    )
                  ) {
                    if (nextButton) {
                      const disabledInShadow = winShadowRoot.querySelector(
                        'form > div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl > div > div > button[disabled="disabled"]'
                      );

                      if (disabledInShadow) {
                        nextButton.style.opacity = "0.5";
                        nextButton.style.cursor = "not-allowed";
                        nextButton.disabled = true;
                      } else {
                        nextButton.style.opacity = "1";
                        nextButton.style.cursor = "pointer";
                        nextButton.disabled = false;
                      }
                    }
                  }

                  const backButton = winShadowRoot.querySelector(
                    "#app > div.flex.flex-col.flex-grow.mt-6 > form > div.z-50.flex-grow.py-6.mt-6.bg-color.shadow-2xl > div > div > div a"
                  );

                  const backStickyButtons = document.querySelectorAll(
                    "#back-button-sticky-mobile, #back-button-sticky"
                  );
                  const wfBackButton = document.querySelector(
                    "#wf-back-button-mobile"
                  );

                  if (backButton) {
                    backStickyButtons.forEach((el) => {
                      el.style.opacity = "1";
                      el.style.cursor = "pointer";
                    });
                    if (wfBackButton) wfBackButton.style.display = "";
                  } else {
                    backStickyButtons.forEach((el) => {
                      el.style.opacity = "0";
                    });
                    if (wfBackButton) wfBackButton.style.display = "none";
                  }

                  if (
                    winShadowRoot.querySelector(
                      "#app > div.flex.flex-col.flex-grow.mt-6 > div.flex.flex-col.flex-grow > div > div > div"
                    ) &&
                    !hasAddedBackBtn
                  ) {
                    const modal = winShadowRoot.querySelector(
                      "#app > div.flex.flex-col.flex-grow.mt-6 > div.flex.flex-col.flex-grow > div > div > div"
                    );

                    if (modal) {
                      modal.insertAdjacentHTML(
                        "beforeend",
                        "<button class='back-btn-home' onclick='refresh_page()'>Back To Home</button>"
                      );
                    }
                    hasAddedBackBtn = true;
                  }

                  if (
                    winShadowRoot.querySelector("input#true-policy-holder") &&
                    canObservePolicyRadio
                  ) {
                    const falsePolicyHolder = winShadowRoot.querySelector(
                      "input#false-policy-holder"
                    );

                    if (falsePolicyHolder) {
                      falsePolicyHolder.addEventListener("change", () => {
                        const firstName = winShadowRoot.querySelector(
                          "input#policy_holders_firstname"
                        );
                        if (firstName) firstName.value = "";

                        const lastName = winShadowRoot.querySelector(
                          "input#policy_holders_lastname"
                        );
                        if (lastName) lastName.value = "";

                        setTimeout(() => {
                          const dob = winShadowRoot.querySelector(
                            "input#policy_holders_dob"
                          );
                          if (dob) dob.value = "";
                        }, 500);

                        const detachListener = (selector) => {
                          const el = winShadowRoot.querySelector(selector);
                          if (el) {
                            const newEl = el.cloneNode(true);
                            el.replaceWith(newEl);
                          }
                        };

                        detachListener("input#first_name");
                        detachListener("input#last_name");
                        detachListener("input#birth_date");
                      });
                    }

                    const truePolicyHolder = winShadowRoot.querySelector(
                      "input#true-policy-holder"
                    );

                    if (truePolicyHolder) {
                      truePolicyHolder.addEventListener("change", () => {
                        const firstNameInput =
                          winShadowRoot.querySelector("input#first_name");
                        const lastNameInput =
                          winShadowRoot.querySelector("input#last_name");
                        const birthDateInput =
                          winShadowRoot.querySelector("input#birth_date");
                        const policyFirstName = winShadowRoot.querySelector(
                          "input#policy_holders_firstname"
                        );
                        const policyLastName = winShadowRoot.querySelector(
                          "input#policy_holders_lastname"
                        );
                        const policyDob = winShadowRoot.querySelector(
                          "input#policy_holders_dob"
                        );

                        if (firstNameInput && policyFirstName)
                          policyFirstName.value = firstNameInput.value;
                        if (lastNameInput && policyLastName)
                          policyLastName.value = lastNameInput.value;
                        if (birthDateInput && policyDob)
                          policyDob.value = birthDateInput.value;

                        const sync = (source, target) => {
                          if (source && target) {
                            const handler = () => {
                              target.value = source.value;
                            };
                            source.addEventListener("change", handler);

                            source._syncHandler = handler;
                          }
                        };

                        sync(firstNameInput, policyFirstName);
                        sync(lastNameInput, policyLastName);
                        sync(birthDateInput, policyDob);
                      });
                    }

                    canObservePolicyRadio = false; // eventHandler already attached
                  }

                  if (
                    !hasGoneStepTwoOnce &&
                    winShadowRoot.querySelector(
                      "#app > div.flex.flex-col.flex-grow.mt-6 > form > div.container.pt-6.mx-auto.sm\\:p-6.flex-grow > div > div > div:has(>div>div>div>div[date-picker-date])"
                    ) == null &&
                    hasClosedAvailDropdown
                  ) {
                    hasClosedAvailDropdown = false; //if the above div dont exist and we have closed the dropdown we need to close it again
                  }

                  const dropdownDiv = winShadowRoot.querySelector(
                    "#app>div.flex.flex-col.flex-grow.mt-6>form>div.container.pt-6.mx-auto>div>div>div:nth-child(3)>div>div>div>div:nth-child(2)>div>div.relative.flex.items-center.justify-center.pb-2.mb-4.border-b.border-gray-300.cursor-pointer.select-none"
                  );
                  if (dropdownDiv && !hasClosedAvailDropdown) {
                    setTimeout(function () {
                      //check if next div if classless means it is the dropdown then we close it
                      if (
                        winShadowRoot.querySelector(
                          "#app>div.flex.flex-col.flex-grow.mt-6>form>div.container.pt-6.mx-auto>div>div>div:nth-child(3)>div>div>div>div:nth-child(2)>div>div.relative.flex.items-center.justify-center.pb-2.mb-4.border-b.border-gray-300.cursor-pointer.select-none + div"
                        ).classList.length == 0
                      ) {
                        // the dropdown container div has no class, so if the next subling of dropdown header has no class it means the dropdown is opened
                        const target = winShadowRoot.querySelector(
                          "#app>div.flex.flex-col.flex-grow.mt-6>form>div.container.pt-6.mx-auto>div>div>div:nth-child(3)>div>div>div>div:nth-child(2)>div>div.relative.flex.items-center.justify-center.pb-2.mb-4.border-b.border-gray-300.cursor-pointer.select-none"
                        );

                        if (target) {
                          target.click();
                        }
                      }
                    }, 500);
                    hasClosedAvailDropdown = true;
                  }
                });
              }
            }
          });

          const config = {
            // some DOM changes need to watch attr & subtree changes as well
            //in browserstack when we observe subtree and/or attributes IOS devices freeze, if it happens on real devices then we can conditionnaly observe both
            //based on the device OS
            //Did conditional observation just to test in browserstack but still conviced that on real device it should not freeze
            attributes: true, //!isIOS(),
            childList: true, //the most needed
            //subtree: true, //!isIOS(),
          };
          observer.observe(this.window.$shedulerShadowRoot, config);
          //}
          //},0)
          var loading_icon_temp = document.getElementById(
            "loading-spinner-tmp"
          );
          loading_icon_temp.style.display = "none"; //hide when jarvis loads
          window.jarvis.toggle(); //toggle is the function that show the jarvis component
          window.scrollTo(0, 0); //scroll on top
        } catch (error) {
          console.error(
            "Error during the jarvis toggle or script setup:",
            error
          );
        }
      });
    } catch (error) {
      console.error("Error during the setup of the jarvis scheduler:", error);
    }
  }
};
