export default function ({HoloR}) {
	return ({
		name: "HoloRMailService",
		description: "Will check for new mails at HoloRMailService+YOURSERVERKEY@gmail.com",
		context: {
			interval: "15 min",
			filter: 'is:unread',
			mapMessageToEvent: (message) => {
				if (message.subject.toLowerCase().match(/important|urgent/)) return "email.new.important";
				return "email.new"
			}
		},
		setup: async ({context}) => {
			const WebHookPlugin = await HoloRPlugin.load("plugins/WebHookDNSPlugin");
			context.webhook = new WebHookPlugin();
		},
		states: {
			checkEmails: {
				entry: async ({context}) => {
					this.log("Looking for new email messages.");
					let messages = [];
					try {
						messages = await context.webhook.request(`/queryGmail/${context.filter}`);
					} catch (e) {
						this.error("Error while query gmail:", e)
						return;
					}

					this.log("Got new Messages", messages.map(msg => msg.subject).join("\n"));
					messages.forEach(message => {
						let evt;
						if (context.mapMessageToEvent) {
							evt = context.mapMessageToEvent(message);
						}
						evt = evt || "email.new";
						this.publish(evt, message);
					});
				},
				after: {
					"$context.interval": "checkEmails"
				}
			}
		}
	})
}