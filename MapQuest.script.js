export default ({
	name: "MapQuest",
	description: 'Provides access to MapQuests Geocoding API. See https://developer.mapquest.com/documentation/geocoding-api/ for details.',
	context: {
		apiKey: "$REPLACE_OR_ILL_ASK_FOR_IT"
	},
	api: ({context, api}) => {
		return {
			/**
			 * Returns the result of a MapQuest API request to path
			 * @param {string} path
			 * @returns {object} JSON response of the request
			 */
			_request: async (path) => {
				let response = await fetch(`http://open.mapquestapi.com/${path}&key=${context.apiKey}`);
				let json = await response.text();
				return JSON.parse(json).results[0].locations[0];
			},

			/**
			 * Returns the {lat,lng} coordinates associated with a place
			 * @param {string} place
			 * @returns {object} {lat,lng}
			 */
			getLatLng: async (/** @type {string} */ place) => {
				context.cache = context.cache || {};
				if (context.cache[place]) {
					return context.cache[place];
				}

				let result = (await api._request(`geocoding/v1/address?location=${encodeURIComponent(place)}`)).latLng;
				context.cache[place] = result;
				return result;
			},

			/**
			 * Returns the distance in m between a b
			 * @param {string} placeA
			 * @param {string} placeB
			 * @returns {number} Distance meters
			 */
			getDistanceBetweenPlaces: async (placeA, placeB) => {
				let distance = api.getDistanceLatLng(
					await api.getLatLng(placeA),
					await api.getLatLng(placeB)
				);
				return distance;
			},

			/**
			 * Returns the distance in m between a b
			 * @param {Object} a //{lat,lng}
			 * @param {Object} b //{lat,lng}
			 * @returns {number} Distance meters
			 */
			getDistanceLatLng: (a,b) => {
				//From https://www.geodatasource.com/developers/javascript
				function distance(lat1, lon1, lat2, lon2, unit = "K") {
					if ((lat1 === lat2) && (lon1 === lon2)) {return 0;}
					else {
						let radlat1 = Math.PI * lat1 / 180;
						let radlat2 = Math.PI * lat2 / 180;
						let theta = lon1 - lon2;
						let radtheta = Math.PI * theta / 180;
						let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
						if (dist > 1) {
							dist = 1;
						}
						dist = Math.acos(dist);
						dist = dist * 180 / Math.PI;
						dist = dist * 60 * 1.1515;
						if (unit == "K") { dist = dist * 1.609344 }
						if (unit == "N") { dist = dist * 0.8684 }
						return dist;
					}
				}

				return distance(a.lat, a.lng, b.lat, b.lng, "K") * 1000;
			}
		}
	}
})
