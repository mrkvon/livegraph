'use strict';

var express = require('express');
var router = express.Router();
var Database = require('arangojs');

var db = new Database({url: 'http://localhost:8529', databaseName: 'livegraph'});

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/', function (req, res, next) {
  var user = req.body;
 
  var errors = {};

  //username should be at least 3 characters long
  function validate (rule, field, errmsg, errors) {
    if(!rule){
      errors[field] = errors[field] || [];
      errors[field].push(errmsg);
      return false;
    }
    return true;
  }

  var minLengthValid = validate(user.username.length >= 3, 'username', 'username should be at least 3 characters long', errors)
  var maxLengthValid = validate(user.username.length < 32, 'username', 'username should be less than 32 characters long', errors);
  var usernameRegex = /^[a-z0-9]+([_\-\.][a-z0-9]+)*$/;
  var emailRegex = /^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;

  var usernameRegexValid = validate(usernameRegex.test(user.username) === true, 'username', 'username should contain only a-z, 0-9, ., -, _', errors);
  var emailValid = validate(user.email.length < 1024 && emailRegex.test(user.email) === true, 'email', 'email is invalid', errors);
  var passwordValid = validate(user.password.length > 7 && user.password.length <= 256, 'password', 'password should be 8 - 256 characters long', errors);
  var passwordsMatch = validate(user.password === user.password2, 'password2', 'passwords don\'t match', errors);

  var valid = minLengthValid && maxLengthValid && usernameRegexValid && emailValid && passwordValid && passwordsMatch;

  if(valid === false) {
    res.status(400);
    return res.json({errors:errors});
  }

  db.query('INSERT @user IN users', {user: user})
    .then(cursor => {
      //console.log(cursor);
      res.status(201);
      res.send('asdf');
    })
    .then(null, (err) => {
      //console.log('***************', err);
      //throw err;
      if(err.errorNum === 1210) {
        return db.query('LET un = (FOR u IN users FILTER u.username == @username RETURN u) LET uem = (FOR v in users FILTER v.email == @email RETURN v) RETURN {"username": LENGTH(un), "email": LENGTH(uem)}', {username: user.username, email: user.email})
        .then(cursor => {
          return cursor.all();
        })
        .then(ret => {
          var num = ret[0];
          res.status(303);
          var errors = {errors: {}}
          if(num.email === 1) errors.errors.email = 'email already exists';
          if(num.username === 1) errors.errors.username = 'username already exists';
          res.json(errors);
        });
      }
      else
        res.sendStatus(500);
    })
    .then(null, (err) => {
      console.log(err);
      res.sendStatus(500);
    });
});

module.exports = router;
