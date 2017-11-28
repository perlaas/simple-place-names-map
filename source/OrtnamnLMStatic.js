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

L.OrtnamnLMStatic = L.FeatureGroup.extend({
  options: {
    debug: false,
    minzoom: 15,
    endpoint: "https://kso.etjanster.lantmateriet.se/sercxi-ortnamn/",
    query: "(node(BBOX)[organic];node(BBOX)[second_hand];);out qt;",
    callback: function(data) {
      for(var i = 0; i < data.pageItems.length; i++) {
        var e = data.pageItems[i];

        //if (e.id in this.instance._ids) continue;
        //this.instance._ids[e.id] = true;
        var pos;
		var placering = e.placeringar[0];
		var plats = placering.plats;
        if (plats.type == "Point") {
			//Proj4js.defs["EPSG:3006"] = "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
			//Proj4js.defs["EPSG:4326"] = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
			var epsg3006 = '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
			//var epsg3006wkt = 'PROJCS["SWEREF99 TM",GEOGCS["SWEREF99",DATUM["SWEREF99",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6619"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.01745329251994328,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4619"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",15],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARMETER["false_northing",0],AUTHORITY["EPSG","3006"],AXIS["y",EAST],AXIS["x",NORTH]]'
			//var epsg3857 = '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'
			//var epsg3857b = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs"
			//var epsg3857wkt = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9108"]],AUTHORITY["EPSG","4326"]]'
			var epsg3857 = '+proj=longlat +datum=WGS84 +no_defs'
			var lat = parseFloat(plats.coordinates[0]);
			var lng = parseFloat(plats.coordinates[1]);
			var e2 = proj4(epsg3006,epsg3857,[lat,lng]);
          pos = new L.LatLng(e2[1], e2[0]);
        }
		
		var tags = [];
		var bookTitle = "Tom Sawyer";
		var author = "Mark Twain";
		var foo = {};
		tags['sprak'] = e.sprak;
		tags['typ'] = placering.typ;
		tags['namn'] = e.namn;

        var popup = this.instance._poiInfo(tags,e.id);
        var circle = L.circle(pos, 50, {
          color: 'red',
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
	  var url =  this.options.endpoint + "ortnamn?" + queryWithMapCoordinates;

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
