window.regions_mapping = {
  atlanta: {
    inputValue: "Alanta, GA, USA",
    regionCoordinates: [33.749660098077506, -84.3965202473269],
    forceCoordinates: false,
    zoomLevel: 10,
  },
  austin: {
    inputValue: "Austin, TX, USA",
    regionCoordinates: [-97.7431, 30.2672],
    forceCoordinates: false,
    zoomLevel: 10,
  },
  charlotte: {
    inputValue: "Charlotte, NC, USA",
    regionCoordinates: [35.22104138684506, -80.84447687795576],
    forceCoordinates: false,
    zoomLevel: 9,
  },
  "dallas-fort-worth": {
    inputValue: "Dallas-Fort Worth Metropolitan Area, TX, USA",
    regionCoordinates: [-96.9209135, 32.7078751],
    forceCoordinates: false,
    zoomLevel: 9,
  },
  houston: {
    inputValue: "Houston, TX, USA",
    regionCoordinates: [-95.3698, 29.7604],
    forceCoordinates: false,
    zoomLevel: 9,
  },
  jacksonville: {
    inputValue: "Jacksonville, FL, USA",
    regionCoordinates: [30.326618468170558, -81.65083466246286],
    forceCoordinates: false,
    zoomLevel: 9,
  },
  nashville: {
    inputValue: "Nashville, TN, USA",
    regionCoordinates: [36.164356171293186, -86.79476957517893],
    forceCoordinates: false,
    zoomLevel: 10,
  },
  "north-carolina": {
    inputValue: "North Carolina, USA",
    regionCoordinates: [35.732535987200706, -79.43499217414373],
    forceCoordinates: false,
    zoomLevel: 6,
  },
  orlando: {
    inputValue: "Orlando, FL, USA",
    regionCoordinates: [28.537020052841306, -81.37953221620637],
    forceCoordinates: false,
    zoomLevel: 10,
  },
  phoenix: {
    inputValue: "Phoenix, AZ, USA",
    regionCoordinates: [33.44938371554326, -112.09258454784829],
    forceCoordinates: false,
    zoomLevel: 10,
  },
  "san-antonio": {
    inputValue: "San Antonio, TX, USA",
    regionCoordinates: [-98.5986018, 29.4315263], //[-98.5420483, 29.4360571],//[-98.4936, 29.4241],
    forceCoordinates: true,
    zoomLevel: 11,
  },
  seattle: {
    inputValue: "Seattle, WA, USA",
    regionCoordinates: [47.61177040298884, -122.32320509966688],
    forceCoordinates: false,
    zoomLevel: 10,
  },
  "south-florida": {
    inputValue: "South Florida, USA",
    regionCoordinates: [26.125273638248615, -82.80271565420823],
    forceCoordinates: false,
    zoomLevel: 7,
  },
  "tampa-bay": {
    inputValue: "Tampa Bay, FL, USA",
    regionCoordinates: [27.9490797972278, -82.45871072579521],
    forceCoordinates: false,
    zoomLevel: 10,
  },
};

const fetchUserLocation = async () => {
  try {
    const response = await fetch("https://geo-ip.rboone.workers.dev/");
    if (!response.ok) {
      throw new Error("No network response");
    }
    const data = await response.json();
    window.userLongLat = [data.longitude, data.latitude];
  } catch (error) {
    console.error("Error:", error);
  }
};

fetchUserLocation();

async function getPermission() {
  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    return `${result.state}`;
  } catch (error) {
    return `geolocation (not supported)`;
  }
}

let zoomLocAllowed = 8;

async function checkPermission() {
  const permissionStatus = await getPermission();

  if (permissionStatus === "granted") {
    zoomLocAllowed = 10;
  }
}

checkPermission();

// #region Utils
/**
 * Location State
 */
const locationState = {
  coords: null, // [lng, lat]
  formatted: null, // "City, State, Country"
};

/**
 * Update the input value with the formatted location
 * @param {string} formatted - The formatted location string
 */
function UpdateInputValue(formatted) {
  const input = document.querySelector("#autocomplete");

  if (!input) {
    console.error(
      "[UpdateInputValue] Input element (#autocomplete) not found in DOM!"
    );
    return;
  }

  if (!formatted || typeof formatted !== "string") {
    console.error("[UpdateInputValue] Invalid formatted value:", formatted);
    return;
  }

  input.value = formatted;
  console.log("[UpdateInputValue] Updated:", formatted);
}

/**
 * Update the location state and sync with map + input
 * @param {[number, number]} coords - Lng, Lat coordinates
 * @param {string} formatted - City, State, Country formatted string
 */
function SetLocation({ coords, formatted }) {
  if (coords) {
    locationState.coords = coords;
    window.userSearchLongLat = coords;
  }
  if (formatted) {
    locationState.formatted = formatted;
    window.userSearchCityRegion = formatted;
  }

  console.log("[LocationManager] Updated:", locationState);

  const input = document.querySelector("#autocomplete");
  if (input && formatted) {
    input.value = formatted;
  }

  if (typeof updateVisibleOffices === "function") updateVisibleOffices();
  if (typeof cardActionsSearch === "function") cardActionsSearch();
}

/**
 * Get the currently set user location
 * @returns {coords: [number, number] | null}
 */
function GetUserLocation() {
  const coords = window.userLongLat;

  console.log("[GetUserLocation] coords:", coords);

  if (!coords || coords.length !== 2) {
    console.warn("[GetUserLocation] No location set.");
    return null;
  }

  return coords;
}

