
/* jshint node: true */
/* jshint esnext: true */

'use strict';

const mongoose = require('mongoose');

const blogSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        firstName: String,
        lastName: String
    },
    created: {type: Date, default: Date.now}
}, {collection: 'blogs'});

blogSchema.methods.getAll = function() {
    return {
        id: this._id,
        title: this.title,
        content: this.content,
        author: this.author.firstName + ' ' + this.author.lastName,
        created: this.created
    };
};

blogSchema.methods.getAuthor = function() {
    return {
        id: this._id,
        author: this.author.firstName + ' ' + this.author.lastName
    };
};

blogSchema.virtual('fullName').get(function() {
    return `${this.author.firstName} ${this.author.lastName}`;});

const BlogModel = mongoose.model('Blog', blogSchema);

module.exports = {BlogModel};
