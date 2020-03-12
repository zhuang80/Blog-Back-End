'use strict';

const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const secret = require('../config').secret;

const UserSchema = new mongoose.Schema({
  username: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true},
  email: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true},
  bio: String,
  image: String,
  hash: String,
  salt: String,
  favorites: [{type: mongoose.Schema.Types.ObjectId, ref: 'Article'}],
}, {timestamps: true});

UserSchema.plugin(uniqueValidator, {message: 'is already taken. '});

UserSchema.methods.setPassword = function(password){
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.validPassword = function(password){
  const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
  return this.hash === hash;
}

UserSchema.methods.generateJWT = function(){
  const today = new Date();
  let exp = new Date(today);
  exp.setDate(today.getDate() + 60);

//specify the jwt payload, we can access payload by req.payload
  return jwt.sign({
    email: this.email,
    id: this._id,
    username: this.username,
    exp: parseInt(exp.getTime() / 1000),
  }, secret);
};

UserSchema.methods.toAuthJSON = function(){
  return {
    username: this.username,
    email: this.email,
    token: this.generateJWT(),
    bio: this.bio,
    image: this.image,
    favorites: this.favorites
  };
};

/**
*@param user: the currently logged in user if it exists, used for following functionality
*/
UserSchema.methods.toProfileJSONFor = function(user){
  return {
    username: this.username,
    bio: this.bio,
    image: this.image ||  'https://static.productionready.io/images/smiley-cyrus.jpg',
    following: false
  };
};
/**
*@param id: the article ID the current user favorites
*/
UserSchema.methods.favorite = function(id){
  console.log("favorite");
  if(this.favorites.indexOf(id) === -1){
    console.log(id);
    this.favorites = this.favorites.concat([id]); //mongodb don't support .push() any more
  }
  console.log(this.favorites);
  return this.save();
};

UserSchema.methods.unfavorite = function(id){
  this.favorites.remove(id);
  return this.save();
};

UserSchema.methods.isFavorite = function(id){
  return this.favorites.some(function(favoriteId){
      return favoriteId.toString() === id.toString();
  });
};
mongoose.model('User', UserSchema);
