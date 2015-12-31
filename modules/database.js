'use strict';

var Database = require('arangojs');

var db = new Database({url: 'http://localhost:8529', databaseName: 'livegraph'});

var users = {};

users.create = function (user) {
  return db.query('INSERT @user IN users', {user: user})
    .then(cursor => {
      //console.log(cursor);
      return 201;
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
          var err = new Error(303);
          var errors = {};
          if(num.email === 1) errors.email = 'email already exists';
          if(num.username === 1) errors.username = 'username already exists';
          err.body = errors;
          throw err;
        });
      }
    });
};

users.read = function (user) {
  return db.query('FOR u IN users FILTER u.username == @username RETURN u', {username: user.username})
    .then((cursor) => {
      return cursor.all();
    })
    .then(users => {
      if(users.length > 0) {
        return users[0];
      }
      else throw new Error(404);
    });
};

//console.log(module.exports);
module.exports = {users: users};
