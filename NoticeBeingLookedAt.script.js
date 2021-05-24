export default function({HoloR}) {
	return ({
		name: "LookingAt",
		context: {
			updateInterval: "250ms",
			relativeFocus: 3 //in order for lookat to be triggered, ray must be withing relativeFocus*boundingSphereRadius
		},
		setup: ({context}) => {
			context.lookAtMaxRelAngle = context.relativeFocus;
			context.lookAwayMinRelAngle = context.relativeFocus*1.25;
		},
		initial : "waitingForLookingAt",
		states: {
			waitingForLookingAt: {
				entry: ({context}) => {
					let angle = HoloR.getViewer().getRelativeAngleTo(this.parent);
					if (angle <= context.lookAtMaxRelAngle) {
						this.send("lookingAt");
					}
				},
				on: {
					lookingAt: "lookingAt"
				},
				after: {
					"$context.updateInterval": "waitingForLookingAt"
				}
			},
			lookingAt: {
				entry: () => {
					HoloR.getViewer().publish("viewer.lookat",null,{targetBelow:this.parent});
				},
				after: {
					"100ms": "waitingForLookAway"
				}
			},
			waitingForLookAway: {
				entry: ({context}) => {
					let angle = HoloR.getViewer().getRelativeAngleTo(this.parent);
					if (angle >= context.lookAwayMinRelAngle) {
						this.send("lookingAway");
					}
				},
				on: {
					"lookingAway": "lookingAway"
				},
				after: {
					"$context.updateInterval": "waitingForLookAway"
				}
			},
			lookingAway: {
				entry: () => {
					HoloR.getViewer().publish("viewer.lookaway",{targetBelow:this.parent});
				},
				after: {
					"100ms": 'waitingForLookingAt'
				}
			}
		}
	})
}