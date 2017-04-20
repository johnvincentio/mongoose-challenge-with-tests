/* jshint node: true */
/* jshint esnext: true */

/* global describe, it, before, after */

'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');

const {app, runServer, closeServer} = require('../server');

/* jshint -W098 */
const should = chai.should();

chai.use(chaiHttp);

describe('Blogs', function() {

    before(function() {
        return runServer();
    });

    after(function() {
        return closeServer();
    });

    it('should list blogs on GET', function() {
        // for Mocha tests, when we're dealing with asynchronous operations,
        // we must either return a Promise object or else call a `done` callback
        // at the end of the test. The `chai.request(server).get...` call is asynchronous
        // and returns a Promise, so we just return it.
        return chai.request(app)
            .get('/blog')
            .then(function(res) {
                res.should.have.status(200);
/* jshint -W030 */
                res.should.be.json;
                res.body.should.be.a('array');
                // because we create 3 items on app load
                res.body.length.should.be.at.least(1);
                const expectedKeys = ['id', 'title', 'content', 'author', 'created'];
                res.body.forEach(function(item) {
                    item.should.be.a('object');
                    item.should.include.keys(expectedKeys);
                });
            });
    });

    it('should get the first blog on a GET by id', function() {
        return chai.request(app)
            .get('/blog')
            .then(function(res) {
                res.should.have.status(200);
                const firstItem = {
                    id: res.body[0].id,
                    title: res.body[0].title,
                    content: res.body[0].content,
                    author: res.body[0].author,
                    created: res.body[0].created
                };
                return chai.request(app)
                    .get('/blog/'+firstItem.id)
                    .then(function(res) {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        res.body.should.include.keys('id', 'title', 'content', 'author', 'created');

                        res.body.id.should.equal(firstItem.id);
                        res.body.title.should.equal(firstItem.title);
                        res.body.content.should.equal(firstItem.content);
                        res.body.author.should.equal(firstItem.author);
                        res.body.created.should.equal(firstItem.created);
                });
            });
    });

    it('should add a blog on POST', function() {
        const newItem = {
            title: 'title-99', content: 'content-99', author: {firstName: 'Donald', lastName: 'Duck'}
        };
        return chai.request(app)
            .post('/blog')
            .send(newItem)
            .then(function(res) {
                res.should.have.status(201);
            /* jshint -W030 */
                res.should.be.json;
                res.body.should.be.a('object');
                res.body.should.include.keys('id', 'title', 'content', 'author', 'created');
                res.body.id.should.not.be.null;
                res.body.title.should.equal(newItem.title);
                res.body.content.should.equal(newItem.content);
                res.body.author.should.equal(newItem.author.firstName + ' ' + newItem.author.lastName);
        });
    });

    it('should update a blog on PUT', function() {
        const updateItem = {
            title: 'title-99',
            content: 'content-99',
            author: {firstName: 'first', lastName: 'last'}
        };
        return chai.request(app)
            .get('/blog')
            .then(function(res) {
                res.should.have.status(200);
                updateItem.id = res.body[0].id;
                updateItem.created = res.body[0].created;
                return chai.request(app)
                    .put('/blog/' + updateItem.id)
                    .send(updateItem);
            })
            .then(function(res) {
                res.should.have.status(201);
            /* jshint -W030 */
                res.should.be.json;
                res.body.should.be.a('object');
                res.body.should.include.keys('id', 'title', 'content', 'author', 'created');
                res.body.id.should.not.be.null;
                res.body.id.should.equal(updateItem.id);
                res.body.title.should.equal(updateItem.title);
                res.body.content.should.equal(updateItem.content);
                res.body.author.should.equal(updateItem.author.firstName + ' ' + updateItem.author.lastName);
                res.body.created.should.equal(updateItem.created);
            });
    });

    it('should delete the first blog on DELETE', function() {
        return chai.request(app)
            .get('/blog')
            .then(function(res) {
                res.should.have.status(200);
                return chai.request(app)
                    .delete('/blog/'+res.body[0].id);
            })
            .then(function(res) {
                res.should.have.status(204);
            });
    });
});
