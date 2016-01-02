'use strict';

var chai = require('chai');
var expect = chai.expect;
var supertest = require('supertest');
var app = require('../app');
//var api = supertest('http://localhost:3000');
var api = supertest(app);

//chai.use(require('sinon-chai'));
//chai.use(require('chai-as-promised'));

var eUsername = 'existent-user';
var neUsername = 'nonexistent-user';
var newUsername = 'new-user';
var shortUsername = 'as';
var longUsername = 'verylongusernameverylongusername0123456789';
var invalidUsername = '.asdf';
var eEmail = 'existent@example.com';
var neEmail = 'nonexistent@example.com';
var newEmail = 'new@example.com';
var invalidEmail = 'invalid@email';
var validPassword = 'p4s5w0rD';
var differentPassword = '&&^#)(&)';
var invalidPassword = 'pwd';
var auth = 'Basic ' + new Buffer(eUsername + ':' + validPassword).toString('base64');
var crypto = require('../modules/auth/crypto');

var Database = require('arangojs');
var db = new Database({url: 'http://localhost:8529', databaseName: 'livegraph'});

beforeEach(function (done) {
  var hash, salt;
  var iterations = 10000;
  db.query('FOR u IN users REMOVE u IN users')
    .then(() => {
      return crypto.generateSalt();
    })
    .then((_salt) => {
      salt = _salt;
      return crypto.hashPassword(validPassword, salt, iterations);
    })
    .then((_hash) => {
      return db.query('INSERT @user IN users', {
        user: {
          username:eUsername,
          email: eEmail,
          hash: _hash,
          salt: salt,
          iterations: iterations
        }
      });
    })
    .then(() => {
      done();
    })
});

afterEach(function (done) {
  db.query('FOR u IN users REMOVE u IN users')
    .then(() => {
      done();
    });
});


before(function (done) {

  db.query('FOR u IN users REMOVE u IN users')
    .then(()=>{done();});
});

describe('GET /users', function () {
  it('should return a 200 response', function(done){
    api.get('/users')
      .set('Accept', 'application/json')
      .expect(200, done);
  });
  it('should be an object with keys and values', function (done) {
    api.get('/users')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function (err, res) {
        //expect(res.body).to.have.property('name');
        //expect(res.body.name).to.not.equal(null);
        done();
      });
  });
});

