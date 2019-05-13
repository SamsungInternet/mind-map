import {wire, bind} from '/bundle/hyperhtml.js';
import {settings, instancePromise as systemPromise} from '/component/system.js';
const store = new Set();
const linkPointMass = 0.05;
import {transfer} from '/comlink/esm/comlink.min.mjs';

/**
 * Subtracts vector b from vector a
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
function subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out
}

/**
 * Calculates the squared length of a vec2
 *
 * @param {vec2} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
function squaredLength(a) {
    var x = a[0],
        y = a[1];
    return x*x + y*y
}

async function setup() {
  const system = await systemPromise;
  const [
    aDomAnchorPos,
    bDomAnchorPos
  ] = await system.getPointsPositions([
    this.pointA.domAnchorId,
    this.pointB.domAnchorId
  ]);
  
  const temp = [];
  subtract(temp, aDomAnchorPos, bDomAnchorPos);
  const length = Math.sqrt(squaredLength(temp));

  this.pointIds = await Promise.all([
    system.makePoint({
        position: aDomAnchorPos,
        mass: linkPointMass
    }),
    system.makePoint({
        position: aDomAnchorPos,
        mass: linkPointMass
    }),
    system.makePoint({
        position: aDomAnchorPos,
        mass: linkPointMass
    })
  ]);
    
  this.constraintIds = await Promise.all([
    system.makeConstraint([
      this.pointA.domAnchorId, this.pointIds[0]
    ], { stiffness: 0.5, restingDistance: length/4 }),
    system.makeConstraint([
      this.pointIds[0], this.pointIds[1]
    ], { stiffness: 0.5, restingDistance: length/4 }),
    system.makeConstraint([
      this.pointIds[1], this.pointIds[2]
    ], { stiffness: 0.5, restingDistance: length/4 }),
    system.makeConstraint([
      this.pointIds[2], this.pointB.domAnchorId
    ], { stiffness: 0.5, restingDistance: length/4 })
  ]);  
}

async function fetchPositionsFromArray(system, arrayToSend) {
  const idsToFetch = Uint16Array.from(arrayToSend);
  return system.getPointsPositionsAsFloat32ArrayBuffer(
    transfer(idsToFetch.buffer, [idsToFetch.buffer])
  );
}

const cache = {};

class Link {
  constructor(
    a, b
  ) {
    
    this.pointA = a;
    this.pointB = b;
    setup.bind(this)().then(() => {
      
      // After creation clear all the caches
      cache.allPoints = false;
      cache.allConstraints = false;
      cache.setOfLinkPointsIds = false;
      store.add(this);
      return this;
    });
  }
  
  static async doPhysics(dt) {
  
    const system = await systemPromise;
    
    // Apply some "gravity" to the ropes.
    await system.addForce(Link.allPoints, [0,2 * linkPointMass * dt]);

    await system.doPhysics(
      Link.allPoints,
      Link.allConstraints,
      dt
    );
  }
  
  async doPhysics(dt) {
  
    const system = await systemPromise;
    
    // Apply some "gravity" to the rope.
    await system.addForce(this.pointIds, [0,2 * linkPointMass * dt]);

    await system.doPhysics(
      this.pointIds,
      this.constraintIds,
      dt
    );
  }
  
  static get allPoints() {
    return cache.allPoints = cache.allPoints || (
      cache.allPoints = Array.from(store).reduce((a, link) => a.concat(link.pointIds),[])
    );
  }
  
  static get allConstraints() {
    return cache.allConstraints || (
      cache.allConstraints = Array.from(store).reduce((a, link) => a.concat(link.constraintIds),[])
    );
  }
    
  static get store() {return store}
  
  static updateSetOfLinkPointsIds() {
    const linkArray = Array.from(Link.store);
    const setOfIds = new Set();
    linkArray.forEach(l => {
      setOfIds.add(l.pointA.domAnchorId);
      setOfIds.add(l.pointIds[0]);
      setOfIds.add(l.pointIds[1]);
      setOfIds.add(l.pointIds[2]);
      setOfIds.add(l.pointB.domAnchorId);
    });
    cache.setOfLinkPointsIds = Array.from(setOfIds);
    return cache.setOfLinkPointsIds;
  }
  
  static async everyTemplate() {
    const linkArray = Array.from(Link.store);
    const arrayToSend = cache.setOfLinkPointsIds || Link.updateSetOfLinkPointsIds();
    const system = await systemPromise;
    const pointPositionsBuffer = await fetchPositionsFromArray(system, arrayToSend);
    return linkArray.map((link, index) => {
      const pointPositions = [
        new Float32Array(pointPositionsBuffer, arrayToSend.indexOf(link.pointA.domAnchorId)*4*2, 2),
        new Float32Array(pointPositionsBuffer, arrayToSend.indexOf(link.pointIds[0])*4*2, 2),
        new Float32Array(pointPositionsBuffer, arrayToSend.indexOf(link.pointIds[1])*4*2, 2),
        new Float32Array(pointPositionsBuffer, arrayToSend.indexOf(link.pointIds[2])*4*2, 2),
        new Float32Array(pointPositionsBuffer, arrayToSend.indexOf(link.pointB.domAnchorId)*4*2, 2)
      ];
      return link.templateSVG(pointPositions);
    });
  }
  
  async template() {
    const pointIds = this.pointIds.slice(0);
    pointIds.unshift(this.pointA.domAnchorId);
    pointIds.push(this.pointB.domAnchorId);
    const system = await systemPromise;
    const pointPositions = await system.getPointsPositions(pointIds);
    return this.templateSVG(pointPositions);
  }
  
  // Array[5] pointpositions 
  templateSVG(pointPositions) {
    return wire(this, 'svg')`
      <path class="link" d="${`M ${
        pointPositions[0][0] * settings.scale + settings.offset[0]
      } ${
        pointPositions[0][1] * settings.scale + settings.offset[1]
      } S ${
        pointPositions[1][0] * settings.scale + settings.offset[0]
      } ${
        pointPositions[1][1] * settings.scale + settings.offset[1]
      } ${
        pointPositions[2][0] * settings.scale + settings.offset[0]
      } ${
        pointPositions[2][1] * settings.scale + settings.offset[1]
      } ${
        pointPositions[3][0] * settings.scale + settings.offset[0]
      } ${
        pointPositions[3][1] * settings.scale + settings.offset[1]
      } ${
        pointPositions[4][0] * settings.scale + settings.offset[0]
      } ${
        pointPositions[4][1] * settings.scale + settings.offset[1]
      } 
      `}" marker-mid="url(#arrow)" />
    `
  }
}

export default Link;