var map = L.map('map').setView([5.5483, 95.3238], 13);

  var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    crossOrigin: true
  }).addTo(map);

  var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
  });

  var currentBasemap = osm;

  function setBasemap(type) {
    map.removeLayer(currentBasemap);
    currentBasemap = (type === 'osm') ? osm : satellite;
    map.addLayer(currentBasemap);
  }

  // Menambahkan fitur pencarian lokasi dengan referensi saran otomatis
  var geocoder = L.Control.Geocoder.nominatim();
  var searchControl = new L.Control.Geocoder({
    collapsed: false,
    position: 'topright',
    geocoder: geocoder,
    placeholder: "Cari lokasi...",
    query: function (query) {
      return geocoder.geocode(query, function(results) {
        // Tampilkan hasil pencarian
        var list = results.map(function(result) {
          return {
            name: result.name,
            latlng: result.center
          };
        });
        
        // Menampilkan referensi pencarian di bawah input
        searchControl._input.placeholder = `Temukan ${list.length} lokasi`;

        // Menambahkan marker dan zoom ke lokasi pertama
        if (list.length > 0) {
          map.setView(list[0].latlng, 16);
          L.marker(list[0].latlng).addTo(map)
            .bindPopup(list[0].name)
            .openPopup();
        }
      });
    }
  }).addTo(map);

  var routingControl;
  var waypoints = [];

  map.on('click', function(e) {
    var latlng = e.latlng;
    waypoints.push(latlng);

    if (waypoints.length === 2) {
      if (routingControl) {
        map.removeControl(routingControl);
      }
      routingControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: true
      }).addTo(map);
    }
  });

  function resetWaypoints() {
    waypoints = [];
    if (routingControl) {
      map.removeControl(routingControl);
    }
  }

  var overpassURL = "https://overpass-api.de/api/interpreter?data=[out:json];(node[amenity=cafe](5.5,95.3,5.6,95.4);node[amenity=restaurant](5.5,95.3,5.6,95.4);node[amenity=school](5.5,95.3,5.6,95.4););out;";

  fetch(overpassURL)
    .then(response => response.json())
    .then(data => {
      var legendList = document.getElementById("legend-list");
      legendList.innerHTML = '';

      var layerGroup = L.layerGroup();

      data.elements.forEach(function(item) {
        var lat = item.lat;
        var lon = item.lon;
        var amenity = item.tags.amenity || 'undefined';

        var iconUrl = '';
        if (amenity === 'cafe') {
          iconUrl = 'https://img.icons8.com/ios/452/cafe.png'; // Ikon Cafe
        } else if (amenity === 'restaurant') {
          iconUrl = 'https://img.icons8.com/ios/452/restaurant.png'; // Ikon Restaurant
        } else if (amenity === 'school') {
          iconUrl = 'https://img.icons8.com/ios/452/school.png'; // Ikon School
        } else {
          iconUrl = 'https://img.icons8.com/ios/452/place.png'; // Ikon Umum
        }

        var legendItem = document.createElement("li");
        legendItem.innerHTML = "<img src='" + iconUrl + "' alt='" + amenity + "'/> <b>" + amenity.charAt(0).toUpperCase() + amenity.slice(1) + "</b>";
        legendList.appendChild(legendItem);
      });

      layerGroup.addTo(map);
    })
    .catch(error => console.log("Error fetching data from Overpass API:", error));

  function locateUser() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        var lat = position.coords.latitude;
        var lon = position.coords.longitude;
        map.setView([lat, lon], 16);
        L.marker([lat, lon]).addTo(map)
          .bindPopup("Lokasi Anda: " + lat + ", " + lon)
          .openPopup();
      }, function() {
        alert("Geolokasi gagal, pastikan browser Anda mendukung geolokasi.");
      });
    } else {
      alert("Browser Anda tidak mendukung fitur geolokasi.");
    }
  }

  function exportGeoJSON() {
    if (routingControl) {
      var geojson = routingControl.getRoute().toGeoJSON();
      var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geojson));
      var downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "rute.geojson");
      downloadAnchorNode.click();
    }
  }

  function startAnimation() {
    if (routingControl) {
      var route = routingControl.getRoute();
      route.getWaypoints().forEach(function(waypoint, index) {
        setTimeout(function() {
          map.panTo(waypoint.latLng);
        }, index * 1000);
      });
    }
  }

  map.on('contextmenu', function(e) {
    var clickedLatLng = e.latlng;
    var indexToRemove = -1;
    for (var i = 0; i < waypoints.length; i++) {
      if (waypoints[i].distanceTo(clickedLatLng) < 20) {
        indexToRemove = i;
        break;
      }
    }

    if (indexToRemove !== -1) {
      waypoints.splice(indexToRemove, 1);
      if (routingControl) {
        map.removeControl(routingControl);
        if (waypoints.length > 0) {
          routingControl = L.Routing.control({
            waypoints: waypoints,
            routeWhileDragging: true
          }).addTo(map);
        }
      }
    }
  });