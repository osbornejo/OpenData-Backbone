/* jshint node:true */
'use strict';
// generated on 2015-01-15 using generator-gulp-webapp 0.2.0
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

gulp.task('styles', function() {
  //allow us to specify imports of bootstrap components
  //without putting the whole path into our sass files
  var sassPaths = ['./bower_components/bootstrap-sass-official/assets/stylesheets'];
  return gulp.src('app/styles/main.scss')
    .pipe(plugins.plumber())
    .pipe(plugins.sass({includePaths: sassPaths })) 
    .pipe(plugins.autoprefixer({browsers: ['last 1 version']}))
    .pipe(gulp.dest('.tmp/styles'));
});

gulp.task('jst', function () {
  // var os = require('os');

  // var renameString = '^.*\/app\/scripts\/(.*).jst.ejs$';
  // if(os.platform()==='win32'){
  //   console.log('using win32 regex');
  //    renameString = "^.*\\app\\scripts\\(.*).jst.ejs$";
  // }

  return gulp.src('./app/scripts/**/*.jst.ejs')
    .pipe(plugins.slash())
    .pipe(plugins.jstConcat('compiled-templates.js', {
      renameKeys: [ '^.*\/app\/scripts\/(.*).jst.ejs$', '$1']
    }))
    .pipe(gulp.dest('./app/scripts'));
});

gulp.task('jshint', function () {
  return gulp.src([ 'app/scripts/**/*.js', '!app/scripts/compiled-templates.js', '!app/scripts/lib/yuki.js', '!app/scripts/lib/plugins/smartMapping.js', '!app/scripts/lib/plugins/FeatureLayerStatistics.js' ])
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter('jshint-stylish'))
    .pipe(plugins.jshint.reporter('fail'));
});

gulp.task('html', ['styles'], function () {
  var lazypipe = require('lazypipe');
  var cssChannel = lazypipe()
    // optimizer
    .pipe( plugins.csso)
    // replace font paths
    .pipe( plugins.replace, 'bower_components/bootstrap-sass-official/assets/fonts/bootstrap','fonts')
    ;
    // rev the file name
    //.pipe( plugins.rev );

  var assets = plugins.useref.assets({searchPath: '{.tmp,app}'});

  //Why does this not work w plugins?
  var gulpIgnore = require('gulp-ignore');
  return gulp.src('app/*.html')
    .pipe( assets )
    //.pipe( plugins.if('*.js', plugins.sourcemaps.init() ))
    .pipe( plugins.if('*.js', plugins.uglify() ))
    //.pipe( plugins.if('*.js', plugins.sourcemaps.write('./maps') ))
    //rev the js file names
    //.pipe( plugins.if('*.js', plugins.rev() ))

    .pipe( plugins.if('*.css', cssChannel() ) )
    .pipe( assets.restore() )
    .pipe( plugins.useref() )
    .pipe( plugins.if('*.html', plugins.minifyHtml({conditionals: true})) )

    //replace the filenames rev'ed in the html file
    //.pipe( plugins.revReplace() )
    
    //dump to dist
    .pipe( gulp.dest('dist'));
});

gulp.task('images', function () {
  return gulp.src('app/images/**/*')
    .pipe(plugins.cache(plugins.imagemin({
      progressive: true,
      interlaced: true
    })))
    .pipe(gulp.dest('dist/images'));
});

gulp.task('fonts', function () {
  return gulp.src(require('main-bower-files')().concat('app/fonts/**/*'))
    .pipe(plugins.filter('**/*.{eot,svg,ttf,woff}'))
    .pipe(plugins.flatten())
    .pipe(gulp.dest('dist/fonts'));
});

gulp.task('extras', function () {
  return gulp.src([
    'app/*.*',
    'app/scripts/lib/plugins/**/*.*',
    '!app/*.html'
  ], {
    base: 'app/'
  }).pipe(gulp.dest('dist'));
});

gulp.task('clean', require('del').bind(null, ['.tmp', 'dist']));

gulp.task('serve', ['connect', 'watch'], function () {
  require('opn')('http://localhost:9000');
});

gulp.task('connect', ['styles', 'jst'], function () {

  var serveStatic = require('serve-static');
  var serveIndex = require('serve-index');
  var app = require('connect')()
    .use(require('connect-livereload')({port: 35729}))
    .use(serveStatic('.tmp'))
    .use(serveStatic('app'))
    .use('/bower_components', serveStatic('bower_components'))
    .use(serveIndex('app'));

  require('http').createServer(app)
    .listen(9000)
    .on('listening', function () {
      console.log('Started connect web server on http://localhost:9000');
    });
});



