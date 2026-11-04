const path = require('path');

module.exports = {
  content: [
    path.join(__dirname, 'server', 'public', 'index.html'),
    path.join(__dirname, 'server', 'public', 'js', '**', '*.js'),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
