export default function({HoloR, SPECIFIED_BY_USER}) {
	return ({
		name: "OpenWeather API",
		icon :"🌤",
		description: "Publishes weather.[current|forecast].[temperature|condition] using OpenWeather API",
		context: {
			api_key: 	SPECIFIED_BY_USER,
			location: 	"Bielefeld, De",
			prefix : 	"weather",
			interval: 	"5min"
		},
		api: ({context,api}) => {
			return {
				query: async (q) => {
					return await fetchJSON(`https://api.openweathermap.org/data/2.5/${q}&mode=json&units=metric&cnt=2&appid=${context.api_key}`);
				},
				retrieve: async (type) => {
					let current = await api.query(`${type}?q=${context.location}`);

					let temperature = (current.list || [current])[0].main.feels_like;
					let condition = (current.list || [current])[0].weather[0].main.toLowerCase();

					return {temperature, condition}
				}
			}
		},
		states: {
			updateWeather: {
				entry: async ({api,self}) => {
					self.publishPrefix("weather", await api.retrieve("weather"), {valueInEvent:true});
					self.publishPrefix("weather.forecast", await api.retrieve("forecast") , {valueInEvent:true});
				},
				refreshAfter: "$context.interval"
			}
		}
	})
}