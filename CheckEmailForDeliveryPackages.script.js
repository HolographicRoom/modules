export default function({HoloRPlugin}) {
	return ({
		name: "CheckEmailForDeliveryPackages",
		context: {
			DHLAPIKey: "$REPLACE_OR_ILL_ASK_FOR_IT",
			updatePackageDetailsInterval: "10 min"
		},
		setup: async ({context}) => {
			const DeliveryTrackerPlugin = await HoloRPlugin.load("plugins/DeliveryTrackerPlugin");
			context.DeliveryTracker = new DeliveryTrackerPlugin({
				dhl: {
					apikey: context.DHLAPIKey
				}
			});
		},
		on: {
			'email.new': 'checkEmailForTrackingId'
		},
		after: {
			"$context.updatePackageDetailsInterval": 'updateKnownPackages'
		},
		initial: "updateKnownPackages",
		api: ({storage}) => {
			return {
				getKnownPackages: () => {
					if (!storage.packages) {
						storage.packages = {};
					}
					return storage.packages;
				}
			}
		},
		states: {
			updateKnownPackages: {
				entry: async ({context,storage}) => {
					Object.entries(storage.packages || {}).forEach(async ([trackingId, pkg]) => {
						let trackingDetails = await context.DeliveryTracker.lookup(pkg.courier, trackingId);

						if (!trackingDetails) {
							this.warn("Invalid tracking id: " + trackingId + ", removed");
							this.publish("delivery.package.invalid");
							delete storage.packages[trackingId];
							storage.save();
							return;
						}

						if (JSON.stringify(pkg.details) !== JSON.stringify(trackingDetails)) {
							pkg.details = trackingDetails;
							storage.packages[trackingId] = pkg;
							storage.save();
							this.publish("delivery.package.updated",pkg);
						}

						//Remove Package if delivered
						if (trackingDetails.status == "Delivered") {
							this.log("Package", trackingDetails.label, "has been delivered, will be removed.");
							this.publish("delivery.package.delivered",pkg);
							delete storage.packages[trackingId];
							storage.save();
						}
					});
				}
			},
			checkEmailForTrackingId: {
				entry: async ({context, evt, api}) => {
					let knownPackages = await api.getKnownPackages();

					let email = evt.details.value;
					let trackedPackage = (await context.DeliveryTracker.findTrackingIDsInText(email.body))[0];

					if (!trackedPackage) return; //no packages detected in email
					if (knownPackages[trackedPackage.trackingId]) return; //trackingId is known already

					let trackingDetails = await context.DeliveryTracker.lookup(trackedPackage.courier, trackedPackage.trackingId);
					if (!trackingDetails) {
						//Number who looks like a trackingId but couldn't be resoved correctly
						//either number is mistakingly took for a tracking id or courier is wrong
						return;
					}

					trackedPackage.details = trackingDetails;

					//Found new trackingId, store and announce new delivery package
					knownPackages[trackedPackage.trackingId] = trackedPackage;
					this.publish("delivery.package.new", trackedPackage);
				},
				after: {
					0: 'debounceUpdateKnownPackages'
				}
			},
			debounceUpdateKnownPackages: {
				after: {
					"1s": 'updateKnownPackages'
				}
			}
		}
	})
}