function SetSearchLocation(coords, formatted) {
  if (coords) {
    window.userSearchLongLat = coords;
    window.userSearchCityRegion = formatted;
  }

  console.log("[SetSearchLocation] coords:", coords);

  if (!coords || coords.length !== 2) {
    console.warn("[SetSearchLocation] No location set.");
    return null;
  }

  return coords;
}

/**
 * Function to get formatted address by coordinates
 * @param {[number, number]} coords - [lng, lat]
 * @returns {Promise<string | null>}
 */
function GetFormattedAddressByCoords(coords) {
  return new Promise((resolve) => {
    if (!coords || coords.length !== 2) {
      console.warn("[GetFormattedAddressByCoords] Invalid coords", coords);
      return resolve(null);
    }

    const lat = parseFloat(coords[1]);
    const lng = parseFloat(coords[0]);

    if (isNaN(lat) || isNaN(lng)) {
      console.warn(
        "[GetFormattedAddressByCoords] Coords are not numbers",
        coords
      );
      return resolve(null);
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results[0]) {
        let city = "",
          state = "",
          country = "";

        results[0].address_components.forEach((comp) => {
          if (comp.types.includes("locality")) city = comp.long_name;
          if (comp.types.includes("administrative_area_level_1"))
            state = comp.short_name;
          if (comp.types.includes("country")) country = comp.long_name;
        });

        const formatted = [city, state, country].filter(Boolean).join(", ");
        resolve(formatted);
      } else {
        console.warn("[Geocoder Failed]", status);
        resolve(null);
      }
    });
  });
}

/**
 * Function to fly to a location or the current set location
 * @param {number} zoom - Zoom level for the map
 * @param {mapboxgl.Map} mapInstance - Mapbox GL map instance
 * @param {[number, number]} [location] - Optional [lng, lat] coordinates to fly to
 */
function FlyToLocation(zoom = 11, mapInstance, location) {
  const coords = location || GetUserLocation();

  if (!coords || coords.length !== 2) {
    console.warn("[FlyToLocation] No location set.");
    return;
  }

  console.log("[FlyToLocation] Flying to:", coords);

  mapInstance.flyTo({
    center: coords,
    essential: true,
    zoom: zoom,
  });
}

/**
 * Render or update the user location marker with a custom div
 * @param {mapboxgl.Map} mapInstance
 * @param {[number, number]} coords - [lng, lat]
 */
function RenderUserMarker(mapInstance, coords) {
  if (!coords || coords.length !== 2) return;

  if (!window.userMarker) {
    // Create the custom element once
    const el = document.createElement("div");
    el.className = "mapboxgl-user-location-dot";

    window.userMarker = new mapboxgl.Marker(el)
      .setLngLat(coords)
      .addTo(mapInstance);

    console.log("[RenderUserMarker] Created marker at:", coords);
  } else {
    // Only update coordinates, do NOT create a new element
    window.userMarker.setLngLat(coords);
    console.log("[RenderUserMarker] Updated marker to:", coords);
  }
}
// #endregion

