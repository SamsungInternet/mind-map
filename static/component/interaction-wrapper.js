import {settings, instancePromise as systemPromise} from '/component/system.js';
import Thought from '/component/thought.js';
import Link from '/component/link.js';

let timeout = -1;
function turnOnPhysicsForABit() {
  settings.doPhysics = true;
  clearTimeout(timeout);
  timeout = setTimeout(async function() {
    settings.doPhysics = false;
  }, 3000);
}

class InteractionWrapper {
  constructor (domObject) {
    this.domObject = domObject;
    domObject.addEventListener('pointermove', this.onpointermove.bind(this));
    domObject.addEventListener('pointerup', this.onpointerup.bind(this));
    domObject.addEventListener('pointercancel', this.onpointerup.bind(this));
    
    this.focusedEls = new Map();
  }
  
  turnOnPhysicsForABit() {
    turnOnPhysicsForABit();
  }
  
  drag (e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = settings.offset;
    
    //offset is in screen coordinates
    const offset = [
      pos[0] - e.clientX,
      pos[1] - e.clientY
    ];
    this.focusedEls.set(e.pointerId, {
      drag: settings.offset, offset
    });
    return false;
  }
  
  focusAsLinkTargeter (thought, button, e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = settings.offset;
    
    //offset is in screen coordinates
    const offset = [
      0 - e.clientX,
      0 - e.clientY
    ];
    this.focusedEls.set(e.pointerId, {
      linkTargeter: button, fromThought: thought, offset
    });
    return false;
  }
  
  async focus (thought, e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const domAnchor = await thought.domAnchor;
    const pos = await domAnchor.position;
    
    //offset is in screen coordinates
    const offset = [
      (pos[0] * settings.scale) - e.clientX,
      (pos[1] * settings.scale) - e.clientY
    ];
    this.focusedEls.set(e.pointerId, {
      thought, offset
    });
    domAnchor.mass = 0;
    return false;
  }
  
  onpointermove(e) {
    let raf = -1;
    function resetRaf() {
      raf = -1
    }
    
    // Sync the pointer moving to the framerate
    this.onpointermove = function (e) {
      if (raf === -1) {
        raf = requestAnimationFrame(() => this._onpointermove(e).then(resetRaf));
      }
    }
    this.onpointermove(e);
  }
  
  async _onpointermove (e) {
    e.preventDefault();
    const {drag, thought, offset, linkTargeter} = this.focusedEls.get(e.pointerId) || {};
    if (thought) {
      const handleAnchor = await thought.handleAnchor;
      const domAnchor = await thought.domAnchor;
      handleAnchor.place([
        (e.clientX + offset[0]) / settings.scale,
        (e.clientY + offset[1]) / settings.scale
      ]);
      domAnchor.place([
        (e.clientX + offset[0]) / settings.scale,
        (e.clientY + offset[1]) / settings.scale
      ]);
      turnOnPhysicsForABit();
      return;
    }
    if (drag) {
      settings.offset[0] = (e.clientX + offset[0]);
      settings.offset[1] = (e.clientY + offset[1]);
      return;
    }
    if (linkTargeter) {
      linkTargeter.style.transform = `translate(${(e.clientX + offset[0])}px, ${(e.clientY + offset[1])}px)`;
      return;
    }
  }
  
  async onpointerup (e) {
    e.preventDefault();
    const {thought, offset, linkTargeter, fromThought} = this.focusedEls.get(e.pointerId) || {};
    this.focusedEls.delete(e.pointerId);
    if (thought) {
      const domAnchor = await thought.domAnchor;
      domAnchor.mass = Thought.mass;
    }
    if (linkTargeter) {
      linkTargeter.style.transform = 'scale(1)';
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetThought = Thought.fromEl(el);
      if (targetThought && fromThought !== targetThought) {
        new Link(fromThought, targetThought);
        this.turnOnPhysicsForABit();
      }
    }
  }
  
  // Curryable
  // fn is function to run on each file
  // event is dropEvent
  dropHandler(fn, event) {
    function dropHandler(event) {

      // Prevent default behavior (Prevent file from being opened)
      event.preventDefault();

      this.hasDragOver = false;

      if (event.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (let i = 0; i < event.dataTransfer.items.length; i++) {
          // If dropped items aren't files, reject them
          if (event.dataTransfer.items[i].kind === 'file') {
            const file = event.dataTransfer.items[i].getAsFile();
            fn(file, event);
          }
        }
      } else {
        // Use DataTransfer interface to access the file(s)
        for (let i = 0; i < event.dataTransfer.files.length; i++) {
          const file = event.dataTransfer.files[i];
          fn(file, event);
        }
      }
    }
    return event ? dropHandler.bind(this)(event) : dropHandler.bind(this);
  }

  dragOver(e) {
    e.preventDefault();
    this.hasDragOver = true;
    clearTimeout(this.dragOver.timeout);
    this.dragOver.timeout = setTimeout(function() {
      this.hasDragOver = false;
    }, 3000);
  }
}

const body = new InteractionWrapper(document.body);

export default body;