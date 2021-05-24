export default function ({HoloR, setInterval}) {
	return ({
		name: 'ActivateOnlyWhenViewerIsNear',
		description: 'Will deactivate the parent HoloRScript if the distance to the viewer is > farDistance and activate once < nearDistance. Will also deactive parent autostart.',
		context: {
			farDistance: 5,
			nearDistance: 3,
			updateInterval: "30s"
		},

		setup: ({context,self}) => {
			let distanceCheck = () => {
				const viewer = HoloR.getViewer();
				if (!viewer) return;
				const distance = viewer.distanceTo(self.getWorldPosition(new THREE.Vector3()));
				console.log(distance);
				if (distance > context.farDistance) {
					self.publish("far");
				}

				if (distance < context.nearDistance) {
					self.publish("near");
				}
			};

			distanceCheck();
			setInterval(distanceCheck, context.updateInterval);
		},

		initial: 'unknown',
		states: {
			unknown: {},
			near: {
				entry: () => {
					if (!parent || parent.type !== "HoloRScript") return;
					parent.start();
				},
				on: {
					far: 'far'
				}
			},
			far: {
				entry: ({parent}) => {
					if (!parent || parent.type !== "HoloRScript") return;
					parent.options.autostart = false;
					parent.stop();
				},
				on: {
					near: 'near'
				}
			}
		}
	})
}