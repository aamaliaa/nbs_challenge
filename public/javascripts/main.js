var viz = angular.module('viz', []);

viz.controller('mainController', function mainController($scope, $http) {

	$scope.sources = [];
	$scope.data = {};
	$scope.finishedData = {};

	$scope.getData = function() {
		$http.get('data/rihanna_facebook.json')
		.then(function(facebook) {
			$scope.data = $.extend(true, $scope.data, formatData(facebook['data']['data']['2104']['11']['values']['global'], 'facebook'));

			$http.get('data/rihanna_twitter.json')
			.then(function(twitter) {
				$scope.data = $.extend(true, $scope.data, formatData(twitter['data']['data']['2104']['28']['values']['global'], 'twitter'));
			
				$http.get('data/rihanna_vevo.json')
				.then(function(vevo) {
					$scope.data = $.extend(true, $scope.data, formatData(vevo['data']['data']['2104']['42']['values']['global'], 'vevo'));
					
					$http.get('data/rihanna_wikipedia.json')
					.then(function(wikipedia) {
						$scope.data = $.extend(true, $scope.data, formatData(wikipedia['data']['data']['2104']['41']['values']['global'], 'wikipedia'));
						$scope.finishedData = $scope.data;
					});
				});
			});
		});
	};

	$scope.toggleSource = function(source) {
		var found = $.inArray(source, $scope.sources);
		if(found < 0) {
			$scope.sources.push(source);
		} else {
			$scope.sources.splice(found, 1);
		}
	};

	var formatData = function(data, metric) {
		var formatted = {};

		for(var k in data) {
			var obj = {};
			obj['date'] = k;
			obj[metric] = data[k];

			formatted[k] = obj;
		}

		return formatted;
	};

	$scope.getData();

});

viz.directive('chart', function() {
	return {
		restrict: 'E',
		scope: {
			data: '=',
			sources: '='
		},
		link: function(scope, element, attrs) {

			var margin = { top: 20, right: 15, bottom: 60, left: 80 },
				width = 960 - margin.left - margin.right,
				height = 500 - margin.top - margin.bottom;

			var svg = d3.select(element[0]).append("svg")
				.attr('width', width + margin.right + margin.left)
				.attr('height', height + margin.top + margin.bottom)
				.attr('class', 'chart')
				.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			scope.$watch('data', function(newData, oldData) {

				if(!newData) {
					return;
				}

				var data = [];
				var parseDate = d3.time.format.iso.parse;

				var j = 0;
				for(var i in newData) {
					data.push(newData[i]);
					data[j].date = parseDate(data[j].date*86400*1000);
					j++;
				};

				var x = d3.time.scale()
					.range([0, width])
					.domain(d3.extent(data, function(d) { return d.date; }));

				var y = d3.scale.linear()
					.range([height, 0]);

				scope.$watchCollection('sources', function(sources, oldSources) {

					svg.selectAll('*').remove();

					if(sources.length < 1) {
						return;
					}

					var y_vals = [],
						lines = {};

					// push y values across sources into array for domain
					data.forEach(function(d) {
						sources.forEach(function(s) {
							y_vals.push(d[s]);
						});
					});
					y.domain(d3.extent(y_vals));

					// add line to array for each source selected
					sources.forEach(function(s) {

						if($.inArray(s, sources) >= 0) {
							lines[s] = d3.svg.line()
								.defined(function(d) { return !isNaN(d[s]); })
								.x(function(d) { return x(d.date); })
								.y(function(d) { return y(d[s]); });

						} else {
							svg.selectAll('.'+s).remove();
						}

					});
					
					var xAxis = d3.svg.axis()
						.scale(x)
						.orient('bottom');

					var yAxis = d3.svg.axis()
						.scale(y)
						.orient('left');

					svg.append('g')
						.attr('transform', 'translate(0,' + height + ')')
						.attr('class', 'main x-axis axis')
						.call(xAxis);

					svg.append('g')
						.attr('transform', 'translate(0,0)')
						.attr('class', 'main y-axis axis')
						.call(yAxis);

					// draw lines for each source
					for(var s in lines) {
						svg.append('path')
							.datum(data)
							.attr("class", "line "+s)
							.attr("d", lines[s]);
					}
				});
			});
		}
	}
});