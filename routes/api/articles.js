'use strict';

const router = require('express').Router();
const mongoose = require('mongoose');
const passport = require('passport');
const User = mongoose.model('User');
const Article = mongoose.model('Article');
const Comment = mongoose.model('Comment');
const auth = require('../auth');

/**
*Prepopulate req.article with the article's data when the :article parameter is
*contained within a route
*/
router.param('article', function(req, res, next, slug) {
  Article.findOne({slug: slug})
  .populate('author')
  .then(function(article) {
    if(!article) return res.sendStatus(404);
    req.article = article;
    return next();
  }).catch(next);
});

router.param('comment', function(req, res, next, id){
  Comment.findById(id).then(function(comment){
    if(!comment) return res.sendStatus(404);

    req.comment = comment;
    return next();
  }).catch(next);
});

//need to check authentication before attempting to save the article
router.post('/', auth.required, function(req, res, next){
  console.log('here');
  User.findById(req.payload.id).then(function(user){
    if(!user) return res.sendStatus(401);

    const article = new Article(req.body.article);
    article.author = user;

    return article.save().then(function(){
      console.log(article.author);
      return res.json({article: article.toJSONFor(user)});
    });
  }).catch(next);
});

router.get('/:article', auth.optional, function(req, res, next){
    Promise.all([
      req.payload ? User.findById(req.payload.id) : null,
      req.article.populate('author').execPopulate()
    ]).then(function(results){
      const user = results[0];

      return res.json({article: req.article.toJSONFor(user)});
    }).catch(next);

});

router.put('/:article', auth.required, function(req, res, next){
  User.findById(req.payload.id).then(function(user){
    if(req.article.author._id.toString() === req.payload.id.toString()){
      if(typeof req.body.article.title !== 'undefined'){
       req.article.title = req.body.article.title;
     }

     if(typeof req.body.article.description !== 'undefined'){
       req.article.description = req.body.article.description;
     }

     if(typeof req.body.article.body !== 'undefined'){
       req.article.body = req.body.article.body;
     }

     req.article.save().then(function(article){
       return res.json({article: article.toJSONFor(user)});
     }).catch(next);
   } else{
     return res.sendStatus(403);
   }
  })
});

router.delete('/:article', auth.required, function(req, res, next){
  User.findById(req.payload.id).then(function(){
    if(req.article.author._id.toString() === req.payload.id.toString()){
      return req.article.remove().then(function(){
        return res.sendStatus(204);
      });
    }else{
      return res.sendStatus(403);
    }
  })
});

router.post('/:article/favorite', auth.required, function(req, res, next){
  const articleId = req.article._id;

  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401); }

     return user.favorite(articleId).then(function(){
       return req.article.updateFavoriteCount().then(function(article){
        return res.json({article: article.toJSONFor(user)});
      });
    });
  }).catch(next);
});

router.delete('/:article/favorite', auth.required, function(req, res, next){
  const articleId = req.article._id;

  User.findById(req.payload.id).then(function (user){
    if (!user) { return res.sendStatus(401); }

    return user.unfavorite(articleId).then(function(){
      return req.article.updateFavoriteCount().then(function(article){
        return res.json({article: article.toJSONFor(user)});
      });
    });
  }).catch(next);
});

router.post('/:article/comments', auth.required, function(req, res, next){
  User.findById(req.payload.id).then(function(user){
    if(!user) return res.sendStatus(401);

    const comment = new Comment(req.body.comment);
    comment.article = req.article;
    comment.author = user;

    return comment.save().then(function(){
      req.article.comments = req.article.comments.concat([comment]);

      return req.article.save().then(function(article){
        res.json({comment: comment.toJSONFor(user)});
      });
    });
  }).catch(next);
});

router.get('/:article/comments', auth.required, function(req, res, next){
  Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then(function(user){

    return req.article.populate({
      path: 'comments',
      //populate the author for every comment
      populate: {
        path: 'author'
      },
      options: {
        sort: {
          createdAt: 'desc'
        }
      }
    }).execPopulate().then(function(article) {
      return res.json({comments: req.article.comments.map(function(comment){

        return comment.toJSONFor(user);
      })});
    });
  }).catch(next);
});

router.delete('/:article/comments/:comment', auth.required, function(req, res, next){
  if(req.comment.author.toString() === req.payload.id.toString()){
    req.article.comments.remove(req.comment._id);
    req.article.save()
      .then(Comment.findById(req.comment._id).remove().exec())
      .then(function(){
        res.sendStatus(204);
      });
  }else{
    res.sendStatus(403);
  }
});
module.exports = router;
