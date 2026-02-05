import { TaskCategory } from '../types';

export const TASK_TEMPLATES = [
    {
        category: TaskCategory.STUDY,
        tasks: [
            { title: '📖 课前预习', time: '18:30', points: 15, icon: '📚' },
            { title: '✍️ 专注作业', time: '19:00', points: 30, icon: '📝' },
            { title: '🗣️ 英语听力', time: '07:30', points: 20, icon: '🎧' },
            { title: '🧠 错题整理', time: '20:30', points: 25, icon: '🧐' },
            { title: '📕 课外阅读', time: '21:00', points: 20, icon: '📕' },
            { title: '🎹 兴趣练习', time: '17:00', points: 40, icon: '🎼' },
            { title: '📝 课后复习', time: '20:00', points: 20, icon: '🔄' },
            { title: '🌅 晨读背诵', time: '07:00', points: 25, icon: '☀️' },
            { title: '✏️ 笔记整理', time: '21:30', points: 15, icon: '📓' },
            { title: '🧮 数学练习', time: '19:30', points: 25, icon: '➕' },
            { title: '🖊️ 书法练字', time: '18:00', points: 20, icon: '🖋️' },
            { title: '🌐 英语口语', time: '08:00', points: 20, icon: '🗣️' },
        ]
    },
    {
        category: TaskCategory.MORNING,
        tasks: [
            { title: '⏰ 准时起床', time: '06:30', points: 10, icon: '⚡' },
            { title: '🛏️ 整理床铺', time: '06:35', points: 10, icon: '🛏️' },
            { title: '🧘 晨间拉伸', time: '06:40', points: 15, icon: '🧘' },
            { title: '🌅 晨读时光', time: '07:00', points: 20, icon: '📖' },
            { title: '🍳 吃好早餐', time: '07:30', points: 15, icon: '🥣' },
            { title: '🎒 检查书包', time: '07:45', points: 10, icon: '🎒' },
        ]
    },
    {
        category: TaskCategory.EVENING,
        tasks: [
            { title: '📚 完成作业', time: '18:30', points: 30, icon: '✍️' },
            { title: '🔍 整理错题', time: '20:00', points: 20, icon: '📋' },
            { title: '📖 睡前阅读', time: '21:00', points: 20, icon: '📚' },
            { title: '💭 今日复盘', time: '21:30', points: 15, icon: '💡' },
            { title: '🌙 准时睡觉', time: '21:45', points: 20, icon: '💤' },
            { title: '🎒 整理书包', time: '21:35', points: 10, icon: '🎒' },
        ]
    },
    {
        category: TaskCategory.SPORTS,
        tasks: [
            { title: '🏃 户外活动', time: '16:30', points: 20, icon: '☀️' },
            { title: '🏀 体育锻炼', time: '17:30', points: 30, icon: '👟' },
            { title: '🧘 亲子运动', time: '19:30', points: 25, icon: '👨‍👩‍👧' },
            { title: '🛹 技能练习', time: '16:00', points: 35, icon: '🛹' },
            { title: '🚶 饭后散步', time: '19:00', points: 15, icon: '🌳' },
            { title: '⚽ 球类运动', time: '17:00', points: 30, icon: '⚽' },
            { title: '🏊 游泳锻炼', time: '16:00', points: 35, icon: '🏊' },
            { title: '🚴 骑行运动', time: '17:30', points: 25, icon: '🚴' },
            { title: '👁️ 眼保健操', time: '10:00', points: 10, icon: '👀' },
            { title: '🏃 广播体操', time: '09:30', points: 15, icon: '🏃' },
        ]
    },
    {
        category: TaskCategory.DISCIPLINE,
        tasks: [
            { title: '📱 限时使用电子产品', time: '20:00', points: 25, icon: '📵' },
            { title: '🎯 制定明日计划', time: '21:30', points: 15, icon: '📋' },
            { title: '💰 记录零花钱', time: '20:00', points: 10, icon: '💰' },
            { title: '⏱️ 专注学习50分钟', time: '19:00', points: 30, icon: '⏱️' },
            { title: '📵 无手机时段', time: '18:30', points: 20, icon: '🚫' },
            { title: '🎮 控制游戏时间', time: '17:00', points: 25, icon: '🎮' },
            { title: '📺 限时看电视', time: '19:30', points: 15, icon: '📺' },
        ]
    },
    {
        category: TaskCategory.SOCIAL,
        tasks: [
            { title: '👋 主动打招呼', time: '08:00', points: 10, icon: '🗣️' },
            { title: '🤝 分享与互助', time: '10:00', points: 15, icon: '🌟' },
            { title: '🙏 学会感恩', time: '20:00', points: 15, icon: '❤️' },
            { title: '💎 诚实守信', time: '21:00', points: 20, icon: '💎' },
            { title: '👂 耐心倾听', time: '10:00', points: 15, icon: '👂' },
            { title: '🙇 尊敬长辈', time: '08:00', points: 15, icon: '🙇' },
            { title: '🤗 关心同学', time: '12:00', points: 15, icon: '🤗' },
            { title: '🗣️ 礼貌用语', time: '08:00', points: 10, icon: '🗣️' },
            { title: '🚫 不随意打断', time: '09:00', points: 15, icon: '🤫' },
        ]
    },
    {
        category: TaskCategory.CHORES,
        tasks: [
            { title: '🍽️ 整理餐具', time: '18:15', points: 10, icon: '🥣' },
            { title: '🧺 收纳衣物', time: '19:45', points: 15, icon: '👕' },
            { title: '🪴 浇花理草', time: '09:00', points: 10, icon: '🌷' },
            { title: '✨ 整理书桌', time: '21:35', points: 15, icon: '🧹' },
            { title: '♻️ 垃圾分类', time: '20:10', points: 10, icon: '♻️' },
            { title: '🛒 帮忙买菜', time: '16:00', points: 20, icon: '🛒' },
            { title: '🧽 洗碗刷碟', time: '19:00', points: 15, icon: '🧽' },
            { title: '🧹 扫地拖地', time: '18:00', points: 20, icon: '🧹' },
            { title: '👕 自己洗衣服', time: '10:00', points: 25, icon: '🧺' },
        ]
    },
    {
        category: TaskCategory.HYGIENE,
        tasks: [
            { title: '🦷 认真刷牙', time: '07:15', points: 10, icon: '🪥' },
            { title: '💦 洗脸护肤', time: '21:50', points: 10, icon: '🧼' },
            { title: '🍱 好好吃饭', time: '12:00', points: 15, icon: '🍚' },
            { title: '✂️ 修剪指甲', time: '19:00', points: 10, icon: '💅' },
            { title: '🚿 每日洗澡', time: '21:00', points: 15, icon: '🚿' },
            { title: '🧴 饭前洗手', time: '12:00', points: 10, icon: '🧴' },
            { title: '🪮 整理仪容', time: '07:30', points: 10, icon: '🪮' },
            { title: '👔 穿戴整洁', time: '07:45', points: 10, icon: '👔' },
        ]
    },
    {
        category: TaskCategory.CREATIVITY,
        tasks: [
            { title: '🎨 绘画创作', time: '15:00', points: 30, icon: '🖌️' },
            { title: '🎹 乐器练习', time: '17:00', points: 35, icon: '🎵' },
            { title: '🧩 益智游戏', time: '16:00', points: 20, icon: '🧩' },
            { title: '📷 摄影记录', time: '10:00', points: 20, icon: '📷' },
            { title: '✏️ 日记写作', time: '21:00', points: 25, icon: '📔' },
            { title: '🎭 才艺表演', time: '19:00', points: 30, icon: '🎭' },
            { title: '🔧 手工制作', time: '15:30', points: 25, icon: '🔧' },
            { title: '🧪 科学实验', time: '14:00', points: 35, icon: '🧪' },
        ]
    },
    {
        category: TaskCategory.SAFETY,
        tasks: [
            { title: '🚦 遵守交通规则', time: '08:00', points: 15, icon: '🚦' },
            { title: '🔥 防火安全知识', time: '19:00', points: 20, icon: '🔥' },
            { title: '💧 防溺水意识', time: '10:00', points: 20, icon: '💧' },
            { title: '⚡ 用电安全', time: '20:00', points: 15, icon: '⚡' },
            { title: '🚫 不玩危险游戏', time: '16:00', points: 15, icon: '🚫' },
            { title: '🏠 记住家庭地址', time: '09:00', points: 10, icon: '🏠' },
        ]
    }
];

export const DEFAULT_REWARDS = [
    { name: '🍿 电影之夜', pointsCost: 500, icon: '🎬' },
    { name: '🍦 冰淇淋自由', pointsCost: 200, icon: '🍨' },
    { name: '🎮 游戏时间+30min', pointsCost: 300, icon: '🎮' },
    { name: '📚 挑选一本心仪书籍', pointsCost: 400, icon: '📗' },
    { name: '🧸 心愿礼物盲盒', pointsCost: 1000, icon: '🎁' },
    { name: '🎡 周末游乐园', pointsCost: 2000, icon: '🎡' },
    { name: '🍕 最爱美食餐', pointsCost: 350, icon: '🍕' },
    { name: '🛍️ 自选小礼物', pointsCost: 600, icon: '🛍️' },
    { name: '🏕️ 亲子露营', pointsCost: 2500, icon: '🏕️' },
    { name: '🎂 定制蛋糕', pointsCost: 800, icon: '🎂' },
];
