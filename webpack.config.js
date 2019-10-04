const path = require('path')

module.exports = {
  // context: __dirname,
  entry: './src/index.js',
  // target: 'node',
  output: {
    // path: path.resolve(__dirname, 'lib'),
    filename: './bundle.js',
  },
  // resolve: {
  //   extensions: ['.js']
  // },
  devtool: 'source-map',
}
