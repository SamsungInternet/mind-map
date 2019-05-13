import {wire, bind} from '/bundle/hyperhtml.js';
import bodyInteractions from './interaction-wrapper.js';
import Link from './link.js';
import {settings, instancePromise as systemPromise} from '/component/system.js';
import {transfer} from '/comlink/esm/comlink.min.mjs';


const md = window.markdownit({
  html: false
});

const store = new Set();

async function setup(start) {
  const system = await systemPromise;
  [
    this.domAnchorId,
    this.handleAnchorId,
  ] = await Promise.all([
    system.makePoint({
        position: start || [ 1, 1 ],
        mass: Thought.mass
    }),
    system.makePoint({
        position: start || [ 1, 1 ],
        mass: 0
    })
  ]);

  this.constraintId = await system.makeConstraint([
    this.domAnchorId, this.handleAnchorId
  ], {
    stiffness: 0.1,
    restingDistance: 0
  });
}

const cache = {};

class Thought {
  constructor({
    body, start
  }) {
    this.body = body;
    this.bodyHTML = md.render(('' + body).trim());
    cache.allPoints = false;
    cache.allConstraints = false;
    return setup.bind(this)(start).then(() => (store.add(this),this));
  }
  
  static get mass() {
    return 10;
  }
    
  static get store() {return store}
  
  static get allPoints() {
    return cache.allPoints || (
      cache.allPoints = Array.from(store).reduce((a, thought) => a.concat([thought.domAnchorId, thought.handleAnchorId]),[])
    );
  }
  
  static get allConstraints() {
    return cache.allConstraints || (
      cache.allConstraints = Array.from(store).map(thought => thought.constraintId)
    );
  }
  
  static async doPhysics(dt) {
    await (await systemPromise).doPhysics(
      Thought.allPoints,
      Thought.allConstraints,
      dt
    );
  }

  async doPhysics(dt) {
    await (await systemPromise).doPhysics(
      [this.domAnchorId, this.handleAnchorId],
      [this.constraintId],
      dt
    );
  }
  
  async editBody() {
    const dialog = document.querySelector('dialog');
    const ta = dialog.querySelector('textarea');
    ta.value = this.body;
    settings.pauseRender = true;
    dialog.showModal();
    ta.focus();
    ta.select();
    dialog.addEventListener('close', function onClose() {
      settings.pauseRender = false;
      if (dialog.returnValue) {
        const body = ta.value;
        this.body = body;
        this.bodyHTML = md.render(('' + body).trim());
      }
    }.bind(this), {once: true});
  }

  get domAnchor() {
    return systemPromise.then(system => system.getPoint(this.domAnchorId));
  }

  get handleAnchor() {
    return systemPromise.then(system => system.getPoint(this.handleAnchorId));
  }
  
  async newThought() {
    const start = (await (await this.domAnchor).position).slice(0);
    start[0] += 200/settings.scale;
    const t = await new Thought({
      body: 'New Idea...',
      start
    });
    await new Link(this, t);
    t.editBody();
  }
  
  static async everyTemplate() {
    const system = await systemPromise;
    const thoughtArray = Array.from(Thought.store);
    const thoughtPointIdArray = Uint16Array.from(thoughtArray.map(a => a.domAnchorId)).buffer;
    const pointPositionsBuffer = await system.getPointsPositionsAsFloat32ArrayBuffer(transfer(thoughtPointIdArray, [thoughtPointIdArray]));
    return thoughtArray.map((thought, index) => {
      const pos = new Float32Array(pointPositionsBuffer, index*4*2, 2);
      return thought.templateHTML(pos);
    });
  }
  
  async template() {
    return this.templateHTML(
      await (await this.domAnchor).position
    );
  }
  
  static fromEl(el) {
    return Array.from(store).find(t => t.el === el);
  }

  templateHTML(pos) {
    return this.el = wire(this)`
    <section onpointerdown=${e=>bodyInteractions.focus(this,e)} class="thought" style=${
      `--offsetX:${Math.floor(pos[0] * settings.scale) + settings.offset[0]}px;
       --offsetY:${Math.floor(pos[1] * settings.scale) + settings.offset[1]}px;`
    }>
      ${{html: this.bodyHTML}}
      <div class="button-container">
        <button title="New Idea" class="thought-button" onpointerdown=${e=>e.stopPropagation()} onclick=${() => this.newThought()}>+</button><span>New Idea</span>
        <button title="Drag to link ideas." class="thought-button grabable" onpointerdown=${e=>bodyInteractions.focusAsLinkTargeter(this,e.target,e)}>&#128279;&#xFE0E;</button><span>Drag to<br />Link Ideas</span>
        <button title="Edit Idea" class="thought-button" onpointerdown=${e=>e.stopPropagation()} onclick=${() => this.editBody()}>&#9999;&#xFE0E;</button><span>Edit</span>
      </div>
    </section>`
  }
}

export default Thought;