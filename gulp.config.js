module.exports = function () {
    var client = './src/client/';

    var config = {
        temp: './.tmp/',

        /**
         * Files paths
         */
        // all js to vet
        alljs: [
            './src/**/*.js',
            './*.js'
        ],

        less: client + 'styles/styles.less'
    };

    return config;
};