describe('POST /users', function () {
  context('which has valid new user data', function () {
    it('should return code 201 Created', function (done) {
      api.post('/users')
        .set('Accept', 'application/json')
        .send({username: newUsername, email: newEmail, password: validPassword, password2: validPassword})
        .expect(201, done);
    });
  });

  context('when user data don\'t pass', function () {
    context('with duplicit username', function () {
      it('should return code 303 and a proper error object', function (done) {
        api.post('/users')
          .send({username: eUsername, email: neEmail, password: 'asdfasdf', password2: 'asdfasdf'})
          .expect(303)
          .end(function (err, res) {
            if(err) return done(err);
            expect(res.body).to.have.property('errors');
            expect(res.body.errors).to.have.property('username');
            expect(res.body.errors.username).to.equal('username already exists');
            done();
          });
      });
    });
    context('with duplicit email', function () {
      it('should return code 303 and proper error object', function (done) {
        api.post('/users')
          .send({username: neUsername, email: eEmail, password: validPassword, password2: validPassword})
          .expect(303)
          .end(function (err, res) {
            if(err) return done(err);
            expect(res.body).to.have.property('errors');
            expect(res.body.errors).to.have.property('email');
            expect(res.body.errors.email).to.equal('email already exists');
            done();
          });
      });
    });
    context('when user data is invalid', function () {
      context('when username is invalid', function () {
        it('(too short username) should return code 400 Bad Request and proper error object', (done) => {
          api.post('/users')
            .set('Accept', 'application/json')
            .send({username: shortUsername, email: neEmail, password: validPassword, password2: validPassword})
            .expect(400)
            .end(function (err, res) {
              if(err) return done(err);
              expect(res.body).to.have.property('errors');
              expect(res.body.errors).to.have.property('username');
              expect(res.body.errors.username).to.include('username should be at least 3 characters long');
              done();
            });
        });
        it('(too long username) should return code 400 Bad Request and proper error object', (done) => {
          api.post('/users')
            .set('Accept', 'application/json')
            .send({username: longUsername, email: 'mail22@example.com', password: '', password2: ''})
            .expect(400)
            .end(function (err, res) {
              if(err) return done(err);
              expect(res.body).to.have.property('errors');
              expect(res.body.errors).to.have.property('username');
              expect(res.body.errors.username).to.include('username should be less than 32 characters long');
              done();
            });
        });
        it('(not passing regex) should return code 400 Bad Request and a proper error object', (done) => {
          api.post('/users')
            .set('Accept', 'application/json')
            .send({username: invalidUsername, email: 'mail22@example.com', password: '', password2: ''})
            .expect(400)
            .end(function (err, res) {
              if(err) return done(err);
              expect(res.body).to.have.property('errors');
              expect(res.body.errors).to.have.property('username');
              expect(res.body.errors.username).to.include('username should contain only a-z, 0-9, ., -, _');
              done();
            });
        });
      });

      context('when provided email is invalid', function () {
        it('should return code 400 Bad Request and proper error object', (done) => {
          api.post('/users')
            .set('Accept', 'application/json')
            .send({username: 'aasdf', email: invalidEmail, password: '', password2: ''})
            .expect(400)
            .end(function (err, res) {
              if(err) return done(err);
              expect(res.body).to.have.property('errors');
              expect(res.body.errors).to.have.property('email');
              expect(res.body.errors.email).to.include('email is invalid');
              done();
            });
        });

      });

      context('when provided password is invalid', function () {
        it('(bad length) should return code 400 Bad Request and a proper error object', (done) => {
          api.post('/users')
            .set('Accept', 'application/json')
            .send({username: 'user.test2', email: 'example3@example.com', password: invalidPassword, password2: invalidPassword})
            .expect(400)
            .end(function (err, res) {
              if(err) return done(err);
              expect(res.body).to.have.property('errors');
              expect(res.body.errors).to.have.property('password');
              expect(res.body.errors.password).to.include('password should be 8 - 256 characters long');
              done();
            });
        });

        it('(dictionary) is too easy to guess');

      });

      context('when passwords don\'t match', () => {
        it('should return 400 code Bad Request and a proper error object', (done) => {
          api.post('/users')
            .set('Accept', 'application/json')
            .send({username: 'user.test3', email: 'example2@example.com', password: validPassword, password2: differentPassword})
            .expect(400)
            .end(function (err, res) {
              if(err) return done(err);
              expect(res.body).to.have.property('errors');
              expect(res.body.errors).to.have.property('password2');
              expect(res.body.errors.password2).to.include('passwords don\'t match');
              done();
            });
        });
      });

    });
  });
});

describe('GET /users/:username', function () {
  context('when user with :username exists', function () {
    context('when authorized', function () {
      it('should return code 200 and a proper user object', function (done) {
        api.get('/users/' + eUsername)
          .set('Accept', 'application/json')
          .set('Authorization', auth)
          .expect(200)
          .end((err, res) => {
            if(err) return done(err);
            expect(res.body).to.have.property('username');
            expect(res.body.username).to.equal(eUsername);
            expect(res.body).to.have.property('email');
            expect(res.body).to.not.have.property('password');
            return done();
          });
      
      });
    });

    context('when unauthorized', () => {
      it('should return code 401 and limited user object', (done) => {
        api.get('/users/' + eUsername)
          .set('Accept', 'application/json')
          .expect(401)
          .end((err, res) => {
            if(err) return done(err);
            expect(res.body).to.have.property('username');
            expect(res.body.username).to.equal(eUsername);
            expect(res.body).to.not.have.property('email');
            expect(res.body).to.not.have.property('password');
            return done();
          });
      });
    });


  });

  context('user :username doesn\'t exist', function () {
    it('should return code 404', (done) => {
      api.get('/users/'+neUsername)
        .set('Accept', 'application/json')
        .expect(404)
        .end((err, res) => {
          if(err) return done(err);
          done();
        });
    });
  });
});

describe('PUT /users/:username', function () {
  context('', function () {});
});

describe('PATCH /users/:username', function () {});

describe('DELETE /users/:username', function () {
  context('when deletion is authorized', function () {
    context('when deletion is successful', function () {
      it('should return code 204 No Content', (done) => {
        api.delete('/users/' + eUsername)
          .set('Accept', 'application/json')
          .set('Authorization', auth)
          .expect(204)
          .end((err, res) => {
            if(err) return done(err);
            done();
          });
      });
    });
  });

  context('when deletion is unauthorized', function () {
    it('should return code 401 Unauthorized', function (done) {
      api.delete('/users/' + eUsername)
        .set('Accept', 'application/json')
        .expect(401)
        .end((err, res) => {
          if(err) return done(err);
          done();
        });
    });
  });
});
