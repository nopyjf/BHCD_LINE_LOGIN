'use strict';

const express = require('express');
const passport = require('passport');
const LineStrategy = require('passport-line-auth').Strategy;
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cors = require('cors');

const app = express();

passport.use(new LineStrategy({
  channelID: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  callbackURL: 'https://bhcd-line-login.herokuapp.com/login/line/return',
  scope: ['profile', 'openid', 'email'],
  botPrompt: 'normal'
},
function(accessToken, refreshToken, params, profile, cb) {
  const {email} = jwt.decode(params.id_token);
  profile.email = email;
  return cb(null, profile);
}));

// Configure Passport authenticated session persistence.
passport.serializeUser(function(user, cb) {cb(null, user);});
passport.deserializeUser(function(obj, cb) {cb(null, obj);});

// Use application-level middleware for common functionality, including
// parsing, and session handling.
app.use(require('body-parser').urlencoded({extended: true}));
app.use(require('express-session')({secret: 'keyboard dog', resave: true, saveUninitialized: true}));

// Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Define routes.
app.get('/', (req, res) => {
  if (req.user == undefined) {
    res.redirect('/login/line')
  } else {
    res.status(200)
    res.end()
  }
})

app.get('/login/line', cors(), passport.authenticate('line'));

app.get('/login/line/return', cors(), passport.authenticate('line', {failureRedirect: '/'}), function(req, res, next) {
  axios({
    method: 'post',
    url: 'https://bhcd-api.herokuapp.com/user-info/new',
    headers: {
      'Content-Type' : 'application/json'
    },
    data: {
        "data" : {
          "id" : req.user.id,
          "displayName" : req.user.displayName,
          "email" : req.user.email,
          "pic" : req.user.pictureUrl
        }
    }
  }).then((response) => {
    console.log(response.data.data)
    res.status(200)
    res.end()
  }).catch((error) => {
    res.status(404)
    res.end()
  })
});

app.get('/logout', cors(), function(req, res){
  axios({
    method: 'post',
    url: 'https://bhcd-api.herokuapp.com/user-info/delete/id',
    headers: {
      'Content-Type' : 'application/json'
    },
    data: {
        "data" : {
          "id" : req.user.id
        }
    }
  }).then((response) => {
    res.status(200)
    res.end()
  }).catch((error) => {
    res.status(404)
    res.end()
  })
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
})
