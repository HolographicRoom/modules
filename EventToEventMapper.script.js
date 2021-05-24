export default function() {
	return ({
		name: "EventToEventMapper",
		context: {
			publishGlobal: false,
			transform: {
				/*
				"random.inputevent" : "random.outputevent",
				"other.inputevent": {
					if: (value) => {
						return value > 10
					},
					then :"output.event.value.over.10",
					else: "output.event.value.underequal.10"
				}
				*/
			}
		},

		setup: ({self,context}) => {
			let options = {
				global: context.publishGlobal
			};

			Object.entries(context.transform).forEach(([evtName, output]) => {
				self.subscribe(evtName, async (value, details) => {
					if (_.isString(output)) {
						return self.publish(evtName, value,options);
					}

					if (_.isObject(output)) {
						let filter = _.isFunction(output.if) && output.if;
						let thenTopic = _.isString(output.then) && output.then;

						if (filter && thenTopic) {
							let res = await filter(value,details);
							if (res) {
								self.publish(thenTopic,res,options);
							} else {
								let elseTopic = _.isString(output.else) && output.else;
								if (elseTopic) {
									self.publish(elseTopic,res,options);
								} else {
									//No else topic declared, ignore
								}
							}
						} else {
							debugger;
							self.error("Invalid description of context.transform, need if/then")
						}
					}
				});
			});
		},

		initial: 'idle',
		states: {idle:{}}
	})
}