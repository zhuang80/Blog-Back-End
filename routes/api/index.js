var router = require('express').Router();

//mount 'users' router on home page
router.use('/', require('./users'));

//mount 'profiles' router on path '/profiles'
router.use('/profiles', require('./profiles'));

//mount 'article' router on path '/article'
router.use('/articles', require('./articles'));

module.exports = router;
