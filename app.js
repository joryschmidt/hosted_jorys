var express = require('express');
var path = require('path');
var morgan = require('morgan');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var bluebird = require('bluebird');
var sessions = require('client-sessions');
var http = require('http');
var https = require('https');
var fs = require('fs');
var forcessl = require('express-force-ssl');
require('dotenv').config();

// Database connection

var host = process.env.IP || '0.0.0.0';
var db = `mongodb://${ host }/default`;

var mongoose_options = { 
  useNewUrlParser: true, 
  useUnifiedTopology: true
};

mongoose.Promise = bluebird;
mongoose.connect(process.env.MONGODB_URI || db, mongoose_options);

var app = express();

// Middleware for session functionality, and req.body

app.use(sessions({
  cookieName: 'session',
  secret: process.env.JORYS_SESSION,
  duration: 8 * 60 * 60 * 1000,
  activeDuration: 20 * 60 * 1000
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(forcessl);



// Skillsquire Routes



var skillsquire_main = require('./routes/skillsquire/main');
var skillsquire_admin = require('./routes/skillsquire/admin');
var skillsquire_resource = require('./routes/skillsquire/resource');
var skillsquire_user = require('./routes/skillsquire/user');


app.use('/skillsquire/admin', requireAdmin, express.static(path.join(__dirname, 'skillsquire', 'views/admin_views')));
app.use('/skillsquire/syntax', express.static(path.join(__dirname, 'skillsquire', 'views/syntax')));
app.use('/skillsquire', express.static(path.join(__dirname, 'skillsquire', 'views')));

app.use('/skillsquire/admin', requireAdmin, skillsquire_admin);
app.use('/skillsquire/resource', skillsquire_resource);
app.use('/skillsquire/user', requireLogin, skillsquire_user);
app.use('/skillsquire/', skillsquire_main);



// OPEM Routes



var opem_main = require('./routes/opem/main');
//var opem_admin = require('./routes/opem/admin');
var opem_user = require('./routes/opem/user');
var opem_event = require('./routes/opem/event');


app.use('/opem/login', express.static(path.join(__dirname, 'opem', 'static', 'login.html')));
app.use('/opem/signup', express.static(path.join(__dirname, 'opem', 'static', 'signup.html')));
app.use('/opem', express.static(path.join(__dirname, 'opem', 'views')));

// app.use('/admin', requireAdmin, admin);
app.use('/opem/user', requireOpemLogin, opem_user);
app.use('/opem/event', requireOpemLogin, opem_event);
app.use('/opem/', opem_main);



// MAIN ROUTE


app.use('/', express.static(__dirname));


// SERVER
var key = fs.readFileSync('/etc/letsencrypt/archive/jorys.io/privkey1.pem').toString(); 
var cert = fs.readFileSync('/etc/letsencrypt/archive/jorys.io/cert1.pem').toString();
var ca = fs.readFileSync('/etc/letsencrypt/archive/jorys.io/chain1.pem').toString();
var credentials = {
	key: key,
	cert: cert,
	ca: ca
};


http.createServer(app).listen(80);
https.createServer(credentials, app).listen(443);


//app.listen(port, function() {
 // console.log('App listening on port', port);
//});

// Custom middleware
function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.admin) {
    next();
  } else {
    res.redirect('/');
  }
}

function requireLogin(req, res, next) {
  if (req.session.user) next();
  else res.status(404).json(null);
}

function requireOpemLogin(req, res, next) {
  if (req.session.opem_user) next();
  else res.status(404).json(null);
}

