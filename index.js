'use strict';
require('dotenv').config();
const express = require('express');
const db = require('./modules/database');
const resize = require('./modules/resize');
const exif = require('./modules/exif');

const bodyParser = require('body-parser');

const multer = require('multer');
const upload = multer({dest: 'public/uploads/'});

const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true}));

// parse application/json
app.use(bodyParser.json());

const connection = db.connect();

const cb = (result, res) => {
  console.log(result);
  res.send(result);
};

app.use(express.static('public'));

// respond to post and save file
app.post('/upload', upload.single('mediafile'), (req, res, next) => {
  next();
});

// create thumbnail
app.use('/upload', (req, res, next) => {
  resize.doResize(req.file.path, 300,
      './public/thumbs/' + req.file.filename + '_thumb', next);
});

// create medium image
app.use('/upload', (req, res, next) => {
  resize.doResize(req.file.path, 640,
      './public/medium/' + req.file.filename + '_medium', next);
});

// get coordinates
app.use('/upload', (req, res, next) => {
  exif.getCoordinates(req.file.path).then(coords => {
    req.coordinates = coords;
    next();
  }).catch(() => {
    console.log('No coordinates');
    req.coordinates = {};
    next();
  });
});

// insert to database
app.use('/upload', (req, res, next) => {
  console.log('insert is here');
  const data = [
    req.body.category,
    req.body.title,
    req.body.details,
    req.file.filename + '_thumb',
    req.file.filename + '_medium',
    req.file.filename,
    req.coordinates,
  ];
  db.insert(data, connection, next);
});

// get updated data form database and send to client
app.use('/upload', (req, res) => {
  db.select(connection, cb, res);
});

app.get('/images', (req, res) => {
  db.select(connection, cb, res);
});

app.patch('/images', (req, res) => {
  console.log('body', req.body);
  const update = db.update(req.body, connection);
  console.log('update', update);
  res.send('{"status": "update OK"}');
});

app.delete('/images/:mID', (req, res)=>{
  const mID = [req.params.mID];
  db.del(mID, connection);
  res.send('{"status": "delete OK"}');
});

app.search('/images/:category', (req, res) => {
  console.log('body', req.body);
  const category = [req.params.category];
  db.srch(category, connection);
  res.send('{"status": "search OK"}');
});

//app.listen(3000);
app.listen(8000); //normal http traffic
https.createServer(options, app).listen(3000); //https traffic