gulp.task('serve:dist',['build'], function () {
  var serveStatic = require('serve-static');
  var serveIndex = require('serve-index');
  //configure connect
  var app = require('connect')()
    .use(require('connect-livereload')({port: 35729}))
    //serve everything from dist
    .use(serveStatic('dist'))
    .use(serveIndex('dist'));

  //create the server, using connect
  require('http').createServer(app)
    .listen(9090)
    .on('listening', function () {
      console.log('Started connect web server on http://localhost:9090');
      require('opn')('http://localhost:9090');
    });
});



// inject bower components
gulp.task('wiredep', function () {
  var wiredep = require('wiredep').stream;

  gulp.src('app/styles/*.scss')
    .pipe(wiredep())
    .pipe(gulp.dest('app/styles'));

  gulp.src('app/*.html')
    .pipe(wiredep({exclude: ['bootstrap-sass-official']}))
    .pipe(gulp.dest('app'));
});

gulp.task('watch', ['connect'], function () {
  plugins.livereload.listen();

  // watch for changes
  gulp.watch([
    'app/*.html',
    '.tmp/styles/**/*.css',
    'app/scripts/**/*.js',
    'app/images/**/*'
  ]).on('change', plugins.livereload.changed);

  gulp.watch('app/styles/**/*.scss', ['styles']);
  gulp.watch('app/**/*.jst.ejs', ['jst']);
  gulp.watch('bower.json', ['wiredep']);
  gulp.watch(['app/scripts/**/*.js', 'test/spec/**/*.spec.js'], ['jshint', 'test']);
});

gulp.task('build', ['jshint', 'test', 'html', 'styles', 'jst', 'images', 'fonts', 'extras'], function () {
  return gulp.src('dist/**/*').pipe(plugins.size({title: 'build', gzip: true}));
});

gulp.task('default', ['clean'], function () {
  gulp.start('build');
});

gulp.task('ghPages', [ 'build' ], function () {
  return gulp.src('dist/**/*')
    .pipe(plugins.ghPages());
});

//composition FTW!
gulp.task('deploy', [ 'ghPages' ], function () {
  return gulp.src('app/index.html')
    .pipe(plugins.open('', {url: 'http://mjuniper.github.io/OpenData-Backbone/'}));
});

var deps = [
  'bower_components/jquery/dist/jquery.js',
  'bower_components/underscore/underscore.js',
  'bower_components/backbone/backbone.js',
  'bower_components/backbone.babysitter/lib/backbone.babysitter.js',
  'bower_components/backbone.wreqr/lib/backbone.wreqr.js',
  'bower_components/marionette/lib/core/backbone.marionette.js',
  'bower_components/backbone-fetch-cache/backbone.fetch-cache.js',
  'bower_components/typeahead.js/dist/typeahead.bundle.js',
  'bower_components/moment/moment.js',
  'test/lib/init.js',
  'app/scripts/app.js',
  'app/scripts/utils/mapmanager.js',
  'app/scripts/base/search-view.js',
  'app/scripts/entities/search-model.js',
  'app/scripts/app-config.js',
  'app/scripts/compiled-templates.js',
  'app/scripts/header-search-view.js',
  'app/scripts/app-layout.js',
  'app/scripts/home/home-view.js',
  'app/scripts/home/home-controller.js',
  'app/scripts/home/home-module.js',
  'app/scripts/entities/dataset-model.js',
  'app/scripts/entities/dataset-collection.js',
  'app/scripts/results/results-view.js',
  'app/scripts/results/results-controller.js',
  'app/scripts/results/results-module.js',
  'app/scripts/datasets/datasets-view.js',
  'app/scripts/datasets/datasets-controller.js',
  'app/scripts/datasets/datasets-module.js',
  'app/scripts/error/error-view.js',
  'app/scripts/error/error-controller.js',
  'app/scripts/error/error-module.js'
];

gulp.task('test', function () {
  return gulp.src('test/spec/**/*.spec.js')
    .pipe(plugins.jasminePhantom({
      integration: true,
      vendor: deps,
      keepRunner: 'test/'
    }));
});
