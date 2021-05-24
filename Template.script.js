export default function ({_,HoloR,HoloRObject3D,HoloRPlugin,importModule}) {
	return ({
		name: 'Template',

		context: {},

		setup: ({context}) => {},
		destroy: ({context}) => {},

		api: {},

		initial: 'IDLE',
		states: {
			IDLE: {
				setup: async () => {},
				entry: async () => {},
				update: async () => {},
				exit: () => {},
				on: {}
			}
		},
		//Global transition that apply independent of current state
		on: {

		},
		after: {
			"1min": "IDLE"
		}
	})
}