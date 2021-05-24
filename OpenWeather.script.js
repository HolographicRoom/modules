export default function({fetchJSON}) {
	return ({
		name: "OpenWeatherAPI",
		icon :"🌤",
		description: "Publishes weather.[current|forecast].[temperature|condition] using OpenWeather API",
		context: {
			apiKey:		"$REPLACE_OR_ILL_ASK_FOR_IT",
			location: 	"$REPLACE_OR_ILL_ASK_FOR_IT",
			prefix : 	"weather",
			interval: 	"5 min"
		},
		api: ({context, api}) => {
			return {
				query: async (q) => {
					return await fetchJSON(`https://api.openweathermap.org/data/2.5/${q}&mode=json&units=metric&cnt=2&appid=${context.apiKey}`);
				},
				retrieve: async (type) => {
					let current = await api.query(`${type}?q=${context.location}`);

					let temperature = (current.list || [current])[0].main.feels_like;
					let condition = (current.list || [current])[0].weather[0].main.toLowerCase();

					return {temperature, condition};
				}
			}
		},
		states: {
			updateWeather: {
				entry: async ({api, context, self}) => {
					self.publishPrefix(context.prefix, await api.retrieve("weather"), {valueInEvent:true});
					self.publishPrefix(`${context.prefix}.forecast`, await api.retrieve("forecast") , {valueInEvent:true});
				},
				refreshAfter: "$context.interval"
			}
		}
	})
}