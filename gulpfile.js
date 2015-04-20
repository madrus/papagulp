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
    log('VET: analysing source with JSHint and JSCS');

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
    log('FONTS: copying fonts');

    return gulp
        .src(config.fonts)
        .pipe(gulp.dest(config.build + 'fonts'));
});

gulp.task('images', ['clean-images'], function () {
    log('IMAGES: compressing and copying images');

    return gulp
        .src(config.images)
        .pipe($.imagemin({optimizationLevel: 4})) // default is 3
        .pipe(gulp.dest(config.build + 'images'));
});

gulp.task('styles', ['clean-styles'], function () {
    log('STYLES: compiling Less --> CSS');

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
    log('CLEAN: cleaning: ' + $.util.colors.blue(delConfig));
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
    log('LESS-WATCHER: watching less files ');
    gulp.watch([config.less], ['styles']); // watch the dirs (1st parm) and kick the tasks (2nd parm)
});

gulp.task('template-cache', ['clean-code'], function () {
    log('TEMPLATE-CACHE: creating AngularJS $templateCache');

    return gulp
        .src(config.html)
        .pipe($.minifyHtml({empty: true})) // remove any empty tags in HTML
        .pipe($.angularTemplatecache(
            config.templateCache.file, // location of the file
            config.templateCache.options
        ))
        .pipe(gulp.dest(config.temp));
});

gulp.task('wiredep', ['vet'], function () {
    log('WIREDEP: injecting the bower css, js and our app js into the html');
    var options = config.getWiredepDefaultOptions();
    var wiredep = require('wiredep').stream;

    return gulp
        .src(config.index)
        .pipe(wiredep(options))
        .pipe($.inject(gulp.src(config.js), {read: false}))
        .pipe(gulp.dest(config.client));
});

gulp.task('inject', ['wiredep', 'styles', 'template-cache'], function () {
    log('INJECT: injecting our app css into the html, after WIREDEP, STYLES and TEMPLATE-CACHE');

    var templateCache = config.temp + config.templateCache.file;

    return gulp
        .src(config.index)
        .pipe($.inject(gulp.src(config.css)))
        .pipe($.inject(gulp.src(templateCache, {read: false}), {
            starttag: '<!-- inject:templates:js -->' // see index.html
        }))
        .pipe(gulp.dest(config.client));
});

gulp.task('optimize', ['inject'], function () {
    log('OPTIMIZE: optimizing the javascript, css, html');

    var assets = $.useref.assets({searchPath: './'});
    var cssFilter = $.filter('**/*.css');
    var jsFilter = $.filter('**/*.js');

    return gulp
        .src(config.index)
        .pipe($.plumber())
        .pipe(assets) // find all the assets
        .pipe(cssFilter) // filter down to css files only
        .pipe($.csso()) // optimize and minify the css files
        .pipe(cssFilter.restore()) // restore filter to all files
        .pipe(jsFilter) // filter down to js files only
        .pipe($.uglify()) // minify and mangle the js files
        .pipe(jsFilter.restore()) // restore filter to all files
        .pipe(assets.restore()) // concatenate them to app's and lib's
        .pipe($.useref()) // merge all links inside the index.html
        .pipe(gulp.dest(config.build));
});

gulp.task('serve-build', ['optimize'], function () {
    log('SERVE-BUILD: starting serve in BUILD mode');
    serve(false /* isDev */);
});

gulp.task('serve-dev', ['inject'], function () {
    log('SERVE-BUILD: starting serve in DEV mode');
    serve(true /* isDev */);
});

/////////////// FUNCTIONS \\\\\\\\\\\\\\\\\

function serve(isDev) {
    var nodeOptions = {
        script: config.nodeServer, // app.js
        delayTime: 1, // 1 second delay
        env: {
            'PORT': port,
            'NODE_ENV': isDev ? 'dev' : 'build'
        },
        watch: [config.server] // define the files to restart on
    };

    log('FUNCTION SERVE: starting nodemon in ' + nodeOptions.env.NODE_ENV.toUpperCase() + ' mode');

    return $.nodemon(nodeOptions)
        //.on('restart', ['vet'], function (ev) { // it seems that 'vet' is not kicked off
        .on('restart', function (ev) {
            log('FUNCTION SERVE: nodemon restarted');
            log('FUNCTION SERVE: files changed on restart:\n' + ev);
            setTimeout(function () {
                browserSync.notify('FUNCTION SERVE: BrowserSync is reloading now...');
                browserSync.reload({stream: false}); // don't pull the gulp stream (but you can if you want!)
            }, config.browserReloadDelay);
        })
        .on('start', function () {
            log('FUNCTION SERVE: nodemon started');
            startBrowserSync(isDev);
        })
        .on('crash', function () {
            log('FUNCTION SERVE: nodemon crashed: script crashed for some reason');
        })
        .on('exit', function () {
            log('FUNCTION SERVE: nodemon exited cleanly');
        });
}

function changeEvent(event) {
    // unfortunately this RegExp of John Papa does not work:
    // it gives UNDEFINED on config.source
    //var srcPattern = new RegExp('/*(?=/' + config.source + ')/');
    //log('srcPattern = ' + srcPattern);
    //log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
    log('File ' + event.path + ' ' + event.type);
}

function startBrowserSync(isDev) {
    if (args.nosync || browserSync.active) {
        return;
    }

    log('FUNCTION STARTBROWSERSYNC: starting BrowserSync on port ' + port);

    if (isDev) {
        // watch the dirs (1st parm) and kick the tasks (2nd parm)
        gulp.watch([config.less], ['styles'])
            .on('change', function (event) {
                changeEvent(event);
            });
    } else {
        // watch the dirs (1st parm) and kick the tasks (2nd parm)
        gulp.watch([config.less, config.js, config.html], ['optimize', browserSync.reload])
            .on('change', function (event) {
                changeEvent(event);
            });
    }

    var options = {
        proxy: 'localhost:' + port,
        port: 3000,
        files: isDev ? [
            config.client + '**/*.*',
            '!' + config.less, // don't watch less files
            config.temp + '**/*.css'
        ] : [], // don't watch these files in build mode
        ghostMode: {
            clicks: true,
            location: true,
            forms: true,
            scroll: true
        },
        injectChanges: true, // inject changes only, otherwise everything
        logFileChanges: true,
        logLevel: 'warn', // 'debug', 'info', 'warn' or 'silent'
        logPrefix: 'BROWSERSYNC', // was initially 'gulp-patterns'
        notify: true,
        reloadDelay: 2000 // reloadDelay in ms
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
        $.util.log($.util.colors.yellow(msg));
    }
}
