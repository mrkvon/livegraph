'use strict';

module.exports = {
  users: {
    user: validateUser
  }
};

function validateUser(user, errors) {
  var errors = errors || {};
  var valid = true;
  //username should be at least 3 characters long

  var minLengthValid = validate(user.username.length >= 3, 'username', 'username should be at least 3 characters long', errors)
  var maxLengthValid = validate(user.username.length < 32, 'username', 'username should be less than 32 characters long', errors);
  var usernameRegex = /^[a-z0-9]+([_\-\.][a-z0-9]+)*$/;
  var emailRegex = /^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;

  var usernameRegexValid = validate(usernameRegex.test(user.username) === true, 'username', 'username should contain only a-z, 0-9, ., -, _', errors);
  var emailValid = validate(user.email.length < 1024 && emailRegex.test(user.email) === true, 'email', 'email is invalid', errors);
  var passwordValid = validate(user.password.length > 7 && user.password.length <= 256, 'password', 'password should be 8 - 256 characters long', errors);
  var passwordsMatch = validate(user.password === user.password2, 'password2', 'passwords don\'t match', errors);

  var valid = minLengthValid && maxLengthValid && usernameRegexValid && emailValid && passwordValid && passwordsMatch;
  return valid;
}

function validate(rule, field, errmsg, errors) {
  if(!rule){
    errors[field] = errors[field] || [];
    errors[field].push(errmsg);
    return false;
  }
  return true;
}