//Mapbox Functionality
function mapboxLocations() {
  //Get region query parameter
  const acceptedRegions = Object.keys(window.regions_mapping); // ['dallas-fort-worth']
  let region = "";
  let inputValue = "";
  let regionCoordinates = [];
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  let zoomRegion = zoomLocAllowed;

  if (urlParams.size !== 0 && urlParams.has("region")) {
    region = urlParams.get("region").toLowerCase();
    //zoomRegion = 8;
  }

  const url = new URL(window.location.href);
  const pathname = url.pathname;
  const locationName = pathname.split("/locations/")[1];
  //console.log(url,pathname,locationName);

  if (locationName) {
    // Get location from URL as well
    region = locationName.toLowerCase();
    //zoomRegion = 8;
  }

  if (region !== "" && acceptedRegions.includes(region)) {
    inputValue = window.regions_mapping[region]?.inputValue ?? ""; // if not found, return empty string
    regionCoordinates = window.regions_mapping[region]?.regionCoordinates ?? []; // if not found, return empty array
  }

  // console.log(region, inputValue, regionCoordinates);

  //Create GeoJSON
  window.locationsGeoJSON = window.locationsGeoJSON || {
    type: "FeatureCollection",
    features: [],
  };

  function createLocationFeature(id, latitude, longitude, name, description) {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      properties: {
        id: id,
        name: name,
        description: JSON.stringify(description),
      },
    };
  }

  locationFeatures.forEach(function (locationFeatures) {
    var feature = createLocationFeature(
      locationFeatures.id,
      locationFeatures.latitude,
      locationFeatures.longitude,
      locationFeatures.name,
      locationFeatures.description
    );
    window.locationsGeoJSON.features.push(feature);
  });
  /*End GeoJSON*/

  //Start map functionality
  const mapboxStyle = "mapbox://styles/nbaulisch/cly4o18ra00jc01qjf3tbbn6j";

  const accessToken =
    "pk.eyJ1IjoibmJhdWxpc2NoIiwiYSI6ImNseHA0MW8zbjBtdHUyaW9keGl3ajFkOGEifQ.l0dQFLRTvNxCCV7CYuIKbQ";
  const zoom = 4;
  mapboxgl.accessToken = accessToken;
  const mapgl = new mapboxgl.Map({
    container: "locations-map", // container id
    style: mapboxStyle,
    center: [-96, 37.8], // starting position
    zoom: 5, // starting zoom
    animate: true,
    attributionControl: false,
    // scrollZoom: false
  });
  mapgl.scrollZoom.disable();
  mapgl.fitBounds([
    [-125.0011, 24.9493], // US southwestern corner of the bounds
    [-66.9326, 49.5904], // US northeastern corner of the bounds
  ]);

  mapgl.on("load", function () {
    mapgl.loadImage(
      "https://cdn.prod.website-files.com/663a58dfb423eff3639562f6/6683102370a009e45238a05b_LocationPin.png",
      function (error, image) {
        if (error) {
          throw error;
        }
        mapgl.addImage("locationsPin", image);
      }
    );
    mapgl.loadImage(
      "https://cdn.prod.website-files.com/663a58dfb423eff3639562f6/668310238fec6bce3551ebbe_LocationPinHover.png",
      function (error, image) {
        if (error) {
          throw error;
        }
        mapgl.addImage("locationsPinHover", image);
      }
    );

    mapgl.addSource("locations", {
      type: "geojson",
      // Use a URL for the value for the `data` property.
      data: locationsGeoJSON,
      cluster: true,
      clusterMaxZoom: 8, // Max zoom to cluster points on
      clusterRadius: 55,
    });

    mapgl.addLayer({
      id: "locations-cluster-layer",
      type: "symbol",
      source: "locations",
      filter: ["has", "point_count"],
      layout: {
        "icon-image": "locationsPin",
        "icon-allow-overlap": true,
      },
    });
    mapgl.addLayer({
      id: "locations-nocluster-layer",
      type: "symbol",
      source: "locations",
      filter: ["!", ["has", "point_count"]],
      layout: {
        "icon-image": "locationsPin",
        "icon-allow-overlap": true,
      },
    });
    mapgl.addLayer({
      id: "locations-highlight-layer",
      type: "symbol",
      source: "locations",
      filter: ["==", "id", ""],
      layout: {
        "icon-image": "locationsPinHover",
        "icon-allow-overlap": true,
      },
    });

    mapgl.addControl(
      new mapboxgl.NavigationControl({
        showCompass: false,
      })
    );
    mapgl.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true, // When active the map will receive updates to the device's location as it changes.
        showUserHeading: true, // Draw an arrow next to the location dot to indicate which direction the device is heading.
      }).on("geolocate", function (e) {
        console.log("[GeolocateControl Event]", e);
        // const coords = [e.coords.longitude, e.coords.latitude];
        // mapgl.flyTo({
        //   center: coords,
        //   essential: true,
        //   zoom: zoomLocAllowed,
        // });

        // const geocoder = new google.maps.Geocoder();
        // geocoder.geocode(
        //   { location: { lat: coords[1], lng: coords[0] } },
        //   (results, status) => {
        //     if (status === "OK" && results[0]) {
        //       const components = results[0].address_components;
        //       let city = "",
        //         state = "",
        //         country = "";

        //       components.forEach((comp) => {
        //         if (comp.types.includes("locality")) city = comp.long_name;
        //         if (comp.types.includes("administrative_area_level_1"))
        //           state = comp.short_name;
        //         if (comp.types.includes("country")) country = comp.long_name;
        //       });

        //       const formatted = [city, state, country]
        //         .filter(Boolean)
        //         .join(", ");

        //       setLocation({ coords, formatted });
        //     }
        //   }
        // );
      })
    );
    document
      .querySelector(".current-location-action")
      .addEventListener("click", async function () {
        const userLocationCoords = GetUserLocation();
        if (userLocationCoords) {
          FlyToLocation(11, mapgl, userLocationCoords);
          RenderUserMarker(mapgl, userLocationCoords);

          const userLocationFormatted = await GetFormattedAddressByCoords(
            userLocationCoords
          );

          if (userLocationFormatted) {
            UpdateInputValue(userLocationFormatted);
            SetSearchLocation(userLocationCoords, userLocationFormatted);
          } else {
            console.warn("No formatted address available");
          }
        } else {
          console.warn("No user location available");
        }
      });

    if (region !== "" && acceptedRegions.includes(region)) {
      //Fly to region
      // TODO : remove the line where region was previously updated because now it get updated from here
      getPlaceObject(inputValue, function (place, error) {
        if (place) {
          // console.log("Place object:", place);
          // You can now use this place object to set the autocomplete and trigger the place_changed event
          document.getElementById("autocomplete").value =
            place.formatted_address;
          if (window.regions_mapping[region].forceCoordinates) {
            place.geometry.location.lng = () =>
              window.regions_mapping[region].regionCoordinates[0];
            place.geometry.location.lat = () =>
              window.regions_mapping[region].regionCoordinates[1];
          }
          //google.maps.event.trigger(autocomplete, 'place_changed');
          placeChangedHandler(place, window.regions_mapping[region].zoomLevel);
        } else {
          console.error("Error:", error);
        }
      });
      //mapgl.flyTo({
      //   center: regionCoordinates,
      // essential: true,
      // zoom: zoomRegion
      //});
    } else {
      //Fly to user location
      mapgl.flyTo({
        center: userLongLat,
        essential: true,
        zoom: zoomLocAllowed,
      });
    }
  });

  mapgl.once("idle", function () {
    if (
      mapgl.getSource("locations-cluster-layer") &&
      mapgl.isSourceLoaded("locations")
    ) {
      var features = mapgl.querySourceFeatures("locations");
      var feature = features[0];

      if (feature !== undefined) {
        mapgl.once("moveend", function () {
          mapgl.setCenter(feature.geometry.coordinates);
        });

        mapgl.flyTo({
          center: feature.geometry.coordinates,
          zoom: 10,
        });
      }
    }
    if (
      mapgl.getSource("locations-nocluster-layer") &&
      mapgl.isSourceLoaded("locations")
    ) {
      var features = mapgl.querySourceFeatures("locations");
      var feature = features[0];

      if (feature !== undefined) {
        mapgl.once("moveend", function () {
          mapgl.setCenter(feature.geometry.coordinates);
        });

        mapgl.flyTo({
          center: feature.geometry.coordinates,
          zoom: zoom,
        });
      }
    }
    if (
      mapgl.getSource("locations-highlight-layer") &&
      mapgl.isSourceLoaded("locations")
    ) {
      var features = mapgl.querySourceFeatures("locations");
      var feature = features[0];

      if (feature !== undefined) {
        mapgl.once("moveend", function () {
          mapgl.setCenter(feature.geometry.coordinates);
        });

        mapgl.flyTo({
          center: feature.geometry.coordinates,
          zoom: zoom,
        });
      }
    }
  });

  mapgl.on("mousemove", function (event) {
    // Change the cursor style as a UI indicator.
    const features = mapgl.queryRenderedFeatures(event.point, {
      layers: [
        "locations-cluster-layer",
        "locations-nocluster-layer",
        "locations-highlight-layer",
      ],
    });
    mapgl.getCanvas().style.cursor = features.length ? "pointer" : "";
  });

  mapgl.on(
    "mouseleave",
    "locations-cluster-layer, locations-nocluster-layer, locations-highlight-layer",
    function () {
      // Change the cursor style as a UI indicator.
      mapgl.getCanvas().style.cursor = "";
    }
  );

  let preventReRender = false;
  mapgl.on("click", function (e) {
    if (e.originalEvent && e.originalEvent.type === "click") {
      preventReRender = false;
    }
  });

  mapgl.on("click", "locations-cluster-layer", (e) => {
    const features = mapgl.queryRenderedFeatures(e.point, {
      layers: ["locations-cluster-layer"],
    });
    const clusterId = features[0].properties.cluster_id;
    mapgl
      .getSource("locations")
      .getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;

        mapgl.flyTo({
          center: features[0].geometry.coordinates,
          zoom: zoom,
        });
        //   console.log(zoom);
      });
  });

  mapgl.on("click", "locations-nocluster-layer", (e) => {
    //Pin click feature
    const clickPoint = turf.point([e.lngLat.lng, e.lngLat.lat]);
    let nearestFeature = null;
    let minDistance = Infinity;

    locationsGeoJSON.features.forEach((feature) => {
      const featurePoint = turf.point(feature.geometry.coordinates);
      const distance = turf.distance(clickPoint, featurePoint, {
        units: "miles",
      });
      if (distance < minDistance) {
        minDistance = distance;
        nearestFeature = feature;
      }
    });

    if (nearestFeature) {
      const featureId = nearestFeature.properties.id;
      mapgl.setFilter("locations-highlight-layer", ["==", "id", featureId]);

      $(".list-feature .office-card-wrapper").removeClass("active");
      let officeTo = $('.office-list-item[data-id="' + featureId + '"]');
      const listWrapper = $(".list-feature");
      listWrapper.animate(
        {
          scrollTop:
            officeTo.offset().top -
            listWrapper.offset().top +
            listWrapper.scrollTop(),
        },
        300,
        function () {
          $(
            '.office-list-item[data-id="' +
              featureId +
              '"] .office-card-wrapper'
          ).addClass("active");
        }
      );
    }
  });

  mapgl.on("idle", function () {
    mapgl.resize();
    mapgl.triggerRepaint();
  });

  // Render items in a separate view
  function renderItems(features) {
    $(".list-feature").empty();
    if (window.userSearchLongLat !== undefined) {
      const from = turf.point(window.userSearchLongLat);
      features.forEach(function (feature) {
        const to = turf.point(feature.geometry.coordinates);
        feature.properties.distance = turf.distance(from, to, {
          units: "miles",
        });
      });
      // Sort features by the calculated distance
      features.sort(function (a, b) {
        return a.properties.distance - b.properties.distance;
      });
    }
    features.forEach(function (feature) {
      var item =
        '<div class="office-list-item" data-id="' +
        feature.properties.id +
        '">';
      item += JSON.parse(feature.properties.description);
      item += "</div>";
      $(".list-feature").append(item);
    });
  }

  function countFeatures(item) {
    const items = $(item).length;
    const notifications = $(".location-map-notifications");
    const location_count = $(".locations-count");

    if (
      window.userSearchLongLat !== undefined &&
      (window.isOutOfBounds === false || window.isOutOfBounds === undefined) &&
      window.hasFeatures === true
    ) {
      notifications.css("display", "flex");
      notifications.css("background-color", "var(--brand-green)");
      location_count.text("Available dental clinics:");

      if (items === 1) {
        $(".location-map-notifications .notification-underline").text(
          items + " Dental Office"
        );
      } else {
        $(".location-map-notifications .notification-underline").text(
          items + " Dental Offices"
        );
      }
      $(".location-map-notifications .notification-continuation").text(
        " found near your area"
      );
    } else {
      if (items === 1) {
        location_count.text(items + " Location");
      } else {
        location_count.text(items + " Locations");
      }
    }
    if (
      window.userSearchLongLat !== undefined &&
      window.isOutOfBounds === true
    ) {
      notifications.css("display", "flex");
      location_count.text("Available dental clinics:");
      $(".location-map-notifications").css(
        "background-color",
        "var(--bold-grey)"
      );
      $(".location-map-notifications .notification-underline").text(
        "Closest Office"
      );
      $(".location-map-notifications .notification-continuation").text(
        "is " + window.minDistance.toFixed(1) + " mi. away"
      );
    }
    if (
      window.userSearchLongLat !== undefined &&
      window.isOutOfBounds === false &&
      window.minDistance === Infinity
    ) {
      notifications.css("display", "none");
      location_count.css("display", "none");
      //$('.location-map-notifications').css('display', 'none');
    }
  }

  function cardActions() {
    $(".office-card-wrapper").on("click", function () {
      preventReRender = true;
      $(".office-card-wrapper").each(function () {
        $(this).removeClass("active");
      });
      $(this).addClass("active");
      var lat = $(this).attr("data-latitude");
      var lng = $(this).attr("data-longitude");
      mapgl.flyTo({
        center: [lng, lat],
        essential: true,
        zoom: 12,
      });
      var featureId = $(this).parent().data("id");
      if (hasFeatures) {
        mapgl.setFilter("locations-highlight-layer", ["==", "id", featureId]);
      }
    });
  }

  function cardActionsSearch() {
    if (!preventReRender) {
      $(".list-feature .office-list-item")
        .first()
        .find(".office-card-wrapper")
        .addClass("active");
      var featureIdFirst = $(".list-feature .office-list-item")
        .first()
        .data("id");
      if (hasFeatures) {
        mapgl.setFilter("locations-highlight-layer", [
          "==",
          "id",
          featureIdFirst,
        ]);
      }
    }
    $(".list-feature").on("click", ".office-list-item", function () {
      preventReRender = true;
      var featureId = $(this).data("id");
      if (hasFeatures) {
        mapgl.setFilter("locations-highlight-layer", ["==", "id", featureId]);
      }
      var location_card = $(this).find(".office-card-wrapper");
      $(".list-feature").each(function () {
        $(".office-card-wrapper").removeClass("active");
      });
      location_card.addClass("active");
      var lat = location_card.attr("data-latitude");
      var lng = location_card.attr("data-longitude");

      mapgl.flyTo({
        center: [lng, lat],
        essential: false,
        zoom: 11,
      });
    });
  }

  function resizeMap() {
    mapgl.resize();
    mapgl.triggerRepaint();
  }

  // Rendered initial items UI functions
  countFeatures(".list-feature .office-list-item");
  cardActions();

  const offices_wrapper = $(".list-feature");
  const dragger = $(".dragger");
  // const map_view_placeholder = $(".map-view-placeholder");
  // const mapViewBtn = $(".map-view-btn");
  const mapSection = $(".location-map-section");
  const locationsMap = $(".locations-map-wrapper");
  const mapToggleBtn = $(".map-toggle-btn");
  const footer = $(".footer-wrapper");
  let isExpanded = false;
  let isHidden = false;
  let viewportWidth = window.visualViewport
    ? window.visualViewport.width
    : window.innerWidth;
  let searchMode = false;
  let modalShown = false;

  // map_view_placeholder.hide();
  if (viewportWidth < 992) {
    footer.hide();
  }
  $(window).on("resize", function () {
    viewportWidth = window.visualViewport
      ? window.visualViewport.width
      : window.innerWidth;
    if (viewportWidth < 992) {
      footer.hide();
    } else {
      footer.show();
    }
  });

  dragger.click(function () {
    resizeMap();
    if (viewportWidth > 767 && viewportWidth < 992) {
      if (isHidden) {
        mapSection.animate({ height: "665px" }, 400);
        offices_wrapper.animate({ height: "285px" }, 400);
        $(".locations-offices")
          .css("border-top-left-radius", "16px")
          .css("border-top-right-radius", "16px");
        setTimeout(function () {
          locationsMap.css("height", mapSection.height() + 16 + "px");
          mapToggleBtn.css("display", "block");
          resizeMap();
        }, 400);
      } else {
        mapSection.animate({ height: "0" }, 400);
        offices_wrapper.animate({ height: "555px" }, 400);
        mapToggleBtn.css("display", "none");
        $(".locations-offices")
          .css("border-top-left-radius", "0")
          .css("border-top-right-radius", "0");
        setTimeout(function () {
          locationsMap.css("height", mapSection.height() + "px");
          resizeMap();
        }, 400);
      }
    }
    if (viewportWidth < 768) {
      if (isHidden) {
        mapSection.animate({ height: "390px" }, 400);
        offices_wrapper.animate({ height: "195px" }, 400);
        $(".locations-offices")
          .css("border-top-left-radius", "16px")
          .css("border-top-right-radius", "16px");
        setTimeout(function () {
          locationsMap.css("height", mapSection.height() + 16 + "px");
          mapToggleBtn.css("display", "block");
          resizeMap();
        }, 400);
      } else {
        mapSection.animate({ height: "0" }, 400);
        offices_wrapper.animate({ height: "560px" }, 400);
        mapToggleBtn.css("display", "none");
        $(".locations-offices")
          .css("border-top-left-radius", "0")
          .css("border-top-right-radius", "0");
        setTimeout(function () {
          locationsMap.css("height", mapSection.height() + "px");
          resizeMap();
        }, 400);
      }
    }
    isHidden = !isHidden;
  });

  // mapViewBtn.on("click", function () {
  //   if (viewportWidth > 767 && viewportWidth < 992) {
  //     mapSection.animate({ height: "665px" }, 400);
  //     setTimeout(function () {
  //       locationsMap.css("height", mapSection.height() + 16 + "px");
  //       mapToggleBtn.css("display", "block");
  //       resizeMap();
  //     }, 401);
  //   }
  //   if (viewportWidth < 768) {
  //     mapSection.animate({ height: "390px" }, 400);
  //     setTimeout(function () {
  //       locationsMap.css("height", mapSection.height() + 16 + "px");
  //       mapToggleBtn.css("display", "block");
  //       resizeMap();
  //     }, 401);
  //   }

  //   var mapview = $(this).attr("href");
  //   $("html,body").animate({ scrollTop: $(mapview).offset().top }, "slow");
  //   isHidden = !isHidden;
  //   return false;
  // });

  // offices_wrapper.on("scroll", function () {
  //   if (viewportWidth < 992) {
  //     if (
  //       $(this).scrollTop() + $(this).innerHeight() >=
  //       $(this)[0].scrollHeight
  //     ) {
  //       map_view_placeholder.css("display", "none");
  //     } else {
  //       map_view_placeholder.css("display", "flex");
  //     }
  //   }
  // });

  mapToggleBtn.on("click", function () {
    // map_view_placeholder.hide();
    if (viewportWidth > 767 && viewportWidth < 992) {
      if (isExpanded) {
        mapSection.animate({ height: "580px" }, 400);
        offices_wrapper.animate({ height: "285px" }, 400);
        setTimeout(function () {
          locationsMap.css("height", mapSection.height() + 16 + "px");
          resizeMap();
        }, 401);
      } else {
        mapSection.animate({ height: "670px" }, 400);
        offices_wrapper.animate({ height: "0px" }, 400);
        setTimeout(function () {
          locationsMap.css("height", mapSection.height() + 16 + "px");
          resizeMap();
        }, 401);
      }
    }

    if (viewportWidth < 768) {
      if (isExpanded) {
        mapSection.animate({ height: "390px" }, 400);
        offices_wrapper.animate({ height: "195px" }, 400);
        setTimeout(function () {
          locationsMap.css("height", mapSection.height() + 16 + "px");
          resizeMap();
        }, 401);
      } else {
        // Animate heights for the "expanded" state
        mapSection.animate({ height: "580px" }, 400);
        offices_wrapper.animate({ height: "0px" }, 400);
        setTimeout(function () {
          locationsMap.css("height", mapSection.height() + 16 + "px");
          resizeMap();
        }, 401);
      }
    }

    if (
      window.userSearchLongLat !== undefined &&
      window.isOutOfBounds === true
    ) {
      if (viewportWidth < 768) {
        if (isExpanded) {
          mapSection.animate({ height: "195px" }, 400);
          // offices_wrapper.animate({ height: "495px" }, 400);
          setTimeout(function () {
            locationsMap.css("height", mapSection.height() + 16 + "px");
            resizeMap();
          }, 401);
        } else {
          // Animate heights for the "expanded" state
          mapSection.animate({ height: "650px" }, 400);
          offices_wrapper.animate({ height: "16px" }, 400);
          // map_view_placeholder.hide();
          setTimeout(function () {
            locationsMap.css("height", mapSection.height() + 16 + "px");
            resizeMap();
          }, 401);
        }
      }
    }

    $(".toggle-fullscreen").toggleClass("hidden");
    $(".toggle-normalscreen").toggleClass("hidden");

    isExpanded = !isExpanded;
  });

  //Card button links
  const book_appointment_btn = $(
    ".list-feature .w-dyn-list .office-card-wrapper .office-cta-buttons .btn-primary"
  );
  const directions_btn = $(
    ".list-feature .w-dyn-list .office-card-wrapper .office-cta-buttons .btn-circle"
  );
  book_appointment_btn.each(function () {
    let book_appointment_slug = $(this).data("slug") + "/book-appointment";
    $(this).attr("href", book_appointment_slug);
  });

  directions_btn.each(function () {
    let directions_slug =
      "https://www.google.com/maps/search/?api=1&query=Ideal+Dental+" +
      $(this).data("name") +
      "+" +
      $(this).data("address") +
      "++" +
      $(this).data("abbrstate") +
      "+" +
      $(this).data("zip");
    $(this).attr("href", directions_slug);
    $(this).attr("aria-label", "Open Google Maps " + $(this).data("name"));
  });

  function updateVisibleOffices() {
    if (preventReRender) return;
    const zoom = mapgl.getZoom();
    const bounds = mapgl.getBounds();
    const center = mapgl.getCenter().toArray();

    // Calculate the approximate width of the visible area in miles
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const widthInMiles = turf.distance([sw.lng, sw.lat], [ne.lng, sw.lat], {
      units: "miles",
    });

    let searchArea;

    if (widthInMiles > 60 && zoom < 12) {
      searchArea = turf.bboxPolygon([sw.lng, sw.lat, ne.lng, ne.lat]);
    } else {
      const searchRadius = 60;
      const options = { steps: 80, units: "miles" };
      searchArea = turf.circle(center, searchRadius, options);
    }

    const visibleFeatures = turf.pointsWithinPolygon(
      locationsGeoJSON,
      searchArea
    );
    const sortedVisibleFeatures = visibleFeatures.features;
    if (window.userSearchLongLat === undefined) {
      const from = turf.point(center);
      sortedVisibleFeatures.forEach(function (feature) {
        const to = turf.point(feature.geometry.coordinates);
        feature.properties.distance = turf.distance(from, to, {
          units: "miles",
        });
      });
      // Sort features by the calculated distance
      sortedVisibleFeatures.sort(function (a, b) {
        return a.properties.distance - b.properties.distance;
      });
    }
    renderItems(sortedVisibleFeatures);

    window.hasFeatures = visibleFeatures.features.length > 0;
  }

  mapgl.on("zoomend", function (e) {
    if (
      e.originalEvent &&
      (e.originalEvent.type === "click" ||
        e.originalEvent.type === "dblclick" ||
        e.originalEvent.type === "pointerup")
    ) {
      preventReRender = false;
      modalShown = false;
    }
    const currentZoom = mapgl.getZoom();
    const roundedZoom = Math.round(currentZoom);

    if (currentZoom !== roundedZoom) {
      mapgl.zoomTo(roundedZoom, { duration: 0 });
    }
  });

  mapgl.on("dragend", function (e) {
    if (
      e.originalEvent &&
      (e.originalEvent.type === "mouseup" ||
        e.originalEvent.type === "touchend" ||
        e.originalEvent.type === "pointerup")
    ) {
      preventReRender = false;
      modalShown = false;
    }
  });

  mapgl.on("movestart", function (e) {
    if (preventReRender) return;
    $(".office-card-wrapper").removeClass("active");
    $(".office-loader-placeholder").css("display", "flex");
    $(".list-feature").empty().hide();
    $(".locations-count").text("").hide();
    $(".location-map-notifications").hide();
  });

  mapgl.on("moveend", function (e) {
    if (!preventReRender) {
      updateVisibleOffices();
      cardActions();
    }
    countFeatures(".list-feature .office-list-item");

    $(".office-loader-placeholder").css("display", "none");
    $(".list-feature").show();
    $(".locations-count").show();
    /*const zoomIndicator = $('.zoom-indicator');
            zoomIndicator.text('Zoom level: ' + mapgl.getZoom());*/
  });

  //Search functionality
  const input = document.getElementById("autocomplete");
  window.isOutOfBounds = false;

  //Prefill the input for Google place search if region query parameter is set
  /* This block is no longer needed check where the function placeChangedHandler when region set from url is called
        if (region !== "" && acceptedRegions.includes(region)) {
            //input.focus();
            //input.value = inputValue;
            //input.blur();
            //input.focus();
        }
        */
  /*$('#autocomplete').on('input blur focus focusin', function() {
							setTimeout(function (){
                  $('.pac-icon').attr('aria-label', 'Location icon');
                  $('.pac-container').attr("role", "listbox");
                  $('.pac-container .pac-item').attr("role", "option");
							}, 101);
        });*/

  input.addEventListener("focus", () => {
    input.setAttribute("aria-expanded", "true");
  });

  input.addEventListener("blur", () => {
    input.setAttribute("aria-expanded", "false");
  });

  const autocomplete = new google.maps.places.Autocomplete(input, {
    language: "en-US",
    types: ["geocode"],
    componentRestrictions: { country: "us" },
  });
  function placeChangedHandler(place_search, forced_zoom_level = false) {
    searchMode = true;
    preventReRender = false;
    modalShown = false;
    window.isOutOfBounds = false;
    //   console.log("Place selected:", place_search);
    window.userSearchLongLat = [
      place_search.geometry.location.lng(),
      place_search.geometry.location.lat(),
    ];
    //   window.userSearchCityRegion =
    //     place_search.address_components[0].long_name +
    //     ", " +
    //     place_search.address_components[2].long_name;

    window.userSearchCityRegion = place_search.formatted_address;

    mapgl.flyTo({
      center: userSearchLongLat,
      essential: true,
      zoom: forced_zoom_level || 11,
    });
    document.querySelector(".form-autocomplete .autocomplete-search-btn").src =
      "https://cdn.prod.website-files.com/663a58dfb423eff3639562f6/668e683bea536ddacccf0aff_Buttonicon.svg";
    input.style.paddingRight = "110px";
    input.setAttribute(
      "aria-label",
      "Your search for: " +
        userSearchCityRegion +
        " run successfully. Search results are now available"
    );
    input_description_a11 = $("#autocomplete-status");
    input.setAttribute("aria-expanded", "false");
    const edit_address = document.querySelector(
      ".form-autocomplete .edit-address-btn"
    );
    edit_address.style.display = "block";
    edit_address.addEventListener("click", function () {
      input.value = "";
      edit_address.style.display = "none";
      input.style.paddingRight = "12px";
      input.setAttribute(
        "aria-label",
        "This address search field contains an autocomplete dropdown list."
      );
      input_description_a11.text(
        "This address search field contains an autocomplete dropdown list."
      );

      input.setAttribute("aria-expanded", "false");
      document.querySelector(
        ".form-autocomplete .autocomplete-search-btn"
      ).src =
        "https://cdn.prod.website-files.com/663a58dfb423eff3639562f6/6686b558d3eab564fece6508_SearchButton.svg";
    });

    $(".office-card-wrapper").removeClass("active");
    $(".office-loader-placeholder").css("display", "flex");
    $(".list-feature").empty().hide();
    $(".locations-count").text("").hide();

    //Map width on usecase search and screen size
    if (viewportWidth < 992) {
      mapSection.css("height", "265px");
      locationsMap.css("height", "281px");
      // offices_wrapper.css("height", "445px");
      resizeMap();
    }
    if (viewportWidth < 768) {
      mapSection.css("height", "205px");
      locationsMap.css("height", "221px");
      // offices_wrapper.css("height", "495px");
      resizeMap();
    }

    updateVisibleOffices();
    cardActionsSearch();

    const searchRadiusNotFound = 100;
    let nearestLocation = null;
    mapgl.on("moveend", function (e) {
      input_description_a11.text(
        "Your search for: " +
          userSearchCityRegion +
          " run successfully. Search results are now available."
      );
      if (!preventReRender) {
        updateVisibleOffices();
        cardActionsSearch();
      }

      countFeatures(".list-feature .office-list-item");

      $(".office-loader-placeholder").css("display", "none");
      $(".list-feature").show();
      $(".locations-count").show();

      if (window.userSearchLongLat !== undefined) {
        const offices = document.querySelectorAll(
          ".list-feature .office-list-item .office-card-wrapper"
        );
        offices.forEach(function (office) {
          const officeLongLat = [
            office.getAttribute("data-longitude"),
            office.getAttribute("data-latitude"),
          ];
          const proximity = office.querySelector(".office-proximity");
          const proximity_txt = office.querySelector(".office-proximity-txt");
          var from = turf.point(window.userSearchLongLat);
          var to = turf.point(officeLongLat);
          var options = { steps: 80, units: "miles" };

          var distance = turf.distance(from, to, options);
          proximity.style.display = "block";
          proximity.style.minWidth = "60px";
          proximity_txt.textContent = distance.toFixed(1) + " mi";
        });
      }

      if (hasFeatures === false && modalShown === false) {
        //Modal Display
        const modal = $(".modal-backdrop");
        $(".in-modal-location div").text(window.userSearchCityRegion);
        if (e.target._moving === false) {
          setTimeout(function () {
            modal.removeClass("hidden").fadeIn().addClass("modal-open");
          }, 200);
        }

        modal.click(function (e) {
          e.preventDefault();
          if ($(e.target).hasClass("modal-backdrop")) {
            $(this).fadeOut().removeClass("modal-open").addClass("hidden");
          }
          if (
            $(e.target).hasClass("show-all-locations-btn") ||
            $(e.target.parentElement).hasClass("show-all-locations-btn")
          ) {
            const link = $(".show-all-locations-btn").attr("href");
            window.location.href = link;
          }
        });

        //Radius search: 60 miles
        function extractTurfPoints(geoJsonData) {
          return geoJsonData.features.reduce((accumulator, feature) => {
            if (feature.geometry.type === "Point") {
              const point = turf.point(
                feature.geometry.coordinates,
                feature.properties
              );
              accumulator.push(point);
            }
            return accumulator;
          }, []);
        }

        const turfPoints = extractTurfPoints(locationsGeoJSON);
        const locations = turf.featureCollection(turfPoints);
        // let mapCenter = mapgl.getCenter().toArray();
        let userLocation = turf.point(userSearchLongLat);
        // if (!preventReRender) {
        //     userLocation = turf.point(mapCenter);
        // }

        const options = { steps: 80, units: "miles" };
        const searchArea = turf.circle(
          userLocation,
          searchRadiusNotFound,
          options
        );
        const pointsWithin = turf.pointsWithinPolygon(locations, searchArea);
        window.minDistance = Infinity;
        // Find the nearest location within the radius
        if (pointsWithin.features.length > 0) {
          pointsWithin.features.forEach((point) => {
            const distance = turf.distance(userLocation, point, options);
            if (distance < searchRadiusNotFound) {
              window.minDistance = distance;
              nearestLocation = point;
            }
          });
        }

        // Output results
        const showClosestLocationBtn = $(
          ".closest-location-wrapper .btn-primary"
        );

        if (nearestLocation) {
          console.log("[Nearest Location Found]", nearestLocation);

          showClosestLocationBtn.show();
          showClosestLocationBtn.on("click", function () {
            console.log("[Closest Location Button Clicked]");

            modal.fadeOut().removeClass("modal-open").addClass("hidden");

            const coords = nearestLocation.geometry.coordinates;
            console.log("[Fly To Coords]", coords);

            mapgl.flyTo({ center: coords, zoom: 9 });

            const geocoder = new google.maps.Geocoder();
            geocoder.geocode(
              { location: { lat: coords[1], lng: coords[0] } },
              (results, status) => {
                console.log("[Geocoder Status]", status, results);

                if (status === "OK" && results[0]) {
                  const components = results[0].address_components;
                  console.log("[Address Components]", components);

                  let city = "",
                    state = "",
                    country = "";

                  components.forEach((comp) => {
                    if (comp.types.includes("locality")) city = comp.long_name;
                    if (comp.types.includes("administrative_area_level_1"))
                      state = comp.short_name;
                    if (comp.types.includes("country"))
                      country = comp.long_name;
                  });

                  const formatted = [city, state, country]
                    .filter(Boolean)
                    .join(", ");
                  console.log("[Formatted Address]", formatted);

                  SetLocation({ coords, formatted });
                  console.log("[setLocation Called]", { coords, formatted });
                } else {
                  console.warn("[Geocoder Failed]", status);
                }
              }
            );
          });
        }
      }
    });
  }

  // Function to retrieve place object for a given location
  function getPlaceObject(query, callback) {
    const request = {
      query: query,
      fields: ["place_id"],
    };

    const service = new google.maps.places.PlacesService(
      document.createElement("div")
    );

    service.findPlaceFromQuery(request, function (results, status) {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        if (results.length > 0) {
          const placeId = results[0].place_id;

          // Get all available details for the place
          service.getDetails(
            { placeId: placeId },
            function (place, detailStatus) {
              if (detailStatus === google.maps.places.PlacesServiceStatus.OK) {
                callback(place);
              } else {
                callback(null, "Error fetching place details");
              }
            }
          );
        } else {
          callback(null, "No results found");
        }
      } else {
        callback(null, "Place query failed");
      }
    });
  }

  autocomplete.addListener("place_changed", () =>
    placeChangedHandler(autocomplete.getPlace())
  );
}

window.addEventListener("load", mapboxLocations);
