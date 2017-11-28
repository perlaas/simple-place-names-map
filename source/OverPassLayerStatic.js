L.Control.MinZoomIndicator = L.Control.extend({
  options: {
    position: 'bottomleft',
  },

  /**
  * map: layerId -> zoomlevel
  */
  _layers: {},

  /** TODO check if nessesary
  */
  initialize: function (options) {
    L.Util.setOptions(this, options);
    this._layers = new Object();
  },

  /**
  * adds a layer with minzoom information to this._layers
  */
  _addLayer: function(layer) {
    var minzoom = 15;
    if (layer.options.minzoom) {
      minzoom = layer.options.minzoom;
    }
    this._layers[layer._leaflet_id] = minzoom;
    this._updateBox(null);
  },

  /**
  * removes a layer from this._layers
  */
  _removeLayer: function(layer) {
    this._layers[layer._leaflet_id] = null;
    this._updateBox(null);
  },

  _getMinZoomLevel: function() {
    var minZoomlevel=-1;
    for(var key in this._layers) {
      if ((this._layers[key] != null)&&(this._layers[key] > minZoomlevel)) {
        minZoomlevel = this._layers[key];
      }
    }
    return minZoomlevel;
  },

  onAdd: function (map) {
    this._map = map;
    map.zoomIndicator = this;

    var className = this.className;
    var container = this._container = L.DomUtil.create('div', className);
    map.on('moveend', this._updateBox, this);
    this._updateBox(null);

    //        L.DomEvent.disableClickPropagation(container);
    return container;
  },

  onRemove: function(map) {
    L.Control.prototype.onRemove.call(this, map);
    map.off({
      'moveend': this._updateBox
    }, this);

    this._map = null;
  },

  _updateBox: function (event) {
    //console.log("map moved -> update Container...");
    if (event != null) {
      L.DomEvent.preventDefault(event);
    }
    var minzoomlevel = this._getMinZoomLevel();
    if (minzoomlevel == -1) {
      this._container.innerHTML = this.options.minZoomMessageNoLayer;
    }else{
      this._container.innerHTML = this.options.minZoomMessage
          .replace(/CURRENTZOOM/, this._map.getZoom())
          .replace(/MINZOOMLEVEL/, minzoomlevel);
    }

    if (this._map.getZoom() >= minzoomlevel) {
      this._container.style.display = 'none';
    }else{
      this._container.style.display = 'block';
    }
  },

  className : 'leaflet-control-minZoomIndicator'
});

L.LatLngBounds.prototype.toOverpassBBoxString = function (){
  var a = this._southWest,
  b = this._northEast;
  return [a.lat, a.lng, b.lat, b.lng].join(",");
}

L.OverPassLayerStatic = L.FeatureGroup.extend({
  options: {
    debug: false,
    minzoom: 15,
    endpoint: "http://overpass-api.de/api/",
    query: "(node(BBOX)[organic];node(BBOX)[second_hand];);out qt;",
    callback: function(data) {
      for(var i = 0; i < data.elements.length; i++) {
        var e = data.elements[i];

		if (e.id in this.instance._ids) continue;
		this.instance._ids[e.id] = true;
        var pos;
		var color = 'green';
        if (e.type === "node") {
          pos = new L.LatLng(e.lat, e.lon);
        } else {
		  var color = 'blue';
		  if (e.type === "relation") {
			var color = 'black';
		  }
          pos = new L.LatLng(e.center.lat, e.center.lon);
        }
        var popup = this.instance._poiInfo(e.tags,e.id);
        var circle = L.circle(pos, 50, {
          color: color,
          fillColor: '#3f0',
          fillOpacity: 0.5
        })
        .bindPopup(popup);
        this.instance.addLayer(circle);
      }
    },
    beforeRequest: function() {
      if (this.options.debug) {
        console.debug('about to query the OverPassAPI');
      }
    },
    afterRequest: function() {
      if (this.options.debug) {
        console.debug('all queries have finished!');
      }
    },
    minZoomIndicatorOptions: {
      position: 'bottomleft',
      minZoomMessageNoLayer: "no layer assigned",
      minZoomMessage: "current Zoom-Level: CURRENTZOOM all data at Level: MINZOOMLEVEL"
    },
  },

  initialize: function (options) {
    L.Util.setOptions(this, options);
    this._layers = {};
    // save position of the layer or any options from the constructor
    this._ids = {};
    this._requested = {};
	this.StaticOnMoveEnd();	
  },

  _poiInfo: function(tags,id) {
    var link = document.createElement("a");
    link.href = "http://www.openstreetmap.org/edit?editor=id&node=" + id;
    link.appendChild(document.createTextNode("Edit this entry in iD"));
    var table = document.createElement('table');
    for (var key in tags){
      var row = table.insertRow(0);
      row.insertCell(0).appendChild(document.createTextNode(key));
      row.insertCell(1).appendChild(document.createTextNode(tags[key]));
    }
    var div = document.createElement("div")
    div.appendChild(link);
    div.appendChild(table);
    return div;
  },

	onMoveEnd: function () {
	},


  StaticOnMoveEnd: function () {
    if (this.options.debug) {
      console.debug("load Pois");
    }

	
	  var queryWithMapCoordinates = this.options.query;
	  var url =  this.options.endpoint + "interpreter?data=[out:json];" + queryWithMapCoordinates;

	  var self = this;
	  var request = new XMLHttpRequest();
	  request.open("GET", url, true);

	  request.onload = function() {
		if (this.status >= 200 && this.status < 400) {
		  var reference = {instance: self};
		  self.options.callback.call(reference, JSON.parse(this.response));
		  if (self.options.debug) {
			console.debug('queryCount: ' + queryCount + ' - finishedCount: ' + finishedCount);
		  }
		  if (++finishedCount == queryCount) {
			  self.options.afterRequest.call(self);
		  }
		}
  };

  request.send();


  },

  onAdd: function (map) {
    this._map = map;
    if (map.zoomIndicator) {
      this._zoomControl = map.zoomIndicator;
      this._zoomControl._addLayer(this);
    }else{
      this._zoomControl = new L.Control.MinZoomIndicator(this.options.minZoomIndicatorOptions);
      map.addControl(this._zoomControl);
      this._zoomControl._addLayer(this);
    }

    //this.StaticOnMoveEnd();
	//map.on('moveend', this.StaticOnMoveEnd, this);
    //if (this.options.debug) {
    //  console.debug("add layer");
    //}
  },

  onRemove: function (map) {
    if (this.options.debug) {
      console.debug("remove layer");
    }
    L.LayerGroup.prototype.onRemove.call(this, map);
    this._ids = {};
    this._requested = {};
    this._zoomControl._removeLayer(this);

    map.off({
      'moveend': this.onMoveEnd
    }, this);

    this._map = null;
  },

  getData: function () {
    if (this.options.debug) {
      console.debug(this._data);
    }
    return this._data;
  }

});

//FIXME no idea why the browser crashes with this code
//L.OverPassLayer = function (options) {
//  return new L.OverPassLayer(options);
//};
