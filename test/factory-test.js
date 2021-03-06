/* global describe, beforeEach, afterEach */

var factory = require('..');
var should = require('chai').should();
var context = describe;
require('./utils/factories');
var adapters = require('./utils/adapters');
var models = require('./utils/models');

var Person = models.Person;
var Job = models.Job;
var Company = models.Company;
var Post = models.Post;
var BlogPost = models.BlogPost;
var User = models.User;

describe('factory', function () {
  describe('#attrs', function () {

    context('attributes defined by function', function () {
      it('correctly generates attrs', function (done) {
        factory.attrs('user', function (err, userAttrs) {
          if(err) done(err);
          userAttrs.should.eql({
            username: 'username_1',
            password: 'dummy_password',
            facebook: {},
            twitter: {}
          });

          done();
        });
      });

      it('correctly overrides attrs', function (done) {
        factory.attrs('user', {
          username: 'john_wayne',
          facebook: {id: 'john_wayne'}
        }, function (err, userAttrs) {
          if(err) done(err);
          userAttrs.should.eql({
            username: 'john_wayne',
            password: 'dummy_password',
            facebook: {id: 'john_wayne'},
            twitter: {}
          });

          done();
        });
      });

      it('correctly generates attrs for given buildOptions', function (done) {
        factory.attrs('user', {}, { facebookUser: true }, function (err, userAttrs) {
          if(err) done(err);
          userAttrs.should.eql({
            username: 'username_1',
            password: 'dummy_password',
            facebook: {
              id: 'dummy_fb_id_1',
              token: 'fb_token1234567',
              email: 'fb_email_1@fb.com',
              name: 'John Doe'
            },
            twitter: {}
          });

          done();
        });
      });

    });

    it('correctly generates attrs', function (done) {
      factory.attrs('job', function (err, jobAttrs) {
        jobAttrs.should.eql({
          title: 'Engineer',
          company: 'Foobar Inc.',
          duties: {
            cleaning: false,
            writing: true,
            computing: true
          }
        });

        done();
      });
    });

    it('correctly overrides attrs', function (done) {
      var overrides = {title: 'Developer'};

      factory.attrs('job', overrides, function (err, jobAttrs) {
        jobAttrs.title.should.eql(overrides.title);
        jobAttrs.company.should.eql('Foobar Inc.');

        done();
      });
    });

    it('correctly handles nested attributes', function (done) {
      factory.attrs('company', function (err, companyAttrs) {
        companyAttrs.employees.should.be.instanceof(Array);
        companyAttrs.employees.length.should.eql(3);

        companyAttrs.managers.should.be.instanceof(Array);
        companyAttrs.managers.length.should.eql(2);

        done();
      });
    });
  });

  describe('#build', function () {

    context('attributes defined by function', function () {
      it('builds the object correctly', function (done) {
        factory.build('user', {}, { twitterUser: true }, function (err, user) {
          if(err) done(err);

          (user instanceof User).should.be.true;
          user.username.should.eql('username_1');
          user.twitter.id.should.eql('dummy_tw_id_1');
          user.facebook.should.eql({});

          done();
        });
      });

      it('builds the object correctly with overrides', function (done) {
        factory.build('user', { twitter: { id: 'twitter_id' } }, { twitterUser: true }, function (err, user) {
          if(err) done(err);

          (user instanceof User).should.be.true;
          user.username.should.eql('username_1');
          user.twitter.id.should.eql('twitter_id');
          user.facebook.should.eql({});

          done();
        });
      });

    });

    it('builds, but does not save the object', function (done) {
      factory.build('job', function (err, job) {
        (job instanceof Job).should.be.true;
        job.title.should.eql('Engineer');
        job.company.should.eql('Foobar Inc.');
        job.should.not.have.property('saveCalled');

        done();
      });

      context('passing attributes as second argument', function () {
        it('sets them', function (done) {
          factory.build('job', {
            title: "Artist",
            company: "Bazqux Co.",
            duties: {cleaning: true, writing: false}
          }, function (err, job) {
            (job instanceof Job).should.be.true;
            job.title.should.eql('Artist');
            job.company.should.eql('Bazqux Co.');
            job.should.not.have.property('saveCalled');
            job.duties.cleaning.should.be.true;
            job.duties.writing.should.be.false;
            job.duties.computing.should.be.true;

            done();
          });
        });
      });

      context('defined with an afterBuild handler', function () {
        it('allows afterBuild to mutate the model', function (done) {
          factory.build('job_with_after_build', function (err, job) {
            job.title.should.eql('Astronaut');

            done();
          });
        });

        it('calls afterBuild with buildMany', function (done) {
          var num = 10;
          factory.buildMany('job_with_after_build', num, function (err, jobs) {
            jobs.forEach(function (job) {
              job.title.should.eql('Astronaut');
            });

            done();
          });
        });
      });

      context('factory containing an association', function () {
        it('is able to handle that', function (done) {
          factory.build('person', {age: 30}, function (err, person) {
            (person instanceof Person).should.be.true;
            person.should.not.have.property('saveCalled');
            person.name.should.eql('Person 1');
            person.age.should.eql(30);
            person.title.should.eql('Engineer', "assoc(model, attr) works as expected");
            (person.job instanceof Job).should.be.true;
            person.job.title.should.eql('Engineer');
            person.job.company.should.eql('Bazqux Co.');
            person.job.saveCalled.should.be.true;
            person.title.should.eql('Engineer');
            done();
          });
        });
      });

      context('factory containing a multi association', function () {
        it('is able to handle that', function (done) {
          factory.build('company', function (err, company) {
            (company instanceof Company).should.be.true;
            company.should.not.have.property('saveCalled');
            company.name.should.eql('Fruit Company');
            company.should.have.property('employees');
            (company.employees instanceof Array).should.be.true;
            company.employees.length.should.eql(3);
            (company.employees[0] instanceof Person).should.be.true;
            company.employees[0].name.should.eql('Person 1');
            (company.employees[1] instanceof Person).should.be.true;
            company.employees[1].name.should.eql('Person 2');
            (company.employees[2] instanceof Person).should.be.true;
            company.employees[2].name.should.eql('Person 3');
            (company.managers instanceof Array).should.be.true;
            company.managers.length.should.eql(2);
            (company.managers[0] instanceof Person).should.be.false;
            company.managers[0].should.eql('Person 4');
            (company.managers[1] instanceof Person).should.be.false;
            company.managers[1].should.eql('Person 5');
            done();
          });
        });
      });

      context('factory containing a sequence', function () {
        it('is able to handle that', function (done) {
          factory.build('post', function (err, post1) {
            factory.build('post', function (err, post2) {
              (post2 instanceof Post).should.be.true;
              (post2.num - post1.num).should.eql(1);
              post2.name.should.contain(post2.num);
              post2.email.should.have.string(post2.num);

              done();
            });
          })
        });
      });
    });
  });

  describe('#create', function () {

    it('creates objects with attributes defined by function', function (done) {
      factory.create('user', {}, { facebookUser: true, twitterUser: true }, function (err, user) {
        if(err) done(err);

        (user instanceof User).should.be.true;
        user.facebook.id.should.eql('dummy_fb_id_1');
        user.twitter.id.should.eql('dummy_tw_id_2');
        user.saveCalled.should.be.true;

        done();
      });
    });

    it('builds and saves the object', function (done) {
      factory.create('job', function (err, job) {
        (job instanceof Job).should.be.true;
        job.title.should.eql('Engineer');
        job.company.should.eql('Foobar Inc.');
        job.saveCalled.should.be.true;
        done();
      });
    });

    context('yields errors', function () {
      afterEach(function () {
        factory.setAdapter(null, 'faulty');
      });

      it('from the adapter', function (done) {
        factory.setAdapter(new adapters.FaultyAdapter(), 'faulty');
        factory.create('faulty', function (err, faulty) {
          (err instanceof Error).should.be.true;
          err.message.should.eql('Save failed');
          done();
        });
      });

      it('from the model', function (done) {
        factory.create('faulty', function (err, faulty) {
          (err instanceof Error).should.be.true;
          err.message.should.eql('Save failed');
          done();
        });
      });
    });

    context('passing attributes as second argument', function () {
      it('sets them', function (done) {
        factory.create('job', {
          title: "Artist",
          company: "Bazqux Co."
        }, function (err, job) {
          (job instanceof Job).should.be.true;
          job.title.should.eql('Artist');
          job.company.should.eql('Bazqux Co.');
          job.saveCalled.should.be.true;
          done();
        });
      });
    });

    context('defined with an afterCreate handler', function () {
      it('allows afterCreate to mutate the model', function (done) {
        factory.create('job_with_after_create', function (err, job) {
          job.title.should.eql('Astronaut');

          done();
        });
      });

      it('calls afterCreate with createMany', function (done) {
        var num = 10;
        factory.createMany('job_with_after_create', num, function (err, jobs) {
          jobs.forEach(function (job) {
            job.title.should.eql('Astronaut');
          });

          done();
        });
      });
    });
  });

  describe('#buildMany', function () {
    it('builds a given set of objects', function (done) {
      var attrsArray = [{title: 'Scientist'}, {}];
      factory.buildMany('job', attrsArray, function (err, jobs) {
        if (err) return done(err);
        jobs.length.should.eql(2);
        var job = jobs[0];
        (job instanceof Job).should.be.true;
        job.title.should.eql('Scientist');
        job.should.not.have.property('saveCalled');
        jobs[1].title.should.eql('Engineer');

        done();
      });
    });

    it('builds a given set of objects with build options', function (done) {
      var attrsArray = [{username: 'ironman'}, {username: 'hulk'}, {username: 'hawkeye'}];
      var buildOptionsArray = [{facebookUser: true}, {twitterUser: true}];
      factory.buildMany('user', attrsArray, buildOptionsArray, function (err, users) {
        if (err) return done(err);
        users.length.should.eql(3);
        var ironman = users[0];
        var hulk = users[1];
        var hawkeye = users[2];

        (ironman instanceof User).should.be.true;
        ironman.username.should.eql('ironman');
        should.exist(ironman.facebook.id);
        should.not.exist(ironman.twitter.id);
        ironman.should.not.have.property('saveCalled');

        hulk.username.should.eql('hulk');
        should.not.exist(hulk.facebook.id);
        should.exist(hulk.twitter.id);
        hulk.should.not.have.property('saveCalled');

        hawkeye.username.should.eql('hawkeye');
        should.not.exist(hawkeye.facebook.id);
        should.not.exist(hawkeye.twitter.id);
        hawkeye.should.not.have.property('saveCalled');

        done();
      });
    });

    it('builds more than the given set of objects', function (done) {
      var attrsArray = [{title: 'Scientist'}, {}];
      factory.buildMany('job', attrsArray, 10, function (err, jobs) {
        if (err) return done(err);
        jobs.length.should.eql(10);
        var job = jobs[0];
        (job instanceof Job).should.be.true;
        job.title.should.eql('Scientist');
        jobs[9].title.should.eql('Engineer');

        done();
      });
    });

    it('builds more than the given set of objects and build options', function (done) {
      var attrsArray = [{username: 'ironman', password: 'd0n7-7ry'}, {username: 'hulk'}, {username: 'hawkeye'}];
      var buildOptionsArray = [{facebookUser: true}, {twitterUser: true}];

      factory.buildMany('user', attrsArray, 10, buildOptionsArray, function (err, users) {
        if (err) return done(err);

        users.length.should.eql(10);
        var ironman = users[0];
        (ironman instanceof User).should.be.true;
        ironman.password.should.eql('d0n7-7ry');
        users[9].password.should.eql('dummy_password');
        should.not.exist(users[9].twitter.id);

        done();
      });
    });

    it('builds a number of objects', function (done) {
      factory.buildMany('job', 10, function (err, jobs) {
        if (err) return done(err);
        jobs.length.should.eql(10);
        var job = jobs[0];
        (job instanceof Job).should.be.true;
        jobs[9].title.should.eql('Engineer');

        done();
      });
    });

    it('builds a number of objects with the same attrs', function (done) {
      factory.buildMany('job', {title: 'Scientist'}, 10, function (err, jobs) {
        if (err) return done(err);
        jobs.length.should.eql(10);
        var job = jobs[0];
        (job instanceof Job).should.be.true;
        job.title.should.eql('Scientist');
        jobs[9].title.should.eql('Scientist');

        done();
      });
    });

    it('builds a number of objects with the same attrs and build options', function (done) {
      factory.buildMany('user', {password: 'bad-idea'}, 10, {twitterUser: true}, function (err, users) {
        if (err) return done(err);

        users.length.should.eql(10);
        var user = users[0];
        (user instanceof User).should.be.true;
        user.password.should.eql('bad-idea');
        should.exist(user.twitter.id);
        users[9].password.should.eql('bad-idea');
        should.exist(users[9].twitter.id);

        done();
      });
    });

    it('operates correctly with sequences', function (done) {
      factory.buildMany('post', 3, function (err, posts) {
        (posts[2].num - posts[1].num).should.eql(1);
        (posts[1].num - posts[0].num).should.eql(1);
        done();
      });
    });
  });

  describe('#createMany', function () {
    it('creates a given set of objects', function (done) {
      var attrsArray = [{title: 'Scientist'}, {}];
      factory.createMany('job', attrsArray, function (err, jobs) {
        if (err) return done(err);
        jobs.length.should.eql(2);
        var job = jobs[0];
        (job instanceof Job).should.be.true;
        job.title.should.eql('Scientist');
        job.saveCalled.should.be.true;
        jobs[1].title.should.eql('Engineer');
        jobs[1].saveCalled.should.be.true;

        done();
      });
    });

    it('creates a given set of objects with build options', function (done) {
      var attrsArray = [{username: 'ironman'}, {username: 'hulk'}, {username: 'hawkeye'}];
      var buildOptionsArray = [{facebookUser: true}, {twitterUser: true}];
      factory.createMany('user', attrsArray, buildOptionsArray, function (err, users) {
        if (err) return done(err);
        users.length.should.eql(3);
        var ironman = users[0];
        var hulk = users[1];
        var hawkeye = users[2];

        (ironman instanceof User).should.be.true;
        ironman.username.should.eql('ironman');
        should.exist(ironman.facebook.id);
        should.not.exist(ironman.twitter.id);
        ironman.saveCalled.should.be.true;

        hulk.username.should.eql('hulk');
        should.not.exist(hulk.facebook.id);
        should.exist(hulk.twitter.id);
        hulk.saveCalled.should.be.true;

        hawkeye.username.should.eql('hawkeye');
        should.not.exist(hawkeye.facebook.id);
        should.not.exist(hawkeye.twitter.id);
        hawkeye.saveCalled.should.be.true;

        done();
      });
    });

    it('creates more than the given set of objects', function (done) {
      var attrsArray = [{title: 'Scientist'}];
      factory.createMany('job', attrsArray, 10, function (err, jobs) {
        if (err) return done(err);
        jobs.length.should.eql(10);
        var job = jobs[0];
        (job instanceof Job).should.be.true;
        job.saveCalled.should.be.true;
        job.title.should.eql('Scientist');
        jobs[9].title.should.eql('Engineer');

        done();
      });
    });

    it('creates more than the given set of objects and build options', function (done) {
      var attrsArray = [{username: 'ironman', password: 'd0n7-7ry'}, {username: 'hulk'}, {username: 'hawkeye'}];
      var buildOptionsArray = [{facebookUser: true}, {twitterUser: true}];

      factory.createMany('user', attrsArray, 10, buildOptionsArray, function (err, users) {
        if (err) return done(err);

        users.length.should.eql(10);
        var ironman = users[0];
        (ironman instanceof User).should.be.true;
        ironman.saveCalled.should.be.true;
        ironman.password.should.eql('d0n7-7ry');
        users[9].password.should.eql('dummy_password');
        should.not.exist(users[9].twitter.id);
        users[9].saveCalled.should.be.true;

        done();
      });
    });

    it('creates a number of objects', function (done) {
      factory.createMany('job', 10, function (err, jobs) {
        if (err) return done(err);
        jobs.length.should.eql(10);
        var job = jobs[0];
        (job instanceof Job).should.be.true;
        job.saveCalled.should.be.true;
        job.title.should.eql('Engineer');
        jobs[9].title.should.eql('Engineer');

        done();
      });
    });

    it("allows the creation of many objects", function (done) {
      factory.createMany('job', 1000, function (err, jobs) {
        if (err) return done(err);
        jobs.length.should.eql(1000);

        done();
      });
    });
  });

  describe('#cleanup', function () {
    it('removes created models', function (done) {
      factory.create('person', function (err, person) {
        factory.create('job', function (err, job) {
          factory.cleanup(function (err) {
            person.destroyCalled.should.be.true;
            person.job.destroyCalled.should.be.true;
            job.destroyCalled.should.be.true;
            done(err);
          });
        });
      });
    });
  });

  describe('Factory class', function () {
    it('can be used to create new Factories', function () {
      var another = new factory.Factory();
      another.should.not.eql(factory);
      another.define('anotherModel', Job, {
        title: 'Scientist',
        company: 'Foobar Inc.'
      });
      another.build('anotherModel', function (err, job) {
        job.title.should.eql('Scientist');
      });
      factory.build('anotherModel', function (err) {
        should.exist(err);
      });
    });
  });

  describe('ObjectAdapter', function () {
    it('can be used to return raw objects', function () {
      var another = new factory.Factory();
      another.setAdapter(new factory.ObjectAdapter(), 'anotherModel');
      another.define('anotherModel', Job, {
        title: 'Scientist',
        company: 'Foobar Inc.'
      });
      another.build('anotherModel', function (err, job) {
        job.constructor.should.eql(Object);
      });
    });
  });

  describe('#buildSync', function () {

    it('builds, but does not save the object', function () {
      var post = factory.buildSync('blogpost');
      (post instanceof BlogPost).should.be.true;
      post.heading.should.eql('The Importance of Being Ernest');
      post.should.not.have.property('saveCalled');
    });

    context('passing attributes as second argument', function () {
      it('sets them', function () {
        var post = factory.buildSync('blogpost', {title: "Bazqux Co."});
        (post instanceof BlogPost).should.be.true;
        post.heading.should.eql('The Importance of Being Ernest');
        post.title.should.eql('Bazqux Co.');
        post.should.not.have.property('saveCalled');
      });
    });

    it('allows the use of buildOptions', function() {
      var user = factory.buildSync('user', {}, { facebookUser: true });
      (user instanceof User).should.be.true;
      user.facebook.id.should.exist;
    });

    it('allows synchronous function properties', function () {
      var post = factory.buildSync('blogpost');
      (post instanceof BlogPost).should.be.true;
      post.title.should.eql('The Importance of Being Ernest');
    });

    it('throws if the factory has async properties', function () {
      (function () {
        factory.buildSync('person');
      }).should.throw();
    });
  });

  describe('#withOptions', function () {
    it('chains to expose the builder functions', function () {
      var builder = factory.withOptions({key: 'value'});

      builder.should.have.property('build');
      builder.should.have.property('buildSync');
      builder.should.have.property('buildMany');
      builder.should.have.property('create');
      builder.should.have.property('createMany');

      var job = builder.buildSync('job', {title: 'Mechanic'});
      (job instanceof Job).should.be.true;
      job.company.should.eql('Foobar Inc.');
      job.title.should.eql('Mechanic');
    });

    it('passes options through to defined afterCreate handler', function () {
      var builder = factory.withOptions({key: 'value'});
      builder.create('job_with_after_create', function (err, job) {
        job._key.should.eql('value');
      });
    });

    it('allows for chaining to merge options', function () {
      var builder = factory.withOptions({key: 'value 2', anotherKey: 'value'});
      builder.create('job_with_after_create', function (err, job) {
        job._key.should.eql('value 2');
        job._anotherKey.should.eql('value');
      });
    });
  });

  describe('#promisify', function () {
    var promisifiedFactory;

    before(function () {
      var Promise = require('bluebird');
      promisifiedFactory = factory.promisify(Promise);
    });

    it('promisifies #build', function (done) {
      promisifiedFactory.build('job').then(function (job) {
        (job instanceof Job).should.be.true;
        job.title.should.eql('Engineer');
        job.company.should.eql('Foobar Inc.');
        done();
      });
    });

    it('works with chained builders too', function (done) {
      promisifiedFactory.withOptions({}).build('job').then(function (job) {
        (job instanceof Job).should.be.true;
        job.title.should.eql('Engineer');
        job.company.should.eql('Foobar Inc.');
        done();
      });
    });
  });
});
