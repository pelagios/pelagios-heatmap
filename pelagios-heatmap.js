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
  
  var currentTimer,
      isDblClick = false;
  map.on('click', function(e) {
	if (currentTimer) {
	  clearTimeout(currentTimer);
      isDblClick = true;	  
    }
    	  
	currentTimer = setTimeout(function() {
	  if (!isDblClick)
        console.log('single click');

      currentTimer = undefined;        
      isDblClick = false;
    }, 200); 
  });
}
