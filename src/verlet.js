import {expose, proxy, transfer} from 'comlink';

import system from 'verlet-system/2d.js';
import Point from 'verlet-point/2d.js';
import Constraint from 'verlet-constraint/2d.js';

import create from 'gl-vec2/create.js';
import add from 'gl-vec2/add.js';
import multiply from 'gl-vec2/multiply.js';
import sub from 'gl-vec2/subtract.js';
import scale from 'gl-vec2/scale.js';
import copy from 'gl-vec2/copy.js';
import sqrLen from 'gl-vec2/squaredLength.js';
import fromValues from 'gl-vec2/fromValues.js';

const vec2 = {
    create,
    add,
    multiply,
    sub,
    scale,
    copy,
    sqrLen,
    fromValues,
}

const points = [];
const constraints = [];

function bufferOrArray(bufferOrArray) {

    // Handle recieving a buffer of Integers instead of an array of integers
    return bufferOrArray.constructor === ArrayBuffer ?
      new Int16Array(bufferOrArray) :
      bufferOrArray;
}

class PointSystem {
  constructor(settings) {
    
    console.log('New PointSystem created');

    const world = system({ 
        gravity: [0, 0],
        friction: 0.9
    });
    this.scale = settings.scale;
    this.world = world;
  }
  
  addForce(pointIdArray, ...args) {
    
    // Handle recieving a buffer of Integers instead of an array of integers
    pointIdArray = bufferOrArray(pointIdArray);
    pointIdArray.forEach(p => points[p].addForce(...args))
  }
  
  doPhysics(pointIdArray, constraintIdArray, dt) {
    
    const thesePoints = pointIdArray.map(p => points[p]);
    const theseConstraints = constraintIdArray.map(c => constraints[c]);
    
    theseConstraints.forEach(c => c.solve());
    this.world.integrate(thesePoints, dt);
  }
  
  getPointsPositions(arrayOfIds) {
    
    // Handle recieving a buffer of Integers instead of an array of integers
    arrayOfIds = bufferOrArray(arrayOfIds);
    return arrayOfIds.map(id => points[id].position);
  }
  
  getPointsPositionsAsFloat32ArrayBuffer(arrayOfIds) {
    
    // Handle recieving a buffer of Integers instead of an array of integers
    arrayOfIds = bufferOrArray(arrayOfIds);

    const array = new Float32Array(arrayOfIds.length * 2);
    arrayOfIds.forEach((id, index) => {
      array[index*2] = points[id].position[0]
      array[index*2+1] = points[id].position[1]
    });
    return transfer(array.buffer, [array.buffer]);
  }
  
  getPoint(id) {
    return proxy(points[id]);
  }
  
  getConstraint(id) {
    return proxy(constraints[id]);
  }
  
  makePoint(settings) {
    const p = new Point(settings);
    points.push(p);
    return points.indexOf(p);
  }
  
  makeConstraint(pointIds, settings) {
    const c = new Constraint(pointIds.map(p => points[p]), settings);
    constraints.push(c);
    return constraints.indexOf(c);
  }
}


expose(PointSystem);