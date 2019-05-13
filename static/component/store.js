
import '/pouchdb/pouchdb.min.js'; /*global PouchDB*/
import {settings, instancePromise as systemPromise} from '/component/system.js';
import Thought from '/component/thought.js';
import Link from '/component/link.js';
import {transfer} from '/comlink/esm/comlink.min.mjs';

const falseIfMissing = e => {
  if (e.status === 404) return false;
  throw e;
};

const db = new PouchDB('db');
async function save() {
  console.log('saving');
  const system = await systemPromise;
  const data = (await db.get('data').catch(falseIfMissing)) || {
    _id: 'data'
  };
  const thoughts = Array.from(Thought.store);
  const linkData = Array.from(Link.store).map(i => [
    thoughts.indexOf(i.pointA),
    thoughts.indexOf(i.pointB)
  ]);
  const thoughtPointIdArray = Uint16Array.from(thoughts.map(a => a.handleAnchorId)).buffer;
  const pointPositionsBuffer = await system.getPointsPositionsAsFloat32ArrayBuffer(transfer(thoughtPointIdArray, [thoughtPointIdArray]));
  const thoughtData = thoughts.map(function (t,i) {
    const pos = new Float32Array(pointPositionsBuffer, i*4*2, 2);
    return {
      body: t.body,
      start: pos
    }
  });
  data.linkData = linkData;
  data.thoughtData = thoughtData;
  
  const body=JSON.stringify(data);
  const newId = await fetch('/save', {
    method: 'POST',
    body, 
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }).then(r => r.text());
  
  history.replaceState({}, window.title, `/${newId}/`);
  
  await db.put(data);
}

async function load(data) {
  try {
    data = data || await db.get('data').catch(falseIfMissing);
  } catch (e) {
    console.log(e);
  }
  if (!data) {

    await new Thought({
      body: '## Hello World\n\nThis is fun!',
      start: [window.innerWidth*0.5/settings.scale, window.innerHeight*0.5/settings.scale]
    });
    return;
  }

  const thoughts = await Promise.all(data.thoughtData.map(t => new Thought(t)));
  await Promise.all(data.linkData.map(l => new Link(thoughts[l[0]], thoughts[l[1]])));
}

export {
  load, save
}