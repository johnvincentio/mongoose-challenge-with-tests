/*jshint browser: true, jquery: true */
/*jshint multistr: true */

var addTemplate = '\
<div>\
    <label for="blog-add-title">Title</label>\
    <input type="text" name="blog-add-title" id="blog-add-title" placeholder="">\
</div>\
<div>\
    <label for="blog-add-author">Author</label>\
    <input type="text" name="blog-add-author" id="blog-add-author" placeholder="eg donald duck">\
</div>\
<div>\
    <label for="blog-add-content">Content</label>\
    <input type="text" name="blog-add-content" id="blog-add-content" placeholder="eg blah blah blah">\
</div>\
<button type="submit">Add blog</button>\
 ';

var listTemplate = '\
<h3>{{1}}</h3>\
<hr>\
<div>{{3}}</div>\
<div>{{4}}</div>\
<div>\
    <button class="js-blog-update">\
        <span>update</span>\
    </button>\
    <button class="js-blog-delete">\
        <span>delete</span>\
    </button>\
</div>\
 ';

var listTemplateOuter = '<li class="js-each-blog" data-item-id="{{2}}" data-item-date="{{5}}">'+listTemplate+'</li>';

var updateTemplate = '\
<form class="js-blog-update-form">\
<div>\
    <label for="blog-update-title">Title</label>\
    <input type="text" name="blog-update-title" id="blog-update-title" value="{{1}}">\
</div>\
<div>\
    <label for="blog-update-author">Author</label>\
    <input type="text" name="blog-update-author" id="blog-update-author" value="{{2}}">\
</div>\
<div>\
    <label for="blog-update-content">Content</label>\
    <input type="text" name="blog-update-content" id="blog-update-content" value="{{3}}">\
</div>\
<div>\
    <button class="js-blog-save">\
        <span>Save</span>\
    </button>\
    <button class="js-blog-cancel">\
        <span>Cancel</span>\
    </button>\
</div>\
</form>\
 ';

var serverBase = window.location.href;
var BLOGS_URL = serverBase + 'blog';

$(function() {

    var $main = $('main');
    var $blog_list = $('#js-blog-list');
    var $add_form = $('#js-blog-add-form');

/* ----------------------------------- */
/* Add a blog                          */
/* ----------------------------------- */

    $add_form.submit(function(e) {
        e.preventDefault();
        var blog = {
            title: $(e.currentTarget).find('#blog-add-title').val(),
            author: $(e.currentTarget).find('#blog-add-author').val(),
            content: $(e.currentTarget).find('#blog-add-content').val()
        };
        console.log('Adding blog: ' + blog);
        $.ajax({
            method: 'POST',
            url: BLOGS_URL,
            data: JSON.stringify(blog),
            dataType: 'json',
            contentType: 'application/json',
            success: function() {
                $main.trigger('list-blogs');
            }
        });
        $('#blog-add-title').val('');
        $('#blog-add-author').val('');
        $('#blog-add-content').val('');
    });

/* ----------------------------------- */
/* Delete a blog and refresh blog list */
/* ----------------------------------- */

    $blog_list.on('click', '.js-blog-delete', function(e) {
        e.preventDefault();
        var id = $(e.currentTarget).closest('.js-each-blog').attr('data-item-id');
        console.log('Deleting blog `' + id + '`');
        $.ajax({
            url: BLOGS_URL + '/' + id,
            method: 'DELETE',
            success: function() {
                $main.trigger('list-blogs');
            }
        });
    });

/* ------------------------------------------- */
/* Update a blog.                              */
/*   Replace blog listing with an update form. */
/* ------------------------------------------- */

    $('#js-blog-list').on('click', '.js-blog-update', function(e) {
        e.preventDefault();
        var $li = $(e.currentTarget).closest('.js-each-blog');
        var id = $li.attr('data-item-id');
        $.ajax({
            url: BLOGS_URL + '/' + id,
            method: 'GET',
            success: function(data) {
                var html = updateTemplate.replace('{{1}}', data.title)
                    .replace('{{2}}', data.author)
                    .replace('{{3}}', data.content);
                $li.html(html);
            }
        });
    });

/* ----------------------------------- */
/* Update a blog was cancelled.        */
/*   1. Get blog from data store.      */
/*   2. Replace update form with the   */
/*        list blog item template.     */
/* ----------------------------------- */

    $blog_list.on('click', '.js-blog-cancel', function(e) {
        e.preventDefault();
        var $li = $(e.currentTarget).closest('.js-each-blog');
        var id = $li.attr('data-item-id');
        $.ajax({
            url: BLOGS_URL + '/' + id,
            method: 'GET',
            success: function(data) {
                var html = listTemplate.replace('{{1}}', data.title)
                    .replace('{{3}}', data.author)
                    .replace('{{4}}', data.content);
                $li.html(html);
            }
        });
    });

/* ----------------------------------- */
/* Save an updated blog.
    Get values from the form.
    Make a new blog object.
    Update the datastore.
    Replace the update template with the list blog item template
*/
/* ----------------------------------- */

    $blog_list.on('click', '.js-blog-save', function(e) {
        e.preventDefault();
        var $li = $(e.currentTarget).closest('.js-each-blog');
        var blog = {
            id: $li.attr('data-item-id'),
            title: $li.find('#blog-update-title').val(),
            author: $li.find('#blog-update-author').val(),
            content: $li.find('#blog-update-content').val(),
            publishDate: $li.attr('data-item-date')
        };
        console.log('Updating Blog :'+JSON.stringify(blog)+':');
        $.ajax({
            url: BLOGS_URL + '/' + blog.id,
            method: 'PUT',
            data: JSON.stringify(blog),
            dataType: 'json',
            contentType: 'application/json',
            success: function() {
                var html = listTemplate.replace('{{1}}', blog.title)
                    .replace('{{3}}', blog.author)
                    .replace('{{4}}', blog.content);
                $li.html(html);
            }
        });
    });

/* ----------------------------------- */
/* Custom events */
/* ----------------------------------- */

    $main.on('list-blogs', function() {
        $.getJSON(BLOGS_URL, function(items) {
            var itemsElement = items.map(function(item) {
                var html = listTemplateOuter.replace('{{1}}', item.title)
                    .replace('{{2}}', item.id)
                    .replace('{{3}}', item.author)
                    .replace('{{4}}', item.content)
                    .replace('{{5}}', item.publishDate);
                return html;
            });
            $blog_list.html(itemsElement);
        });
    });

/* ----------------------------------- */
/* Entry point                         */
/* ----------------------------------- */

    $add_form.html(addTemplate);   // add the add blog template
    $main.trigger('list-blogs');
});
