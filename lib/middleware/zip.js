/*!
 * Module dependencies.
 */
 
var fs = require('fs'),
    archiver = require('archiver'),
    path = require('path');

module.exports = function(options) {
    return function(req, res, next) {
        if (req.url.indexOf('/__api__/zip') === 0 && req.method === 'GET') {
            options.req = req;

            var archive = archiver('zip');

            archive.on('error', function(err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end();
            });

            archive.pipe(res);
            archive.directory(path.join(process.cwd(), 'www'), false);
            archive.finalize();
        }
        else {
            next();
        }
    };
};
