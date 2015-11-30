'use babel';

import gulp from 'gulp';

gulp.task('babel-task-1', () => {
  console.log('This task (1) is derived from a babel gulpfile');
});

gulp.task('babel-task-2', () => {
  console.log('This task (2) is derived from a babel gulpfile');
});
