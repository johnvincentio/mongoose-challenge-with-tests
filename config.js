
/* jshint node: true */
/* jshint esnext: true */

exports.DATABASE_URL = process.env.DATABASE_URL ||
                       global.DATABASE_URL ||
                      'mongodb://localhost/blogDB';
exports.PORT = process.env.PORT || 8080;
