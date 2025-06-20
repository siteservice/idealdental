import mapboxgl, { LngLatLike } from "mapbox-gl";
import * as turf from "@turf/turf";
import type {
  FeatureCollection,
  Feature,
  GeoJsonProperties,
  Geometry,
  Position,
  Point,
  MultiPoint,
} from "geojson";
import type { Units } from "@turf/helpers";
import pointsWithinPolygon from "@turf/points-within-polygon";

export {};

declare global {
  interface Window {
    google: typeof google;
    regions_mapping: RegionsMapping;
    userLongLat?: [number, number];
    userSearchLongLat?: [number, number];
    locationsGeoJSON: GeoJSON.FeatureCollection<
      GeoJSON.Point,
      LocationFeatureProperties
    >;
    isOutOfBounds: boolean;
    hasFeatures: boolean;
    minDistance: number;
    userSearchCityRegion: string;
  }
}

declare const locationsGeoJSON: GeoJSON.FeatureCollection;

type LocationFeatureProperties = {
  id: string;
  name: string;
  description: string;
};

type Region =
  | "dallas-fort-worth"
  | "houston"
  | "san-antonio"
  | "austin"
  | "atlanta"
  | "nashville"
  | "north-carolina"
  | "orlando"
  | "phoenix"
  | "seattle"
  | "south-florida"
  | "tampa-bay";

type RegionCoordinates = [number, number];

type RegionProps = {
  inputValue: string;
  regionCoordinates: RegionCoordinates;
  forceCoordinates: boolean;
  zoomLevel: number;
};

type RegionsMapping = Record<Region, RegionProps>;

type UserLocationGEOIPJSON = {
  latitude: string;
  longitude: string;
  city: string;
  region: string;
  country: string;
};

type LocationFeature = {
  id: string;
  latitude: string;
  longitude: string;
  name: string;
  description: string;
};

type DistanceOptions = { steps: number; units: Units };

