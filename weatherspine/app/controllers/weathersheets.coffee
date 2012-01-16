Spine = require('spine')
WeatherQuery = require('models/weatherquery')

class WeatherSheets extends Spine.Controller
  id: 'wejet'

  elements:
    '#search': 'search'

  events:
    'submit form': 'user_query'

  constructor: ->
    super

    @routes
    	'/q/:query': (params) ->
        @api_query(params)

    @navigate('/q/local', true)

  api_query: (params) ->
    @query = params.query
    weather = new WeatherQuery(query: @query)
    weather.qapi()

  user_query: ->
    query = @search.val()
    @navigate(query)

  template: (sheet) ->
  	require('views/weathersheets')

  render: =>
  	@html(@template(Weather.sheet))
    
module.exports = WeatherSheets
