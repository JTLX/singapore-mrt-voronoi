// https://chriszetter.com/blog/2014/06/15/building-a-voronoi-map-with-d3-and-leaflet/
var points = [];
var lines = [];
var visiblePoints = [];
var drawLayer;
$.getJSON("./mrt_neat.json", function(data) {
    points = data['stops'];
    lines = data['lines'];
    // console.log(points);
    $(document).ready(function() {
        // var southWest = L.latLng(1.242538, 103.609314),
        //     northEast = L.latLng(1.466322, 104.037781),
        var southWest = L.latLng(1.273429, 103.686218),
            northEast = L.latLng(1.438178, 103.967056),
            bounds = L.latLngBounds(southWest, northEast);
        map = L.map('mcmap', {crs: L.CRS.EPSG4326}).fitBounds(bounds);

        // L.tileLayer('http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        L.tileLayer('http://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
                attribution: '',
                maxZoom: 17,
                }).addTo(map);

        var bounds = map.getBounds();
        var topLeft = map.latLngToLayerPoint(bounds.getNorthWest());    
        var mapLayer = {
            onAdd: function(map) { // called during map.addLayer(mapLayer);
                map.on('viewreset moveend', drawLayer);
                setTimeout(drawLayer, 0);
            }
        };

        lines.forEach(function(line) {
            line.points = polyline.decode(line.coords);
        });

       

        
        // filtering and projecting
        drawLayer = function() {
            // console.log("drawLayer called");
            bounds = map.getBounds();
            topLeft = map.latLngToLayerPoint(bounds.getNorthWest());	

            $("#overlay").remove(); // remove previous overlay before drawing

            // create overlay
            var svg = d3.select(map.getPanes().overlayPane).append("svg")
                .attr('id', 'overlay')
                .attr("class", "leaflet-zoom-hide")
                .style("width", map.getSize().x + 'px')
                .style("height", map.getSize().y + 'px')
                .style("margin-left", topLeft.x + "px")
                .style("margin-top", topLeft.y + "px");

            filteredPoints = points.filter(function(p) {
                return p.network.toLowerCase().includes("mrt");
            });

            visiblePoints = filteredPoints.filter(function(p) {
                var drawLimit = bounds.pad(0.4);
                var latlng = new L.LatLng(p.coord[0], p.coord[1]); // get latlng of the array elem
                p['latlng'] = latlng;
                p['pt'] = map.latLngToLayerPoint(latlng);
                return drawLimit.contains(latlng); // determine if the point is inside the drawing (visible area)
            });

    		// remove points with equal latlngs
    		function contains(array,obj) {
    			for(var i =0;i<array.length;i++) {
    				if(isEqual(array[i],obj))return true;
    			}
    			return false;
    		}
    		//comparator
    		function isEqual(obj1,obj2) {
    			if(obj1.latlng.equals(obj2.latlng)) {
                    return true;
                }
    			return false;
    		}
    		function removeDuplicates(ary) {
    			var arr = [];
    			return ary.filter(function(x) {
    				return !contains(arr,x) && arr.push(x);
    			});
    		} 

    		removeDuplicates(visiblePoints);

            var svgPoints = svg.selectAll('g')
                .data(visiblePoints)
                .enter()
                .append('g')
                .attr('transform', 'translate(' + (-topLeft.x) + ',' + (-topLeft.y) + ')');

                var transform = d3.geo.transform({point: function(y, x) {
                  var point = map.latLngToLayerPoint(new L.LatLng(y, x));
                  this.stream.point(point.x, point.y);
              }});
                var path = d3.geo.path().projection(transform);

                var feature = svg.selectAll("path")
                .data(lines)
                .enter().append("path");

                feature.attr("d", function(d) {
                    return path({"type":"Feature","geometry":{"type":"LineString","coordinates":d.points}});
                    // return path({"type":"Feature","geometry":{"type":"Polygon","coordinates":[d.points]}});
                })
                .attr("fill", "none")
                .attr("stroke", function(d) {
                    return d.colour;
                })
                .attr("stroke-width", "1.2")
                .attr('transform', 'translate(' + (-topLeft.x) + ',' + (-topLeft.y) + ')');;

            svgPoints.append('circle')
                .attr('transform', function(d) {  return "translate(" + d.pt.x + ", " + d.pt.y + ")"; }) // where d is an elem in filtered points
                .attr('fill', 'white')
                .attr('stroke', 'black')
                .attr('stroke-width', '1.5')
                .attr('r', function(e) { return map.getZoom()/4; });
            // console.log(map.getZoom());
            // returns a voronoi function
            var voronoi = d3.geom.voronoi()
                .x(function(d) {return d.pt.x}) // tell it how to extract x,y from each of the points we pass to it
                .y(function(d) {return d.pt.y});

            var voronoiPolygons = voronoi(filteredPoints);
            // console.log("voronoiPolygons = ", voronoiPolygons);
            voronoiPolygons.forEach(function(polygon) { polygon.point.cell = polygon;  }); // TODO: understand

            var buildPathFromPoint = function(point) {
                if(point.cell == undefined) console.log(point);
                return "M" + point.cell.join("L") + "Z";
            }
            svgPoints.append("path")
                .attr("d", buildPathFromPoint)
                .attr('fill', 'none')
                .attr('stroke', '#777')
                .attr('stroke-width', '0.7');

        }
        map.addLayer(mapLayer);
        drawLayer();
    });
});