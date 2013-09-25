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
  this.map = map;
  
  /** @private **/
  this._loadIndicator = new pelagios.LoadIndicator();
  
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
      
  this.map.on('click', function(e) {
    if (currentTimer) {
      clearTimeout(currentTimer);
      isDblClick = true;      
    }
          
    currentTimer = setTimeout(function() {
      if (!isDblClick)
        self._onClick(e);

      currentTimer = undefined;        
      isDblClick = false;
    }, 500); 
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
  
  this._loadIndicator.show();
  
  jQuery.getJSON('http://pelagios.dme.ait.ac.at/api/places.json?limit=200&bbox=' + q, function(data) {
    self._loadIndicator.hide();
    
    console.log(data.length + ' places nearby');
    
    // Compute nearest
    var distances = jQuery.map(data, function(place, idx) {
      var latlng;
      
      if (place.geometry.type == 'Polygon') {
        latlng = pelagios.Heatmap.util.averageCoords(place.geometry.coordinates[0]);
      } else if (place.geometry.type == 'Point') {    
        latlng = { lat: place.geometry.coordinates[1], lng: place.geometry.coordinates[0] }
      }
      return { idx: idx, dist: pelagios.Heatmap.util.distanceSq(latlng, event.latlng) }
    });   
    
    if (distances.length > 0) {
      distances.sort(function(a, b) { return ((a.dist < b.dist) ? -1 : ((a.dist > b.dist) ? 1 : 0)); })
    
      // Open popup for nearest place  
      var nearestPlace = data[distances[0].idx];
      self.showPopup({ lat: nearestPlace.geometry.coordinates[1], lng: nearestPlace.geometry.coordinates[0] }, nearestPlace); 
    }
  });
}

/**
 * Shows a popup with place-specific information at a specific coordinate.
 */
pelagios.Heatmap.prototype.showPopup = function(markerOrLatlng, place) {
  var content = '<h2>' + place.label + '</h2>' +
                     '<p><em>' + place.altLabels + '<br/>' + place.coverage + 
                     '</em></p><p>' + place.comment + 
                     '</p><p><a href="' + place.uri + '" target="_blank">' + place.number_of_references + 
                     ' references.</a></p>' 
  
  if (markerOrLatlng.lat && markerOrLatlng.lng) {
    L.popup().setLatLng(markerOrLatlng)
     .setContent(content)
     .openOn(this.map);
  } else {
    markerOrLatlng.bindPopup(content).openPopup();
  }
}

/**
 * The load indicator, backed by a plain old DIV. Will
 * be hidden after creation.
 * @constructor
 */
pelagios.LoadIndicator = function() {
  this.element = document.createElement('div');
  this.element.className = 'pelagios-load-indicator';
  this.element.style.visibility = 'hidden';
  
  this._deferredIndicator;
  
  document.body.appendChild(this.element);
}

/**
 * Shows the load indicator.
 */
pelagios.LoadIndicator.prototype.show = function() {
  var self = this;
  this._deferredIndicator = setTimeout(function() {
    self.element.style.visibility = 'visible';
    delete self._deferredIndicator;
  }, 200); 
}

/**
 * Hides the load indicator.
 */
pelagios.LoadIndicator.prototype.hide = function() {
  if (this._deferredIndicator)
    clearTimeout(this._deferredIndicator);
    
  this.element.style.visibility = 'hidden';
}

/**
 * A Pelagios place search box.
 * @constructor
 */
pelagios.Searchbox = function(form, heatmap) {
  var self     = this,
      input    = form.getElementsByTagName('input')[0],
      onSubmit = function(e) {
                   self._findPlaces(input.value);
                   e.preventDefault();
                 };
                 
  /** @private **/
  this._heatmap = heatmap;
  
  /** @private **/
  this._results = [];
   
  if (form.addEventListener) {          
    form.addEventListener('submit', onSubmit, false); 
  } else if (form.attachEvent) {            
    form.attachEvent('onsubmit', onSubmit);
  }
}

pelagios.Searchbox.prototype._findPlaces = function(query) {
  var self = this;
  
  jQuery.each(this._results, function(idx, marker) {
    self._heatmap.map.removeLayer(marker);
  });
  
  jQuery.getJSON('http://pelagios.dme.ait.ac.at/api/search.json?query=' + query, function(places) {
    var minLat = 90,
        minLng = 180,
        maxLat = -90,
        maxLng = -180;

    jQuery.each(places, function(idx, place) {    
      if (place.geometry) {
        var latlng;
        
        if (place.geometry.type == 'Polygon') {
          latlng = pelagios.Heatmap.util.averageCoords(place.geometry.coordinates[0]);
        } else if (place.geometry.type == 'Point') {      
          latlng = { lat: place.geometry.coordinates[1], lng: place.geometry.coordinates[0] }
        }
        
        if (latlng) {
          if (latlng.lat < minLat)
            minLat = latlng.lat;

          if (latlng.lng < minLng)
            minLng = latlng.lng;

          if (latlng.lat > maxLat)
            maxLat = latlng.lat;

          if (latlng.lng > maxLng)
            maxLng = latlng.lng;
                      
          var marker = L.marker(latlng);
          marker.on('click', function(e) {
            self._heatmap.showPopup(marker, place);   
          });
          self._results.push(marker);
          marker.addTo(self._heatmap.map);
        }
      }
    });
    
    self._heatmap.map.fitBounds([[minLat, minLng], [maxLat, maxLng]]);
  });
}

/**
 * Utility methods. Pretty nasty implementations, but do the job for the
 * purposes (and region of the world).
 */
pelagios.Heatmap.util = {

  distanceSq    : function(latlngA, latlngB) {
                    var dLat = latlngA.lat - latlngB.lat,
                        dLng = latlngA.lng - latlngB.lng;
        
                    return Math.pow(dLat, 2) + Math.pow(dLng, 2);
                  },
               
  averageCoords : function(coords) {
                    var avgLat = 0, 
                        avgLon = 0,
                        j      = coords.length;
                      
                    for (var i=0; i<j; i++) {
                      avgLat += coords[i][1];
                      avgLon += coords[i][0];
                    }
                     
                    return { lat: avgLat / j, lng: avgLon / j };
                  }
                  
}
