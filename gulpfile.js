/* jshint -W127 */
var gulp = require('gulp');
var args = require('yargs').argv;
var browserSync = require('browser-sync');
var config = require('./gulp.config')(); // .js may be left out
var del = require('del');
var $ = require('gulp-load-plugins')({lazy: true});
var port = process.env.PORT || config.defaultPort;

gulp.task('help', $.taskListing);

gulp.task('default', ['help']);

gulp.task('vet', function () {
    log('Analysing source with JSHint and JSCS');

    return gulp
        .src(config.alljs)
        .pipe($.if(args.verbose, $.print()))
        .pipe($.jscs())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', {
            verbose: true
        }))
        .pipe($.jshint.reporter('fail'));
});

gulp.task('fonts', ['clean-fonts'], function () {
    log('Copying fonts');

    return gulp
        .src(config.fonts)
        .pipe(gulp.dest(config.build + 'fonts'));
});

gulp.task('images', ['clean-images'], function () {
    log('Compressing and copying images');

    return gulp
        .src(config.images)
        .pipe($.imagemin({optimizationLevel: 4})) // default is 3
        .pipe(gulp.dest(config.build + 'images'));
});

gulp.task('styles', ['clean-styles'], function () {
    log('Compiling Less --> CSS');

    return gulp
        .src(config.less)
        .pipe($.plumber())
        .pipe($.less())
        .pipe($.autoprefixer({
            browsers: ['last 2 version', '> 5%']
        }))
        .pipe(gulp.dest(config.temp));
});

gulp.task('clean', function (done) {
    var delConfig = [].concat(config.build, config.temp);
    log('Cleaning: ' + $.util.colors.blue(delConfig));
    del(delConfig, done);
});

gulp.task('clean-fonts', function (done) {
    clean(config.build + 'fonts/**/*.*', done);
});

gulp.task('clean-images', function (done) {
    clean(config.build + 'images/**/*.*', done);
});

gulp.task('clean-styles', function (done) {
    clean(config.temp + '**/*.css', done);
});

gulp.task('clean-code', function (done) {
    var files = [].concat(
        config.temp + '**/*.js',
        config.build + '**/*.html',
        config.build + 'js/**/*.js'
    );
    clean(files, done);
});

gulp.task('less-watcher', function () {
    gulp.watch([config.less], ['styles']); // watch the dirs (1st parm) and kick the tasks (2nd parm)
});

gulp.task('template-cache', ['clean-code'], function () {
    log('Creating AngularJS $templateCache');

    return gulp
        .src(config.htmlTemplates)
        .pipe($.minifyHtml({empty: true})) // remove any empty tags in HTML
        .pipe($.angularTemplatecache(
            config.templateCache.file, // location of the file
            config.templateCache.options
        ))
        .pipe(gulp.dest(config.temp));
});

gulp.task('wiredep', function () {
    log('Wire up the bower css, js and our app js into the html');
    var options = config.getWiredepDefaultOptions();
    var wiredep = require('wiredep').stream;

    return gulp
        .src(config.index)
        .pipe(wiredep(options))
        .pipe($.inject(gulp.src(config.js)))
        .pipe(gulp.dest(config.client));
});

gulp.task('inject', ['wiredep', 'styles'], function () {
    log('Wire up our app css into the html, after first calling Less and wiredep');

    return gulp
        .src(config.index)
        .pipe($.inject(gulp.src(config.css)))
        .pipe(gulp.dest(config.client));
});

gulp.task('serve-dev', ['inject'], function () {
    var isDev = true;

    var nodeOptions = {
        script: config.nodeServer, // app.js
        delayTime: 1, // 1 second delay
        env: {
            'PORT': port,
            'NODE_ENV': isDev ? 'dev' : 'build'
        },
        watch: [config.server] // define the files to restart on
    };

    return $.nodemon(nodeOptions)
        //.on('restart', ['vet'], function (ev) { // it seems that 'vet' is not kicked off
        .on('restart', function (ev) {
            log('*** nodemon restarting...');
            log('files changed on restart:\n' + ev);
            setTimeout(function () {
                browserSync.notify('BrowserSync is reloading now...');
                browserSync.reload({stream: false}); // don't pull the gulp stream (but you can if you want!)
            }, config.browserReloadDelay);
            log('*** nodemon restarted');
        })
        .on('start', function () {
            log('*** nodemon starting...');
            startBrowserSync();
            log('*** nodemon started');
        })
        .on('crash', function () {
            log('*** nodemon crashed: script crashed for some reason');
        })
        .on('exit', function () {
            log('*** nodemon exited cleanly');
        });
});

/////////////// FUNCTIONS \\\\\\\\\\\\\\\\\

function changeEvent(event) {
    // unfortunately this RegExp of John Papa does not work:
    // it gives UNDEFINED on config.source
    //var srcPattern = new RegExp('/*(?=/' + config.source + ')/');
    //log('srcPattern = ' + srcPattern);
    //log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
    log('File ' + event.path + ' ' + event.type);
}

function startBrowserSync() {
    if (args.nosync || browserSync.active) {
        return;
    }

    log('Starting browser-sync on port ' + port);

    gulp.watch([config.less], ['styles']) // watch the dirs (1st parm) and kick the tasks (2nd parm)
        .on('change', function (event) {
            changeEvent(event);
        });

    // don't watch Less files
    // inject changes only, otherwise everything
    // reloadDelay is in ms
    var options = {
        proxy: 'localhost:' + port,
        port: 3000,
        files: [
            config.client + '**/*.*',
            '!' + config.less,
            config.temp + '**/*.css'
        ],
        ghostMode: {
            clicks: true,
            location: true,
            forms: true,
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: 'gulp-patterns',
        notify: true,
        reloadDelay: 0
    };
    browserSync(options);
}

function clean(path, done) {
    log('Cleaning: ' + $.util.colors.blue(path));
    del(path, done);
}

function log(msg) {
    if (typeof (msg) === 'object') {
        for (var prop in msg) {
            if (msg.hasOwnProperty(prop)) {
                $.util.log($.util.colors.blue(prop + ': ' + msg[prop]));
            }
        }
    } else {
        $.util.log($.util.colors.blue(msg));
    }
}
