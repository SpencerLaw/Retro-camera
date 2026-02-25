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

export const REWARD_CATEGORIES = [
    { id: 'family', name: '亲子陪伴', icon: '👨‍👩‍👧' },
    { id: 'freedom', name: '特权自由', icon: '🕊️' },
    { id: 'school', name: '学校相关', icon: '🏫' },
    { id: 'surprises', name: '小惊喜', icon: '🎁' },
    { id: 'food', name: '美味食光', icon: '🍔' },
    { id: 'outing', name: '外出体验', icon: '🎡' },
    { id: 'creative', name: '创意精神', icon: '✨' },
    { id: 'other', name: '其他', icon: '💎' }
];

export const DEFAULT_REWARDS = [
    // --- 亲子陪伴 (Family) ---
    { name: '爸妈陪玩1小时', pointsCost: 500, icon: '👨‍👩‍👧', category: 'family' },
    { name: '全家一起做饭', pointsCost: 400, icon: '🍳', category: 'family' },
    { name: '去公园踢球/放风筝', pointsCost: 300, icon: '🪁', category: 'family' },
    { name: '骑自行车兜风', pointsCost: 300, icon: '🚲', category: 'family' },
    { name: '陪看一本挑的书', pointsCost: 200, icon: '📖', category: 'family' },
    { name: '陪做手工或画画', pointsCost: 250, icon: '🎨', category: 'family' },
    { name: '全家野餐/烧烤', pointsCost: 600, icon: 'BBQ', category: 'family' },
    { name: '角色扮演游戏', pointsCost: 300, icon: '🎭', category: 'family' },
    { name: '躲猫猫比赛', pointsCost: 200, icon: '🙈', category: 'family' },
    { name: '去动物园/植物园', pointsCost: 800, icon: '🦁', category: 'family' },
    { name: '打羽毛球/乒乓球', pointsCost: 300, icon: '🏸', category: 'family' },
    { name: '陪搭积木/乐高', pointsCost: 400, icon: '🧱', category: 'family' },
    { name: '听我讲故事', pointsCost: 150, icon: '👂', category: 'family' },
    { name: '家庭游戏之夜', pointsCost: 500, icon: '🎲', category: 'family' },
    { name: '书店逛逛', pointsCost: 250, icon: '📚', category: 'family' },
    { name: '种一株小植物', pointsCost: 200, icon: '🌱', category: 'family' },
    { name: '互相化妆游戏', pointsCost: 200, icon: '💄', category: 'family' },
    { name: '散步聊天', pointsCost: 150, icon: '🚶', category: 'family' },
    { name: '做DIY小礼物', pointsCost: 300, icon: '🎁', category: 'family' },

    // --- 特权自由 (Freedom) ---
    { name: '晚睡30分钟', pointsCost: 300, icon: '🌙', category: 'freedom' },
    { name: '免做家务一天', pointsCost: 500, icon: '🛡️', category: 'freedom' },
    { name: '晚餐菜单决定权', pointsCost: 400, icon: '🍽️', category: 'freedom' },
    { name: '当一天遥控器主人', pointsCost: 300, icon: '📺', category: 'freedom' },
    { name: '多玩30分钟户外', pointsCost: 200, icon: '🌳', category: 'freedom' },
    { name: '决定周末一天', pointsCost: 1000, icon: '📅', category: 'freedom' },
    { name: '免检查作业一天', pointsCost: 200, icon: '📝', category: 'freedom' },
    { name: '周六赖床特权', pointsCost: 150, icon: '🛌', category: 'freedom' },
    { name: '决定周末去哪玩', pointsCost: 1500, icon: '🗺️', category: 'freedom' },
    { name: '指定谁做家务', pointsCost: 300, icon: 'point_up', category: 'freedom' },
    { name: '扮演一天爸妈', pointsCost: 800, icon: '👔', category: 'freedom' },
    { name: '决定一日三餐', pointsCost: 600, icon: '🍱', category: 'freedom' },
    { name: '和朋友多玩1小时', pointsCost: 400, icon: '🤝', category: 'freedom' },
    { name: '免叠衣服/倒垃圾', pointsCost: 200, icon: '🗑️', category: 'freedom' },
    { name: '优先坐副驾驶', pointsCost: 100, icon: '🚗', category: 'freedom' },
    { name: '穿我想穿的衣服', pointsCost: 100, icon: '👗', category: 'freedom' },
    { name: '多30分钟自由时间', pointsCost: 200, icon: '⏳', category: 'freedom' },
    { name: '免写日记一天', pointsCost: 150, icon: '📓', category: 'freedom' },
    { name: '当一天小管家', pointsCost: 500, icon: '🔑', category: 'freedom' },
    { name: '决定听什么音乐', pointsCost: 100, icon: '🎵', category: 'freedom' },
    // 核心核销项
    { name: '周末多看30min电视', pointsCost: 1000, icon: '📺', category: 'freedom' },
    { name: '周末多玩30min游戏', pointsCost: 1100, icon: '🎮', category: 'freedom' },

    // --- 学校相关 (School) ---
    { name: '写表扬信给老师', pointsCost: 300, icon: '✉️', category: 'school' },
    { name: '展示画或作文', pointsCost: 200, icon: '🖼️', category: 'school' },
    { name: '当一天小老师', pointsCost: 400, icon: '👨‍🏫', category: 'school' },
    { name: '读故事给小朋友', pointsCost: 200, icon: '📖', category: 'school' },
    { name: '多买一本课外书', pointsCost: 250, icon: '📚', category: 'school' },
    { name: '午休多玩10分钟', pointsCost: 150, icon: '⏰', category: 'school' },
    { name: '电脑放我的照片', pointsCost: 300, icon: '💻', category: 'school' },
    { name: '老师打电话表扬', pointsCost: 500, icon: '📞', category: 'school' },
    { name: '多一次自由活动', pointsCost: 200, icon: '🏃', category: 'school' },
    { name: '帮老师发本子', pointsCost: 150, icon: '📚', category: 'school' },
    { name: '黑板画画展示', pointsCost: 200, icon: '🖍️', category: 'school' },
    { name: '多一次艺术创作', pointsCost: 200, icon: '🎨', category: 'school' },
    { name: '被老师点名表扬', pointsCost: 150, icon: '🌟', category: 'school' },

    // --- 小惊喜 (Surprises) ---
    { name: '新漫画或绘本', pointsCost: 300, icon: '📘', category: 'surprises' },
    { name: '可爱文具/贴纸', pointsCost: 100, icon: '✏️', category: 'surprises' },
    { name: '文具店挑小礼物', pointsCost: 200, icon: '🎁', category: 'surprises' },
    { name: '扭蛋机扭几次', pointsCost: 150, icon: '💊', category: 'surprises' },
    { name: '小乐高补充包', pointsCost: 250, icon: '🧱', category: 'surprises' },
    { name: '新彩色笔/荧光笔', pointsCost: 150, icon: '🖍️', category: 'surprises' },
    { name: '一本新小说', pointsCost: 300, icon: '📖', category: 'surprises' },
    { name: '新钥匙扣/姓名贴', pointsCost: 100, icon: '🏷️', category: 'surprises' },
    { name: '橡皮泥/手工套装', pointsCost: 200, icon: '🖐️', category: 'surprises' },
    { name: '新书签/笔记本', pointsCost: 100, icon: '🔖', category: 'surprises' },
    { name: '小盲盒/小玩具', pointsCost: 200, icon: '🎁', category: 'surprises' },
    { name: '新铅笔盒/挂件', pointsCost: 300, icon: '🎒', category: 'surprises' },
    { name: '彩色胶带', pointsCost: 100, icon: '🎗️', category: 'surprises' },
    { name: '植物种子包', pointsCost: 50, icon: '🌱', category: 'surprises' },

    // --- 美味食光 (Food) ---
    { name: '自制水果沙拉', pointsCost: 150, icon: '🥗', category: 'food' },
    { name: '爸妈做最爱家常菜', pointsCost: 300, icon: '🍲', category: 'food' },
    { name: '多一份水果拼盘', pointsCost: 100, icon: '🍉', category: 'food' },
    { name: '烤红薯/玉米', pointsCost: 150, icon: '🍠', category: 'food' },
    { name: '自制爆米花/冰沙', pointsCost: 150, icon: '🍿', category: 'food' },
    { name: '特制蛋炒饭', pointsCost: 200, icon: '🍚', category: 'food' },
    { name: '做饼干/蛋糕', pointsCost: 350, icon: '🍪', category: 'food' },
    { name: '多一份酸奶', pointsCost: 50, icon: '🥛', category: 'food' },
    { name: '吃一次拉面', pointsCost: 400, icon: '🍜', category: 'food' },
    { name: '红烧肉/糖醋排骨', pointsCost: 350, icon: '🍖', category: 'food' },
    { name: '水果披萨', pointsCost: 300, icon: '🍕', category: 'food' },
    { name: '自制果昔', pointsCost: 150, icon: '🥤', category: 'food' },
    { name: '包饺子/馄饨', pointsCost: 300, icon: '🥟', category: 'food' },
    { name: '指定的早餐', pointsCost: 200, icon: '🍳', category: 'food' },
    { name: '冰淇淋自由', pointsCost: 100, icon: '🍨', category: 'food' },

    // --- 外出体验 (Outing) ---
    { name: '室内游乐场半天', pointsCost: 600, icon: '🎡', category: 'outing' },
    { name: '电影院看大片', pointsCost: 500, icon: '🎬', category: 'outing' },
    { name: '滑冰/游泳一次', pointsCost: 400, icon: '⛸️', category: 'outing' },
    { name: '攀岩/射箭体验', pointsCost: 450, icon: '🧗', category: 'outing' },
    { name: '周边一日游', pointsCost: 1000, icon: '🚗', category: 'outing' },
    { name: '去博物馆', pointsCost: 300, icon: '🏛️', category: 'outing' },
    { name: '科技馆/展览', pointsCost: 400, icon: '🚀', category: 'outing' },
    { name: '画画/编程体验课', pointsCost: 350, icon: '🎨', category: 'outing' },
    { name: '蹦床/密室逃脱', pointsCost: 500, icon: '🤸', category: 'outing' },
    { name: '露营/野餐升级版', pointsCost: 800, icon: '⛺', category: 'outing' },
    { name: '动物园喂动物', pointsCost: 200, icon: '🥕', category: 'outing' },
    { name: '游乐园玩半天', pointsCost: 1500, icon: '🎢', category: 'outing' },
    { name: '看演唱会/话剧', pointsCost: 1200, icon: '🎭', category: 'outing' },
    { name: '共享单车探险', pointsCost: 200, icon: '🚲', category: 'outing' },

    // --- 创意精神 (Creative) ---
    { name: '作品贴冰箱展示', pointsCost: 50, icon: '🖼️', category: 'creative' },
    { name: '家庭舞会/卡拉OK', pointsCost: 300, icon: '🎤', category: 'creative' },
    { name: '穿睡衣宅一天', pointsCost: 200, icon: '👕', category: 'creative' },
    { name: '疯狂发型日', pointsCost: 150, icon: '🤪', category: 'creative' },
    { name: '玩具过夜', pointsCost: 100, icon: '🧸', category: 'creative' },
    { name: '泡泡浴+泡泡', pointsCost: 150, icon: '🛁', category: 'creative' },
    { name: '爸妈表演才艺', pointsCost: 300, icon: '🤹', category: 'creative' },
    { name: '指挥爸妈做傻事', pointsCost: 200, icon: '🤡', category: 'creative' },
    { name: '全家唱喜欢的歌', pointsCost: 100, icon: '🎶', category: 'creative' },
    { name: '画一幅全家福', pointsCost: 200, icon: '👨‍👩‍👧‍👦', category: 'creative' },
    { name: '当一天家庭摄影师', pointsCost: 200, icon: '📸', category: 'creative' },
];
