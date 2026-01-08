class Racer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000); // Aspect ratio 1, will be updated by canvas size
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("gameCanvas"),
      antialias: true,
    });

    this.setupRenderer();
    this.setupLighting();
    this.setupFog();
    this.setupControls();

    this.car = null;
    this.geomorphTemplates = {}; // Initialize as object
    this.consecutiveCurves = 0;
    this.lastTurnDirection = null;
    this.activeGeomorphs = [];
    this.carPosition = new THREE.Vector3(-6, 1, 10); // Initial car position Z adjusted for better start
    this.startZ = this.carPosition.z;
    this.carRotation = 0;
    this.carVelocity = new THREE.Vector3();
    this.carSpeed = 0;
    this.wheelSpeed = 0;
    this.maxSpeed = 120;
    this.leftLight = null;
    this.rightLight = null;

    // Devil car properties
    this.devilCar = null;
    this.devilPosition = this.carPosition.clone().add(new THREE.Vector3(0, 0, -50));
    this.devilRotation = 0;
    this.devilVelocity = new THREE.Vector3();
    this.devilSpeed = 0;
    this.devilMaxSpeed = 120;
    this.devilActive = false;
    this.devilAggression = 0.7; // How aggressive the devil is (0-1)

    // Collision detection
    this.collisionBoxes = []; // For trees and obstacles
    this.playerBoundingBox = new THREE.Box3();
    this.devilBoundingBox = new THREE.Box3();

    // Combat system
    this.lastCollisionTime = 0;
    this.collisionCooldown = 500; // ms between collision damage

    // Track progress for devil activation
    this.passedGeomorphs = 0;
    this.cameraOffset = new THREE.Vector3(0, 8, -5);
    this.cameraTarget = new THREE.Vector3();

    this.input = {
      gas: false,
      brake: false,
      steering: 0,
    };

    this.createGeomorphTemplates();
    this.createCar();
    this.initializeTrack();
    this.animate();
  }

  setupRenderer() {
    const canvas = document.getElementById("gameCanvas");
    const size = Math.min(window.innerWidth, window.innerHeight);
    this.renderer.setSize(size, size);
    this.camera.aspect = 1; // Canvas is square
    this.camera.updateProjectionMatrix();
    this.renderer.setClearColor(0x000000);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x555577, 0.2); // Cool moody fill
    this.scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0xff6666, 0.5);
    moonLight.position.set(30, 100, 30);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    this.scene.add(moonLight);
  }

  setupFog() {
    this.scene.fog = new THREE.Fog(0x110022, 40, 150);
    //this.scene.fog = new THREE.Fog(0x9370db, 50, 250); // Adjusted far distance slightly
    //this.scene.fog = new THREE.Fog(0x1a1a2e, 30, 120);
    //this.scene.fog = new THREE.Fog(0x110022, 30, 120); // Darker purple for contrast
  }

  setupControls() {
    this.joystick = nipplejs.create({
      zone: document.getElementById("joystickContainer"),
      mode: "static",
      position: { left: "50%", top: "50%" },
      color: "#00ffff",
      size: 100,
    });

    this.joystick.on("move", (evt, data) => {
      if (data.vector) {
        this.input.steering = data.vector.x;
      }
    });

    this.joystick.on("end", () => {
      this.input.steering = 0;
    });

    const gasButton = document.getElementById("gasButton");
    const brakeButton = document.getElementById("brakeButton");

    const handleTouchStart = (button, inputKey) => (e) => {
      e.preventDefault();
      this.input[inputKey] = true;
      button.classList.add("active");
    };
    const handleTouchEnd = (button, inputKey) => (e) => {
      e.preventDefault();
      this.input[inputKey] = false;
      button.classList.remove("active");
    };

    gasButton.addEventListener(
      "touchstart",
      handleTouchStart(gasButton, "gas")
    );
    gasButton.addEventListener(
      "touchend",
      handleTouchEnd(gasButton, "gas")
    );
    gasButton.addEventListener(
      "mousedown",
      handleTouchStart(gasButton, "gas")
    ); // For desktop testing
    gasButton.addEventListener(
      "mouseup",
      handleTouchEnd(gasButton, "gas")
    ); // For desktop testing

    brakeButton.addEventListener(
      "touchstart",
      handleTouchStart(brakeButton, "brake")
    );
    brakeButton.addEventListener(
      "touchend",
      handleTouchEnd(brakeButton, "brake")
    );
    brakeButton.addEventListener(
      "mousedown",
      handleTouchStart(brakeButton, "brake")
    ); // For desktop testing
    brakeButton.addEventListener(
      "mouseup",
      handleTouchEnd(brakeButton, "brake")
    ); // For desktop testing

    document.addEventListener("keydown", (e) => {
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          this.input.gas = true;
          gasButton.classList.add("active");
          break;
        case "ArrowDown":
        case "KeyS":
          this.input.brake = true;
          brakeButton.classList.add("active");
          break;
        case "ArrowLeft":
        case "KeyA":
          this.input.steering = -1;
          break;
        case "ArrowRight":
        case "KeyD":
          this.input.steering = 1;
          break;
      }
    });

    document.addEventListener("keyup", (e) => {
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          this.input.gas = false;
          gasButton.classList.remove("active");
          break;
        case "ArrowDown":
        case "KeyS":
          this.input.brake = false;
          brakeButton.classList.remove("active");
          break;
        case "ArrowLeft":
        case "KeyA":
        case "ArrowRight":
        case "KeyD":
          this.input.steering = 0;
          break;
      }
    });
  }

  createGeomorphTemplates() {
    this.geomorphTemplates = {
      straight: this.createStraightGeomorph(),
      leftTurn: this.createLeftTurnGeomorph(),
      rightTurn: this.createRightTurnGeomorph(),
    };
  }

  createStraightGeomorph() {
    const group = new THREE.Group();
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f2f2f,
    }); // Very dark gray

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);

    const roadGeometry = new THREE.PlaneGeometry(24, 100); // Width 24, Length 100
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x9099b0,
    }); // Dried blood asphalt
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01; // Slightly above ground
    road.receiveShadow = true;
    group.add(road);

    return {
      group,
      entrance: {
        position: new THREE.Vector3(0, 0, -50),
        direction: new THREE.Vector3(0, 0, 1),
      },
      exit: {
        position: new THREE.Vector3(0, 0, 50),
        direction: new THREE.Vector3(0, 0, 1),
      },
    };
  }

  createLeftTurnGeomorph() {
    const group = new THREE.Group();
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f2f2f,
    }); // Very dark gray
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);

    const segments = 16;
    const radius = 50; // Corrected radius
    const roadWidth = 24;
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x9099b0,
    });

    // Curve Center: (-radius, 0, -radius) = (-50, 0, -50) to achieve path from (0,0,-50) to (-50,0,0)
    // Path: x(t) = -radius + radius * cos(t), z(t) = -radius + radius * sin(t) for t in [0, PI/2]
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * (Math.PI / 2);
      const angle2 = ((i + 1) / segments) * (Math.PI / 2);

      const x1 = -radius + radius * Math.cos(angle1);
      const z1 = -radius + radius * Math.sin(angle1);
      const x2 = -radius + radius * Math.cos(angle2);
      const z2 = -radius + radius * Math.sin(angle2);

      const segmentLength =
        1.5 * Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
      const roadSegmentGeo = new THREE.PlaneGeometry(
        roadWidth,
        segmentLength
      );
      const roadSegment = new THREE.Mesh(roadSegmentGeo, roadMaterial);

      roadSegment.position.set((x1 + x2) / 2, 0.01, (z1 + z2) / 2);
      roadSegment.rotation.order = "YXZ"; // Set Euler angle order
      roadSegment.rotation.x = -Math.PI / 2;
      roadSegment.rotation.y = Math.atan2(x2 - x1, z2 - z1); // atan2(dx, dz) for Y rotation
      roadSegment.receiveShadow = true;
      group.add(roadSegment);
    }

    return {
      group,
      entrance: {
        position: new THREE.Vector3(0, 0, -50),
        direction: new THREE.Vector3(0, 0, 1),
      },
      exit: {
        position: new THREE.Vector3(-50, 0, 0),
        direction: new THREE.Vector3(-1, 0, 0),
      },
    };
  }

  createRightTurnGeomorph() {
    const group = new THREE.Group();
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f2f2f,
    }); // Very dark gray
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);

    const segments = 16;
    const radius = 50; // Corrected radius
    const roadWidth = 24;
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x9099b0,
    }); // Dried blood asphalt

    // Curve Center: (radius, 0, -radius) = (50, 0, -50)
    // Path: x(t) = radius - radius * cos(t), z(t) = -radius + radius * sin(t) for t in [0, PI/2]
    // (Starts at (0,-50), ends at (50,0) relative to geomorph origin (0,0,0))
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * (Math.PI / 2);
      const angle2 = ((i + 1) / segments) * (Math.PI / 2);

      const x1 = radius - radius * Math.cos(angle1);
      const z1 = -radius + radius * Math.sin(angle1);
      const x2 = radius - radius * Math.cos(angle2);
      const z2 = -radius + radius * Math.sin(angle2);

      const segmentLength =
        1.5 * Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
      const roadSegmentGeo = new THREE.PlaneGeometry(
        roadWidth,
        segmentLength
      );
      const roadSegment = new THREE.Mesh(roadSegmentGeo, roadMaterial);

      roadSegment.position.set((x1 + x2) / 2, 0.01, (z1 + z2) / 2);
      roadSegment.rotation.order = "YXZ"; // Set Euler angle order
      roadSegment.rotation.x = -Math.PI / 2;
      roadSegment.rotation.y = Math.atan2(x2 - x1, z2 - z1);
      roadSegment.receiveShadow = true;
      group.add(roadSegment);
    }

    return {
      group,
      entrance: {
        position: new THREE.Vector3(0, 0, -50),
        direction: new THREE.Vector3(0, 0, 1),
      },
      exit: {
        position: new THREE.Vector3(50, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
      },
    };
  }

  createCar() {
    this.car = new THREE.Group();
    const bodyGeometry = new THREE.BoxGeometry(2, 1.2, 2.5); // Smaller body
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
    }); // Jet black
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    this.car.add(body);

    const frontWheelGeometry = new THREE.CylinderGeometry(
      0.4,
      0.4,
      0.3,
      16
    );
    const rearWheelGeometry = new THREE.CylinderGeometry(
      0.7,
      0.7,
      0.5,
      16
    );

    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
    });
    const wheelPositions = [
      { pos: [-1.2, 0.4, 1.5], geometry: frontWheelGeometry },
      { pos: [1.2, 0.4, 1.5], geometry: frontWheelGeometry },
      { pos: [-1.2, 0.4, -2.5], geometry: rearWheelGeometry },
      { pos: [1.2, 0.4, -2.5], geometry: rearWheelGeometry },
    ];
    wheelPositions.forEach(({ pos, geometry }) => {
      const wheel = new THREE.Mesh(geometry, wheelMaterial);
      wheel.position.set(...pos);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      this.car.add(wheel);
    });

    // --- HEADLIGHTS --- //
    this.leftLight = new THREE.SpotLight(
      0x99ccff,
      60,
      100,
      Math.PI / 3,
      0.3,
      1
    );
    this.leftLight.position.set(-0.7, 0.75, 4.25);
    this.leftLight.castShadow = true;
    this.leftLight.shadow.mapSize.width = 1024;
    this.leftLight.shadow.mapSize.height = 1024;
    this.leftLight.shadow.camera.near = 0.5;
    this.leftLight.shadow.camera.far = 100;

    this.rightLight = new THREE.SpotLight(
      0x99ccff,
      60,
      100,
      Math.PI / 3,
      0.3,
      1
    );
    this.rightLight.position.set(0.7, 0.75, 4.25);
    this.rightLight.castShadow = true;
    this.rightLight.shadow.mapSize.width = 1024;
    this.rightLight.shadow.mapSize.height = 1024;
    this.rightLight.shadow.camera.near = 0.5;
    this.rightLight.shadow.camera.far = 100;

    // Create targets and add them to the car group
    this.leftLight.target.position.set(-0.3, 1, 15);
    this.rightLight.target.position.set(0.3, 1, 15);

    this.car.add(this.leftLight);
    this.car.add(this.leftLight.target);
    this.car.add(this.rightLight);
    this.car.add(this.rightLight.target);

    // Store references for steering adjustments
    // The Y=0 here means the lights aim towards the car's base plane in the distance.
    this.leftLightBaseTarget = new THREE.Vector3(-0.3, 0, 15);
    this.rightLightBaseTarget = new THREE.Vector3(0.3, 0, 15);

    this.car.position.copy(this.carPosition);
    this.scene.add(this.car);
  }

  createDevilCar() {
    this.devilCar = new THREE.Group();

    // Devil car body - menacing red/black
    const bodyGeometry = new THREE.BoxGeometry(2.2, 1.4, 2.8); // Slightly larger
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x660000, // Dark red
      metalness: 0.8,
      roughness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    this.devilCar.add(body);

    // Devil spikes/details
    const spikeGeometry = new THREE.ConeGeometry(0.2, 1, 6);
    const spikeMaterial = new THREE.MeshStandardMaterial({
      color: 0x330000,
    });

    // Add spikes on hood
    for (let i = 0; i < 3; i++) {
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
      spike.position.set((i - 1) * 0.6, 1.3, 1);
      spike.castShadow = true;
      this.devilCar.add(spike);
    }

    // Wheels - larger and more aggressive
    const frontWheelGeometry = new THREE.CylinderGeometry(
      0.45,
      0.45,
      0.35,
      16
    );
    const rearWheelGeometry = new THREE.CylinderGeometry(
      0.75,
      0.75,
      0.55,
      16
    );
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
    });

    const wheelPositions = [
      { pos: [-1.3, 0.45, 1.6], geometry: frontWheelGeometry },
      { pos: [1.3, 0.45, 1.6], geometry: frontWheelGeometry },
      { pos: [-1.3, 0.45, -2.7], geometry: rearWheelGeometry },
      { pos: [1.3, 0.45, -2.7], geometry: rearWheelGeometry },
    ];

    wheelPositions.forEach(({ pos, geometry }) => {
      const wheel = new THREE.Mesh(geometry, wheelMaterial);
      wheel.position.set(...pos);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      this.devilCar.add(wheel);
    });

    // Devil headlights - eerie red glow
    const leftLight = new THREE.SpotLight(
      0xff3333,
      40,
      80,
      Math.PI / 4,
      0.4,
      1
    );
    leftLight.position.set(-0.7, 0.75, 4.5);
    leftLight.castShadow = true;
    const rightLight = leftLight.clone();
    rightLight.position.set(0.7, 0.75, 4.5);

    leftLight.target.position.set(-0.3, 0, 15);
    rightLight.target.position.set(0.3, 0, 15);

    this.devilCar.add(leftLight);
    this.devilCar.add(leftLight.target);
    this.devilCar.add(rightLight);
    this.devilCar.add(rightLight.target);

    this.devilCar.position.copy(this.devilPosition);
    this.scene.add(this.devilCar);
  }

  initializeTrack() {
    // Initial transform: position at origin, looking along +Z
    const currentTransform = {
      position: new THREE.Vector3(0, 0, 0),
      direction: new THREE.Vector3(0, 0, 1),
    };

    for (let i = 0; i < 2; i++) {
      // Start with 3 straight geomorphs
      this.addGeomorph("straight", currentTransform);
    }
    for (let i = 0; i < 6; i++) {
      // Add 4 more random ones
      const availableTypes = this.getAvailableGeomorphTypes();
      const randomType =
        availableTypes[Math.floor(Math.random() * availableTypes.length)];
      this.addGeomorph(randomType, currentTransform);
    }
  }

  getAvailableGeomorphTypes() {
    const allTypes = ["straight", "leftTurn", "rightTurn"];

    // If we've had 2 consecutive curves, only allow straight
    if (this.consecutiveCurves >= 2) {
      return ["straight"];
    }

    // If the last geomorph was a turn, don't allow the same turn direction
    if (this.lastTurnDirection === "left") {
      return ["straight", "rightTurn"];
    } else if (this.lastTurnDirection === "right") {
      return ["straight", "leftTurn"];
    }

    return allTypes;
  }

  addGeomorph(type, currentTransform) {
    const template = this.geomorphTemplates[type];
    const instance = {
      group: template.group.clone(), // Clone the group of meshes
      // These will store WORLD positions and directions after placement
      entrance: {
        position: new THREE.Vector3(),
        direction: new THREE.Vector3(),
      },
      exit: {
        position: new THREE.Vector3(),
        direction: new THREE.Vector3(),
      },
      type: type,
    };

    // 1. Calculate the rotation angle for the new geomorph.
    // All templates have their entrance facing their local +Z (0,0,1).
    // We want to rotate the geomorph so this local +Z aligns with currentTransform.direction.
    const targetDirection = currentTransform.direction;
    const angle = Math.atan2(targetDirection.x, targetDirection.z); // Angle for Y rotation

    // 2. Get the local entrance position from the template.
    const localEntrancePosition = template.entrance.position.clone(); // e.g., (0,0,-50)

    // 3. Determine where this local entrance point would be, relative to the geomorph's origin, AFTER rotation.
    const rotatedLocalEntranceVector = localEntrancePosition
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

    // 4. Calculate the world position for the geomorph's origin (group.position).
    // The geomorph's origin (G_pos) must be such that: G_pos + rotatedLocalEntranceVector = currentTransform.position
    const groupOrigin = currentTransform.position
      .clone()
      .sub(rotatedLocalEntranceVector);

    // 5. Set the geomorph's group position and rotation.
    instance.group.position.copy(groupOrigin);
    instance.group.rotation.y = angle;

    // 6. Set the world entrance properties for the instance.
    instance.entrance.position.copy(currentTransform.position); // By definition, it's aligned.
    instance.entrance.direction.copy(targetDirection);

    // 7. Calculate the world exit position and direction for the instance.
    const localExitPosition = template.exit.position.clone();
    const worldExitPosition = groupOrigin
      .clone()
      .add(
        localExitPosition.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          angle
        )
      );
    instance.exit.position.copy(worldExitPosition);

    const localExitDirection = template.exit.direction.clone();
    const worldExitDirection = localExitDirection.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      angle
    );
    instance.exit.direction.copy(worldExitDirection);

    this.scene.add(instance.group);
    this.addRandomScenery(instance.group, type);
    this.activeGeomorphs.push(instance);

    // Track consecutive curves
    if (type === "leftTurn" || type === "rightTurn") {
      this.consecutiveCurves++;
      this.lastTurnDirection = type === "leftTurn" ? "left" : "right"; // Add this line
    } else {
      this.consecutiveCurves = 0; // Reset counter when placing straight
      this.lastTurnDirection = null;
    }

    // Update currentTransform for the next geomorph to connect to this one's exit.
    currentTransform.position.copy(instance.exit.position);
    currentTransform.direction.copy(instance.exit.direction);
  }

  addRandomScenery(group, type) {
    const treeCount = 8;
    const roadWidth = 24;
    const roadHalfWidth = roadWidth / 2;
    const treeTrunkRadius = 0.6;
    const minimumGapFromRoadEdge = 7;
    const additionalRandomSpread = 15;

    const trunkGeo = new THREE.CylinderGeometry(
      treeTrunkRadius,
      treeTrunkRadius,
      6,
      8
    );
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const leavesGeo = new THREE.SphereGeometry(3.0, 16, 16);
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });

    for (let i = 0; i < treeCount; i++) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 3;
      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.y = 6.5;
      tree.add(trunk);
      tree.add(leaves);

      let treePosition;

      if (type === "leftTurn" || type === "rightTurn") {
        const curveRadius = 50;
        const angleOnCurve = Math.random() * (Math.PI / 2);
        const centerX = type === "leftTurn" ? -curveRadius : curveRadius;
        const centerZ = -curveRadius;

        let placementRadius;
        if (Math.random() > 0.4) {
          placementRadius =
            curveRadius +
            roadHalfWidth +
            minimumGapFromRoadEdge +
            Math.random() * additionalRandomSpread;
        } else {
          const maxInnerOffset =
            curveRadius - roadHalfWidth - minimumGapFromRoadEdge;
          placementRadius = Math.random() * (maxInnerOffset - 5) + 5;
          placementRadius = Math.max(
            5,
            Math.min(placementRadius, maxInnerOffset)
          );
        }

        const x = centerX + placementRadius * Math.cos(angleOnCurve);
        const z = centerZ + placementRadius * Math.sin(angleOnCurve);
        treePosition = new THREE.Vector3(x, 0, z);
      } else {
        const side = Math.random() > 0.5 ? 1 : -1;
        const xOffset =
          side *
          (roadHalfWidth +
            minimumGapFromRoadEdge +
            Math.random() * additionalRandomSpread);
        const zOffset = (Math.random() - 0.5) * 90;
        treePosition = new THREE.Vector3(xOffset, 0, zOffset);
      }

      tree.position.copy(treePosition);
      group.add(tree);

      // Create collision box for tree (using trunk radius + some padding)
      const worldPosition = treePosition.clone();
      // Transform to world coordinates based on group's transform
      worldPosition.applyMatrix4(group.matrixWorld);

      const collisionBox = {
        position: worldPosition,
        radius: treeTrunkRadius + 1.5, // Trunk + padding
        geomorphGroup: group, // Reference to remove when geomorph is disposed
      };
      this.collisionBoxes.push(collisionBox);
    }
  }

  calculateSteeringPhysics(deltaTime) {
    if (this.carSpeed < 0.5) return 0;

    const steerInput = this.input.steering;
    if (Math.abs(steerInput) < 0.01) return 0;

    // Vehicle characteristics
    const frontGrip = 1.0;
    const rearGrip = 0.85; // Slightly less rear grip for realistic handling
    const wheelbase = 2.5; // Distance between front and rear axles

    // Calculate load transfer
    const acceleration =
      (this.carSpeed - (this.previousSpeed || 0)) / deltaTime;
    this.previousSpeed = this.carSpeed;

    const loadTransfer = acceleration / 50; // Normalize
    const frontLoad = 1 - loadTransfer * 0.3;
    const rearLoad = 1 + loadTransfer * 0.3;

    // Effective grip with load
    const effectiveFrontGrip = frontGrip * Math.max(0.3, frontLoad);
    const effectiveRearGrip = rearGrip * Math.max(0.3, rearLoad);

    // Speed-dependent steering sensitivity
    const speedFactor = Math.max(
      0.2,
      1 - (this.carSpeed / this.maxSpeed) * 0.8
    );

    // Calculate slip angles (simplified)
    const desiredTurnRate = steerInput * 4.0 * speedFactor;
    const maxFrontSlip = effectiveFrontGrip * 2.0;
    const maxRearSlip = effectiveRearGrip * 2.0;

    // Determine handling characteristic
    let actualTurnRate = desiredTurnRate;

    if (Math.abs(desiredTurnRate) > maxFrontSlip) {
      // Understeer - front tires lose grip first
      actualTurnRate = Math.sign(desiredTurnRate) * maxFrontSlip * 0.8;

      // Scrub some speed during understeer
      this.carSpeed *= 0.995;
    } else if (Math.abs(desiredTurnRate) > maxRearSlip) {
      // Oversteer - rear tires lose grip
      const oversteerAmount = Math.abs(desiredTurnRate) - maxRearSlip;
      actualTurnRate =
        desiredTurnRate +
        Math.sign(desiredTurnRate) * oversteerAmount * 0.3;

      // More dramatic speed loss during oversteer
      this.carSpeed *= 0.99;
    }

    return actualTurnRate * deltaTime;
  }

  calculateTraction(deltaTime) {
    // Simple traction control simulation
    const maxWheelSlip = 0.15; // 15% slip threshold
    const currentSlip =
      Math.abs(this.carSpeed - (this.wheelSpeed || this.carSpeed)) /
      Math.max(this.carSpeed, 1);

    if (currentSlip > maxWheelSlip && this.input.gas) {
      // Reduce power when wheels are slipping
      const tractionReduction = Math.min(0.7, currentSlip * 2);
      return 1 - tractionReduction;
    }

    return 1.0; // Full traction
  }

  updateCar(deltaTime) {
    // Physics constants
    const maxAcceleration = 25;
    const maxBrakeForce = 80;
    const rollingResistance = 0.003; // Rolling friction coefficient
    const airResistance = 0.001; // Air drag coefficient
    const maxGripForce = 40; // Maximum lateral grip
    const weightTransferFactor = 0.3; // How much weight shifts during acceleration/braking

    // Calculate forces
    let engineForce = 0;
    let brakeForce = 0;

    if (this.input.gas) {
      const speedRatio = this.carSpeed / this.maxSpeed;
      const tractionMultiplier = this.calculateTraction(deltaTime);

      // Exponential decay - maintains good power longer, then drops off
      const powerCurve = Math.exp(-speedRatio * 1.5);

      engineForce =
        maxAcceleration * Math.max(0.15, powerCurve) * tractionMultiplier;
    }

    if (this.input.brake) {
      brakeForce = maxBrakeForce;
    }

    // Calculate resistance forces
    const rollingForce = this.carSpeed * rollingResistance * 60;
    const dragForce = this.carSpeed * this.carSpeed * airResistance;
    const totalResistance = rollingForce + dragForce;

    // Net force and acceleration
    const netForce = engineForce - brakeForce - totalResistance;
    const acceleration = netForce;

    // Update speed
    this.carSpeed = Math.max(0, this.carSpeed + acceleration * deltaTime);
    this.carSpeed = Math.min(this.carSpeed, this.maxSpeed);

    // Steering with grip limits
    if (Math.abs(this.input.steering) > 0.01 && this.carSpeed > 0.5) {
      const steeringDelta = this.calculateSteeringPhysics(deltaTime);
      this.carRotation -= steeringDelta;
    }

    // Update position
    const forward = new THREE.Vector3(
      Math.sin(this.carRotation),
      0,
      Math.cos(this.carRotation)
    );
    this.carVelocity.copy(forward).multiplyScalar(this.carSpeed);
    this.carPosition.add(
      this.carVelocity.clone().multiplyScalar(deltaTime)
    );

    // Apply position to car
    this.car.position.copy(this.carPosition);
    this.car.rotation.y = this.carRotation;

    // Update speedometer
    document.getElementById(
      "speedometer"
    ).textContent = `SPEED: ${Math.round(this.carSpeed)}`;
  }

  // isOnRoad(position) {
  //     // Placeholder - needs proper implementation by checking against activeGeomorphs road bounds
  //     return true;
  // }

  updateCarVisuals(deltaTime) {
    if (!this.car) return;

    const lateralForce =
      Math.abs(this.input.steering) * (this.carSpeed / this.maxSpeed);
    const longitudinalForce =
      (this.input.gas ? 0.3 : 0) + (this.input.brake ? -0.5 : 0);

    // Body roll during turns
    const maxRoll = 0.08; // radians
    const targetRoll = -this.input.steering * lateralForce * maxRoll;
    this.car.rotation.z = THREE.MathUtils.lerp(
      this.car.rotation.z || 0,
      targetRoll,
      0.1
    );

    // Pitch during acceleration/braking
    const maxPitch = 0.05;
    const targetPitch = longitudinalForce * maxPitch;
    this.car.rotation.x = THREE.MathUtils.lerp(
      this.car.rotation.x || 0,
      targetPitch,
      0.1
    );

    // Slight vertical movement for suspension effect
    const suspensionBounce =
      Math.sin(Date.now() * 0.01) * 0.1 * (this.carSpeed / this.maxSpeed);
    this.car.position.y = this.carPosition.y + 1 + suspensionBounce;

    // Update headlight targets to follow car rotation and steering
    const forwardDistance = 15;
    const steerOffset = this.input.steering * 3; // Steering affects light direction

    this.leftLight.target.position.set(
      this.leftLightBaseTarget.x + steerOffset,
      this.leftLightBaseTarget.y,
      this.leftLightBaseTarget.z
    );
    this.rightLight.target.position.set(
      this.rightLightBaseTarget.x + steerOffset,
      this.rightLightBaseTarget.y,
      this.rightLightBaseTarget.z
    );
  }

  // Revised updateDevilAI: The devil now aggressively chases the player,
  // aiming for a point just ahead of them and then holding position.
  updateDevilAI(deltaTime) {
    if (!this.devilActive || !this.devilCar) return;

    // Compute player's forward vector.
    const playerForward = new THREE.Vector3(
      Math.sin(this.carRotation),
      0,
      Math.cos(this.carRotation)
    );

    // Determine if the devil is behind the player.
    const toPlayer = new THREE.Vector3().subVectors(this.carPosition, this.devilPosition);
    const isBehind = toPlayer.dot(playerForward) > 0;

    // Set desired target: a point ahead of the player along their forward direction.
    const offsetDistance = 10;
    let desiredTarget = this.carPosition.clone().add(playerForward.clone().multiplyScalar(offsetDistance));

    // Optionally, project the target onto the road.
    const roadTarget = this.findClosestRoadTarget(this.devilPosition);
    if (roadTarget) {
      const { center, direction } = roadTarget;
      const vecToTarget = new THREE.Vector3().subVectors(desiredTarget, center);
      const proj = vecToTarget.dot(direction);
      desiredTarget = center.clone().add(direction.clone().multiplyScalar(proj));
    }

    // Set the target speed.
    // If the devil is behind, accelerate to catch up; if ahead, slow down to block.
    let targetSpeed = isBehind ? this.carSpeed + 20 : Math.max(this.carSpeed - 10, 10);

    // Determine steering: aim from the devil's position to the desired target.
    const desiredDir = new THREE.Vector3().subVectors(desiredTarget, this.devilPosition).normalize();
    const currentDir = new THREE.Vector3(
      Math.sin(this.devilRotation),
      0,
      Math.cos(this.devilRotation)
    );
    const angleDiff = currentDir.angleTo(desiredDir);
    const cross = new THREE.Vector3().crossVectors(currentDir, desiredDir);
    const steerSign = cross.y >= 0 ? 1 : -1;
    const steerStrength = Math.min(1, angleDiff / (Math.PI / 4)) * steerSign;

    // Adjust the devil's speed toward the target speed.
    const speedDiff = targetSpeed - this.devilSpeed;
    this.devilSpeed += speedDiff * 0.5 * deltaTime; // tweak acceleration factor

    // Update the devil's rotation based on the steer strength.
    this.devilRotation += steerStrength * deltaTime * 2; // tweak steering response

    // Update devil position.
    const newForward = new THREE.Vector3(
      Math.sin(this.devilRotation),
      0,
      Math.cos(this.devilRotation)
    );
    this.devilVelocity.copy(newForward).multiplyScalar(this.devilSpeed);
    this.devilPosition.add(this.devilVelocity.clone().multiplyScalar(deltaTime));

    // Update the devil car's mesh.
    this.devilCar.position.copy(this.devilPosition);
    this.devilCar.rotation.y = this.devilRotation;
    this.devilCar.rotation.z = -steerStrength * 0.1; // subtle lean effect
  }

  updateCollisionDetection() {
    if (!this.car) return;


    this.playerBoundingBox.setFromObject(this.car);
    if (this.devilCar) {
      this.devilBoundingBox.setFromObject(this.devilCar);
    }

    // Check player vs devil collision
    if (
      this.devilActive &&
      this.devilCar &&
      this.playerBoundingBox.intersectsBox(this.devilBoundingBox)
    ) {
      this.handleCarCollision();
    }

    // Check player vs trees
    this.checkTreeCollisions(this.carPosition, this.car, true);

    // Check devil vs trees
    
    if (this.devilActive && this.devilCar) {
      this.checkTreeCollisions(this.devilPosition, this.devilCar, false);
    }
  }

  checkTreeCollisions(carPos, carObj, isPlayer) {
    for (let i = 0; i < this.collisionBoxes.length; i++) {
      const tree = this.collisionBoxes[i];
      const distance = carPos.distanceTo(tree.position);

      if (distance < tree.radius + 2) {
        // Car radius ~2
        this.handleTreeCollision(carPos, carObj, tree, isPlayer);
      }
    }
  }

  handleCarCollision() {
    const currentTime = Date.now();
    if (currentTime - this.lastCollisionTime < this.collisionCooldown) return;
    this.lastCollisionTime = currentTime;

    // Vector from devil car to player car
    const toPlayer = new THREE.Vector3().subVectors(this.carPosition, this.devilPosition);
    const distance = toPlayer.length();
    const collisionNormal = toPlayer.normalize(); 

    // Penetration correction (kept as before)
    const playerRadius = 1.4;
    const devilRadius = 1.5;
    const penetration = playerRadius + devilRadius - distance;
    if (penetration > 0) {
      const correction = collisionNormal.clone().multiplyScalar(penetration * 0.21);
      this.carPosition.add(correction);
      this.devilPosition.sub(correction);
      if (this.car) this.car.position.copy(this.carPosition);
      if (this.devilCar) this.devilCar.position.copy(this.devilPosition);
    }

    // Calculate relative velocity along collision normal
    const playerForward = new THREE.Vector3(Math.sin(this.carRotation), 0, Math.cos(this.carRotation));
    const devilForward = new THREE.Vector3(Math.sin(this.devilRotation), 0, Math.cos(this.devilRotation));
    const v1 = playerForward.clone().multiplyScalar(this.carSpeed);
    const v2 = devilForward.clone().multiplyScalar(this.devilSpeed);
    const relativeVelocity = v1.clone().sub(v2);
    const velocityAlongNormal = relativeVelocity.dot(collisionNormal);

    if (velocityAlongNormal < 0) {
      // Use a small impulse multiplier for a gentle nudge
      const impulseMultiplier = 0.1;
      const impulse = Math.abs(velocityAlongNormal) * impulseMultiplier;

      // Determine which vehicle is being rammed (lower speed) and nudge it
      if (this.carSpeed < this.devilSpeed) {
        this.carSpeed = Math.max(0, this.carSpeed - impulse);
        // Adjust player's rotation slightly toward devil's direction
        this.carRotation = THREE.MathUtils.lerp(this.carRotation, this.devilRotation, 0.1);
      } else {
        this.devilSpeed = Math.max(0, this.devilSpeed - impulse);
        this.devilRotation = THREE.MathUtils.lerp(this.devilRotation, this.carRotation, 0.1);
      }
    } else {
      // Minor deceleration if already separating
      this.carSpeed *= 0.97;
      this.devilSpeed *= 0.97;
    }

    this.carSpeed = Math.max(0, Math.min(this.carSpeed, this.maxSpeed));
    this.devilSpeed = Math.max(0, Math.min(this.devilSpeed, this.devilMaxSpeed));
  }

  handleTreeCollision(carPos, carObj, tree, isPlayer) {
    // Increase the effective tree size by using its full radius
    const carPhysicalRadius = 1.2; // Effective radius of the car
    const treePhysicalRadius = tree.radius; // Use the full detection radius of the tree

    // Calculate the normal vector from tree to car
    const normal = new THREE.Vector3().subVectors(carPos, tree.position);
    const distance = normal.length();
    normal.normalize();

    // Calculate penetration depth based on full effective radii
    const penetration = (carPhysicalRadius + treePhysicalRadius) - distance;

    // 1. Positional Correction: nudge the car away from the tree if overlapping
    if (penetration > 0) {
      const correctionAmount = penetration + 0.1; // Slight extra nudge
      if (isPlayer) {
        this.carPosition.add(normal.clone().multiplyScalar(correctionAmount));
        if (this.car) this.car.position.copy(this.carPosition);
      } else {
        this.devilPosition.add(normal.clone().multiplyScalar(correctionAmount));
        if (this.devilCar) this.devilCar.position.copy(this.devilPosition);
      }
    }
    
    // 2. Update Speed and Rotation: force a hard hit stop and reorient
    if (isPlayer) {
      // Rotate the car to face away from the tree
      this.carRotation = Math.atan2(normal.x, normal.z);
      // Drastically reduce speed on collision
      this.carSpeed *= 0.05; // Lose 95% of speed
      if (this.carSpeed < 0.5) this.carSpeed = 0;
    } else { // Devil car
      this.devilRotation = Math.atan2(normal.x, normal.z);
      this.devilSpeed *= 0.05;
      if (this.devilSpeed < 0.5) this.devilSpeed = 0;
    }
  }

  findClosestRoadTarget(position) {
    let closest = null;
    let minDistance = Infinity;

    for (const geom of this.activeGeomorphs) {
      const { entrance, exit } = geom;

      const lineCenter = entrance.position
        .clone()
        .add(exit.position)
        .multiplyScalar(0.5);
      const distance = position.distanceTo(lineCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closest = {
          geomorph: geom,
          center: lineCenter,
          direction: exit.position
            .clone()
            .sub(entrance.position)
            .normalize(),
        };
      }
    }

    return closest;
  }

  updateCamera() {
    const speedFactor = this.carSpeed / this.maxSpeed;
    const steerFactor = this.input.steering;

    // Much closer camera distance
    const baseDistance = 6; // Reduced from 15
    const speedDistance = speedFactor * 2; // Reduced from 5
    const totalDistance = baseDistance + speedDistance;

    // Banking/leaning effect during turns
    const bankAngle = steerFactor * 0.12 * speedFactor;
    const lateralOffset = steerFactor * 2 * (1 - speedFactor * 0.3);

    // Lower camera height for closer feel
    const baseHeight = 4; // Reduced from 8
    const speedHeight = speedFactor * 1; // Reduced from 2
    const turnHeight = Math.abs(steerFactor) * 0.8; // Reduced from 1.5
    const totalHeight = baseHeight + speedHeight + turnHeight;

    // Calculate camera position relative to car
    const carMatrix = new THREE.Matrix4().makeRotationY(this.carRotation);
    const relativePosition = new THREE.Vector3(
      lateralOffset,
      totalHeight,
      -totalDistance
    );
    relativePosition.applyMatrix4(carMatrix);

    const desiredCameraPosition = this.carPosition
      .clone()
      .add(relativePosition);

    // More responsive camera for close following
    const lerpFactor = 0.12 + speedFactor * 0.06; // Increased responsiveness
    this.camera.position.lerp(desiredCameraPosition, lerpFactor);

    // Closer look-ahead distance
    const lookAheadDistance = speedFactor * 5; // Reduced from 10
    const forwardVector = new THREE.Vector3(
      0,
      0,
      lookAheadDistance
    ).applyMatrix4(carMatrix);
    this.cameraTarget
      .copy(this.carPosition)
      .add(forwardVector)
      .add(new THREE.Vector3(0, 1, 0)); // Reduced height offset from 2 to 1

    this.camera.lookAt(this.cameraTarget);

    // Apply banking rotation to camera
    this.camera.rotateZ(bankAngle);
  }

  manageGeomorphs() {
    if (this.activeGeomorphs.length > 0) {
      const lastGeomorph =
        this.activeGeomorphs[this.activeGeomorphs.length - 1];
      const distanceToLastExit = this.carPosition.distanceTo(
        lastGeomorph.exit.position
      );

      // Add new geomorphs when we're getting close to the end of the track
      // Keep adding until we have enough lookahead distance
      while (
        distanceToLastExit < 150 &&
        this.activeGeomorphs.length < 8
      ) {
        const availableTypes = this.getAvailableGeomorphTypes();
        const randomType =
          availableTypes[
            Math.floor(Math.random() * availableTypes.length)
          ];

        const currentLastGeomorph =
          this.activeGeomorphs[this.activeGeomorphs.length - 1];
        const currentTransform = {
          position: currentLastGeomorph.exit.position.clone(),
          direction: currentLastGeomorph.exit.direction.clone(),
        };
        this.addGeomorph(randomType, currentTransform);

        // Update distance for next iteration
        const newLastGeomorph =
          this.activeGeomorphs[this.activeGeomorphs.length - 1];
        const newDistanceToLastExit = this.carPosition.distanceTo(
          newLastGeomorph.exit.position
        );
        if (newDistanceToLastExit <= distanceToLastExit) break; // Prevent infinite loop
      }
    }

    // Remove geomorphs that are far behind the car
    // But keep at least 3 geomorphs active for safety
    while (this.activeGeomorphs.length > 4) {
      // Consider keeping more if performance allows, e.g., 3 or 4
      const firstGeomorph = this.activeGeomorphs[0];
      const distanceFromCar = this.carPosition.distanceTo(
        firstGeomorph.group.position
      );

      if (distanceFromCar > 150) {
        // Tune this distance as needed
        const oldGeomorph = this.activeGeomorphs.shift();

        // Cleanup call before removing from scene
        this.disposeGeomorphResources(oldGeomorph.group);

        this.scene.remove(oldGeomorph.group);

        // Recalculate consecutiveCurves and lastTurnDirection
        let newConsecutiveCurves = 0;
        let newLastTurnDirection = null;
        let foundFirstNonStraightFromEnd = false;
        for (let i = this.activeGeomorphs.length - 1; i >= 0; i--) {
          const geomorph = this.activeGeomorphs[i];
          if (geomorph.type === "straight") {
            if (
              foundFirstNonStraightFromEnd ||
              this.activeGeomorphs.length - 1 === i
            )
              break;
          } else if (
            geomorph.type === "leftTurn" ||
            geomorph.type === "rightTurn"
          ) {
            newConsecutiveCurves++;
            foundFirstNonStraightFromEnd = true;
            if (newLastTurnDirection === null) {
              newLastTurnDirection =
                geomorph.type === "leftTurn" ? "left" : "right";
            }
          }
          if (
            newConsecutiveCurves >= 2 &&
            (geomorph.type === "leftTurn" ||
              geomorph.type === "rightTurn")
          ) {
            if (newLastTurnDirection === null)
              newLastTurnDirection =
                geomorph.type === "leftTurn" ? "left" : "right";
          }
        }
        this.consecutiveCurves = newConsecutiveCurves;
        this.lastTurnDirection = newLastTurnDirection;
      } else {
        break;
      }
    }
    // Track progress for devil activation
    for (let i = 0; i < this.activeGeomorphs.length; i++) {
      const geomorph = this.activeGeomorphs[i];
      const carZ = this.carPosition.z;
      const exitZ = geomorph.exit.position.z;

      // For straight segments only, and only if we haven't already counted it
      if (
        geomorph.type === "straight" &&
        !geomorph.counted &&
        carZ > exitZ
      ) {
        geomorph.counted = true;
        this.passedGeomorphs++;
      }
    }
  }

  disposeGeomorphResources(group) {
    if (!group) return;

    // Remove collision boxes associated with this geomorph
    this.collisionBoxes = this.collisionBoxes.filter(
      (box) => box.geomorphGroup !== group
    );

    group.traverse((object) => {
      if (object.isMesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }

        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => {
              this.disposeMaterialTextures(material);
              material.dispose();
            });
          } else {
            this.disposeMaterialTextures(object.material);
            object.material.dispose();
          }
        }
      }
    });
  }

  disposeMaterialTextures(material) {
    // Standard PBR material properties that might hold textures
    const textureProperties = [
      "map",
      "lightMap",
      "aoMap",
      "emissiveMap",
      "bumpMap",
      "normalMap",
      "displacementMap",
      "roughnessMap",
      "metalnessMap",
      "alphaMap",
      "envMap",
      "specularMap",
      "gradientMap"
    ];

    for (const prop of textureProperties) {
      if (material[prop] && material[prop].isTexture) {
        material[prop].dispose();
      }
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const deltaTime = 1 / 60;

    this.updateCar(deltaTime);
    this.updateCarVisuals(deltaTime);

    // Check if devil should be activated
    if (!this.devilActive && this.carPosition.z - this.startZ > 50) {
      this.devilActive = true;
      this.devilPosition = this.carPosition.clone().add(new THREE.Vector3(0, 0, -60)); // Start behind player
      this.createDevilCar();
    }

    if (this.devilActive) {
      this.updateDevilAI(deltaTime);
    }

    this.updateCollisionDetection();
    this.updateCamera();
    this.manageGeomorphs();

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener("load", () => {
  // Ensure nipplejs and three.min.js are loaded before this script or defer this script
  if (typeof THREE === "undefined" || typeof nipplejs === "undefined") {
    console.error("THREE.js or NippleJS is not loaded!");
    return;
  }
  new Racer();
});

window.addEventListener(
  "resize",
  () => {
    const game = window.racerInstance; // Assuming you might store instance globally for easy access
    const canvas = document.getElementById("gameCanvas");
    const size = Math.min(window.innerWidth, window.innerHeight);

    if (canvas) {
      canvas.style.width = size + "px";
      canvas.style.height = size + "px";
    }

    if (game && game.renderer && game.camera) {
      game.renderer.setSize(size, size);
      game.camera.aspect = 1; // Canvas is square
      game.camera.updateProjectionMatrix();
    } else {
      // Fallback if game instance not available yet or renderer/camera not setup
      const renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById("gameCanvas"),
      });
      if (renderer) renderer.setSize(size, size);
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      if (camera) {
        camera.aspect = 1;
        camera.updateProjectionMatrix();
      }
    }
  },
  false
);
