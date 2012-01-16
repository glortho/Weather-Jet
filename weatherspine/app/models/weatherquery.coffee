Spine = require('spine')

class WeatherQuery extends Spine.Model
	@configure 'WeatherQuery', 'query'

	defaults: {
  	xhr: {
	  	urls: {
	  		locations: 'http://autocomplete.wunderground.com/aq?query={query}&format=JSON',
	  		weather: 'http://api.wunderground.com/api/19965ec909572167/{feature}/q/{query}.json',
	  	},
	  	options: {
	  		dataType: 'jsonp',
	  		type: 'post'
	  	}
	  }
	}

	api_sets: [{
		url: 'geolookup',
		ref: 'location',
		callback: (nugget) ->
			return nugget.city + ', ' + ( nugget.state.length ? nugget.state + ' (' + nugget.zip + ')' : nugget.country_name )
	}, {
		url: 'conditions',
		ref: 'current_observation',
		callback: (nugget) ->
			return "<img src='" + nugget.icon_url + "' alt='icon-now' class='icon' id='icon-now' style='float: left; margin-right: 10px;'/><div>" + nugget.temp_f + ' F, ' + nugget.weather + " </div>"
	}, {
		url: 'forecast7day',
		ref: 'forecast',
		callback: (nugget) ->
			output = ''

			if nugget && nugget.simpleforecast
				data = nugget.simpleforecast.forecastday

				this.chart(nugget)

				for i in [0..4]
					output += '<span><img title="' + data[i].pop + '% chance of precipitation" src="' + data[i].icon_url + '"/></span>'
			else
				output = 'No forecast data for this location'
			output
	}]

	qapi: ->
		if @query == 'local'
			navigator.geolocation?.getCurrentPosition (pos) =>
				@query = pos.coords.latitude + ',' + pos.coords.longitude
				@send()
		else
			@query = false
			@send()
		
	send: =>
		settings = $.extend({}, @defaults.xhr.options)

		options = {
			url: $.map(@api_sets, (item) ->
				item.url
			).join '/'
		}

		settings.url = @defaults.xhr.urls.weather.replace('{feature}', options.url).replace('{query}', @query || 'autoip');

		console.log(settings)

module.exports = WeatherQuery
