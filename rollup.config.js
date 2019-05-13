// rollup.config.js
import 'rollup'; /* eslint no-unused-vars: 0*/
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import builtins from 'rollup-plugin-node-builtins';
// import uglify from 'rollup-plugin-uglify';

export default {
	output: {
	  format: 'es'
  },
	plugins: [
		resolve({
			browser: true,
      extensions: [ '.js' ],  // Default: ['.js']
		}),
		builtins(),
		commonjs({
      
		}),
    // uglify() // Code minification
	],
  context: 'window'
};
