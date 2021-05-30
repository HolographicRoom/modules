export default function({HoloRObject3D, HoloRScript, HoloRPlugin}) {
	return ({
		name: "PackageMobile",
		icon: "📦🎈",
		description: `
		This script will look for E-Mails containing a package tracking id, if one is found, it will:
		- clone the script's parent object and make it float above the surface
		- lookup the current geographic tracking position of the package
		- set distance to the ground depending on how far away (geographically) the package is

		A package that is close to the context.HomeAdress will be placed close to the ground,
		while a package that is still far away is placed below the ceiling.

		Packages that are marked as delivered are removed.

		Will use a child named "BoxTemplate" as a template for rendering boxes. If no such child
		is found, it will use a simple brown box.

		Supports UPS, FedEx and DHL (with API Key).
		`,
		context: {
			emailCheckInterval: "15 min",
			HomeAddress: 		"$REPLACE_OR_ILL_ASK_FOR_IT", //Home address to calcualte distance of current package location
			DHLAPIKey: 			"$REPLACE_OR_ILL_ASK_FOR_IT",
			MapQuestAPIKey: 	"$REPLACE_OR_ILL_ASK_FOR_IT",
			radius: 			0.5, 	//New packages will be placed within a radius of 0.5
			floatingPackages: 	true, 	//Make packages float above ground
		},
		setup: async ({context,parent, self}) => {
			//Prepare the 3d object template that is used to visualize a delivery packages
			context.boxTemplate = THREE.ext.traverseFindFirst(self,obj => obj.name.toLowerCase() == "boxtemplate") || new THREE.Mesh(new THREE.BoxGeometry(0.25,0.25,0.25), new THREE.MeshStandardMaterial({
				color: 0x19e000
			}));
			context.boxTemplate.visible = false;

			//Add module for scanning incoming email for delivery tracking ids
			let deliveryPackages = await HoloRScript.fromModule('scripts:CheckEmailForDeliveryPackages', {
				context: {
					DHLAPIKey: context.DHLAPIKey
				}
			});
			self.add(deliveryPackages);
			context.deliveryPackages = deliveryPackages;

			//Load MapQuestPlugin to find the distance between home adress and current package location
			context.MapQuest = await HoloRScript.fromModule("scripts:MapQuest",{
				context: {
					apikey: context.MapQuestAPIKey
				}
			});

			let mailservice = await HoloRScript.fromModule('scripts:HoloRMailService.script.js',{
				context: {
					interval: context.emailCheckInterval
				}
			});
			self.add(mailservice);

			context.packageContainer = new HoloRObject3D();
			self.add(context.packageContainer,"InTransitPackages");
		},
		on: {
			'delivery.package.new': 'receivedPackageUpdates',
			'delivery.package.updated': 'receivedPackageUpdates',
			'delivery.package.delivered': 'receivedPackageUpdates'
		},
		initial: "updatePackages",
		states: {
			updatePackages: async ({context,storage}) => {
				let packages = context.deliveryPackages.api.getKnownPackages();

				//Mark all packages as obsolete so that when we have iterated
				//through all currently active packages and marked them as non obsolete
				//we will know which ones to delete.
				context.packageContainer.children.forEach(packageObject => {
					packageObject.userData.isObsolete = true;
				});

				Object.entries(packages).forEach(async ([trackingId, pkg]) => {
					let trackingDetails = pkg.details;

					let box = context.packageContainer.getObjectByProperty("name", trackingDetails.label);

					if (box) {
						box.userData.isObsolete = false;
					}

					//Remove Package if delivered
					let isDelivered = trackingDetails.status == "Delivered" || (trackingDetails.checkpoints && trackingDetails.checkpoints[0] && trackingDetails.checkpoints && trackingDetails.checkpoints[0].message.startsWith("Delivered"));

					if (isDelivered) {
						this.log("Package", trackingDetails.label, "has been delivered, will be removed.");
						if (box) box.destroy();
						return;
					}

					//Package is still in transit, create a box if it is a new one
					if (!box) {
						let boxTemplate = context.boxTemplate || this.getObjectByName(context.ObjectTemplateName);
						if (!boxTemplate) {
							this.warn("Couldn't find template to spawn new 3d object representing a package, using a simple box instead.");
							box = new THREE.Mesh(new THREE.BoxGeometry(0.25,0.25,0.25));
						} else {
							box = boxTemplate.clone();
						}
						box.position.set((Math.random() * 2 - 1)*context.radius, 0, (Math.random() * 2 - 1)*context.radius);
					}

					//Get distance between home address and current package location in meters
					let currentPackageLocation = trackingDetails.checkpoints && trackingDetails.checkpoints[0] && trackingDetails.checkpoints[0].location;
					let distance = currentPackageLocation ? await context.MapQuest.api.getDistanceBetweenPlaces(currentPackageLocation, context.HomeAddress) : 100*1000;

					//Place box closer to the ground the nearer its location is
					let roomHeight = HoloR.getRoom().getSize().y;
					let boxSize = 0.3;
					if (box.boundingBox) {
						boxSize = box.boundingBox.getSize(new THREE.Vector3()).y;
					}

					let heightAboveGround = Math.ext.mapClamp(Math.sqrt(distance / 1000), 0, 10, 0, roomHeight - boxSize);

					this.log(`Package ${trackingId} is in ${currentPackageLocation}, ${distance} meter away, will be placed at ${heightAboveGround}m above ground.`);
					if (context.floatingPackages) {
						box.floater = box.floater || await HoloRScript.fromModule('scripts:FloatAboveGround.script.js',{
							floatHeight: heightAboveGround
						});
						box.add(box.floater);
						if (box.floater.context) {
							box.floater.context.floatHeight = heightAboveGround;
						}
					} else {
						box.position.y = heightAboveGround;
					}

					box.visible = true;
					context.packageContainer.add(box, trackingDetails.label);
				});

				context.packageContainer.children.forEach(packageObject => {
					if (packageObject.userData.isObsolete) {
						packageObject.destroy();
					}
				});
			},
			receivedPackageUpdates: {
				after: {
					"1s": "updatePackages"
				}
			}
		}
	})
}