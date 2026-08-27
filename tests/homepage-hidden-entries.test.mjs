import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('App.tsx', 'utf8');
const homeSource = fs.readFileSync('components/HomePage.tsx', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('homepage hides the requested product entries while keeping direct routes available', () => {
  assert.match(appSource, /<Route path="\/course-scheduler" element=\{<CourseSchedulerApp \/>} \/>/);
  assert.match(appSource, /<Route path="\/tsl-skin" element=\{<TslSkinRoute \/>} \/>/);
  assert.match(appSource, /<Route path="\/prompts" element=\{<PromptGalleryApp \/>} \/>/);

  assert.doesNotMatch(homeSource, /to="\/course-scheduler"|to="\/tsl-skin"|to="\/prompts"/);
  assert.doesNotMatch(homeSource, /智能排课系统|走班制动态教务|特斯拉皮肤|提示词图库/);
});
