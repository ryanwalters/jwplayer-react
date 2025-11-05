var path = require('path');

module.exports = {
    mode: 'production',
    entry: './src/jwplayer.tsx',
    output: {
        path: path.resolve('lib'),
        filename: 'jwplayer-react.js',
        libraryTarget: 'commonjs2'
    },
    module: {
        rules: [
            {
                test: /\.(jsx?|tsx?)$/,
                exclude: /(node_modules)/,
                use: 'babel-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    }
}