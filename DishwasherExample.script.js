export default function ({
	_,
	HoloR,
	HoloRObject3D,
	importModule
}) {
	return ({
		name: 'DishWasherExample',

		/********************************************************
		 * Context can be accessed from every function
		 * and is useful for specifiy configuration parameters
		 * or options
		 * Changes in context do not persist across restarts
		 * Use storage for persistent storage
		 ******************************************************/
		context: {
			repairDuration: "10s", //repair duration either as int (milliseconds) or string (10min, 2 days, 5 hours, ...)
			modelNumber: "ACME1337",
			repairEvent: ['got.mechanic', 'prayers'],
			secret_api_key: "$REPLACE_OR_ILL_ASK_FOR_IT" //Will trigger a prompt to enter value and will be stored on the server side
		},

		/***********************************************************
		 * Setup is used to prepare requirements for the execution
		 * of this script, e.g. loading additional modules or
		 * instantiating/preloading elements
		 *
		 * Destroy is used to clean up effects caused by .setup()
		 ******************************************************/
		setup: ({context}) => {
			this.log('.setup() will only be executed once');

			this.log("Press x to toggle dishwasher on/off.");
			HoloR.onKeyDown("x", (evt) => {
				this.send("button.press", evt)
			}, this);

			this.log("Press k to kick the machine");
			HoloR.onKeyDown("k", (evt) => {
				this.send("kick.machine", evt)
			}, this);


			//Create some heavy object that we need to destroy
			//once this machine is destroyed
			context.newExpensiveObject = new HoloRObject3D();
		},
		destroy: ({context}) => {
			this.log('.destroy() will only be execute once and is used to clean up after .setup()')
			context.newExpensiveObject.destroy();
		},

		/**********************************************
		 * api is used for helper functions that are
		 * often called from within the states or from
		 * outside this machine
		 * they are also available outside of this script
		 * as remote procedure call via
		 * CALLINGOBJECT.remote([NAME_OF_THIS_SCRIPT].api.[METHODNAME])
		 * e.g.:
		 * let getTemperature = await someObject.remote("DishWasherExample.api.getTemperature", timeout = 10000);
		 * let temperature = getTemperature();
		 ********************************************/
		 api: {
			getTemperature: () => {
				//Simulate temperature reading
				return Math.sin(Date.now()*0.01)*5 + 46;
			},
			getLocation: async () => {
				//Get a module from npm that wraps the browser geolocation in a promise to showcase
				//how to load modules, these are cached so it is fine to not preload them in
				//a setup routine but instead import them whenever needed
				const {getCurrentPositionPromise} = await importModule("npm:geolocation-promise");
				let location = await getCurrentPositionPromise({
					enableHighAccuracy: false,
					timeout: 5000,
					maximumAge: 10000
				});
				return location.coords;
			}
		},


		/**********************************************
		 * State declaration
		 **********************************************/
		initial: 'POWEROFF',
		states: {
			POWERON: {
				//.entry() is called whenever the state is entered
				entry: async ({storage,evt}) => {
					this.log('POWERON: POWERON.entry() caused by', evt)

					//storage is persistent within the browser
					//and lives until Application Storage in the browser is
					//cleared

					storage.counter = storage.counter || 0;
					storage.counter++;

					this.log(`POWERON: This machine has been powered on ${storage.counter} times`);
				},

				//.update() is called on every frame while this state is active
				update: ({api,send}) => {
					let temperature = api.getTemperature();
					this.log("Machine temperature",temperature);
					send("machine.temperature",temperature);
				},

				//.exit() is called whenever the state is left for another state
				exit: () => {
					this.log('POWERON: POWERON.exit() ')
				},

				//.on specifies eventNames and their target states
				on: {
					'button.press': 'POWERON',
					"machine.temperature": {
						if: (value) => value > 50,
						then: "OVERHEATED"
					}
				}
			},
			POWEROFF: {
				entry: () => {
					this.log('POWEROFF: .entry(): DishWasher is turned off.')
				},
				exit: () => {
					this.log('POWEROFF: .exit() ')
				},
				on: {
					'button.press': 'POWERON'
				}
			},
			OVERHEATED: {
				setup: ({context}) => {
					this.log("OVERHEATED: Did you know you can press r to repair me, in case it ever got broken?");
					HoloR.onKeyDown("r", (evt) => {
						let repairEvent = _.sample(context.repairEvent);
						this.send(repairEvent)
					}, this);
				},
				entry: async ({context,api}) => {
					this.log(`OVERHEATED: Machine ${context.modelNumber} is out of order because of overheating`);
					let position = await api.getLocation();
					this.log("Please send maintenance to", position);
				},
				on: {
					'$context.repairEvent': 'REPAIRED'
				}
			},
			REPAIRED: {
				entry: () => {
					this.log("REPAIRED: I am repaired.")
				},
				on: {
					//empty string will trigger immediate transition to POWEROFF without waiting for
					//other events
					"": "POWEROFF"
				}
			},
			WOBBLE: {
				update: () => {
					this.log("WOBBLE: Machine is wobbling....");
				},
				//Use after to schedule automatic transtion after a timeout of 500ms
				//and $return to return to whatever the previous state was
				after: {
					"500ms": "$return"
				}
			}
		},
		//Global transition that apply independent of current state
		on: {
			'kick.machine': 'WOBBLE'
		}
	})
}