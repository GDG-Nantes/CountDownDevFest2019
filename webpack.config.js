const path = require('path');


module.exports = {
  // context: __dirname,
  entry: "./src/guitar_hero.js",
  // target: 'node',
  output: {
    // path: path.resolve(__dirname, 'lib'),
  	filename: "./dist/bundle.js"
  },
  // resolve: {
  //   extensions: ['.js']
  // },
  devtool: 'source-map',
};
