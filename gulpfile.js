var gulp = require('gulp');
var args = require('yargs').argv;
var config = require('./gulp.config')(); // .js may be left out
var del = require('del');
var $ = require('gulp-load-plugins')({lazy: true});

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

gulp.task('styles', ['clean-styles'], function () {
    log('Compiling Less --> CSS');

    return gulp
        .src(config.less)
        .pipe($.plumber())
        .pipe($.less())
        .pipe($.autoprefixer({browsers: ['last 2 version', '> 5%']}))
        .pipe(gulp.dest(config.temp));
});

gulp.task('clean-styles', function (done) {
    var files = config.temp + '**/*.css';
    clean(files, done);
});

gulp.task('less-watcher', function(){
    gulp.watch([config.less], ['styles']); // watch the dirs (1st parm) and kick the tasks (2nd parm)
});

///////////////

function clean(path, done) {
    log('Cleaning: ' + $.util.colors.blue(path));
    del(path, done);
};

function log(msg) {
    if (typeof (msg) === 'object') {
        for (var item in msg) {
            if (msg.hasOwnProperty(item)) {
                $.util.log($.util.colors.blue(item + ': ' + msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors.blue(msg));
    }
}
