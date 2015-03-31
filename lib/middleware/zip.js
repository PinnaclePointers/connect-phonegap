/*!
 * Module dependencies.
 */
 
var fs = require('fs'),
    archiver = require('archiver'),
    path = require('path'),
    mkpath = require('mkpath'),
    ncp = require('ncp').ncp;

module.exports = function(options) {
    return function(req, res, next) {
        if (req.url.indexOf('/__api__/zip') === 0 && req.method === 'GET') {
            options.req = req;

            var resPath = path.join(__dirname, '../../res/middleware'),
                outPath = path.join(__dirname, '../../tmp', options.req.sessionID),
                wwwPath = path.join(outPath, 'www');

            // helper function that returns the scripts to inject into each HTML page
            var injectScript = function() {
                var autoreloadScript = path.join(resPath, 'autoreload.js'),
                    consoleScript = path.join(resPath, 'consoler.js'),
                    homepageScript = path.join(resPath, 'homepage.js'),
                    refreshScript = path.join(resPath, 'refresh.js');

                var scripts = fs.readFileSync(autoreloadScript) +
                              fs.readFileSync(consoleScript) +
                              fs.readFileSync(homepageScript) +
                              fs.readFileSync(refreshScript);

                // replace default server address with this server address
                return scripts.replace(/127\.0\.0\.1:3000/g, options.req.headers.host);
            };

            // create the temporary www/
            if (!fs.existsSync(wwwPath)) {
                mkpath.sync(wwwPath, '0700');
            }

            var findHTMLFiles = function(read, write, file) {
                read.on('end', function(chunk) {
                    if (file.name.indexOf('.html') > -1) {
                        write.write(injectScript());
                    }
                });

                read.pipe(write);
            };

            // copy the app to our temporary temporary path
            ncp(path.join(process.cwd(), 'www'), wwwPath, { filter: '**/*', transform: findHTMLFiles}, function (e) {
                if (e) {
                    return callback(e);
                }

                var archive = archiver('zip', { store: false });
                archive.on('error', function(err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end();
                });

                archive.pipe(res);
                archive.directory(wwwPath, false);
                archive.finalize();

            });

        }
        else {
            next();
        }
    };
};
