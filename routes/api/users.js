'use strict';

const mongoose = require('mongoose');
const router = require('express').Router();
const passport = require('passport');
const User = mongoose.model('User');
const auth = require('../auth');

//register route
router.post('/users', auth.optional, function(req, res, next) {
  const user = new User();

  user.username = req.body.user.username;
  user.email = req.body.user.email;
  user.setPassword(req.body.user.password);

//save the user information and handle the error
  user.save().then(function(){
    return res.json({user: user.toAuthJSON()});
  }).catch(next);
});

//middleware function to handle validation errors from Mongoose
router.use(function(err, req, res, next){
  if(err.name === 'ValidationError') {
    return res.status(422).json({
      errors: Object.keys(err.errors).reduce(function(errors, key){
        errors[key] = err.errors[key].message;

        return errors;
      }, {})
    });
  }

  return next(err);
});

//log in route
router.post('/users/login', auth.optional, function(req, res, next){
  const {body: {user}} = req;

  if(!user.email){
    return res.status(422).json({errors: {email: "is required"}});
  }

  if(!user.password){
    return res.status(422).json({errors: {password: "is required"}});
  }

  passport.authenticate('local', {session: false}, function(err, user, info){
    if(err) { return next(err);}

    if(user) {
      user.token = user.generateJWT();
      return res.json({user: user.toAuthJSON()});
    }else {
      return res.status(422).json(info);
    }
  })(req, res, next);
});

router.get('/user', auth.required, function(req, res, next){
  User.findById(req.payload.id).then(function(user){
    if(!user) return res.sendStatus(401);

    return res.json({user: user.toAuthJSON()});
  }).catch(next);
});

router.put('/user', auth.required, function(req, res, next){
  User.findById(req.payload.id).then(function(user){
    if(!user) return res.sendStatus(401);

    if(typeof req.body.user.username !== 'undefined'){
      user.username = req.body.user.username;
    }

    if(typeof req.body.user.email !== 'undefined'){
      user.email = req.body.user.email;
    }

    if(typeof req.body.user.bio !== 'undefined'){
      user.bio = req.body.user.bio;
    }

    if(typeof req.body.user.image !== 'undefined'){
      user.image = req.body.user.image;
    }

    if(typeof req.body.user.password !== 'undefined'){
      user.setPassword(req.body.user.password);
    }

    return user.save().then(function(){
      return res.json({user: user.toAuthJSON()});
    })
  }).catch(next);
});



module.exports = router;
