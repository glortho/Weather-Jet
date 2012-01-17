Spine = require('spine')

class WeatherQuery extends Spine.Model
	@extend(Spine.Events)

	@configure 'WeatherQuery', 'query'

	defaults: {
  	xhr: {
	  	urls: {
	  		locations: 'http://autocomplete.wunderground.com/aq?query={query}&format=JSON',
	  		weather: 'http://api.wunderground.com/api/19965ec909572167/geolookup/conditions/forecast7day/q/{query}.json',
	  	},
	  	options: {
	  		dataType: 'jsonp',
	  		type: 'post'
	  	}
	  }
	}

	qapi: (cb) ->
		@cb = cb
		if @query == 'local' and navigator.geolocation
			navigator.geolocation.getCurrentPosition (pos) =>
				@query = pos.coords.latitude + ',' + pos.coords.longitude
				@send()
		else
			@send()
		
	send: =>
		settings = $.extend({}, @defaults.xhr.options)
		settings.url = @defaults.xhr.urls.weather.replace('{query}', @query == 'local' ? 'autoip' : @query)
		# $.ajax(settings).done(@cb)

module.exports = WeatherQuery
