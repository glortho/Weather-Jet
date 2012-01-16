/*
 * Weather Jet weather widget prepared for Richard Jones of Callisto.fm
 *
 * Copyright 2012 Jonathan Verity @ Dataverse Consulting LLC
 *
 * DEPENDENCIES
 *
 *	1. wunderground.com API - http://www.wunderground.com/weather/api/d/documentation.html
 *		Note: Because the free api is limited (with consequences!) this app has no polling and should (but currently doesn't) throttle queries
 *
 *	2. highcharts.com
 *
 *	3. jQuery and jQuery UI
 *
 */

// self-executing function to keep everything out of global scope and pass jQuery in as var (best practice to avoid lib conflicts)
(function($) {

	// custom doc ready for json callbacks, allows us finer-grained control over just these functions
	var docready = new $.Deferred();

	Highcharts.setOptions({colors: ['#ED561B', '#058DC7']});

	var Wejet = function() {
		// private self reference for convenient reference to this object from nested objects
		var mode = 'prod', // dev or prod
			self = this,

			// convenient way to connect api uri, results obj (ref), dom element id (also ref), and formatter (callback)
			_api_sets = [{
				url: 'geolookup',
				ref: 'location',
				callback: function(nugget) {
					return nugget.city + ', ' + ( nugget.state.length ? nugget.state + ' (' + nugget.zip + ')' : nugget.country_name );
				}
			}, {
				url: 'conditions',
				ref: 'current_observation',
				callback: function(nugget) {
					return "<img src='" + nugget.icon_url + "' alt='icon-now' class='icon' id='icon-now' style='float: left; margin-right: 10px;'/><div>" + nugget.temp_f + ' F, ' + nugget.weather + " </div>";
				}
			}, {
				url: 'forecast7day',
				ref: 'forecast',
				callback: function(nugget) {
					var data, nug, output = '';

					if ( nugget && nugget.simpleforecast ) {
						data = nugget.simpleforecast.forecastday;

						this.chart(nugget);

						for (var i = 0; i < 5; i++) {
							output += '<span><img title="' + data[i].pop + '% chance of precipitation" src="' + data[i].icon_url + '"/></span>';
						}
					} else {
						output = 'No forecast data for this location';
					}
					return output;
				}
			}],

			_chart_settings ={
				chart: {
					renderTo: 'forecast-chart',
					defaultSeriesType: 'column'
				},
				title: {
					text: '5-Day Forecast'
				},
				xAxis: {
					// categories: days
				},
				yAxis: {
					title: {
						text: 'Temperature'
					}
				},
				legend: {
					align: 'right',
					x: -100,
					verticalAlign: 'top',
					y: 20,
					floating: true,
					backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColorSolid) || 'white',
					borderColor: '#CCC',
					borderWidth: 1,
					shadow: false
				},
				plotOptions: {
					column: {
						pointPadding: 0.2,
						borderWidth: 0,
						dataLabels: {
							enabled: true
						}
					}
				},
				series: [{
					name: 'High'
					// data: highs
				}, {
					name: 'Low'
					// data: lows
				}]
			};

		this.error = function(msg) {
			var $el = $('#flash');

			$('#search-form').fadeOut(function() {
				document.getElementById('search').value = '';
			}).delay(2500).fadeIn();

			$el.html(msg).fadeIn().delay(2500).fadeOut();
		};

		// custom xhr object that adheres to and calls jQuery ajax
		this.xhr = {
			autocomplete: 'http://autocomplete.wunderground.com/aq?query={query}&format=JSON',
			defaults: {
				url: 'http://api.wunderground.com/api/19965ec909572167/{feature}/q/{query}.json',
				dataType: 'jsonp',
				type: 'post',
				beforeSend: function() {self.xhr.loading.show();}, // show loading animation before every send
				complete: function() {self.xhr.loading.hide();}
			},
			loading: {
				show: function() {
					var icon = document.getElementById('icon-now');

					if ( icon ) icon.className = 'loading';
				},
				hide: function() {$('#icon-now').removeClass('loading');}
			},
			send: function(options) {
				var settings = $.extend({}, this.defaults);

				if ( options.query ) {
					settings.url = this.autocomplete.replace('{query}', options.query);
					settings.jsonp = 'cb';
				} else {
					// quick and dirty templating
					settings.url = settings.url.replace('{feature}', options.url) .replace('{query}', self.query || 'autoip');
				}

				return $.ajax(settings).promise();
			}
		};

		this.locate = function(callback) {
			var geo = navigator.geolocation;

			if ( geo ) {
				geo.getCurrentPosition(function(pos) {
					self.query = pos.coords.latitude + ',' + pos.coords.longitude;
					callback.call(self);
				});
			}
		};

		this.chart = function(data) {
			var nuggets = data.simpleforecast.forecastday,
				days = [], highs = [], lows = [],
				nug, chart;

				// nuggets.splice(nuggets.length-1, 1);

			for (var i = 0; i < 5; i++) {
				nug = nuggets[i];
				days.push(nug.date.weekday_short);
				highs.push(parseInt(nug.high.fahrenheit, 10));
				lows.push(parseInt(nug.low.fahrenheit, 10));
			}

			series = [highs, lows];

			_chart_settings.xAxis.categories = days;
			for (i = series.length - 1; i >= 0; i--) {
				_chart_settings.series[i].data = series[i];
			}

			chart = new Highcharts.Chart(_chart_settings);

			$('text > tspan[x=340]').hide(); // hiding highcarts.com url (not a nice thing to do, but need to for now)
		};

		this.fetch = {
			local: function() {
				var set, nugget;

				$.getJSON('./data.json', function(data) {
					for (var i = _api_sets.length - 1; i >= 0; i--) {
						set = _api_sets[i];
						nugget = data[set.ref];
						docready.then(function() {
							document.getElementById(set.ref).innerHTML = set.callback.call(self, nugget);
						});
					}
				});
			},
			remote: function() {
				var deferred = new $.Deferred(),
					options = {
						url: $.map(_api_sets, function(item) {
							return item.url;
						}).join('/')
					};
		
				self.xhr
					.send(options)
					.done(function(data) {
						var set, nugget, msg;
						deferred.resolve();
						if ( !data || data.response.error ) {
							msg = data ? data.response.error : 'Unknown error.';
							self.error(msg);
						} else {
							for (var i = _api_sets.length - 1; i >= 0; i--) {
								set = _api_sets[i];
								nugget = data[set.ref];
								docready.then(function() {
									document.getElementById(set.ref).innerHTML = set.callback.call(self, nugget);
								});
							}
						}
					});

				// Note: No fail function/error checking because JSONP doesn't trigger error callbacks, so have to do something like this.
				window.setTimeout( function() {
					if ( deferred.state() == 'pending' ) {
						self.error('Request failed. Please pick a different location or try again later.');
						deferred.reject();
						self.xhr.loading.hide();
					}
				}, 3000);
			}
		};

		this.search = {
			autocomplete: function() {
				var cache = {},
					that = this;

				$('#search').autocomplete({
					source: function( request, response ) {
						var term = request.term;

						if ( cache[term] ) {
							response(cache[term]);
						} else {
							self.xhr
								.send({query: term})
								.done(function(data) {
									var items = that.result_items(data);
									cache[term] = items;
									response(items);
								});
						}
					},
					focus: function() {
						return false;
					},
					select: function(e, ui) {
						this.value = ui.item.value.replace('/q/', '');
						that.submit();
						this.blur();
						return false;
					}
				});
			},
			result_items: function(data, callback) {
				var arr = $.map( data.RESULTS, function( item ) {
					return {
						label: item.name,
						value: item.l
					};
				});
				return arr;
			},
			bind: function() {
				$('form').on('submit', this.submit);
			},
			submit: function() {
				var el = document.getElementById('search'),
					query = el.value;
				
				$(el).autocomplete('close');
				el.value = '';

				if ( query && query.length && query != self.query) {
					self.query = query;
					self.update();
				}
				return false;
			},
			init: function() {
				this.bind();
				this.autocomplete();
			}
		};

		this.update = function() {
			if ( mode == 'dev') {
				// local testing
				this.fetch.local();
			} else {
				this.fetch.remote();
			}
		};

		this.preload = function() {
			this.locate(this.update);
		};

		this.init = function() {
			this.search.init();
		};
	};

	// exporting and being explicit about scoping
	window.weather_jet = new Wejet();

	// no reason to wait for doc ready to fetch json, since fetches will be async
	window.weather_jet.preload();

	// on docready, init and trigger our custom docready for json callbacks
	$(function() {
		weather_jet.init();
		docready.resolve();
	});

})(jQuery);
