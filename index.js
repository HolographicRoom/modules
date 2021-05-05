export default function() {
	return ({
		name: "wiggle",
		context: {
			duration: 0.5, //wiggle duration in seconds
			intensity: 0.01, //max amount of displacement in meters
			speed: 5, //number of wiggles per seconds
			events: ['random.event.to.trigger.wiggle']
		},
		states: {
			wiggle: {
				entry: ({context,evt}) => {
					context.offset = new THREE.Vector3();
					context.wiggleStartedAt = Date.now();
				},
				update: ({context,parent}) => {
					//First restore original position
					parent.position.sub(context.offset);

					//Calculate relative time (0: start, 1: duration)
					let f = Math.min(1, (Date.now() - context.wiggleStartedAt) / (context.duration * 1000));

					if (f == 1) {
						return this.send("wiggle.finished");
					}

					//Apply sinus function to relative time so it maps from (0 -> intensity -> 0);
					let jiggleAmount = context.intensity * Math.sin(f * Math.PI);

					//Convert time in context.speed cycles per second
					let k = Date.now() / 1000 * Math.PI * 2 * context.speed;

					//Calculate offset in world space
					context.offset.set(
						Math.sin(k),
						Math.sin(k * 0.5), //slower jiggle in Y direction
						Math.cos(k)
					).multiplyScalar(jiggleAmount);

					//Convert offset to parent coordinate space
					//this has no effect if parents are neither scaled nor rotated
					if (parent.parent) parent.parent.worldToLocal(context.offset);

					parent.position.add(context.offset);
				},
				on: {
					"wiggle.finished": 'idle'
				}
			},
			idle: {
				on: {
					"$context.events": "wiggle"
				}
			}
		},
		initial: 'idle'
	})
}
