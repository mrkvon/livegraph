'use strict';

var express = require('express');
var router = express.Router();
var db = require('../modules/database');
var validate = require('../modules/validate');
//var auth = require('basic-auth');
var auth = require('../modules/auth');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/', function (req, res, next) {
  var user = req.body;
 
  var errors = {};

  var valid = validate.users.user(user, errors);


  if(valid === false) {
    res.status(400);
    return res.json({errors:errors});
  }

    
  return db.users.create(user)
    .then((code) => {
      if(code === 201) {
        res.status(201).json({});
        return;
      }
    })
    .then(null, (err) => {
      if(Number(err.message) === 303) {
        res.status(303).json({errors: err.body});
        return;
      }
      else return res.status(500).send();
    });
});

router.get('/:username', function (req, res, next) {
  //**authenticate
  var credentials = auth(req);
  if(!credentials) return res.status(401).end();
  
  var usrnm = req.params.username;
  //**read user data for authentication
  return auth.enticate()
  return db.users.read({username: credentials.name})
    .then((user) => {
      var authenticationSuccess = user.password === credentials.pass;
      if(authenticationSuccess) {
        return (credentials.name === usrnm) ? user : db.users.read({username: usrnm});
      }
      else {
        res.status(401).end();
        throw new Error('break');
      }
    }, (err) => {
      if(Number(err.message) === 404) {
        res.status(401).end();
        throw new Error('break');
      }
      throw err;
    })
    .then((user) => {
      res.status(200).json({username: user.username, email: user.email}).end();
    })
    .then(null, (err) => {
      if(Number(err.message) === 404){
        return res.status(404).end();
      }
      else if(err.message === 'break'){
        return;
      }
    });
});

router.delete('/:username', function (req, res, next) {

});

module.exports = router;
