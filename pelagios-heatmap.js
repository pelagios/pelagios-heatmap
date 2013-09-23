/** Namespace **/
var pelagios = { }

/**
 * The PELAGIOS heatmap.
 * @param {Object} map the Leaflet.js map
 * @param {Array.<Object>} data the heatmap data array
 * @constructor
 */
pelagios.Heatmap = function(map, data) {
  /** @private **/
  this._map = map;
  
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
  this._addClickHandler();  
}

/**
 * This is to prevent that a double click triggers two single clicks (which
 * is the default behavior). 
 * @private
 */
pelagios.Heatmap.prototype._addClickHandler = function() {
  var self = this,
      currentTimer,
      isDblClick = false;
      
  this._map.on('click', function(e) {
	if (currentTimer) {
	  clearTimeout(currentTimer);
      isDblClick = true;	  
    }
    	  
	currentTimer = setTimeout(function() {
	  if (!isDblClick)
        self._onClick(e);

      currentTimer = undefined;        
      isDblClick = false;
    }, 200); 
  });
}

/**
 * On single click, this method queries the Pelagios API for places around the click 
 * location, and displays a popup for the place closest to the mouse.
 * @private
 */
pelagios.Heatmap.prototype._onClick = function(event) {
  var self   = this,
      minLon = event.latlng.lng - 0.1,
      maxLon = event.latlng.lng + 0.1,
      minLat = event.latlng.lat - 0.1,
      maxLat = event.latlng.lat + 0.1,
      q      =  minLon + ',' + minLat + ',' + maxLon + ',' + maxLat;
            
  jQuery.getJSON('http://pelagios.dme.ait.ac.at/api/places.json?limit=200&bbox=' + q, function(data) {
	console.log(data.length + ' places nearby');
	
	// Compute nearest
	var distances = jQuery.map(data, function(place, idx) {
		
	  // TODO handle polygons (reducing coordinates to points)
	  
	  var latlng = { lat: place.geometry.coordinates[1],
		             lng: place.geometry.coordinates[0] }
	  return { idx: idx, dist: pelagios.Heatmap.util.distanceSq(latlng, event.latlng) }
	});	  
	distances.sort(function(a, b) { return ((a.dist < b.dist) ? -1 : ((a.dist > b.dist) ? 1 : 0)); })
	
	// Open popup for nearest place  
	var nearestPlace = (distances.length > 0) ? data[distances[0].idx] : undefined;
	console.log('Nearest: ', nearestPlace);
	
	if (nearestPlace)  
	  self.showPopup({ lat: nearestPlace.geometry.coordinates[1], lng: nearestPlace.geometry.coordinates[0] }, nearestPlace); 
  });
}

/**
 * Shows a popup with place-specific information at a specific coordinate.
 */
pelagios.Heatmap.prototype.showPopup = function(latlng, place) {
  // TODO replace dummy content
  L.popup().setLatLng(latlng)
   .setContent('<h2>' + place.label + '</h2>' +
               '<p><em>' + place.altLabels + '<br/>' + place.coverage + 
               '</em></p><p>' + place.comment + 
               '</p><p><a href="' + place.uri + '" target="_blank">' + place.number_of_references + 
               ' references in ' + place.in_number_of_datasets + ' datasets.</a></p>')
   .openOn(this._map);
}

/**
 * Utility methods.
 */
pelagios.Heatmap.util = {

  distanceSq : function(latlngA, latlngB) {
                 var dLat = latlngA.lat - latlngB.lat,
                     dLng = latlngA.lng - latlngB.lng;
        
                 return Math.pow(dLat, 2) + Math.pow(dLng, 2);
               }
}

