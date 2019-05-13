const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const app = express();
const sharp = require('sharp');
const PouchDB = require('pouchdb');
const bodyParser = require('body-parser');
const template = require('./template.js');

function randomString() {
  return Math.floor(Number.MAX_SAFE_INTEGER * Math.random()).toString(36);
}

try {
  fs.mkdirSync(__dirname + '/.data', { recursive: true });
  fs.mkdirSync(__dirname + '/.data/images', { recursive: true });
} catch (e) {}

const MyPouchDB = PouchDB.defaults({
  prefix: '.data', mode: 'minimumForPouchDB'
});

const storeDB = new MyPouchDB('store');

const falseIfMissing = e => {
  if (e.status === 404) return false;
  throw e;
};

app.post('/save', bodyParser.json(), async function (req, res) {
  let needsNewId = true;
  let newId = '';
  while (needsNewId) {
    newId = randomString();
    needsNewId = await storeDB.get('store_' + newId).catch(falseIfMissing);
  }
  try {
    await storeDB.put({
      _id: 'store_' + newId,
      data: req.body
    });
  } catch (e) {
    console.log(e);
  }
  res.end(newId);
})

/* Image uploading Endpoint */
app.post('/images', fileUpload({
  limits: { fileSize: 1.2 * 1024 * 1024 },
}), async function (req, res) {
  
  if (Object.keys(req.files).length == 0) {
    return res.status(400).send('No files were uploaded.');
  }
  
  if (!req.files.image || req.files.image.truncated) {
    return res.status(400).send('Error uploading file (too big?)');
  }
  
  try {
    const filename = Date.now() + '_' + req.files.image.name.replace(/[^a-z0-9]/gi,"_") + '.png';
    await sharp(req.files.image.data)
      .resize(400,400,{
        fit: sharp.fit.inside,
        withoutEnlargement: true
      })
      .toFile(__dirname + '/.data/images/' + filename);
    res.redirect(301, '/images/' + filename);
  } catch (e) {res.status(400).send(e.stack);}
});

app.use('/bundle', express.static(__dirname + '/.data/bundles'));
app.use('/images', express.static(__dirname + '/.data/images'));
app.use('/lodash', express.static(__dirname + '/node_modules/lodash-es/'));
app.use('/pouchdb', express.static(__dirname + '/node_modules/pouchdb/dist/'));
app.use('/comlink', express.static(__dirname + '/node_modules/comlink/dist/'));
app.use('/dialog-polyfill', express.static(__dirname + '/node_modules/dialog-polyfill/'));
app.use(express.static(__dirname + '/static'));
app.use('/:id/', async function (req, res) {
  const saved = await storeDB.get('store_' + req.params.id).catch(falseIfMissing);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(template((saved && JSON.stringify(saved.data)) || "false"));
});
app.use('/', function (req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(template("false"));
});
app.listen(process.env.PORT);