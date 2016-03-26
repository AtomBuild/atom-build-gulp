try {
  const gulpfile = process.argv[2];
  const gulp = require(process.cwd() + '/node_modules/gulp');

  require(gulpfile);
  process.send({ tasks: Object.keys(gulp.tasks) });
} catch (e) {
  process.send({ error: { message: e.message || e.code } });
}
