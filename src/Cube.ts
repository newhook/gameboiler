import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { PhysicsWorld, createObstacleBody } from './physics';
import { GameObject } from './types';

export class Cube implements GameObject {
  public mesh: THREE.Mesh;
  public body: RAPIER.RigidBody;
  public mass: number;
  public size: { width: number; height: number; depth: number };

  constructor(
    size: number,
    material: THREE.Material,
    position: { x: number; y: number; z: number },
    physicsWorld: RAPIER.World,
    mass: number = 1.0
  ) {
    // Create cube geometry
    const geometry = new THREE.BoxGeometry(size, size, size);

    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Create physics body for the cube
    this.body = createObstacleBody(
      { width: size, height: size, depth: size },
      position,
      physicsWorld,
      mass
    );

    // Store properties
    this.mass = mass;
    this.size = { width: size, height: size, depth: size };
  }

  // Apply random rotation to the cube
  applyRandomRotation(torqueStrength: number = 5.0): void {
    // Generate random torque around each axis
    const torqueX = (Math.random() - 0.5) * torqueStrength;
    const torqueY = (Math.random() - 0.5) * torqueStrength;
    const torqueZ = (Math.random() - 0.5) * torqueStrength;

    // Apply the torque to make the cube spin as it falls
    this.body.applyTorqueImpulse({ x: torqueX, y: torqueY, z: torqueZ }, true);
  }

  // Apply random horizontal impulse
  applyRandomImpulse(impulseStrength: number = 1.0): void {
    // Create a small random linear impulse for more varied movement
    const impulseX = (Math.random() - 0.5) * impulseStrength;
    const impulseZ = (Math.random() - 0.5) * impulseStrength;

    // Apply only horizontal impulse to avoid counteracting gravity
    this.body.applyImpulse({ x: impulseX, y: 0, z: impulseZ }, true);
  }

  update(delta: number): void {}

  // Static factory method to create a random cube
  static createRandom(
    physicsWorld: PhysicsWorld,
    materials: THREE.Material[],
    worldSize: number
  ): Cube {
    // Random size between 0.5 and 1.5
    const size = Math.random() * 1.0 + 0.5;

    // Select random material
    const material = materials[Math.floor(Math.random() * materials.length)];

    // Random position
    const posX = (Math.random() - 0.5) * worldSize * 0.8;
    const posY = Math.random() * 10 + 5;
    const posZ = (Math.random() - 0.5) * worldSize * 0.8;

    // Create cube
    const cube = new Cube(size, material, { x: posX, y: posY, z: posZ }, physicsWorld.world, 1.0);

    // Apply random forces
    cube.applyRandomRotation();
    cube.applyRandomImpulse();

    return cube;
  }
}
