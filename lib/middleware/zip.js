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
                res.write('500 - error in zipping operation\n');
                res.end();
            });

            archive.directory(path.join(process.cwd(), 'www'), false);

            archive.on('finish', function(){
                res.writeHead(200, { 'Content-Type': 'application/zip' });
                archive.pipe(res);
            });

            archive.finalize();

/*
            archive.on('data', function(chunk) {
              console.log(chunk.toString());
            });
*/

        }
        else {
            next();
        }
    };
};
