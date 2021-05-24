export default function ({HoloR, setInterval}) {
	return ({
		name: 'ActivateOnlyWhenViewerIsNear',
		description: 'Will deactivate the parent HoloRScript if the distance to the viewer is > farDistance and activate once < nearDistance. Will also deactive parent autostart.',
		context: {
			farDistance: 5,
			nearDistance: 3,
			updateInterval: "5s"
		},
		initial: 'unknown',
		states: {
			unknown: {
				setup: ({context,self}) => {
					if (parent && parent.type === "HoloRScript") {
						parent.options.autostart = false;
						parent.stop();
					}

					let distanceCheck = () => {
						const viewer = HoloR.getViewer();
						if (!viewer) return;
						const distance = viewer.distanceTo(self.getWorldPosition(new THREE.Vector3()));
						if (distance > context.farDistance) {
							self.send("far");
						}

						if (distance < context.nearDistance) {
							self.send("near");
						}
						setTimeout(distanceCheck, context.updateInterval);
					};
					distanceCheck();
				},
				on : {
					far:'far',
					near:'near'
				}
			},
			near: {
				entry: ({parent}) => {
					parent && parent.type === "HoloRScript" && parent.start();
				},
				on: {
					far: 'far'
				}
			},
			far: {
				entry: ({parent}) => {
					parent && parent.type === "HoloRScript" && parent.stop();
				},
				on: {
					near: 'near'
				}
			}
		}
	})
}