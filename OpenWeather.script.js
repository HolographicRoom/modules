export default function({fetchJSON,ui}) {
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
		api: ({context, api, self, storage}) => {
			return {
				query: async (q) => {
					let res;
					try {
						res = await fetchJSON(`https://api.openweathermap.org/data/2.5/${q}&mode=json&units=metric&cnt=2&appid=${context.apiKey}`);
					} catch (e) {
						self.error("query failed because of Error",e);
						switch (e) {
							case 401:
								context.apiKey = "$ASKME";
								delete storage.apiKey;
								storage.save();
								ui.modal.alert("OpenWeather API Token is invalid. Please update via options or reload.");
								self.error("API Token is not valid");
								break;
							default:
								break;
						}
					}
					return res;
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