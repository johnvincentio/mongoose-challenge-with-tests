/* jshint node: true */
/* jshint esnext: true */

/* global describe, it, before, after, beforeEach, afterEach */

'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

const {BlogModel} = require('../models');

/* jshint -W098 */
const should = chai.should();

chai.use(chaiHttp);

function generateData() {
    return {
        title: faker.lorem.words(),
        content: faker.lorem.sentence(),
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        created: faker.date.past()
    };
}

function seedData() {
    console.info('seeding blog data');
    const data = [];

    for (let i=1; i<=10; i++) {
        data.push(generateData());
    }
    // this will return a promise
    return BlogModel.insertMany(data);
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();      // TODO; check this against old...
}

describe('Blogs API resources', function() {

    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });

    describe('GET endpoint', function() {
/*
 strategy:
    1. get back all blogs returned by by GET request to `/blog`
    2. prove res has right status, data type
    3. prove the number of blogs we got back is equal to number in db.
*/
        let res;
        it('should return all blogs', function() {
            return chai.request(app)
                .get('/blog')               // 1
                .then(function(_res) {
                    res = _res;
                    res.should.have.status(200);    // 2
                    res.body.length.should.be.at.least(1);
                    return BlogModel.count();
                })
                .then(function(count) {     // 3
                    res.body.should.have.length.of(count);
                });
        });

/*
 strategy:
    1. get back all blogs returned by by GET request to `/blog`
    2. prove res has right status, data type
    3. get first document from the database
    4. verify fields have correct values
*/
       it('should return blogs with right fields', function() {
           let item;
            return chai.request(app)
                .get('/blog')               // 1
                .then(function(res) {
                    res.should.have.status(200);    // 2
    /* jshint -W030 */
                    res.should.be.json;
                    res.body.should.be.a('array');
                    res.body.length.should.be.at.least(1);

                    const expectedKeys = ['id', 'title', 'content', 'author', 'created'];
                    res.body.forEach(function(item) {
                        item.should.be.a('object');
                        item.should.include.keys(expectedKeys);
                    });
                    item = res.body[0];     // first record
                    return BlogModel.findById(item.id).exec();      // 3
                })
                .then(function(blog) {      // 4
                    blog.id.should.equal(item.id);
                    blog.title.should.equal(item.title);
                    blog.content.should.equal(item.content);
                    item.author.should.equal(`${blog.author.firstName} ${blog.author.lastName}`);
                    blog.created.toJSON().should.equal(item.created); // json formatted ISO date
                });
        });
    });

    describe('GET by ID endpoint', function() {
/*
 strategy:
    1. find one record
    2. get that record by id
    3. prove res has right status, data type
    4. verify fields have correct values
*/
        it('should get one blog by id', function() {
            let item;
            return BlogModel        // 1
                .findOne()
                .exec()
                .then(function(blog) {
                    item = blog;
                    return chai.request(app)
                        .get('/blog/'+item.id);     // 2
            })
            .then(function(res) {
                res.should.have.status(200);        // 3
                res.body.should.be.a('object');
                res.body.should.include.keys('id', 'title', 'content', 'author', 'created');
                res.body.id.should.equal(item.id);          // 4
                res.body.title.should.equal(item.title);
                res.body.content.should.equal(item.content);
                res.body.author.should.equal(`${item.author.firstName} ${item.author.lastName}`);
                res.body.created.should.equal(item.created.toJSON()); // json formatted ISO date
            });
        });
    });



    describe('POST endpoint', function() {
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
    });

    describe('PUT endpoint', function() {
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
    });

    describe('DELETE endpoint', function() {
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
});
