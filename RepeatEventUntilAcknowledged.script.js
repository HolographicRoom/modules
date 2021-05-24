export default  ({
	name: "repeatevent",
	context: {
		repeatEvery: "1s",
		acknowledgeEvent: "event.to.acknowledge",
		events: ['event.to.be.repeated']
	},
	states: {
		handleNewEvent: ({context, evt}) => {
			if (evt.details.dontRepeat) return;
			context.activeEvents.push(evt);
		},
		repeat: ({context,parent}) => {
			context.activeEvents = context.activeEvents || [];
			context.activeEvents.forEach(evt => {
				parent.publish(evt.details.topic,evt.details.value,{dontRepeat:true, source:evt.details.source})
			});
		},
		acknowledge: ({context}) => {
			context.activeEvents = [];
		}
	},
	initial: 'repeat',
	on: {
		"$context.acknowledgeEvent": "acknowledge",
		"$context.events": "handleNewEvent"
	},
	after: {
		"$context.repeatEvery": 'repeat'
	}
})