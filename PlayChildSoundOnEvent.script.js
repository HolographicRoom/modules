export default ({
	name: "PlayChildrenSoundsOnEvent",
	description: 'Upon receiving event, will start playing all HoloRAudioElement below this script',
	context: {
		event: "sound.playing.event",
		loop: false
	},
	states: {
		play: ({children, context}) => {
			children
			.filter(child => child.type == "HoloRAudioElement")
			.forEach(soundChild => {
				soundChild.play({
					loop: context.loop
				});
			});
		},
		idle: {}
	},
	on: {
		"$context.event": "play"
	},
	initial: 'idle'
})