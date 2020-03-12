'use strict';

const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const slug = require('slug');

const ArticleSchema = new mongoose.Schema({
  slug: {type: String, lowercase: true, unique: true},
  title: String,
  description: String,
  body: String,
  favoritesCount: {type: Number, default: 0},
  tagList: [{type: String}],
  author:{ type: mongoose.Schema.Types.ObjectId, ref:'User'}
},{timestamps: true});

ArticleSchema.plugin(uniqueValidator, {message: 'is already taken'});

ArticleSchema.methods.slugify = function(){
  this.slug = slug(this.title) + '-' + (Math.random() * Math.pow(36, 6) | 0).toString(36);
};

//generate a slug for the article before validation
ArticleSchema.pre('validate', function(next){
  if(!this.slug){
    this.slugify();
  }
  next();
});

ArticleSchema.methods.toJSONFor = function(user) {
  return {
    slug: this.slug,
    title: this.title,
    description: this.description,
    body: this.body,
    createdAt: this.createdAt,
    updateAt: this.updateAt,
    tagList: this.tagList,
    favoritesCount: this.favoritesCount,
    author: this.author.toProfileJSONFor(user)
  }
};
mongoose.model('Article', ArticleSchema);
