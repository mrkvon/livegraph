'use strict';

var chai = require('chai');
var expect = chai.expect;
var supertest = require('supertest');
var app = require('../app');
//var api = supertest('http://localhost:3000');
var api = supertest(app);

//chai.use(require('sinon-chai'));
//chai.use(require('chai-as-promised'));

before(function (done) {
  var Database = require('arangojs');

  var db = new Database({url: 'http://localhost:8529', databaseName: 'livegraph'});

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
        .send({username: 'test-user1', email: 'mail@example.com', password: 'p4s5w0rd', password2: 'p4s5w0rd'})
        .expect(201, done);
    });
  });

  context('without passing user data', function () {
    context('with duplicit username', function () {
      it('should return code 303 and a proper error object', function (done) {
        api.post('/users')
          .send({username: 'test-user1', email: 'mail@example2.com', password: 'asdfasdf', password2: 'asdfasdf'})
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
          .send({username: 'test-user2', email: 'mail@example.com', password: 'asdfasdf', password2: 'asdfasdf'})
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
        it('should return code 400 Bad Request and proper error object', (done) => {
          api.post('/users')
            .set('Accept', 'application/json')
            .send({username: 'te', email: 'mail22@example.com', password: '', password2: ''})
            .expect(400)
            .end(function (err, res) {
              if(err) return done(err);
              expect(res.body).to.have.property('errors');
              expect(res.body.errors).to.have.property('username');
              expect(res.body.errors.username).to.include('username should be at least 3 characters long');
              done();
            });
        });
        it('should return code 400 Bad Request and proper error object', (done) => {
          api.post('/users')
            .set('Accept', 'application/json')
            .send({username: 'teaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', email: 'mail22@example.com', password: '', password2: ''})
            .expect(400)
            .end(function (err, res) {
              if(err) return done(err);
              expect(res.body).to.have.property('errors');
              expect(res.body.errors).to.have.property('username');
              expect(res.body.errors.username).to.include('username should be less than 32 characters long');
              done();
            });
        });
        it('should return code 400 Bad Request and proper error object', (done) => {
          api.post('/users')
            .set('Accept', 'application/json')
            .send({username: 'teaaaaA$', email: 'mail22@example.com', password: '', password2: ''})
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
            .send({username: 'aasdf', email: 'eeeexample.com', password: '', password2: ''})
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
            .send({username: 'user.test2', email: 'example3@example.com', password: 'asdffds', password2: 'asdffds'})
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
            .send({username: 'user.test3', email: 'example2@example.com', password: '540(LJ7L0--$@', password2: '*()&(ljkwh()L:JK'})
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
  context('user :username exists', function () {
    it('returns code 200');
  });

  context('user :username doesn\'t exist', function () {
    it('returns code 404');
  });

});

describe('PUT /users/:username', function () {
  context('', function () {});
});

describe('PATCH /users/:username', function () {});

describe('DELETE /users/:username', function () {
  context('deletion successful', function () {
    it('returns code 204 No Content');
  });
});
