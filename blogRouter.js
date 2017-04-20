/* jshint node: true */
/* jshint esnext: true */

'use strict';

const express = require('express');
const router = express.Router();

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const {BlogModel} = require('./models');

router.get('/', (req, res) => {
    BlogModel
        .find()
        .limit(10)
        .exec()
        .then(blogs => {
            res.json(blogs.map(blog => blog.getAll()));
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({message: 'Internal Server error'});
        });
});

router.get('/:id', (req, res) => {
    BlogModel
        .findById(req.params.id)
        .exec()
        .then(blog => {
            if (blog) {
                res.json(blog.getAll());
            }
            else {
                res.status(204).json({message: `Record ${req.params.id} not found`});
            }
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({message: 'Internal Server error'});
        });
});

router.get('/author', (req, res) => {
    BlogModel.findOne()
    .exec()
    .then(blog => {
        console.log(blog.fullName);     // virtual property getter
        res.json(blog.getAuthor());
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({message: 'Internal server error'});
    });
});

router.post('/', jsonParser, (req, res) => {
    const requiredFields = ['title', 'content', 'author'];
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!(field in req.body)) {
            const message = `Missing \`${field}\` in request body`;
            console.error(message);
            return res.status(400).send(message);
        }
    }

    BlogModel
        .create({
            title: req.body.title, content: req.body.content, author: req.body.author
        })
        .then(blog => res.status(201).json(blog.getAll()))
        .catch(err => {
            console.error(err);
            res.status(500).json({message: 'Internal Server error'});
        });
});

router.put('/:id', jsonParser, (req, res) => {
    console.log("Put request; req.params.id "+req.params.id);
        if (! (req.params.id && req.body.id && req.params.id === req.body.id)) {
        const message2 = (
            `Request path id (${req.params.id}) and request body id ${req.body.id}) must match`);
        console.error(message2);
        res.status(400).send(message2);
    }
    const requiredFields = ['id'];
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!(field in req.body)) {
            const message = `Missing \`${field}\` in request body`;
            console.error(message);
            return res.status(400).send(message);
        }
    }

    // we only support a subset of fields being updateable.
    // if the user sent over any of the updatableFields, we update those values in document.
    const toUpdate = {};
    const updateableFields = ['title', 'content', 'author'];
    updateableFields.forEach(field => {
        if (field in req.body) {
            toUpdate[field] = req.body[field];
        }
    });

    // {new: true} will return the updated version of the record.
    console.log(`Updating blog item \`${req.params.id}\``);
    BlogModel.findByIdAndUpdate(req.params.id, {$set: toUpdate}, {new: true})
        .exec()
        .then(item => res.status(201).json(item.getAll()))
        .catch(err => {
            console.error(err);
            res.status(500).json({message: 'Internal Server error'});
        });
});

router.delete('/:id', (req, res) => {
    BlogModel
        .findByIdAndRemove(req.params.id)
        .exec()
        .then(() => {
            console.log(`Deleting blog item \`${req.params.id}\``);
            res.status(204).end();
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({message: 'Internal Server error'});
        });
});

module.exports = router;
