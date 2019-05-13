import {wire, bind} from '/bundle/hyperhtml.js'
import {settings, instancePromise as systemPromise} from '/component/system.js';
import Thought from '/component/thought.js';
import Link from '/component/link.js';
import interactions from '/component/interaction-wrapper.js';
import {load, save} from '/component/store.js';
import dialogPolyfill from '/dialog-polyfill/index.js';

let showHints = false;
const dropHandler = interactions.dropHandler(uploadFile);
const title = 'hello world';
const template = ({
  links,
  thoughts,
  timings
}) => wire(document.body)`
  <header>
    <h1>${title}</h1>
    <button onclick=${function () { try {save()} catch(e) {console.log(e)}}}>Save</button>
    <label><input type="checkbox" onchange="${function () {showHints = this.checked}}" /> Toggle Tool Hints</label>
    <label><input type="checkbox" id="perftoggle" /> Disable Goo Filter</label>
  </header>
  <pre>
    ${timings}
  </pre>
  <main 
    onpointerdown=${interactions.drag.bind(interactions)}
    ondrop=${dropHandler}
    ondragover=${interactions.dragOver.bind(interactions)}
    class=${
      (Array.from(interactions.focusedEls.values())
      .find(interaction => 'linkTargeter' in interaction) ? 'linkTargeting ' : '') +
      (showHints ? 'hints ' : '') + (window.perftoggle && window.perftoggle.checked ? 'perf ' : '')
    }
  ><!-- main -->
    <svg>
      ${links}
      <defs>
        <filter id="goo">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="5" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
        </filter>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5"
            markerWidth="1" markerHeight="1"
            orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 L 2 5 z" />
        </marker>
      </defs>
    </svg>
    ${thoughts}
  </main>
  <div id="dropmessage" class=${(interactions.hasDragOver ? 'dragover ' : '')}>
    <h2>Drop Files Here</h2>
  </div>
  <dialog>
    <h2>Edit Idea - Markdown Syntax Supported</h2>
    <textarea style="width:60vw;height:80vh;" name="newbody" form="newbodyform"></textarea>
    <form id="newbodyform" method="dialog">
      <button>Cancel</button>
      <input type="submit" value="Update" />
    </form>
  </dialog>
`;

(async function setup() {
  
  const render = bind(document.body);
  const system = await systemPromise;
  
  // Do initial render to display title etc
  render`${template({
    links:[],
    thoughts:[],
    timings: ''
  })}`;
  
  // Polyfill the dialog element
  dialogPolyfill.registerDialog(document.querySelector('dialog'));
  
  // Load a saved session if any
  await load(window.saveData);
  
  // Run the simulation for a second in 60 16ms chunks
  // so that nothing bounces on start up.
  performance.mark('start-pre-physics');
  for (let i=0;i<60;i++) await Promise.all([
    Promise.all([
      Link.doPhysics(0.016),
      Thought.doPhysics(0.016)
    ])
  ]);
  performance.mark('end-pre-physics');
  
  /*Physics & Render Loop*/
  let animready = true;
  (async function anim(nt) {
    requestAnimationFrame(anim);
    if (!nt) { return ; }
    if (!anim.pt) { anim.pt=nt;  return ; }
    if (!animready) return;
    
    // Disable
    animready = false;
    
    const dt = Math.min((nt - anim.pt)/1000, 0.032);

    if (settings.doPhysics) {
      performance.clearMarks('start-physics');
      performance.clearMarks('end-physics');
      performance.clearMeasures("Time to do real time physics");
      performance.mark('start-physics');
      await Promise.all([
        Link.doPhysics(0.016),
        Thought.doPhysics(0.016)
      ])
      performance.mark('end-physics');
      performance.measure("Time to do real time physics", 'start-physics', 'end-physics');
    }
    
    
    performance.clearMarks('start-template');
    performance.clearMarks('end-template');
    performance.clearMeasures("Time to make templates");
    performance.mark('start-template');
    
    if (settings.pauseRender) return animready = true;
    
    const [links, thoughts] = await Promise.all([
      await Link.everyTemplate,
      await Thought.everyTemplate
    ]);
    performance.mark('end-template');
    performance.measure("Time to make templates", 'start-template', 'end-template');
    
    render`${template({
      links,
      thoughts,
      timings: performance.getEntriesByType("measure").map(m => `${m.name} ${m.duration.toFixed(1)}ms`).join('\n')
    })}`;

    anim.pt=nt;
    animready = true;
  }()).catch(e => console.log(e));
}()).catch(e => console.log(e))


function uploadFile(file, e) {
  // Handle images
  if (file.type.match(/^image\//i)) {
    const formData = new FormData(); 
    formData.append('image', file, file.name);
    fetch('/images', {
      body: formData,
      method: 'POST'
    }).then(async response => {
      if (response.status === 200) {
        const url = response.url;
        await new Thought({
          body: `![An image](${url})`,
          start: [e.clientX/settings.scale, e.clientY/settings.scale]
        });
      } else  {
        response.text().then(text => alert(text));
      }
    });
  }
}