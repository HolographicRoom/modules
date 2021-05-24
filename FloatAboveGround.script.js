export default function ({HoloR}) {
	return ({
		name: "floater",
		icon: '🧚',
		context: {
			rotationAmount: 0.03,
			floatSpeed: 0.001,
			floatHeightRange: 0.125,
			floatHeight: 0.0,

			heightAdjustmentSpeed: 0.05,
			tansitionDurationFloatToNonFloat: 2.0,

			floatOnStart: true,
			floatingEvent: "floatingEvent"
		},
		setup: ({
			context
		}) => {
			//Executed only once after the machine has started and as soon as the machine enters in any state
			context.offset = {
				f: 0,
				position: new THREE.Vector3(),
				rotation: new THREE.Vector3()
			}
		},
		destroy: ({
			context,
			oldParent
		}) => {
			//Executed if the machine has stopped and the setup function has been called before
			if (context.offset.position && context.offset.position.length() > 0) {
				if (!oldParent) return this.warn("Offset position could not be removed cause oldParent is already gone");

				oldParent.position.sub(context.offset.position);
			}

			if (context.offset.rotation && context.offset.rotation.length() > 0) {
				if (!oldParent) return this.warn("Offset rotation could not be removed cause oldParent is already gone");
				oldParent.rotation.setFromVector3(oldParent.rotation.toVector3().sub(context.offset.rotation));
			}
		},
		initial: "idle",
		on: {
			float: "floating",
			stopFloating: "nofloating",
			"$context.floatingEvent": "floating"
		},
		states: {
			idle: ({
				context,
				publish
			}) => {
				if (context.floatOnStart) {
					publish("float");
				} else {
					publish("stopFloating");
				}
			},
			nofloating: {
				entry: ({
					context,
					parent
				}) => {
					if (!parent) return;

					let originalPosition = parent.position.clone().sub(context.offset.position);
					let originalRotation = parent.rotation.clone().setFromVector3(parent.rotation.toVector3().sub(context.offset.rotation));

					context.offset.position.set(0, 0, 0);
					context.offset.rotation.set(0, 0, 0);

					parent.position.tween({
						duration: context.tansitionDurationFloatToNonFloat * 1000
					}).copy(originalPosition);
					parent.rotation.tween({
						duration: context.tansitionDurationFloatToNonFloat * 1000
					}).copy(originalRotation);
				},
			},
			floating: {
				entry: ({
					context
				}) => {
					context.offset.f = 0;
					new TWEEN.Tween(context.offset).to({
						f: 1.0
					}, 1000).start();
				},
				update: ({
					context,
					parent
				}) => {
					if (!parent) return;

					const f = Date.now() * context.floatSpeed + parent.random;
					//Floating has two components: Shift in A) position and B) rotation

					{
						//A: Position
						//Restore the position and rotation before floating takes effect
						parent.position.sub(context.offset.position);

						//In order to calculate the height above ground we need to know the world size of the object
						if (!parent.boundingBox || Date.now() - parent.boundingBox.createdAt > 1000) {
							parent.boundingBox = new THREE.Box3().setFromObject(parent);
							parent.boundingBox.createdAt = Date.now();
						}

						//Calculate distance between lower box around object and nearest point on the ground below
						let distanceBetweenBoxAndGround = 0; {
							let pos = parent.getWorldPosition(new THREE.Vector3());
							let distanceOriginToGround = HoloR.getRoom().castRayAgainstSurface(
								//Cast a ray down to the ground, starting at 1.5m above object origin
								pos.clone().multiply(new THREE.Vector3(1, 0, 1)).add(new THREE.Vector3(0, 1.5, 0)),
								new THREE.Vector3(0, -1, 0)
							)[0];

							if (distanceOriginToGround && _.isFinite(distanceOriginToGround)) {
								distanceBetweenBoxAndGround = distanceOriginToGround.point.y - parent.boundingBox.min.y;
							}
						}

						let targetDistanceToGround = distanceBetweenBoxAndGround + context.floatHeight;
						this.targetDistanceToGroundSmooth = (1 - context.heightAdjustmentSpeed) * (this.targetDistanceToGroundSmooth || 0) + context.heightAdjustmentSpeed * targetDistanceToGround;

						//Simulate float by changing position periodically
						context.offset.position.set(
							Math.sin(f) * 0.02,
							this.targetDistanceToGroundSmooth + (Math.sin(f) * 0.5 + 0.5) * context.floatHeightRange,
							Math.cos(f) * 0.02
						).multiplyScalar(context.offset.f);


						if (isNaN(context.offset.position.length())) {
							this.warn("UUPS");
							context.offset.position.set(0, 0, 0);
						}

						if (parent.parent) {
							let m = parent.parent.matrixWorld.clone();
							m.setPosition(0, 0, 0);
							let before = context.offset.position.clone();
							context.offset.position.applyMatrix4(m);

							if (!isNaN(before.length()) && isNaN(context.offset.position.length())) {
								this.error("Matrix causes NaN entries in position fofset");
								debugger;
								context.offset.position.set(0, 0, 0);
							}
						}

						parent.position.add(context.offset.position);
					}

					{
						//B: Rotation
						parent.rotation.setFromVector3(parent.rotation.toVector3().sub(context.offset.rotation));

						context.offset.rotation.set(
							Math.cos(f * 2),
							Math.sin(f * 1.5),
							Math.sin(f * 2.5)
						).multiplyScalar(context.rotationAmount * context.offset.f);

						parent.rotation.setFromVector3(context.offset.rotation);

					}
				}
			}
		}
	})
}