const fsm = ({
	icon:'🏋🏾',
	name: "FitBit",
	description: "Provides access to FitBit data via their API",
	context: {
		//Go to https://dev.fitbit.com/apps/new and register a new app for your FitBit:
		//Oauth 2.0 Application Type: Personal
		//Redirect URL: will be shown in the console output (e.g. https://webhookdns-holor.eu.ngrok.io/oauth2/fitbit)
		clientId: '$REPLACE_OR_ILL_ASK_FOR_IT', //<<- Copy the client ID of your app here
		scopes: ['activity','heartrate','sleep','nutrition','sleep','weight','profile'], //See https://dev.fitbit.com/build/reference/web-api/explore/
		updateInterval: "15 min"
	},
	setup: async ({context}) => {
		context.client = await HoloROAuth2.from({
			name:				"fitbit",
			baseUrl:			"https://api.fitbit.com/1/user/-",
			authorizationUri:	"https://www.fitbit.com/oauth2/authorize",
			scopes:				context.scopes,
			clientId:			context.clientId
		});
	},
	states: {
		updateData: async ({self,context}) => {
			let result = {
				/*
				//TODO: FitBit API returns error code 400
				fat: await context.client.get("/body/log/fat/date/today/7d.json"),
				weight: await context.client.get("/body/log/weight/date/today/7d.json"),
				*/
				"caloriesIn.7d": 	(await context.client.get("/foods/log/caloriesIn/date/today/7d.json"))["foods-log-caloriesIn"],
				"water.7d": 		(await context.client.get("/foods/log/water/date/today/7d.json"))["foods-log-water"],
				"caloriesOut.7d": 	(await context.client.get("/activities/calories/date/today/7d.json"))["activities-calories"],
				"activities": 		(await context.client.get("/activities/recent.json")),
				"heartrate.7d": 	(await context.client.get("/activities/heart/date/today/7d.json"))["activities-heart"],
				"sleep": 			(await context.client.get("/sleep/date/today.json"))
			};

			Object.entries(result).forEach(([name,data]) => {
				if (!data) return;
				self.log("FitBit API returned",name,data,"publishing...");
				if (_.isArray(data)) {
					data.forEach(d => {
						if (d.value) d.value = parseFloat(d.value);
					});
				}
				self.publish(`health.fitbit.${name}`,data);
			});
		}
	},
	after: {
		"$context.updateInterval": "updateData"
	}
})

export default fsm;