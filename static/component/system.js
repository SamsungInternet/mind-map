import {wrap} from '/comlink/esm/comlink.min.mjs';

const settings = {
  scale: 500,
  offset: [0,0]
};

const instancePromise = (function () {
  const PointSystem = wrap(new Worker("/bundle/verlet.js"));
  const instancePromise = new PointSystem(settings);
  return instancePromise.then(i => {
    console.log(i);
    return i;
  });
}());

export {
  instancePromise,
  settings
}