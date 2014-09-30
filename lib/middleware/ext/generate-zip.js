/*!
 * Module dependencies.
 */
 
var archiver = require('archiver'),
    fs = require('fs'),
    path = require('path'),
    findit = require('findit'),
    mkpath = require('mkpath'),
    ncp = require('ncp').ncp,
    os = require('os');

/**
 * Handle the /zip route
 *
 * Generates a zip archive of the served application, which is deployed
 * on the device.
 *
 * Options:
 *   - `options.req` is the request object provided by `http`
 */

module.exports = function(options, callback) {
    // source path to the user's app
    var source = {};
    source.path = path.join(process.cwd());
    source.www = path.join(source.path, 'www');

    // destination path to the temp directory and app archive
    var destination = {};
    destination.path = path.join(os.tmpdir(), 'connect-phonegap', options.req.sessionID);
    destination.www = path.join(destination.path, 'www');
    destination.zip = path.join(destination.path, 'www.zip');

    // create the temporary directory
    if (!fs.existsSync(destination.www)) {
        mkpath.sync(destination.www, '0700');
    }

    // copy the app to our temporary temporary path
    ncp(source.www, destination.www, { filter: '**/*' }, function (e) {
        if (e) {
            return callback(e);
        }

        // find the html files to inject our scripts into
        var finder = findit(destination.www);
        finder.on('file', function (file, stat) {
            var destPath = path.join(destination.www, file.split('www')[1]);
            if (file.indexOf('.html') > -1) {
                var writer = fs.createWriteStream(destPath, { 'flags': 'a' });
                writer.end(injectScript());
            }
        });

        // after modifying the html files, we will create a zip archive of the app
        finder.on('end', function(){
            var archive = archiver('zip'),
                output = fs.createWriteStream(destination.zip);

            // finished creating zip
            output.on('close', function () {
                options.emitter.emit('log', 'created app archive (' + archive.pointer(), 'bytes) mwb');
                callback(null, { zipPath: destination.zip });
            });

            // error creating zip
            archive.on('error', function(e) {
                options.emitter.emit('error', e);
                callback(e);
            });

            // create the zip
            archive.pipe(output);
            archive.bulk([
                { expand: true, cwd: destination.www, src: ['**/*'] }
            ]);
            archive.finalize();
        });

        // helper function that returns the scripts to inject into each HTML page
        function injectScript() {
            var sourcePath = path.join(__dirname, '../../../res/middleware'),
                autoreloadScript = path.join(sourcePath, 'autoreload.js'),
                consoleScript = path.join(sourcePath, 'consoler.js'),
                homepageScript = path.join(sourcePath, 'homepage.js'),
                refreshScript = path.join(sourcePath, 'refresh.js');

            var scripts = fs.readFileSync(autoreloadScript) +
                          fs.readFileSync(consoleScript) +
                          fs.readFileSync(homepageScript) +
                          fs.readFileSync(refreshScript);

            // replace default server address with this server address
            return scripts.replace(/127\.0\.0\.1:3000/g, options.req.headers.host);
        }
    });
};