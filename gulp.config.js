module.exports = function () {
    var client = './src/client/';
    var clientApp = client + 'app/';
    var root = './'
    var server = './src/server/';
    var temp = './.tmp/';

    var config = {
        /**
         * Files paths
         */
        // all js to vet
        alljs: [
            './src/**/*.js',
            './*.js'
        ],
        build: './build/', // some people do './dist/' or'./prod/' or'./production/'
        client: client,
        css: temp + 'styles.css',
        fonts: './bower_components/font-awesome/fonts/**/*.*',
        html: clientApp + '**/*.html', // this does not hit the index.html !!!
        images: client + 'images/**/*.*',
        index: client + 'index.html',
        js: [
            clientApp + '**/*.module.js',
            clientApp + '**/*.js',
            '!' + clientApp + '**/*.spec.js' // exclude
        ],
        less: client + 'styles/styles.less',
        root: root,
        server: server,
        temp: temp,

        /**
         * optimize files
         */
        optimized: {
            app: 'app.js',
            css: '*.css',
            lib: 'lib.js'
        },

        /**
         * template cache
         */
        templateCache: {
            file: 'templates.js', // choose any name you like
            options: {
                module: 'app.core',
                standAlone: false, // it depends on the existing module 'app.core'
                root: 'app/' // for routes
            }
        },

        /**
         * browser sync
         */
        browserReloadDelay: 1000,

        /**
         * Bower and NPM locations
         */
        bower: {
            json: require('./bower.json'),
            directory: './bower_components/',
            ignorePath: '../..' // because bower_components are ../.. from index.html
        },
        packages: [
            './package.json',
            './bower.json'
        ],

        /**
         *  Node settings
         */
        defaultPort: 7203,
        nodeServer: './src/server/app.js'
    };

    config.getWiredepDefaultOptions = function () {
        return {
            bowerJson: config.bower.json,
            directory: config.bower.directory,
            ignorePath: config.bower.ignorePath
        };
    };

    return config;
};
