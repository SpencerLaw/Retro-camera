console.error([
  'scripts/rewrite_scheduler_app.mjs has been retired.',
  'Edit components/course-scheduler/CourseSchedulerApp.tsx directly.',
  'Rebuild scheduler seed data with scripts/generate_all_grades_excel_data.mjs so all data stays tied to the real Excel workbooks.'
].join('\n'));

process.exitCode = 1;
