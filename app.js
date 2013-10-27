
/**
 * Module dependencies.
 */

var express  = require('express')
  , routes   = require('./routes')
  , user     = require('./routes/user')
  , http     = require('http')
  , path     = require('path')
  , config   = require('./config')
  , graph    = require('fbgraph') // fb app 
  , mongoose = require('mongoose') // mongodb
  , moment   = require('moment');

mongoose.connect(config.mongolab); // connection to mongolab
// mongo USER schema
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var userSchema = new Schema({
    id  : ObjectId
  , user: Schema.Types.Mixed
  , date: { type: Date, default: Date.now }
});
var User = mongoose.model('User', userSchema);

var app = express();

// FB config
var conf = {
    client_id:      config.fb.client_id
  , client_secret:  config.fb.client_secret
  , scope:          config.fb.scope
  , redirect_uri:   config.fb.redirect_uri
};

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon(__dirname + '/public/img/favicon.jpg'));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// app.get('/', routes.index);
// app.get('/users', user.list);

app.get('/', function (req, res) {
  User.find(function(err, user) {
    res.render('bootstrap', { guests: user });
  });
});

app.get('/resume', function (req, res) {
  res.render('resume');
});

app.get('/resume/download/doc', function (req, res) {
  res.download(__dirname + '/public/Resume for Wilson Chang-1.doc');
});

app.get('/resume/download/pdf', function (req, res) {
  res.download(__dirname + '/public/Resume for Wilson Chang-1.pdf');
});

app.get('/hobbies', function (req, res) {
  res.render('hobbies');
});

/**
 * Connect to FB and mine user data
 */
app.get('/auth/facebook', function(req, res) {
  // we don't have a code yet
  // so we'll redirect to the oauth dialog
  if (!req.query.code) {
    var authUrl = graph.getOauthUrl({
        "client_id":     conf.client_id
      , "redirect_uri":  conf.redirect_uri
      , "scope":         conf.scope
    });

    if (!req.query.error) { //checks whether a user denied the app facebook login/permissions
      res.redirect(authUrl);
    } else {  //req.query.error == 'access_denied'
      res.send('access denied');
    }
    return;
  }
  graph.authorize({
      "client_id":      conf.client_id
    , "redirect_uri":   conf.redirect_uri
    , "client_secret":  conf.client_secret
    , "code":           req.query.code
  }, function (err, facebookRes) {
    // res.redirect('/UserHasLoggedIn');
    function errResp(e, r) {
      if (e) {
        console.log(e);
      }
      else {
        console.log(r);
      }
    }
    var params = { fields: 'id, name, first_name, middle_name, last_name, gender, locale, languages, link,'
                         + 'username, age_range, third_party_id, installed, timezone, updated_time,'
                         + 'verified, bio, birthday, cover, currency, devices, education, email, hometown,'
                         + 'interested_in, location, political, payment_pricepoints, favorite_athletes,'
                         + 'favorite_teams, picture, quotes, relationship_status, religion, security_settings,'
                         + 'significant_other, video_upload_limits, website, work' 
                 };
    graph.get("me", params,  function(err, resp) {
      // errResp(err, resp);
      var query = { 'user.first_name': resp.first_name }
      User.findOneAndUpdate(query, { user: resp, date: new Date() }, function (er, usr) {
        if (!usr) {
          var user = new User ({ user: resp });
          user.save(function(err) {
            if (err) console.log(err);
          });        
        }
        res.redirect('/')
      })
    });;
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
