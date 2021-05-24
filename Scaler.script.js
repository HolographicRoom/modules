export default ({
	name: "Scaler",
	context: {
		duration: "1s",
		event: false,
		scale: 0.0001
	},
	states: {
		idle: ({parent,context}) => {
			//When no event is specified, scale immediately
			if (!context.event) {
				parent.scale.tween({duration:context.duration}).set(1,1,1).multiplyScalar(context.scale);
			}
		},
		scaled: {
			entry: ({parent, context}) => {
				context.priorScale = parent.scale.clone();
				parent.scale.tween({duration: context.duration}).set(1,1,1).multiplyScalar(context.scale);
			},
			exit: ({parent, context}) => {
				parent.scale.tween({duration: "0.5s"}).copy(context.priorScale);
			}
		}
	},
	initial: 'idle',
	on: {
		"$context.event": "scaled"
	}
})