window.regions_mapping = {
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
  "san-antonio": {
    inputValue: "San Antonio, TX, USA",
    regionCoordinates: [-98.5986018, 29.4315263],
    forceCoordinates: true,
    zoomLevel: 11,
  },
  austin: {
    inputValue: "Austin, TX, USA",
    regionCoordinates: [-97.7431, 30.2672],
    forceCoordinates: false,
    zoomLevel: 10,
  },
  atlanta: {
    inputValue: "Alanta, GA, USA",
    regionCoordinates: [33.749660098077506, -84.3965202473269],
    forceCoordinates: false,
    zoomLevel: 10,
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
    const data: UserLocationGEOIPJSON = await response.json();
    window.userLongLat = [
      parseFloat(data.longitude),
      parseFloat(data.latitude),
    ];
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

//Mapbox Functionality
function mapboxLocations() {
  const isRegion = (key: string): key is Region => {
    return [
      "dallas-fort-worth",
      "houston",
      "san-antonio",
      "austin",
      "atlanta",
      "nashville",
      "north-carolina",
      "orlando",
      "phoenix",
      "seattle",
      "south-florida",
      "tampa-bay",
    ].includes(key as Region);
  };

  const acceptedRegions: Region[] = Object.keys(window.regions_mapping).filter(
    isRegion
  );
  let region: Region | undefined;
  let inputValue = "";
  let regionCoordinates: RegionCoordinates;
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);

  if (urlParams.has("region")) {
    const regionParam = urlParams.get("region")?.toLowerCase() || "";

    if (isRegion(regionParam)) {
      region = regionParam;
    } else {
      console.warn("Invalid region parameter in URL:", regionParam);
    }
  }

  const url = new URL(window.location.href);
  const pathname = url.pathname;
  const locationName = pathname.split("/locations/")[1];

  if (locationName) {
    const maybeRegion = locationName.toLowerCase();
    if (isRegion(maybeRegion)) {
      region = maybeRegion;
    }
  }

  if (region && acceptedRegions.includes(region)) {
    inputValue = window.regions_mapping[region]?.inputValue ?? "";
    regionCoordinates = window.regions_mapping[region]?.regionCoordinates ?? [];
  }

  //Create GeoJSON
  window.locationsGeoJSON = window.locationsGeoJSON || {
    type: "FeatureCollection",
    features: [],
  };

  function createLocationFeature({
    id,
    latitude,
    longitude,
    name,
    description,
  }: LocationFeature): GeoJSON.Feature<
    GeoJSON.Point,
    LocationFeatureProperties
  > {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [
          parseFloat(String(longitude)),
          parseFloat(String(latitude)),
        ] as [number, number],
      },
      properties: {
        id: id,
        name: name,
        description: JSON.stringify(description),
      },
    };
  }

  const locationFeatures: LocationFeature[] = [];

  locationFeatures.forEach(function (location) {
    const feature = createLocationFeature(location);
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
    container: "locations-map",
    style: mapboxStyle,
    center: [-96, 37.8],
    zoom: 5,
    attributionControl: false,
  });
  mapgl.scrollZoom.disable();
  mapgl.fitBounds([
    [-125.0011, 24.9493],
    [-66.9326, 49.5904],
  ]);

  mapgl.on("load", function () {
    mapgl.loadImage(
      "https://cdn.prod.website-files.com/663a58dfb423eff3639562f6/6683102370a009e45238a05b_LocationPin.png",
      function (error, image) {
        if (error || !image) {
          throw error ?? new Error("Image not loaded");
        }
        mapgl.addImage("locationsPin", image);
      }
    );

    mapgl.loadImage(
      "https://cdn.prod.website-files.com/663a58dfb423eff3639562f6/668310238fec6bce3551ebbe_LocationPinHover.png",
      function (error, image) {
        if (error || !image) {
          throw error ?? new Error("Image not loaded");
        }
        mapgl.addImage("locationsPinHover", image);
      }
    );

    const locationsGeoJSON = window.locationsGeoJSON;

    mapgl.addSource("locations", {
      type: "geojson",
      data: locationsGeoJSON,
      cluster: true,
      clusterMaxZoom: 8,
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
        trackUserLocation: true,
        showUserHeading: true,
      }).on("geolocate", function (e) {
        const coords = (e as GeolocationPosition).coords;
        const userExactCoords: [number, number] = [
          coords.longitude,
          coords.latitude,
        ];

        mapgl.flyTo({
          center: userExactCoords,
          essential: true,
          zoom: zoomLocAllowed,
        });
      })
    );

    const currentLocationAction = document.querySelector(
      ".current-location-action"
    );

    if (currentLocationAction) {
      currentLocationAction.addEventListener("click", function () {
        const geolocateBtn = document.querySelector<HTMLButtonElement>(
          ".mapboxgl-ctrl-geolocate"
        );

        if (geolocateBtn) {
          geolocateBtn.classList.add("hidden");
          geolocateBtn.click();
        } else {
          console.error("Geolocate button not found");
        }
      });
    }

    if (region && acceptedRegions.includes(region)) {
      getPlaceObject(
        inputValue,
        function (
          place: google.maps.places.PlaceResult | null,
          error?: string
        ) {
          if (place) {
            const autocomplete =
              document.querySelector<HTMLInputElement>("#autocomplete");

            if (autocomplete && place.formatted_address) {
              autocomplete.value = place.formatted_address;
            }

            if (
              window.regions_mapping[region].forceCoordinates &&
              place.geometry &&
              place.geometry.location
            ) {
              place.geometry.location = {
                lat: () => window.regions_mapping[region].regionCoordinates[1],
                lng: () => window.regions_mapping[region].regionCoordinates[0],
                toJSON: () => ({
                  lat: window.regions_mapping[region].regionCoordinates[1],
                  lng: window.regions_mapping[region].regionCoordinates[0],
                }),
              } as unknown as google.maps.LatLng;
            }

            place_changed_handler(place);
          } else {
            console.error("Error:", error);
          }
        }
      );
    } else {
      mapgl.flyTo({
        center: window.userLongLat,
        essential: true,
        zoom: zoomLocAllowed,
      });
    }
  });

  mapgl.once("idle", () => {
    const hasAnyLayer =
      mapgl.getSource("locations-cluster-layer") ||
      mapgl.getSource("locations-nocluster-layer") ||
      mapgl.getSource("locations-highlight-layer");

    if (!hasAnyLayer || !mapgl.isSourceLoaded("locations")) return;

    const features = mapgl.querySourceFeatures("locations");
    const feature = features[0];

    if (feature?.geometry.type === "Point") {
      const coords: [number, number] = feature.geometry.coordinates as [
        number,
        number
      ];

      mapgl.once("moveend", () => {
        mapgl.setCenter(coords);
      });

      mapgl.flyTo({
        center: coords,
        zoom: 10,
      });
    }
  });

  mapgl.on("mousemove", function (event) {
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
      mapgl.getCanvas().style.cursor = "";
    }
  );

  let preventReRender = false;
  mapgl.on("click", function (e) {
    if (e.originalEvent && e.originalEvent.type === "click") {
      preventReRender = false;
    }
  });

  // mapgl.on("click", "locations-cluster-layer", (e) => {
  //   const features = mapgl.queryRenderedFeatures(e.point, {
  //     layers: ["locations-cluster-layer"],
  //   });
  //   const clusterId = features[0].properties?.cluster_id;
  //   mapgl
  //     .getSource("locations")
  //     .getClusterExpansionZoom(clusterId, (err, zoom) => {
  //       if (err) return;

  //       mapgl.flyTo({
  //         center: features[0].geometry.coordinates,
  //         zoom: zoom,
  //       });
  //       //   console.log(zoom);
  //     });
  // });

  mapgl.on("click", "locations-cluster-layer", (e) => {
    const features = mapgl.queryRenderedFeatures(e.point, {
      layers: ["locations-cluster-layer"],
    });

    if (!features.length) return;

    const clusterId = features[0].properties?.cluster_id as number | undefined;
    if (clusterId === undefined) return;

    const source = mapgl.getSource("locations") as mapboxgl.GeoJSONSource;
    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;

      if (features[0].geometry.type === "Point") {
        const coords = features[0].geometry.coordinates as [number, number];

        mapgl.flyTo({
          center: coords,
          zoom: zoom ?? 10,
        });
      } else {
        console.warn("Feature geometry is not a Point");
      }
    });
  });

  mapgl.on("click", "locations-nocluster-layer", (e) => {
    const clickPoint = turf.point([e.lngLat.lng, e.lngLat.lat]);
    let nearestFeature: Feature<Geometry, GeoJsonProperties> | undefined;
    let minDistance: number = Infinity;

    locationsGeoJSON.features.forEach((feature) => {
      if (feature.geometry.type === "Point") {
        const coords = feature.geometry.coordinates as [number, number];
        const featurePoint = turf.point(coords);
        const distance = turf.distance(clickPoint, featurePoint, {
          units: "miles",
        });

        if (feature && distance < minDistance) {
          minDistance = distance;
          nearestFeature = feature;
        }
      }
    });

    if (nearestFeature) {
      const featureId: number | undefined = nearestFeature.properties?.id;
      mapgl.setFilter("locations-highlight-layer", ["==", "id", featureId]);

      $(".list-feature .office-card-wrapper").removeClass("active");
      let officeTo = $('.office-list-item[data-id="' + featureId + '"]');
      const listWrapper = $(".list-feature");

      const officeOffset = officeTo.offset();
      const listOffset = listWrapper.offset();
      const listScrollTop = listWrapper.scrollTop();

      if (
        officeTo.length === 0 ||
        listWrapper.length === 0 ||
        !officeOffset ||
        !listOffset ||
        !listScrollTop
      ) {
        return;
      }

      listWrapper.animate(
        {
          scrollTop: officeOffset.top - listOffset.top + listScrollTop,
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
  function renderItems(
    features: Feature<Point | MultiPoint, GeoJsonProperties>[]
  ) {
    $(".list-feature").empty();
    if (window.userSearchLongLat !== undefined) {
      const from = turf.point(window.userSearchLongLat);
      features.forEach(function (feature) {
        const to = turf.point(feature.geometry.coordinates as Position);

        if (feature.properties) {
          feature.properties.distance = turf.distance(from, to, {
            units: "miles",
          });
        }
      });
      // Sort features by the calculated distance
      features.sort(function (a, b) {
        if (a.properties && b.properties) {
          return a.properties.distance - b.properties.distance;
        }
        return 0;
      });
    }
    features.forEach(function (feature) {
      let item;

      if (feature.properties) {
        item =
          '<div class="office-list-item" data-id="' +
          feature.properties.id +
          '">';
        item += JSON.parse(feature.properties.description);
        item += "</div>";

        $(".list-feature").append(item);
      }
    });
  }

  function countFeatures(item: string) {
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

      if (!lat || !lng) {
        return;
      }

      mapgl.flyTo({
        center: [parseFloat(lng), parseFloat(lat)],
        essential: true,
        zoom: 12,
      });
      var featureId = $(this).parent().data("id");
      if (window.hasFeatures) {
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
      if (window.hasFeatures) {
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
      if (window.hasFeatures) {
        mapgl.setFilter("locations-highlight-layer", ["==", "id", featureId]);
      }
      var location_card = $(this).find(".office-card-wrapper");
      $(".list-feature").each(function () {
        $(".office-card-wrapper").removeClass("active");
      });
      location_card.addClass("active");
      var lat = location_card.attr("data-latitude");
      var lng = location_card.attr("data-longitude");

      if (!lat || !lng) {
        return;
      }

      mapgl.flyTo({
        center: [parseFloat(lng), parseFloat(lat)],
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
  const map_view_placeholder = $(".map-view-placeholder");
  const mapViewBtn = $(".map-view-btn");
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

  map_view_placeholder.hide();
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
          locationsMap.css(
            "height",
            `${(mapSection ? mapSection.height() ?? 0 : 0) + 16}px`
          );

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
          locationsMap.css(
            "height",
            `${(mapSection ? mapSection.height() ?? 0 : 0) + 16}px`
          );
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

  mapViewBtn.on("click", function () {
    if (viewportWidth > 767 && viewportWidth < 992) {
      mapSection.animate({ height: "665px" }, 400);
      setTimeout(function () {
        locationsMap.css(
          "height",
          `${(mapSection ? mapSection.height() ?? 0 : 0) + 16}px`
        );
        mapToggleBtn.css("display", "block");
        resizeMap();
      }, 401);
    }
    if (viewportWidth < 768) {
      mapSection.animate({ height: "390px" }, 400);
      setTimeout(function () {
        locationsMap.css(
          "height",
          `${(mapSection ? mapSection.height() ?? 0 : 0) + 16}px`
        );
        mapToggleBtn.css("display", "block");
        resizeMap();
      }, 401);
    }

    var mapview = $(this).attr("href");

    if (mapview) {
      const target = $(mapview);
      const offsetTop = target.offset()?.top;

      if (offsetTop !== undefined) {
        $("html,body").animate({ scrollTop: offsetTop }, "slow");
      }
    }

    isHidden = !isHidden;
    return false;
  });

  offices_wrapper.on("scroll", function () {
    if (viewportWidth < 992) {
      const $this = $(this);
      const scrollTop = $this.scrollTop() ?? 0;
      const innerHeight = $this.innerHeight() ?? 0;
      const scrollHeight = $this[0]?.scrollHeight ?? 0;

      if (scrollTop + innerHeight >= scrollHeight) {
        map_view_placeholder?.css("display", "none");
      } else {
        map_view_placeholder?.css("display", "flex");
      }
    }
  });

  mapToggleBtn.on("click", function () {
    map_view_placeholder.hide();
    if (viewportWidth > 767 && viewportWidth < 992) {
      if (isExpanded) {
        mapSection.animate({ height: "580px" }, 400);
        offices_wrapper.animate({ height: "285px" }, 400);
        setTimeout(function () {
          locationsMap.css(
            "height",
            `${(mapSection ? mapSection.height() ?? 0 : 0) + 16}px`
          );

          resizeMap();
        }, 401);
      } else {
        mapSection.animate({ height: "670px" }, 400);
        offices_wrapper.animate({ height: "0px" }, 400);
        setTimeout(function () {
          locationsMap.css(
            "height",
            `${(mapSection ? mapSection.height() ?? 0 : 0) + 16}px`
          );
          resizeMap();
        }, 401);
      }
    }

    if (viewportWidth < 768) {
      if (isExpanded) {
        mapSection.animate({ height: "390px" }, 400);
        offices_wrapper.animate({ height: "195px" }, 400);
        setTimeout(function () {
          locationsMap.css(
            "height",
            `${(mapSection ? mapSection.height() ?? 0 : 0) + 16}px`
          );
          resizeMap();
        }, 401);
      } else {
        // Animate heights for the "expanded" state
        mapSection.animate({ height: "580px" }, 400);
        offices_wrapper.animate({ height: "0px" }, 400);
        setTimeout(function () {
          locationsMap.css(
            "height",
            `${(mapSection ? mapSection.height() ?? 0 : 0) + 16}px`
          );
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
          offices_wrapper.animate({ height: "495px" }, 400);
          setTimeout(function () {
            locationsMap.css(
              "height",
              `${(mapSection ? mapSection.height() ?? 0 : 0) + 16}px`
            );
            resizeMap();
          }, 401);
        } else {
          // Animate heights for the "expanded" state
          mapSection.animate({ height: "650px" }, 400);
          offices_wrapper.animate({ height: "16px" }, 400);
          map_view_placeholder.hide();
          setTimeout(function () {
            locationsMap.css(
              "height",
              `${(mapSection ? mapSection.height() ?? 0 : 0) + 16}px`
            );
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

    if (!bounds) return;

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
      const options: { steps: number; units: Units } = {
        steps: 80,
        units: "miles",
      };
      searchArea = turf.circle(center, searchRadius, options);
    }

    const filteredFeatures: Feature<Point | MultiPoint>[] =
      locationsGeoJSON.features.filter(
        (feature): feature is Feature<Point | MultiPoint> =>
          feature.geometry.type === "Point" ||
          feature.geometry.type === "MultiPoint"
      );

    const pointFeatureCollection: FeatureCollection<Point | MultiPoint> = {
      type: "FeatureCollection",
      features: filteredFeatures,
    };

    const visibleFeatures = pointsWithinPolygon(
      pointFeatureCollection,
      searchArea
    );

    const sortedVisibleFeatures = visibleFeatures.features;
    if (window.userSearchLongLat === undefined) {
      const from = turf.point(center);
      sortedVisibleFeatures.forEach(function (feature) {
        const to = turf.point(feature.geometry.coordinates as Position);

        if (feature.properties) {
          feature.properties.distance = turf.distance(from, to, {
            units: "miles",
          });
        }
      });
      sortedVisibleFeatures.sort(function (a, b) {
        if (a.properties && b.properties) {
          return a.properties.distance - b.properties.distance;
        }
        return 0;
      });
    }
    renderItems(sortedVisibleFeatures);

    window.hasFeatures = visibleFeatures.features.length > 0;
  }

  mapgl.on("zoomend", function (e) {
    const originalEvent = (e as any).originalEvent;

    if (
      originalEvent &&
      (originalEvent.type === "click" ||
        originalEvent.type === "dblclick" ||
        originalEvent.type === "pointerup")
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
  });

  //#region Search functionality
  const input = document.querySelector<HTMLInputElement>("#autocomplete");
  window.isOutOfBounds = false;

  if (input) {
    input.addEventListener("focus", () => {
      input.setAttribute("aria-expanded", "true");
    });

    input.addEventListener("blur", () => {
      input.setAttribute("aria-expanded", "false");
    });
  } else {
    console.warn("Autocomplete input not found");
  }

  let autocomplete: google.maps.places.Autocomplete;

  if (!input) {
    throw new Error("Autocomplete input element not found");
  }

  autocomplete = new google.maps.places.Autocomplete(input, {
    //TODO: Double check these options.
    // language: "en-US",
    types: ["geocode"],
    componentRestrictions: { country: "us" },
  });

  function place_changed_handler(place_search: google.maps.places.PlaceResult) {
    searchMode = true;
    preventReRender = false;
    modalShown = false;
    window.isOutOfBounds = false;

    if (place_search.geometry && place_search.geometry.location) {
      window.userSearchLongLat = [
        place_search.geometry.location.lng(),
        place_search.geometry.location.lat(),
      ];
    }

    if (place_search.formatted_address) {
      window.userSearchCityRegion = place_search.formatted_address;
    }

    mapgl.flyTo({
      center: window.userSearchLongLat,
      essential: true,
      zoom: 11,
    });

    const autocompleteSearchBtn = document.querySelector<HTMLImageElement>(
      ".form-autocomplete .autocomplete-search-btn"
    );

    if (autocompleteSearchBtn) {
      autocompleteSearchBtn.src =
        "https://cdn.prod.website-files.com/663a58dfb423eff3639562f6/668e683bea536ddacccf0aff_Buttonicon.svg";
    }

    if (input) {
      input.style.paddingRight = "110px";
      input.setAttribute(
        "aria-label",
        "Your search for: " +
          window.userSearchCityRegion +
          " run successfully. Search results are now available"
      );
      const input_description_a11 = $("#autocomplete-status");

      input.setAttribute("aria-expanded", "false");
      const edit_address = document.querySelector<HTMLButtonElement>(
        ".form-autocomplete .edit-address-btn"
      );

      if (edit_address) {
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

          if (autocompleteSearchBtn) {
            autocompleteSearchBtn.src =
              "https://cdn.prod.website-files.com/663a58dfb423eff3639562f6/6686b558d3eab564fece6508_SearchButton.svg";
          }
        });
      }
    }

    $(".office-card-wrapper").removeClass("active");
    $(".office-loader-placeholder").css("display", "flex");
    $(".list-feature").empty().hide();
    $(".locations-count").text("").hide();

    //Map width on usecase search and screen size
    if (viewportWidth < 992) {
      mapSection.css("height", "265px");
      locationsMap.css("height", "281px");
      offices_wrapper.css("height", "445px");
      resizeMap();
    }
    if (viewportWidth < 768) {
      mapSection.css("height", "205px");
      locationsMap.css("height", "221px");
      offices_wrapper.css("height", "495px");
      resizeMap();
    }

    updateVisibleOffices();
    cardActionsSearch();

    const searchRadiusNotFound = 100;
    let nearestLocation: Feature<Point | MultiPoint, GeoJsonProperties>;
    mapgl.on("moveend", function (e) {
      const input_description_a11 = $("#autocomplete-status");

      if (input_description_a11.length > 0) {
        input_description_a11.text("");
      }

      input_description_a11.text(
        "Your search for: " +
          window.userSearchCityRegion +
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
          const officeLong = office.getAttribute("data-longitude");
          const officeLat = office.getAttribute("data-latitude");
          let officePosition: Position = [
            officeLong ? parseFloat(officeLong) : 0,
            officeLat ? parseFloat(officeLat) : 0,
          ];

          const proximity =
            office.querySelector<HTMLDivElement>(".office-proximity");
          const proximity_txt = office.querySelector(".office-proximity-txt");
          var from = turf.point(window.userSearchLongLat as Position);
          var to = turf.point(officePosition);
          var options: DistanceOptions = { steps: 80, units: "miles" };

          var distance = turf.distance(from, to, options);

          if (proximity) {
            proximity.style.display = "block";
            proximity.style.minWidth = "60px";
          }

          if (proximity_txt) {
            proximity_txt.textContent = distance.toFixed(1) + " mi";
          }
        });
      }

      if (window.hasFeatures === false && modalShown === false) {
        const modal = $(".modal-backdrop");
        $(".in-modal-location div").text(window.userSearchCityRegion);
        const isMoving =
          typeof (e.target as any)._moving === "boolean"
            ? (e.target as any)._moving
            : undefined;

        if (isMoving === false) {
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
            (e.target.parentElement &&
              $(e.target.parentElement).hasClass("show-all-locations-btn"))
          ) {
            const link = $(".show-all-locations-btn").attr("href");
            if (link) {
              window.location.href = link;
            }
          }
        });

        function extractTurfPoints(
          geoJsonData: FeatureCollection
        ): Feature<Point, GeoJsonProperties>[] {
          return geoJsonData.features.reduce<
            Feature<Point, GeoJsonProperties>[]
          >((accumulator, feature) => {
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
        let userLocation = turf.point(window.userSearchLongLat as Position);

        const options: DistanceOptions = { steps: 80, units: "miles" };
        const searchArea = turf.circle(
          userLocation,
          searchRadiusNotFound,
          options
        );
        const pointsWithin = turf.pointsWithinPolygon(locations, searchArea);
        window.minDistance = Infinity;

        if (pointsWithin.features.length > 0) {
          pointsWithin.features.forEach((point) => {
            if (point.geometry.type === "Point") {
              const pointAsPoint = point as Feature<Point, GeoJsonProperties>;
              const distance = turf.distance(
                userLocation,
                pointAsPoint,
                options
              );
              if (distance < searchRadiusNotFound) {
                window.minDistance = distance;
                nearestLocation = pointAsPoint;
              }
            }
          });
        }

        const closest_location_btn = $(
          ".closest-location-wrapper .btn-primary"
        );

        if (nearestLocation) {
          closest_location_btn.show();
          closest_location_btn.on("click", function () {
            window.isOutOfBounds = true;
            modalShown = true;
            modal.fadeOut().removeClass("modal-open").addClass("hidden");
            mapgl.flyTo({
              center: nearestLocation.geometry.coordinates as LngLatLike,
              zoom: 9,
            });
          });
        } else {
          closest_location_btn.hide();
        }
      }
    });
  }

  function getPlaceObject(
    query: string,
    callback: (
      place: google.maps.places.PlaceResult | null,
      error?: string
    ) => void
  ) {
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

          service.getDetails(
            { placeId: placeId ? placeId : "" },
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
    place_changed_handler(autocomplete.getPlace())
  );
}

document.addEventListener("DOMContentLoaded", mapboxLocations);
