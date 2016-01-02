'use strict';

var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var express = require('express');
var router = express.Router();
var db = require('../modules/database');
var validate = require('../modules/validate');
//var auth = require('basic-auth');
var auth = require('../modules/auth/crypto');


passport.use(new BasicStrategy(
  function (username, password, done) {
    var user;
    db.users.read({username: username})
      .then((_user) => {
        user = _user;
        
        return auth.hashPassword(password, user.salt, user.iterations);
      })
      .then((hash) => {
        var authed = auth.compareHashes(hash, user.hash);
        if(authed === true) {
          return done(null, {username: user.username, email: user.email});
        }
        else return done(null, false);
      }, (err) => {
        if(Number(err.message) === 404) {
          return done(null, false);
        }
        return done(err);
      });
  }
));

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
  
  var hash;
  var salt;
  const ITERATIONS = 10000;
  
  return auth.generateSalt()
    .then((_salt) => {
      salt = _salt;
      console.log(salt);
      return auth.hashPassword(user.password, salt, ITERATIONS);
    })
    .then((_hash) => {
      hash = _hash;
      return db.users.create({
        username: user.username,
        email: user.email,
        hash: hash,
        salt: salt,
        iterations: ITERATIONS
      });
    })
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
  passport.authenticate('basic', function (err, __user, info) {
    if(err) res.status(500).end(err);

    var errorBreak = new Error('break');
    var usrnm = req.params.username;
    return db.users.read({username: usrnm})
      .then((user) => {
        var userExists = !!__user;
        var canViewProfile = __user && __user.username === user.username;
        if(canViewProfile) {
          res.status(200).json({username: user.username, email: user.email}).end();
        }
        else {
          //** the user is not authorized to viewProfile (just info about username existence)
          res.status(401).json({username: user.username}).end();
        }
        throw errorBreak;
      })
      .then(null, (err) => {
        if(Number(err.message) === 404){
          return res.status(404).end();
        }
        else if(err.message === 'break'){
          return;
        }
        else {
          console.log(err);
          res.status(500).end();
        }
      });
  })(req, res, next);
});

router.delete('/:username', function (req, res, next) {
  passport.authenticate('basic', function (err, __user, info) {
    if(err) return next(err);
    var username = req.params.username;
    var canDelete = __user && __user.username === username;
    
    if(canDelete) {
      
      return db.users.delete({username: username})
        .then(() => {
          res.status(204).json();
        })
        .then(null, (err) => {
          return next(err);
        });
    }
    else return res.status(401).json();
    //res.status(204).json();
  })(req, res, next);
});

module.exports = router;
