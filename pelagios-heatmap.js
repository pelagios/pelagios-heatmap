// Namespace
var pelagios = { }

/**
 * The pelagios heatmap
 * @constructor
 */
pelagios.Heatmap = function(map, data) {
  var heatmapLayer = L.TileLayer.heatMap({
      radius: 12,
      opacity: 0.8,
      gradient: {
          0.45: "rgb(0,0,255)",
          0.55: "rgb(0,255,255)",
          0.65: "rgb(0,255,0)",
          0.95: "yellow",
          1.0: "rgb(255,0,0)"
      }
  });
  
  heatmapLayer.addData(testData.data);
  map.addLayer(heatmapLayer);
  
  // TODO clean up - move utility functions somewhere else for better readability
  var showPopup = function(latlng) {
	L.popup().setLatLng(latlng)
    .setContent('<p>Hello world!<br />This is a nice popup.</p>')
    .openOn(map);
  }
     
  var distanceSq = function(latlngA, latlngB) {
    // Not very elegant but sufficient for the geographical extent we're dealing with
    var dLat = latlngA.lat - latlngB.lat,
        dLng = latlngA.lng - latlngB.lng;
        
    return Math.pow(dLat, 2) + Math.pow(dLng, 2);
  }
  
  var sortByDistance = function(a, b) { 
    return ((a.dist < b.dist) ? -1 : ((a.dist > b.dist) ? 1 : 0));
  }
  
  var handleSingleClick = function(event) {
    var minLon = event.latlng.lng - 0.05,
        maxLon = event.latlng.lng + 0.05,
        minLat = event.latlng.lat - 0.05,
        maxLat = event.latlng.lat + 0.05,
        q      =  minLon + ',' + minLat + ',' + maxLon + ',' + maxLat;
            
    jQuery.getJSON('http://pelagios.dme.ait.ac.at/api/places.json?bbox=' + q, function(data) {
	  // Compute nearest
	  var distances = jQuery.map(data, function(place, idx) {
		var latlng = { lat: place.geometry.coordinates[1],
			           lng: place.geometry.coordinates[0] }
	    return { idx: idx, dist: distanceSq(latlng, event.latlng) }
	  });	  
	  distances.sort(sortByDistance);
	  
	  var nearestPlace = (distances.length > 0) ? data[distances[0].idx] : undefined;
	  
	  showPopup({ lat: nearestPlace.geometry.coordinates[1], lng: nearestPlace.geometry.coordinates[0] }); 
	});
  }
  
  var currentTimer,
      isDblClick = false;
  map.on('click', function(e) {
	if (currentTimer) {
	  clearTimeout(currentTimer);
      isDblClick = true;	  
    }
    	  
	currentTimer = setTimeout(function() {
	  if (!isDblClick)
        handleSingleClick(e);

      currentTimer = undefined;        
      isDblClick = false;
    }, 200); 
  });
}
