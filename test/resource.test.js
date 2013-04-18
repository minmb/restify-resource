
var assert = require('assert')
  , restify = require('restify')
  , Resource = require('..')
  , request = require('supertest')
  , batch = require('./support/batch');

describe('app.resource(name)', function(){
  it('should return a pre-defined resource', function(){
    var app = restify.createServer();
    app.resource('users', { index: function(){} });
    app.resource('users').should.be.an.instanceof(Resource);
    app.resource('foo').should.be.an.instanceof(Resource);
  })
})

describe('app.VERB()', function(){
  it('should map additional routes', function(done){
    var app = restify.createServer();

    app.use(restify.bodyParser());

    var pets = app.resource('pets');
    var toys = app.resource('toys');
    var values = ['balls', 'platforms', 'tunnels'];

    toys.get('/types', function(req, res){
      res.send(values);
    });

    request(app)
    .get('/toys/types')
    .expect('["balls","platforms","tunnels"]', done);
  })
})

describe('app.resource()', function(){
  it('should map CRUD actions', function(done){
    var app = restify.createServer();
    var next = batch(done);

    var ret = app.resource('forums', require('./fixtures/forum'));
    ret.should.be.an.instanceof(Resource);

    request(app)
    .get('/forums')
    .expect('"forum index"', next());

    request(app)
    .get('/forums/new')
    .expect('"new forum"', next());

    request(app)
    .post('/forums')
    .expect('"create forum"', next());
    
    request(app)
    .get('/forums/5')
    .expect('"show forum 5"', next());
    
    request(app)
    .get('/forums/5/edit')
    .expect('"edit forum 5"', next());
    
    request(app)
    .del('/forums/5')
    .expect('"destroy forum 5"', next());
  })

  it('should support root resources', function(done){
     var app = restify.createServer();
     var next = batch(done);
     var forum = app.resource(require('./fixtures/forum'));
     var thread = app.resource('threads', require('./fixtures/thread'));
     forum.map(thread);
  
     request(app)
     .get('/')
     .expect('"forum index"', next());
  
     // request(app)
     // .get('/12')
     // .expect('show forum 12', next());
  
     // request(app)
     // .get('/12/threads')
     // .expect('thread index of forum 12', next());
  
     // request(app)
     // .get('/1/threads/50')
     // .expect('show thread 50 of forum 1', next());
   })
  
   describe('"id" option', function(){
     it('should allow overriding the default', function(done){
       var app = restify.createServer();
       var next = batch(done);
     
       app.resource('users', {
         id: 'uid',
         show: function(req, res){
           res.send(req.params.uid);
         }
       });
  
       request(app)
       .get('/users')
       .expect(404, next());
  
       request(app)
       .get('/users/10')
       .expect('"10"', next());
     })
   })
  
   describe('with several segments', function(){
     it('should work', function(done){
       var app = restify.createServer();
       var next = batch(done);
       var cat = app.resource('api/cat', require('./fixtures/cat'));
  
       request(app)
       .get('/api/cat')
       .expect('"list of cats"', next());
  
       request(app)
       .get('/api/cat/new')
       .expect('"new cat"', next());
     })
   })
  
   it('should allow configuring routes', function(done){
     var app = restify.createServer();
     var next = batch(done);
     var Forum = require('./fixtures/forum').Forum;
     
     function load(id, fn) { fn(null, "User"); }
  
     var actions = {
       login: function(req, res){
         res.end('login');
       },
       logout: function(req, res){
         res.end('logout');
       }
     };
     
     var users = app.resource('users', actions, { load: load });
     users.map('get', 'login', actions.login);
     users.map('get', '/logout', actions.logout);
  
     request(app)
     .get('/users/1/login')
     .expect('login', next());
  
     request(app)
     .get('/users/logout')
     .expect('logout', next());
   })
  
   describe('autoloading', function(){
     describe('when no resource is found', function(){
       it('should not invoke the callback', function(done){
          var app = restify.createServer();
       
          function load(id, fn) { fn(); }
          var actions = { show: function(){
            assert.fail('called show when loader failed');
          }};
       
          app.resource('pets', actions, { load: load });
  
          request(app)
          .get('/pets/0')
          .expect(404, done);
       })
     })
  
     describe('when a resource is found', function(){
       it('should invoke the callback', function(done){
         var app = restify.createServer();
         var Forum = require('./fixtures/forum').Forum;
       
         var actions = { show: function(req, res){
           res.end(req.forum.title);
         }};
       
         var forum = app.resource('forum', actions, { load: Forum.get });
  
         request(app)
         .get('/forum/12')
         .expect('Ferrets', done);
       })
  
       it('should work recursively', function(done){
         var app = restify.createServer();
         var Forum = require('./fixtures/forum').Forum;
         var Thread = require('./fixtures/thread').Thread;
       
         var actions = { show: function(req, res){
           res.end(req.forum.title + ': ' + req.thread.title);
         }};
       
         var forum = app.resource('forum', { load: Forum.get });
         var threads = app.resource('thread', actions, { load: Thread.get });
       
         forum.add(threads);
  
         request(app)
         .get('/forum/12/thread/1')
         .expect('Ferrets: Tobi rules', done);
       })
     })
   })
})

describe('Resource#add(resource)', function(){
  it('should support nested resources', function(done){
    var app = restify.createServer();

    var users = app.resource('users');
    var pets = app.resource('pets', require('./fixtures/pets'));
    users.add(pets);

    request(app)
    .get('/users/1/pets')
    .expect('["tobi","jane","loki"]', done);
  })
})