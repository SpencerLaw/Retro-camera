import fs from 'fs';

const lines = fs.readFileSync('D:/docx_parsed.txt', 'utf8').split('\n').map(l => l.trim()).filter(l => l);

const output = [];
let currentWeekStart = null;
let currentDayIndex = 0;
let currentDateStr = '';
let currentContentLines = [];

const dayMap = { '一': 0, '二': 1, '三': 2, '四': 3, '五': 4, '六': 5, '日': 6 };

function flushCurrentTask() {
    if (currentDateStr && currentContentLines.length > 0) {
        let title = currentContentLines[0];
        let content = currentContentLines.slice(1).join(' ');

        // Sometimes title is short and there is no content (e.g. holidays)
        // Only output if there is actual content
        if (content.length > 10) {
            output.push(`${currentDateStr}\t15:55\t【${title}】${content}`);
        } else if (title.length > 10) {
            output.push(`${currentDateStr}\t15:55\t${title}`);
        }
    }
    currentContentLines = [];
}

let i = 0;
while (i < lines.length) {
    const line = lines[i];

    // Detect week start time
    if (line === '时间' && i + 1 < lines.length) {
        const timeLine = lines[i + 1];
        const match = timeLine.match(/(\d+)月(\d+)日/);
        if (match) {
            currentWeekStart = new Date(2026, parseInt(match[1]) - 1, parseInt(match[2]));
        }
        i++;
        continue;
    }

    // Detect weekday header
    const dayMatch = line.match(/^周(一|二|三|四|五|六|日)/);
    if (dayMatch && currentWeekStart) {
        flushCurrentTask(); // Save previous

        const dayIndex = dayMap[dayMatch[1]];
        const taskDate = new Date(currentWeekStart);
        taskDate.setDate(taskDate.getDate() + dayIndex);

        const yyyy = taskDate.getFullYear();
        const mm = String(taskDate.getMonth() + 1).padStart(2, '0');
        const dd = String(taskDate.getDate()).padStart(2, '0');
        currentDateStr = `${yyyy}-${mm}-${dd}`;

        i++;
        continue;
    }

    // Ignore meta headers
    if (line.includes('2026年春季学期') || line === '周次' || line.match(/^第\d+周/) || line === '班级' || line === 'X年级1班' || line === '授课教师学生代表签字' || line === '离' || line === '校' || line === '前' || line === '1' || line === '分' || line === '钟' || line === '离校前1分钟' || line.match(/^假期.*安全教育/)) {
        i++;
        continue;
    }

    // Accumulate content if we are within a day
    if (currentDateStr) {
        currentContentLines.push(line);
    }

    i++;
}

flushCurrentTask(); // final flush

fs.writeFileSync('D:/schedule_import.txt', output.join('\n'), 'utf8');
console.log(`Successfully generated ${output.length} broadcast tasks.`);
