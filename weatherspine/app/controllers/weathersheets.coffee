Spine = require('spine')
WeatherQuery = require('models/weatherquery')

class WeatherSheets extends Spine.Controller
  @extend(Spine.Events)
  id: 'wejet'

  elements:
    '#search': 'search'

  events:
    'submit form': 'user_query'

  constructor: ->
    super

    @bind 'data-ready', 'show'
    @routes
    	'/q/:query': (params) ->
        @api_query(params)

    @navigate('/q/local', true)

  api_query: (params) ->
    @query = params.query
    weather = new WeatherQuery(query: @query)
    weather.qapi(@show)

  user_query: ->
    query = @search.val()
    @navigate(query)

  show: (data) ->
    console.log(data)

  template: (sheet) ->
  	require('views/weathersheets')

  render: =>
  	@html(@template(Weather.sheet))
    
module.exports = WeatherSheets
