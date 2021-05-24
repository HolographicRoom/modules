export default function({HoloRScript, HoloRAudioElement}) {
	return ({
		name: "WeatherToGo",
		icon: '🌤🌂🔊',
		description: `Get the weather forecast for the specified location and play corresponding HoloRAudioElements below this script.
			Expects HoloRAudioElements with name ("Rain","Thunderstorm","Birds") below this script.
			If such items are not present on start, it will try to load suitable sounds from freesound.org
		`,
		context: {
			crossFadeDuration: "15 s",
			OpenWeather: {
				apiKey: "$REPLACE_OR_ILL_ASK_FOR_IT", 	//API key for openweather (e.g. a4b84e6bfccdf0b4e421a259352bf877)
				location: "Bielefeld, De",				//Location for weather forecasts
				interval: "5 min" 						//update interval
			}
		},
		setup: async ({context,self,getChildByName}) => {
			let OpenWeatherMap = await HoloRScript.fromModule("scripts:OpenWeather", {context:context.OpenWeather});
			this.add(OpenWeatherMap);

			let fallbackAudio = {
				"Birds": {volume:0.75,url:"https://freesound.org/data/previews/433/433000_969948-lq.mp3"},
				"Rain":  {volume:0.125,url:"https://freesound.org/data/previews/243/243628_3509815-hq.mp3"},
				"Thunderstorm": {volume:0.5,url:"https://freesound.org/data/previews/278/278866_1402315-lq.mp3"}
			};

			context.audioFiles = {};
			for (let [audioName, options] of Object.entries(fallbackAudio)) {
				let audio = getChildByName(audioName);
				if (!audio) {
					audio = await HoloRAudioElement.from(options);
					self.add(audio, audioName);
				}
				context.audioFiles[audioName] = audio;
			}
		},
		on: {
			"weather.forecast.condition.rain": "Rain",
			"weather.forecast.condition.thunderstorm": "Thunderstorm",
			"weather.forecast.condition.clouds": "ClearCloudy",
			"weather.forecast.condition.clear": "ClearCloudy"
		},
		initial: 'weatherUnknown',
		states: {
			weatherUnknown: {},
			Rain: {
				entry: ({context,self}) => {
					self.log("☔ Raining");
					context.audioFiles["Rain"].loop().fadeIn(context.crossFadeDuration);
				},
				exit: async ({context}) => {
					await context.audioFiles["Rain"].fadeOut(context.crossFadeDuration);
				}
			},
			Thunderstorm: {
				entry: ({context,self}) => {
					self.log("⛈️ Thunderstorm")
					context.audioFiles["Thunderstorm"].loop().fadeIn(context.crossFadeDuration);
				},
				exit: async ({context}) => {
					await context.audioFiles["Thunderstorm"].fadeOut(context.crossFadeDuration);
				}
			},
			ClearCloudy: {
				entry: ({context,self}) => {
					self.log("⛅ Clear or Cloudy");
					context.audioFiles["Birds"].loop().fadeIn(context.crossFadeDuration);
				},
				exit: async ({context}) => {
					await context.audioFiles["Birds"].fadeOut(context.crossFadeDuration);
				}
			}
		}
	})
}