var webpack = require("webpack");

module.exports = {
    module: {
        loaders: [
            // Raw HTML and handlebars.
            { test: /\.html$/, loader: 'raw-loader' },
            { test: /\.hbs$/, loader: 'raw-loader' },

            // Javascript.
            { test: /\.tsx?$/, loader: 'ts-loader' },

            // CSS and Less.
            { test: /\.css$/, loader: 'style-loader!css-loader' },
            { test: /\.less$/, loader: 'style-loader!css-loader!less-loader' },
        ],
    },

    // Write to src/built as bundle.js
    output: {
        path: './src/built',
        filename: 'bundle.js',
        publicPath: 'http://localhost:8080/built/'
    },

    resolve: {
        // Resolve typescript files
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js']
    },

    devtool: 'cheap-source-map',
    entry: [
        './src/main.ts'
    ]
};