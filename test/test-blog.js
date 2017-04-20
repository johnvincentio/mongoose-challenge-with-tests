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
    return new Promise((resolve, reject) => {
        console.warn('Deleting database');
        mongoose.connection.dropDatabase()
        .then(result => resolve(result))
        .catch(err => reject(err));
    });
//    return mongoose.connection.dropDatabase();
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
                .then(function(_res) {      // 2
                    res = _res;
                    res.should.have.status(200);
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
       it('should return fields with correct values', function() {
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

/*
 strategy:
    1. Create a non-existent Id
    2. get that record by id
    3. verify status
*/
        it('should fail to get record by a bad id', function() {
            let myid = mongoose.Types.ObjectId();       // 1
            return chai.request(app)
                .get(`/blog/${myid}`)     // 2
                .then(function(res) {
                    res.should.have.status(204);        // 3
                });
        });
    });

    describe('POST endpoint', function() {
/*
 strategy:
    1. create a new record
    2. post the record
    3. prove res has right status, data type
    4. verify fields have correct values
    5. get the record by id
    6. verify record is identical to the new record.
*/
        it('should add a new blog', function() {
            let created;
            const item = generateData();     // 1

            return chai.request(app)
                .post('/blog')              // 2
                .send(item)
                .then(function(res) {
                    res.should.have.status(201);        // 3
                /* jshint -W030 */
                    res.should.be.json;
                    res.body.should.be.a('object');
                    res.body.should.include.keys('id', 'title', 'content', 'author', 'created');
                    res.body.id.should.not.be.null;
                    res.body.title.should.equal(item.title);     // 4
                    res.body.content.should.equal(item.content);
                    res.body.author.should.equal(`${item.author.firstName} ${item.author.lastName}`);
                    created = res.body.created;
                    return BlogModel.findById(res.body.id).exec();      // 5
                })
                .then(function(blog) {      // 6
                    blog.title.should.equal(item.title);
                    blog.content.should.equal(item.content);
                    blog.author.firstName.should.equal(item.author.firstName);
                    blog.author.lastName.should.equal(item.author.lastName);
                    blog.created.toJSON().should.equal(created); // json formatted ISO date
                });
        });
    });

    describe('POST endpoint error conditions', function() {

/*
strategy:
1. create a new record missing title field
2. make a POST request with that record
3. ensure status code = 400
*/
        it('should fail to add a new blog - missing title', function() {
            const newBlog = generateData();
            delete newBlog.title;
            chai.request(app)
                .post('/blog')
                .send(newBlog)
            .then(() => {
                throw Error('should have failed with a 400');
            })
            .catch(e => {
                e.status.should.equal(400);
            });
        });

        /*
strategy:
1. create a new record missing content field
2. make a POST request with that record
3. ensure status code = 400
*/
        it('should fail to add a new blog - missing content', function() {
            const newBlog = generateData();
            delete newBlog.content;
            chai.request(app)
                .post('/blog')
                .send(newBlog)
            .then(() => {
                throw Error('should have failed with a 400');
            })
            .catch(e => {
                e.status.should.equal(400);
            });
        });

/*
strategy:
1. create a new record missing firstName field
2. make a POST request with that record
3. ensure status code = 400
*/
        it('should fail to add a new blog - missing firstName', function() {
            const newBlog = generateData();
            delete newBlog.author.firstName;
            chai.request(app)
                .post('/blog')
                .send(newBlog)
            .then(() => {
                throw Error('should have failed with a 400');
            })
            .catch(e => {
                e.status.should.equal(400);
            });
        });

/*
strategy:
1. create a new record missing lastName field
2. make a POST request with that record
3. ensure status code = 400
*/
        it('should fail to add a new blog - missing lastName', function() {
            const newBlog = generateData();
            delete newBlog.author.lastName;
            chai.request(app)
                .post('/blog')
                .send(newBlog)
            .then(() => {
                throw Error('should have failed with a 400');
            })
            .catch(e => {
                e.status.should.equal(400);
            });
        });
    });

    describe('PUT endpoint', function() {
/*
Strategy:
1. Get an existing blog
2. Put request to update the data.
3. Prove blog data returned by request is the same data used in the update.
4. Get record from database by id
5. Prove blog data in database is the same data used in the update.
*/
        it('should update fields you send over', function() {
            const updateData = generateData();

            return BlogModel        // 1
                .findOne()
                .exec()
                .then(function(blog) {
                    updateData.id = blog.id;
                    updateData.created = blog.created;
                    return chai.request(app)
                        .put(`/blog/${updateData.id}`)      // 2
                        .send(updateData);
            })
            .then(function(res) {
                res.should.have.status(201);
            /* jshint -W030 */
                res.should.be.json;
                res.body.should.be.a('object');
                res.body.should.include.keys('id', 'title', 'content', 'author', 'created');
                res.body.id.should.equal(updateData.id);          // 3
                res.body.title.should.equal(updateData.title);
                res.body.content.should.equal(updateData.content);
                res.body.author.should.equal(`${updateData.author.firstName} ${updateData.author.lastName}`);
                res.body.created.should.equal(updateData.created.toJSON());
                return BlogModel.findById(updateData.id).exec();      // 4
            })
            .then(function(blog) {      // 5
                blog.id.should.equal(updateData.id);
                blog.title.should.equal(updateData.title);
                blog.content.should.equal(updateData.content);
                blog.author.firstName.should.equal(updateData.author.firstName);
                blog.author.lastName.should.equal(updateData.author.lastName);
                blog.created.toJSON().should.equal(updateData.created.toJSON());
            });
        });
    });

    describe('DELETE endpoint', function() {
/*
Strategy:
1. Get one record
2. make a delete request for that record's id
3. assert that response has correct status code
4. get the record by id
5. prove that record does not exist
*/
        it('should delete by id', function() {
            let item;
            return BlogModel        // 1
                .findOne()
                .exec()
                .then(function(blog) {
                    item = blog;
                    return chai.request(app).delete(`/blog/${blog.id}`);   // 2
                })
                .then(function(res) {
                    res.should.have.status(204);        // 3
                    return BlogModel.findById(item.id).exec();      // 4
                })
                .then(function(_blog) {      // 5
                    should.not.exist(_blog);
                });
        });

/*
Strategy:
1. Create a non-existent Id
2. make a delete request for that id
3. assert that response has correct status code
*/
        it('delete blog by non-existent id', function() {
            let myid = mongoose.Types.ObjectId();       // 1
            return chai.request(app).delete(`/blog/${myid}`)       // 2
            .then(res => {
                res.should.have.status(204);        // 3
            });
        });
    });
});
