// 默认分类配置
export const DEFAULT_CATEGORIES = [
    { id: 'study', name: '自主学习', icon: '📚' },
    { id: 'morning', name: '晨间习惯', icon: '☀️' },
    { id: 'evening', name: '晚间习惯', icon: '🌙' },
    { id: 'sports', name: '运动健康', icon: '🏃' },
    { id: 'discipline', name: '自律管理', icon: '🎯' },
    { id: 'chores', name: '劳动技能', icon: '🧹' },
    { id: 'hygiene', name: '个人卫生', icon: '🧼' },
    { id: 'creativity', name: '创意艺术', icon: '🎨' },
    { id: 'other', name: '自定义', icon: '✨' }
];

export const TASK_TEMPLATES = [
    {
        category: 'study',
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
        category: 'morning',
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
        category: 'evening',
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
        category: 'sports',
        tasks: [
            { title: '🏃 户外活动', time: '16:30', points: 20, icon: '☀️' },
            { title: '🏀 体育锻炼', time: '17:30', points: 30, icon: '👟' },
            { title: '🧘 亲子运动', time: '19:30', points: 25, icon: '👨‍👩‍👧' },
            { title: '🚶 饭后散步', time: '19:00', points: 15, icon: '🌳' },
            { title: '⚽ 球类运动', time: '17:00', points: 30, icon: '⚽' },
            { title: '🏊 游泳锻炼', time: '16:00', points: 35, icon: '🏊' },
            { title: '🚴 骑行运动', time: '17:30', points: 25, icon: '🚴' },
            { title: '👁️ 眼保健操', time: '10:00', points: 10, icon: '👀' },
            { title: '🏃 广播体操', time: '09:30', points: 15, icon: '🏃' },
            { title: '🛹 技能练习', time: '16:00', points: 35, icon: '🛹' },
        ]
    },
    {
        category: 'discipline',
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
        category: 'chores',
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
        category: 'hygiene',
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
        category: 'creativity',
        tasks: [
            { title: '🎨 绘画创作', time: '15:00', points: 30, icon: '🖌️' },
            { title: '🎹 乐器练习', time: '17:00', points: 35, icon: '🎵' },
            { title: '🧩 益智游戏', time: '16:00', points: 20, icon: '🧩' },
            { title: '📷 摄影记录', time: '10:00', points: 20, icon: '📷' },
            { title: '✏️ 日记写作', time: '21:00', points: 25, icon: '📔' },
            { title: '🔧 手工制作', time: '15:30', points: 25, icon: '🔧' },
            { title: '🧪 科学实验', time: '14:00', points: 35, icon: '🧪' },
        ]
    }
];

export const DEFAULT_REWARDS = [
    // --- 低分值奖励 (50-200) ---
    { name: '🍦 冰淇淋自由', pointsCost: 100, icon: '🍨' },
    { name: '🍭 额外挑选零食', pointsCost: 150, icon: '🍬' },
    { name: '🧸 获得一张贴纸', pointsCost: 50, icon: '✨' },
    { name: '📖 睡前多读一个故事', pointsCost: 80, icon: '🌙' },
    { name: '🎨 挑选一套彩色粘土', pointsCost: 200, icon: '🎨' },

    // --- 中分值奖励 (300-600) ---
    { name: '🎮 游戏时间+30min', pointsCost: 300, icon: '🎮' },
    { name: '📱 手机时间+1h', pointsCost: 500, icon: '📱' },
    { name: '🍕 晚餐菜单决定权', pointsCost: 400, icon: '🍕' },
    { name: '📚 挑选一本心仪书籍', pointsCost: 450, icon: '📗' },
    { name: '🎬 电影之夜(含爆米花)', pointsCost: 600, icon: '🍿' },
    { name: '🧹 免除一次家务(扫地/倒垃圾)', pointsCost: 350, icon: '🛡️' },
    { name: '🎭 邀请好朋友来家里玩', pointsCost: 550, icon: '🤝' },

    // --- 高分值奖励 (800-2000) ---
    { name: '🧸 乐高/大型玩具盲盒', pointsCost: 1200, icon: '🎁' },
    { name: '🎡 周末游乐园门票', pointsCost: 2000, icon: '🎡' },
    { name: '🏞️ 全家郊游/露营一次', pointsCost: 1500, icon: '🏕️' },
    { name: '🛹 获得一套新运动装备', pointsCost: 1000, icon: '🛹' },
    { name: '🎂 私人定制生日蛋糕', pointsCost: 800, icon: '🎂' },
    { name: '🎢 科技馆/水族馆一游', pointsCost: 1800, icon: '🐠' },
    { name: '🎤 体验一节感兴趣的才艺课', pointsCost: 900, icon: '🎸' },

    // --- 特权/愿望类 ---
    { name: '🌟 获得一个"心愿币"(兑换任意小愿望)', pointsCost: 1000, icon: '💎' },
    { name: '🏖️ 海边/度假旅行决定权', pointsCost: 5000, icon: '✈️' },
    { name: '🚲 获得一辆新自行车/平衡车', pointsCost: 3000, icon: '🚲' },
    { name: '💻 电子产品升级/新耳机', pointsCost: 2500, icon: '🎧' },
    { name: '🛌 周末"懒觉"特权(不限量)', pointsCost: 300, icon: '🛌' },
    { name: '👗 挑选一套新衣服/新鞋', pointsCost: 700, icon: '👟' },
];
