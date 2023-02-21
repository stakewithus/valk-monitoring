module.exports = function (grunt) {
  grunt.initConfig({
    babel: {
      options: {
        sourceMap: true,
        presets: ['es2015'],
        plugins: [
          'transform-runtime',
          'transform-es2015-spread',
          'transform-object-rest-spread',
        ],
      },
      debug: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: ['**/*.js', '**/*.spec.js'],
            dest: 'build/',
          },
        ],
      },
    },
    copy: {
      all: {
        files: [
          // includes files within path
          {
            expand: true, cwd: 'src/', src: '**', dest: 'build/',
          },
        ],
      },
    },
    watch: {
      components: {
        files: ['src/**/*.js'],
        tasks: ['babel'],
      },
    },
  });
  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.registerTask('default', ['babel', 'watch']);
  grunt.registerTask('pre-test', ['copy', 'babel']);
};
