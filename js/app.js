// ==================== 全局状态 ====================
// Day 3 更新版 - 新增课时消耗、充值、审批处理、结算功能
const state = {
    currentRole: 'ADMIN',
    currentUser: null,
    currentPage: 'workbench',
    teachers: [],
    students: [],
    courses: [],
    lessons: [],
    approvals: [],
    messages: [],
    // 视图模式
    scheduleView: 'week', // 'day', 'week', 'month'
    // Day 3 新增：结算相关
    settlementYear: new Date().getFullYear(),
    settlementMonth: new Date().getMonth() + 1
};
// ==================== 工具函数 ====================
// 时间格式化函数：统一处理 HH:MM:SS 和 HH:MM 格式
function formatTime(timeStr) {
    if (!timeStr) return '';
    // 截取前5位：HH:MM:SS -> HH:MM
    return timeStr.substring(0, 5);
}
// 用户信息
const mockUsers = {
    ADMIN: { name: '教务管理员', avatar: '👩‍💼' },
    TEACHER: { name: '李老师', avatar: '👨‍🏫' },
    STUDENT: { name: '王同学', avatar: '👨‍🎓' },
    FINANCE: { name: '财务张', avatar: '💰' }
};

// 菜单配置
const menuConfig = {
    ADMIN: ['workbench', 'scheduling', 'users', 'courses', 'approvals', 'settlement'],
    TEACHER: ['schedule', 'approvals', 'messages'],
    STUDENT: ['schedule', 'messages'],
    FINANCE: ['settlement', 'approvals']
};

const menuIcons = {
    workbench: '📋', scheduling: '📅', schedule: '📆', users: '👥',
    courses: '📚', approvals: '✅', messages: '💬', settlement: '💰'
};

const menuNames = {
    workbench: '工作台', scheduling: '排课管理', schedule: '我的课表', users: '用户管理',
    courses: '课程管理', approvals: '审批管理', messages: '消息中心', settlement: '结算管理'
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('页面加载完成，开始初始化...');
    await testDatabaseConnection();
});

// 测试数据库连接
async function testDatabaseConnection() {
    const statusEl = document.getElementById('dbStatus');
    try {
        const teachers = await getTeachers();
        statusEl.textContent = '✅ 数据库连接成功';
        statusEl.className = 'db-status connected';
        console.log('数据库连接成功，教师数量:', teachers.length);
    } catch (error) {
        statusEl.textContent = '❌ 数据库连接失败';
        statusEl.className = 'db-status error';
        console.error('数据库连接失败:', error);
    }
}

// ==================== 登录/登出 ====================
function selectRole(el) {
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    state.currentRole = el.dataset.role;
}

async function login() {
    state.currentUser = mockUsers[state.currentRole];
    
    // 加载数据
    await loadAllData();
    
    // 显示主界面
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appContainer').classList.add('active');
    
    // 更新用户信息
    document.getElementById('userAvatar').textContent = state.currentUser.avatar;
    document.getElementById('userName').textContent = state.currentUser.name;
    document.getElementById('userRole').textContent = state.currentRole;
    
    // 构建菜单并导航
    buildSidebar();
    const defaultPage = menuConfig[state.currentRole][0];
    navigateTo(defaultPage);
    
    // 更新通知
    updateNotificationDot();
}

function logout() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('appContainer').classList.remove('active');
    state.currentUser = null;
}

// 加载所有数据
async function loadAllData() {
    showToast('正在加载数据...', 'warning');
    state.teachers = await getTeachers();
    state.students = await getStudents();
    state.courses = await getCourses();
    state.lessons = await getLessons();
    state.approvals = await getApprovals();
    state.messages = await getMessages();
    showToast('数据加载完成', 'success');
}

// ==================== 侧边栏 ====================
function buildSidebar() {
    const nav = document.getElementById('sidebarNav');
    const menus = menuConfig[state.currentRole];
    nav.innerHTML = menus.map(page => `
        <div class="nav-item ${state.currentPage === page ? 'active' : ''}" onclick="navigateTo('${page}')">
            <span class="nav-icon">${menuIcons[page]}</span>
            <span class="nav-text">${menuNames[page]}</span>
        </div>
    `).join('');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ==================== 页面导航 ====================
function navigateTo(page) {
    state.currentPage = page;
    document.getElementById('pageTitle').textContent = menuNames[page];
    buildSidebar();
    renderCurrentPage();
}

function renderCurrentPage() {
    const content = document.getElementById('contentArea');
    const renderers = {
        workbench: renderWorkbench,
        scheduling: renderScheduling,
        schedule: renderSchedule,
        users: renderUsers,
        courses: renderCourses,
        approvals: renderApprovals,
        messages: renderMessages,
        settlement: renderSettlement
    };
    
    if (renderers[state.currentPage]) {
        renderers[state.currentPage](content);
    } else {
        content.innerHTML = '<div class="empty-state"><div class="empty-icon">🚧</div><h3>功能开发中</h3></div>';
    }
}

// ==================== 工作台 ====================
function renderWorkbench(container) {
    const todayLessons = state.lessons.filter(l => l.schedule_date === getTodayDate()).length;
    const pendingApprovals = state.approvals.filter(a => a.status === 'PENDING').length;
    const lowBalanceStudents = state.students.filter(s => s.balance <= 5).length;
    const thisWeekLessons = getThisWeekLessonsCount();
    const completedLessons = state.lessons.filter(l => l.status === 'COMPLETED').length;
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">👨‍🏫</div>
                <div class="stat-value">${state.teachers.length}</div>
                <div class="stat-label">教师总数</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">👨‍🎓</div>
                <div class="stat-value">${state.students.length}</div>
                <div class="stat-label">学生总数</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📅</div>
                <div class="stat-value">${todayLessons}</div>
                <div class="stat-label">今日课程</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📆</div>
                <div class="stat-value">${thisWeekLessons}</div>
                <div class="stat-label">本周课程</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value">${completedLessons}</div>
                <div class="stat-label">已完成课时</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⏳</div>
                <div class="stat-value">${pendingApprovals}</div>
                <div class="stat-label">待审批</div>
            </div>
        </div>
        
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">📢 快捷操作</h3>
            </div>
            <div style="padding: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="navigateTo('scheduling')">📅 排课管理</button>
                <button class="btn btn-secondary" onclick="navigateTo('users')">👥 用户管理</button>
                <button class="btn btn-secondary" onclick="navigateTo('courses')">📚 课程管理</button>
                <button class="btn btn-secondary" onclick="navigateTo('approvals')">✅ 审批管理</button>
                <button class="btn btn-secondary" onclick="navigateTo('settlement')">💰 结算管理</button>
                <button class="btn btn-success" onclick="generateTestData()">🔧 生成测试数据</button>
            </div>
        </div>
        
        ${lowBalanceStudents > 0 ? `
        <div class="table-container" style="margin-top: 20px; border-left: 4px solid var(--warning);">
            <div class="table-header">
                <h3 class="table-title">⚠️ 课时预警 (${lowBalanceStudents}人)</h3>
            </div>
            <table class="data-table">
                <thead><tr><th>学生</th><th>剩余课时</th><th>状态</th><th>操作</th></tr></thead>
                <tbody>
                    ${state.students.filter(s => s.balance <= 5).map(s => `
                        <tr>
                            <td>${s.name_zh || s.name_en}</td>
                            <td><span class="${s.balance <= 0 ? 'balance-warning' : 'balance-low'}">${s.balance}</span></td>
                            <td><span class="status-badge ${s.balance <= 0 ? 'inactive' : 'pending'}">${s.balance <= 0 ? '已用完' : '偏低'}</span></td>
                            <td><button class="btn btn-success btn-sm" onclick="openRechargeModal(${s.id})">💰 充值</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
    `;
}

// 获取本周课程数
function getThisWeekLessonsCount() {
    const weekDays = getWeekDays();
    const startDate = weekDays[0].date;
    const endDate = weekDays[6].date;
    return state.lessons.filter(l => l.schedule_date >= startDate && l.schedule_date <= endDate).length;
}

// ==================== 生成测试数据 ====================
async function generateTestData() {
    if (!confirm('确定要生成测试数据吗？这将添加示例教师、学生、课程和排课记录。')) return;
    
    showToast('正在生成测试数据...', 'warning');
    
    try {
        // 生成教师数据
        const teachersData = [
            { name_zh: '张明', name_en: 'Zhang Ming', phone: '13800001001', email: 'zhangming@edu.com', subject: 'math', status: 'active', avatar: '张' },
            { name_zh: '李华', name_en: 'Li Hua', phone: '13800001002', email: 'lihua@edu.com', subject: 'english', status: 'active', avatar: '李' },
            { name_zh: '王芳', name_en: 'Wang Fang', phone: '13800001003', email: 'wangfang@edu.com', subject: 'physics', status: 'active', avatar: '王' },
            { name_zh: '陈静', name_en: 'Chen Jing', phone: '13800001004', email: 'chenjing@edu.com', subject: 'chemistry', status: 'active', avatar: '陈' },
            { name_zh: '刘洋', name_en: 'Liu Yang', phone: '13800001005', email: 'liuyang@edu.com', subject: 'chinese', status: 'active', avatar: '刘' }
        ];
        
        // 生成学生数据
        const studentsData = [
            { name_zh: '小明', name_en: 'Xiao Ming', phone: '13900001001', email: 'xiaoming@student.com', balance: 20, status: 'active', avatar: '明' },
            { name_zh: '小红', name_en: 'Xiao Hong', phone: '13900001002', email: 'xiaohong@student.com', balance: 15, status: 'active', avatar: '红' },
            { name_zh: '小刚', name_en: 'Xiao Gang', phone: '13900001003', email: 'xiaogang@student.com', balance: 8, status: 'active', avatar: '刚' },
            { name_zh: '小丽', name_en: 'Xiao Li', phone: '13900001004', email: 'xiaoli@student.com', balance: 3, status: 'active', avatar: '丽' },
            { name_zh: '小强', name_en: 'Xiao Qiang', phone: '13900001005', email: 'xiaoqiang@student.com', balance: 25, status: 'active', avatar: '强' },
            { name_zh: '小美', name_en: 'Xiao Mei', phone: '13900001006', email: 'xiaomei@student.com', balance: 0, status: 'active', avatar: '美' },
            { name_zh: '小杰', name_en: 'Xiao Jie', phone: '13900001007', email: 'xiaojie@student.com', balance: 12, status: 'active', avatar: '杰' },
            { name_zh: '小雨', name_en: 'Xiao Yu', phone: '13900001008', email: 'xiaoyu@student.com', balance: 5, status: 'active', avatar: '雨' }
        ];
        
        // 生成课程数据
        const coursesData = [
            { name_zh: '高中数学一对一', name_en: 'High School Math 1v1', subject: 'math', type: '1v1', price: 300, duration: 90, status: 'active' },
            { name_zh: '初中数学一对一', name_en: 'Middle School Math 1v1', subject: 'math', type: '1v1', price: 250, duration: 90, status: 'active' },
            { name_zh: '英语口语小班', name_en: 'English Speaking Class', subject: 'english', type: 'class', price: 150, duration: 60, status: 'active' },
            { name_zh: '英语一对一', name_en: 'English 1v1', subject: 'english', type: '1v1', price: 280, duration: 60, status: 'active' },
            { name_zh: '物理一对三', name_en: 'Physics 1v3', subject: 'physics', type: '1v3', price: 200, duration: 90, status: 'active' },
            { name_zh: '化学一对一', name_en: 'Chemistry 1v1', subject: 'chemistry', type: '1v1', price: 280, duration: 90, status: 'active' },
            { name_zh: '语文阅读写作', name_en: 'Chinese Reading & Writing', subject: 'chinese', type: '1v1', price: 260, duration: 90, status: 'active' }
        ];
        
        // 批量插入教师
        for (const teacher of teachersData) {
            const exists = state.teachers.find(t => t.phone === teacher.phone);
            if (!exists) {
                await addTeacher(teacher);
            }
        }
        
        // 批量插入学生
        for (const student of studentsData) {
            const exists = state.students.find(s => s.phone === student.phone);
            if (!exists) {
                await addStudent(student);
            }
        }
        
        // 批量插入课程
        for (const course of coursesData) {
            const exists = state.courses.find(c => c.name_zh === course.name_zh);
            if (!exists) {
                await addCourse(course);
            }
        }
        
        // 重新加载数据
        state.teachers = await getTeachers();
        state.students = await getStudents();
        state.courses = await getCourses();
        
        // 生成排课数据
        await generateLessonsData();
        
        // 生成审批数据
        await generateApprovalsData();
        
        // 生成消息数据
        await generateMessagesData();
        
        // 重新加载所有数据
        await loadAllData();
        
        showToast('测试数据生成成功！', 'success');
        renderCurrentPage();
        
    } catch (error) {
        console.error('生成测试数据失败:', error);
        showToast('生成测试数据失败', 'error');
    }
}

// 生成排课数据
async function generateLessonsData() {
    if (state.teachers.length === 0 || state.students.length === 0 || state.courses.length === 0) {
        console.log('缺少基础数据，跳过排课生成');
        return;
    }
    
    const weekDays = getWeekDays();
    const times = ['09:00', '10:00', '14:00', '15:00', '16:00', '19:00', '20:00'];
    const classrooms = ['A101', 'A102', 'A103', 'B201', 'B202'];
    
    const lessonsToAdd = [];
    
    // 为每天生成2-4节课
    for (const day of weekDays) {
        const lessonsPerDay = Math.floor(Math.random() * 3) + 2;
        const usedSlots = new Set();
        
        for (let i = 0; i < lessonsPerDay; i++) {
            const time = times[Math.floor(Math.random() * times.length)];
            const slotKey = `${day.date}-${time}`;
            
            if (usedSlots.has(slotKey)) continue;
            usedSlots.add(slotKey);
            
            const teacher = state.teachers[Math.floor(Math.random() * state.teachers.length)];
            const student = state.students[Math.floor(Math.random() * state.students.length)];
            const course = state.courses[Math.floor(Math.random() * state.courses.length)];
            const classroom = classrooms[Math.floor(Math.random() * classrooms.length)];
            
            const startHour = parseInt(time.split(':')[0]);
            const duration = course.duration || 60;
            const endHour = startHour + Math.ceil(duration / 60);
            const endTime = `${endHour.toString().padStart(2, '0')}:00`;
            
            const exists = state.lessons.find(l => 
                l.schedule_date === day.date && 
                formatTime(l.start_time) === time && 
                l.teacher_id === teacher.id
            );
            
            if (!exists) {
                lessonsToAdd.push({
                    course_id: course.id,
                    teacher_id: teacher.id,
                    student_id: student.id,
                    course_name_zh: course.name_zh,
                    course_name_en: course.name_en,
                    teacher_name: teacher.name_zh,
                    student_name: student.name_zh,
                    schedule_date: day.date,
                    start_time: time,
                    end_time: endTime,
                    classroom: classroom,
                    status: 'SCHEDULED',
                    type: 'regular'
                });
            }
        }
    }
    
    for (const lesson of lessonsToAdd) {
        await addLesson(lesson);
    }
    
    state.lessons = await getLessons();
}

// 生成审批数据
async function generateApprovalsData() {
    const approvalTypes = ['请假', '调课', '换教师'];
    const reasons = [
        '家中有事，申请请假一次',
        '时间冲突，申请调整到下周',
        '想换一位老师试试',
        '身体不适，申请取消本次课程',
        '临时有事，申请改期'
    ];
    
    const count = Math.floor(Math.random() * 2) + 2;
    
    for (let i = 0; i < count; i++) {
        const type = approvalTypes[Math.floor(Math.random() * approvalTypes.length)];
        const reason = reasons[Math.floor(Math.random() * reasons.length)];
        const student = state.students[Math.floor(Math.random() * state.students.length)];
        
        const exists = state.approvals.find(a => a.applicant === student?.name_zh && a.status === 'PENDING');
        if (!exists && student) {
            await addApproval({
                type: type,
                lesson_id: null,
                lesson_info: `${student.name_zh} 的课程`,
                reason: reason,
                applicant: student.name_zh,
                status: 'PENDING'
            });
        }
    }
    
    state.approvals = await getApprovals();
}

// 生成消息数据
async function generateMessagesData() {
    const messagesData = [
        { sender: '系统通知', avatar: '🔔', content: '欢迎使用 EduSchedule Pro 排课系统！', unread: true },
        { sender: '教务处', avatar: '📢', content: '本周六有教师培训会议，请各位老师准时参加。', unread: true },
        { sender: '张明老师', avatar: '👨‍🏫', content: '下周一的课程需要调整时间，请确认。', unread: false }
    ];
    
    for (const msg of messagesData) {
        const exists = state.messages.find(m => m.content === msg.content);
        if (!exists) {
            await addMessage(msg);
        }
    }
    
    state.messages = await getMessages();
}

// ==================== 用户管理 ====================
function renderUsers(container) {
    container.innerHTML = `
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">👨‍🏫 教师列表 (${state.teachers.length})</h3>
                <button class="btn btn-primary" onclick="openUserModal('teacher')">+ 新增教师</button>
            </div>
            <table class="data-table">
                <thead>
                    <tr><th>姓名</th><th>手机号</th><th>科目</th><th>状态</th><th>操作</th></tr>
                </thead>
                <tbody>
                    ${state.teachers.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#999;">暂无数据</td></tr>' : 
                    state.teachers.map(t => `
                        <tr>
                            <td><strong>${t.name_zh || ''}</strong> ${t.name_en ? `<span style="color:#999;">${t.name_en}</span>` : ''}</td>
                            <td>${t.phone || '-'}</td>
                            <td>${getSubjectName(t.subject)}</td>
                            <td><span class="status-badge ${t.status}">${t.status === 'active' ? '在职' : '离职'}</span></td>
                            <td>
                                <button class="action-btn edit" onclick="editTeacher(${t.id})">✏️</button>
                                <button class="action-btn delete" onclick="deleteTeacherConfirm(${t.id})">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="table-container" style="margin-top: 24px;">
            <div class="table-header">
                <h3 class="table-title">👨‍🎓 学生列表 (${state.students.length})</h3>
                <button class="btn btn-primary" onclick="openUserModal('student')">+ 新增学生</button>
            </div>
            <table class="data-table">
                <thead>
                    <tr><th>姓名</th><th>手机号</th><th>剩余课时</th><th>状态</th><th>操作</th></tr>
                </thead>
                <tbody>
                    ${state.students.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#999;">暂无数据</td></tr>' : 
                    state.students.map(s => `
                        <tr>
                            <td><strong>${s.name_zh || ''}</strong> ${s.name_en ? `<span style="color:#999;">${s.name_en}</span>` : ''}</td>
                            <td>${s.phone || '-'}</td>
                            <td><span class="${s.balance <= 0 ? 'balance-warning' : s.balance <= 5 ? 'balance-low' : 'balance-normal'}">${s.balance}</span></td>
                            <td><span class="status-badge ${s.status}">${s.status === 'active' ? '在读' : '停课'}</span></td>
                            <td>
                                <button class="action-btn" onclick="openRechargeModal(${s.id})" title="充值">💰</button>
                                <button class="action-btn edit" onclick="editStudent(${s.id})">✏️</button>
                                <button class="action-btn delete" onclick="deleteStudentConfirm(${s.id})">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==================== 课程管理 ====================
function renderCourses(container) {
    container.innerHTML = `
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">📚 课程列表 (${state.courses.length})</h3>
                <button class="btn btn-primary" onclick="openCourseModal()">+ 新增课程</button>
            </div>
            <table class="data-table">
                <thead>
                    <tr><th>课程名称</th><th>科目</th><th>类型</th><th>单价</th><th>时长</th><th>状态</th><th>操作</th></tr>
                </thead>
                <tbody>
                    ${state.courses.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:#999;">暂无数据</td></tr>' : 
                    state.courses.map(c => `
                        <tr>
                            <td><strong>${c.name_zh || ''}</strong></td>
                            <td>${getSubjectName(c.subject)}</td>
                            <td>${getTypeName(c.type)}</td>
                            <td>¥${c.price}</td>
                            <td>${c.duration}分钟</td>
                            <td><span class="status-badge ${c.status}">${c.status === 'active' ? '可用' : '停用'}</span></td>
                            <td>
                                <button class="action-btn edit" onclick="editCourse(${c.id})">✏️</button>
                                <button class="action-btn delete" onclick="deleteCourseConfirm(${c.id})">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==================== 排课管理（支持多视图） ====================
function renderScheduling(container) {
    const viewButtons = `
        <div class="view-toggle">
            <button class="view-btn ${state.scheduleView === 'day' ? 'active' : ''}" onclick="switchScheduleView('day')">日视图</button>
            <button class="view-btn ${state.scheduleView === 'week' ? 'active' : ''}" onclick="switchScheduleView('week')">周视图</button>
            <button class="view-btn ${state.scheduleView === 'month' ? 'active' : ''}" onclick="switchScheduleView('month')">月视图</button>
        </div>
    `;
    
    let scheduleContent = '';
    
    switch(state.scheduleView) {
        case 'day':
            scheduleContent = renderDayView();
            break;
        case 'month':
            scheduleContent = renderMonthView();
            break;
        default:
            scheduleContent = renderWeekView();
    }
    
    container.innerHTML = `
        <div class="schedule-header">
            ${viewButtons}
            <button class="btn btn-primary" onclick="openLessonModal()">+ 新增排课</button>
        </div>
        ${scheduleContent}
    `;
}

// 切换视图
function switchScheduleView(view) {
    state.scheduleView = view;
    renderCurrentPage();
}

// 周视图
function renderWeekView() {
    const weekDays = getWeekDays();
    const times = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '19:00', '20:00'];
    
    return `
        <div class="schedule-nav" style="margin-bottom: 20px;">
            <button onclick="changeWeek(-1)">◀ 上周</button>
            <span class="current-period">${weekDays[0].dateStr} ~ ${weekDays[6].dateStr}</span>
            <button onclick="changeWeek(1)">下周 ▶</button>
        </div>
        
        <div class="schedule-grid">
            <div class="schedule-header-cell">时间</div>
            ${weekDays.map(d => `<div class="schedule-header-cell">${d.dayName}<br><small>${d.dateShort}</small></div>`).join('')}
            
            ${times.map(time => `
                <div class="schedule-time-cell">${time}</div>
                ${weekDays.map(d => {
                    const dayLessons = state.lessons.filter(l => l.schedule_date === d.date && formatTime(l.start_time) === time);
                    return `<div class="schedule-cell">
                        ${dayLessons.map(l => `
                            <div class="schedule-lesson ${l.status === 'COMPLETED' ? 'completed' : ''} ${l.status === 'CANCELLED' ? 'cancelled' : ''}" onclick="showLessonDetail(${l.id})">
                                <div class="lesson-title">${l.course_name_zh || '课程'}</div>
                                <div class="lesson-info">${l.teacher_name || ''} | ${l.classroom || ''}</div>
                            </div>
                        `).join('')}
                    </div>`;
                }).join('')}
            `).join('')}
        </div>
    `;
}

// 日视图
function renderDayView() {
    const today = new Date();
    today.setDate(today.getDate() + currentDayOffset);
    const dateStr = today.toISOString().split('T')[0];
    const displayDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dayName = dayNames[today.getDay()];
    
    const times = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '19:00', '20:00'];
    const dayLessons = state.lessons.filter(l => l.schedule_date === dateStr);
    
    return `
        <div class="schedule-nav" style="margin-bottom: 20px;">
            <button onclick="changeDay(-1)">◀ 前一天</button>
            <span class="current-period">${displayDate} ${dayName}</span>
            <button onclick="changeDay(1)">后一天 ▶</button>
        </div>
        
        <div class="day-view-container">
            ${times.map(time => {
                const timeLessons = dayLessons.filter(l => formatTime(l.start_time) === time);
                return `
                    <div class="day-time-row">
                        <div class="day-time-label">${time}</div>
                        <div class="day-time-content">
                            ${timeLessons.length === 0 ? 
                                '<div class="day-empty-slot">空闲</div>' :
                                timeLessons.map(l => `
                                    <div class="day-lesson-card ${l.status === 'COMPLETED' ? 'completed' : ''} ${l.status === 'CANCELLED' ? 'cancelled' : ''}" onclick="showLessonDetail(${l.id})">
                                        <div class="day-lesson-title">${l.course_name_zh || '课程'}</div>
                                        <div class="day-lesson-info">
                                            <span>👨‍🏫 ${l.teacher_name || '-'}</span>
                                            <span>👨‍🎓 ${l.student_name || '-'}</span>
                                            <span>🚪 ${l.classroom || '-'}</span>
                                            <span>⏰ ${l.start_time} - ${l.end_time}</span>
                                        </div>
                                    </div>
                                `).join('')
                            }
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        
        <div class="day-summary" style="margin-top: 20px; padding: 16px; background: var(--white); border-radius: var(--radius);">
            <h4>📊 当日统计</h4>
            <p>共 <strong>${dayLessons.length}</strong> 节课 | 已完成 <strong>${dayLessons.filter(l => l.status === 'COMPLETED').length}</strong> | 待上课 <strong>${dayLessons.filter(l => l.status === 'SCHEDULED').length}</strong></p>
        </div>
    `;
}

// 月视图
function renderMonthView() {
    const today = new Date();
    today.setMonth(today.getMonth() + currentMonthOffset);
    const year = today.getFullYear();
    const month = today.getMonth();
    const displayMonth = `${year}年${month + 1}月`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push({ day: '', date: '', lessons: [] });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        const dayLessons = state.lessons.filter(l => l.schedule_date === dateStr);
        days.push({ day: d, date: dateStr, lessons: dayLessons });
    }
    
    return `
        <div class="schedule-nav" style="margin-bottom: 20px;">
            <button onclick="changeMonth(-1)">◀ 上月</button>
            <span class="current-period">${displayMonth}</span>
            <button onclick="changeMonth(1)">下月 ▶</button>
        </div>
        
        <div class="month-grid">
            <div class="month-header-cell">周一</div>
            <div class="month-header-cell">周二</div>
            <div class="month-header-cell">周三</div>
            <div class="month-header-cell">周四</div>
            <div class="month-header-cell">周五</div>
            <div class="month-header-cell weekend">周六</div>
            <div class="month-header-cell weekend">周日</div>
            
            ${days.map(d => `
                <div class="month-cell ${d.day === '' ? 'empty' : ''} ${d.date === getTodayDate() ? 'today' : ''}" onclick="${d.day ? `goToDay('${d.date}')` : ''}">
                    ${d.day ? `
                        <div class="month-day-number">${d.day}</div>
                        <div class="month-lessons-count">
                            ${d.lessons.length > 0 ? `<span class="lesson-dot">${d.lessons.length}节课</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// 跳转到指定日期的日视图
function goToDay(dateStr) {
    const today = new Date();
    const target = new Date(dateStr);
    currentDayOffset = Math.floor((target - today) / (1000 * 60 * 60 * 24));
    state.scheduleView = 'day';
    renderCurrentPage();
}

// 我的课表（教师/学生视图）
function renderSchedule(container) {
    renderScheduling(container);
}

// ==================== 审批管理 ====================
function renderApprovals(container) {
    const pending = state.approvals.filter(a => a.status === 'PENDING');
    const processed = state.approvals.filter(a => a.status !== 'PENDING');
    
    container.innerHTML = `
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">⏳ 待处理 (${pending.length})</h3>
            </div>
            <table class="data-table">
                <thead><tr><th>类型</th><th>相关课程</th><th>申请人</th><th>原因</th><th>时间</th><th>操作</th></tr></thead>
                <tbody>
                    ${pending.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#999;">暂无待处理审批</td></tr>' : 
                    pending.map(a => `
                        <tr>
                            <td><span class="status-badge pending">${a.type}</span></td>
                            <td>${a.lesson_info || '-'}</td>
                            <td>${a.applicant}</td>
                            <td>${a.reason || '-'}</td>
                            <td>${formatDate(a.created_at)}</td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="showApprovalDetail(${a.id})">审批</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="table-container" style="margin-top: 24px;">
            <div class="table-header">
                <h3 class="table-title">✅ 已处理 (${processed.length})</h3>
            </div>
            <table class="data-table">
                <thead><tr><th>类型</th><th>相关课程</th><th>申请人</th><th>状态</th><th>时间</th></tr></thead>
                <tbody>
                    ${processed.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#999;">暂无记录</td></tr>' : 
                    processed.map(a => `
                        <tr>
                            <td><span class="status-badge pending">${a.type}</span></td>
                            <td>${a.lesson_info || '-'}</td>
                            <td>${a.applicant}</td>
                            <td><span class="status-badge ${a.status === 'APPROVED' ? 'active' : 'inactive'}">${a.status === 'APPROVED' ? '已通过' : '已拒绝'}</span></td>
                            <td>${formatDate(a.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==================== 消息中心 ====================
function renderMessages(container) {
    container.innerHTML = `
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">💬 消息列表</h3>
            </div>
            ${state.messages.length === 0 ? 
                '<div class="empty-state"><div class="empty-icon">📭</div><h3>暂无消息</h3></div>' :
                state.messages.map(m => `
                    <div style="padding: 16px 24px; border-bottom: 1px solid var(--gray-100); display: flex; gap: 12px; align-items: start; ${m.unread ? 'background: var(--gray-50);' : ''}" onclick="markMessageAsRead(${m.id})">
                        <div style="font-size: 24px;">${m.avatar || '📩'}</div>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between;">
                                <strong>${m.sender}</strong>
                                <small style="color: var(--gray-500);">${m.time || formatDate(m.created_at)}</small>
                            </div>
                            <p style="margin-top: 4px; color: var(--gray-600);">${m.content}</p>
                        </div>
                        ${m.unread ? '<span style="width:8px;height:8px;background:var(--primary);border-radius:50%;"></span>' : ''}
                    </div>
                `).join('')
            }
        </div>
    `;
}

// ==================== Day 3: 结算管理 ====================
function renderSettlement(container) {
    const year = state.settlementYear;
    const month = state.settlementMonth;
    
    // 筛选指定月份的已完成课程
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    const completedLessons = state.lessons.filter(l => 
        l.status === 'COMPLETED' && 
        l.schedule_date >= startDate && 
        l.schedule_date <= endDate
    );
    
    // 按教师分组统计
    const teacherStats = {};
    completedLessons.forEach(lesson => {
        const teacherId = lesson.teacher_id;
        if (!teacherStats[teacherId]) {
            teacherStats[teacherId] = {
                teacher_id: teacherId,
                teacher_name: lesson.teacher_name,
                lessons: [],
                count: 0
            };
        }
        teacherStats[teacherId].lessons.push(lesson);
        teacherStats[teacherId].count++;
    });
    
    const teacherList = Object.values(teacherStats);
    const totalLessons = completedLessons.length;
    const totalAmount = totalLessons * 200; // 假设每节课200元课酬
    
    // 学生消耗统计
    const studentConsumption = {};
    completedLessons.forEach(lesson => {
        const studentId = lesson.student_id;
        if (!studentConsumption[studentId]) {
            studentConsumption[studentId] = {
                student_name: lesson.student_name,
                count: 0
            };
        }
        studentConsumption[studentId].count++;
    });
    
    container.innerHTML = `
        <div class="settlement-header">
            <div class="settlement-filters">
                <select id="settlementYear" onchange="updateSettlementPeriod()">
                    ${[2024, 2025, 2026].map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}年</option>`).join('')}
                </select>
                <select id="settlementMonth" onchange="updateSettlementPeriod()">
                    ${Array.from({length: 12}, (_, i) => i + 1).map(m => `<option value="${m}" ${m === month ? 'selected' : ''}>${m}月</option>`).join('')}
                </select>
            </div>
            <button class="btn btn-secondary" onclick="exportSettlement()">📥 导出结算</button>
        </div>
        
        <div class="settlement-summary">
            <div class="settlement-card">
                <div class="card-icon">📚</div>
                <div class="card-value">${totalLessons}</div>
                <div class="card-label">已完成课时</div>
            </div>
            <div class="settlement-card">
                <div class="card-icon">👨‍🏫</div>
                <div class="card-value">${teacherList.length}</div>
                <div class="card-label">授课教师数</div>
            </div>
            <div class="settlement-card">
                <div class="card-icon">💰</div>
                <div class="card-value">¥${totalAmount.toLocaleString()}</div>
                <div class="card-label">应结算金额</div>
            </div>
        </div>
        
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">👨‍🏫 教师结算明细</h3>
            </div>
            <table class="data-table">
                <thead>
                    <tr><th>教师</th><th>授课数</th><th>课酬标准</th><th>应结算</th><th>操作</th></tr>
                </thead>
                <tbody>
                    ${teacherList.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#999;">暂无结算数据</td></tr>' :
                    teacherList.map(t => `
                        <tr>
                            <td><strong>${t.teacher_name || '未知教师'}</strong></td>
                            <td>${t.count} 节</td>
                            <td>¥200/节</td>
                            <td><strong style="color: var(--success);">¥${(t.count * 200).toLocaleString()}</strong></td>
                            <td><button class="btn btn-sm btn-secondary" onclick="showTeacherSettlementDetail(${t.teacher_id}, '${t.teacher_name}')">查看详情</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="table-container" style="margin-top: 24px;">
            <div class="table-header">
                <h3 class="table-title">👨‍🎓 学生课时消耗</h3>
            </div>
            <table class="data-table">
                <thead>
                    <tr><th>学生</th><th>本月消耗</th><th>当前余额</th><th>状态</th></tr>
                </thead>
                <tbody>
                    ${Object.keys(studentConsumption).length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#999;">暂无数据</td></tr>' :
                    Object.values(studentConsumption).map(sc => {
                        const student = state.students.find(s => s.name_zh === sc.student_name);
                        const balance = student ? student.balance : 0;
                        return `
                            <tr>
                                <td><strong>${sc.student_name}</strong></td>
                                <td>${sc.count} 课时</td>
                                <td><span class="${balance <= 0 ? 'balance-warning' : balance <= 5 ? 'balance-low' : 'balance-normal'}">${balance} 课时</span></td>
                                <td><span class="status-badge ${balance <= 0 ? 'inactive' : balance <= 5 ? 'pending' : 'active'}">${balance <= 0 ? '需充值' : balance <= 5 ? '余额偏低' : '正常'}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 更新结算周期
function updateSettlementPeriod() {
    state.settlementYear = parseInt(document.getElementById('settlementYear').value);
    state.settlementMonth = parseInt(document.getElementById('settlementMonth').value);
    renderCurrentPage();
}

// 显示教师结算详情
function showTeacherSettlementDetail(teacherId, teacherName) {
    const year = state.settlementYear;
    const month = state.settlementMonth;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const lessons = state.lessons.filter(l => 
        l.teacher_id === teacherId && 
        l.status === 'COMPLETED' && 
        l.schedule_date >= startDate && 
        l.schedule_date <= endDate
    );
    
    const totalAmount = lessons.length * 200;
    
    const detailHtml = `
        <div class="settlement-detail-header">
            <h4>👨‍🏫 ${teacherName} - ${year}年${month}月结算</h4>
            <div class="settlement-detail-stats">
                <div class="stat-item">
                    <div class="stat-value">${lessons.length}</div>
                    <div class="stat-label">授课总数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">¥200</div>
                    <div class="stat-label">课酬标准</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">¥${totalAmount.toLocaleString()}</div>
                    <div class="stat-label">应结算金额</div>
                </div>
            </div>
        </div>
        
        <table class="data-table" style="font-size: 13px;">
            <thead>
                <tr><th>日期</th><th>课程</th><th>学生</th><th>时间</th><th>课酬</th></tr>
            </thead>
            <tbody>
                ${lessons.map(l => `
                    <tr>
                        <td>${l.schedule_date}</td>
                        <td>${l.course_name_zh || '-'}</td>
                        <td>${l.student_name || '-'}</td>
                        <td>${l.start_time}-${l.end_time}</td>
                        <td>¥200</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('settlementDetailContent').innerHTML = detailHtml;
    openModal('settlementDetailModal');
}

// 导出结算
function exportSettlement() {
    showToast('导出功能开发中...', 'warning');
}

// ==================== 模态框操作 ====================
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// 用户模态框
function openUserModal(type) {
    document.getElementById('userModalTitle').textContent = type === 'teacher' ? '新增教师' : '新增学生';
    document.getElementById('userType').value = type;
    document.getElementById('subjectGroup').style.display = type === 'teacher' ? 'block' : 'none';
    document.getElementById('editUserId').value = '';
    document.getElementById('editUserType').value = type;
    document.getElementById('userName_input').value = '';
    document.getElementById('userNameEn').value = '';
    document.getElementById('userPhone').value = '';
    document.getElementById('userEmail').value = '';
    openModal('userModal');
}

function editTeacher(id) {
    const teacher = state.teachers.find(t => t.id === id);
    if (!teacher) return;
    document.getElementById('userModalTitle').textContent = '编辑教师';
    document.getElementById('userType').value = 'teacher';
    document.getElementById('subjectGroup').style.display = 'block';
    document.getElementById('editUserId').value = id;
    document.getElementById('editUserType').value = 'teacher';
    document.getElementById('userName_input').value = teacher.name_zh || '';
    document.getElementById('userNameEn').value = teacher.name_en || '';
    document.getElementById('userPhone').value = teacher.phone || '';
    document.getElementById('userEmail').value = teacher.email || '';
    document.getElementById('userSubject').value = teacher.subject || 'math';
    openModal('userModal');
}

function editStudent(id) {
    const student = state.students.find(s => s.id === id);
    if (!student) return;
    document.getElementById('userModalTitle').textContent = '编辑学生';
    document.getElementById('userType').value = 'student';
    document.getElementById('subjectGroup').style.display = 'none';
    document.getElementById('editUserId').value = id;
    document.getElementById('editUserType').value = 'student';
    document.getElementById('userName_input').value = student.name_zh || '';
    document.getElementById('userNameEn').value = student.name_en || '';
    document.getElementById('userPhone').value = student.phone || '';
    document.getElementById('userEmail').value = student.email || '';
    openModal('userModal');
}

async function saveUser() {
    const type = document.getElementById('editUserType').value || document.getElementById('userType').value;
    const id = document.getElementById('editUserId').value;
    const data = {
        name_zh: document.getElementById('userName_input').value,
        name_en: document.getElementById('userNameEn').value,
        phone: document.getElementById('userPhone').value,
        email: document.getElementById('userEmail').value,
        avatar: document.getElementById('userName_input').value.charAt(0)
    };
    
    if (!data.name_zh) {
        showToast('请输入姓名', 'error');
        return;
    }
    
    if (type === 'teacher') {
        data.subject = document.getElementById('userSubject').value;
        if (id) {
            await updateTeacher(parseInt(id), data);
        } else {
            await addTeacher(data);
        }
        state.teachers = await getTeachers();
    } else {
        if (id) {
            await updateStudent(parseInt(id), data);
        } else {
            data.balance = 0;
            await addStudent(data);
        }
        state.students = await getStudents();
    }
    
    closeModal('userModal');
    showToast('保存成功', 'success');
    renderCurrentPage();
}

async function deleteTeacherConfirm(id) {
    if (!confirm('确定删除此教师？')) return;
    await deleteTeacher(id);
    state.teachers = await getTeachers();
    showToast('删除成功', 'success');
    renderCurrentPage();
}

async function deleteStudentConfirm(id) {
    if (!confirm('确定删除此学生？')) return;
    await deleteStudent(id);
    state.students = await getStudents();
    showToast('删除成功', 'success');
    renderCurrentPage();
}

// 课程模态框
function openCourseModal() {
    document.getElementById('courseModalTitle').textContent = '新增课程';
    document.getElementById('editCourseId').value = '';
    document.getElementById('courseName').value = '';
    document.getElementById('courseNameEn').value = '';
    document.getElementById('courseSubject').value = 'math';
    document.getElementById('courseType').value = '1v1';
    document.getElementById('coursePrice').value = '';
    document.getElementById('courseDuration').value = '60';
    openModal('courseModal');
}

function editCourse(id) {
    const course = state.courses.find(c => c.id === id);
    if (!course) return;
    document.getElementById('courseModalTitle').textContent = '编辑课程';
    document.getElementById('editCourseId').value = id;
    document.getElementById('courseName').value = course.name_zh || '';
    document.getElementById('courseNameEn').value = course.name_en || '';
    document.getElementById('courseSubject').value = course.subject || 'math';
    document.getElementById('courseType').value = course.type || '1v1';
    document.getElementById('coursePrice').value = course.price || '';
    document.getElementById('courseDuration').value = course.duration || '60';
    openModal('courseModal');
}

async function saveCourse() {
    const id = document.getElementById('editCourseId').value;
    const data = {
        name_zh: document.getElementById('courseName').value,
        name_en: document.getElementById('courseNameEn').value,
        subject: document.getElementById('courseSubject').value,
        type: document.getElementById('courseType').value,
        price: parseInt(document.getElementById('coursePrice').value) || 0,
        duration: parseInt(document.getElementById('courseDuration').value)
    };
    
    if (!data.name_zh) {
        showToast('请输入课程名称', 'error');
        return;
    }
    
    if (id) {
        await updateCourse(parseInt(id), data);
    } else {
        await addCourse(data);
    }
    
    state.courses = await getCourses();
    closeModal('courseModal');
    showToast('保存成功', 'success');
    renderCurrentPage();
}

async function deleteCourseConfirm(id) {
    if (!confirm('确定删除此课程？')) return;
    await deleteCourse(id);
    state.courses = await getCourses();
    showToast('删除成功', 'success');
    renderCurrentPage();
}

// 排课模态框

// 打开排课模态框
function openLessonModal() {
    document.getElementById('lessonModalTitle').textContent = '新增排课';
    document.getElementById('editLessonId').value = '';
    document.getElementById('lessonMode').value = 'single';
    
    // 填充下拉选项
    const courseSelect = document.getElementById('lessonCourse');
    courseSelect.innerHTML = state.courses.length === 0 ? 
        '<option value="">请先添加课程</option>' :
        state.courses.map(c => `<option value="${c.id}">${c.name_zh}</option>`).join('');
    
    const teacherSelect = document.getElementById('lessonTeacher');
    teacherSelect.innerHTML = state.teachers.length === 0 ?
        '<option value="">请先添加教师</option>' :
        state.teachers.map(t => `<option value="${t.id}">${t.name_zh}</option>`).join('');
    
    const studentSelect = document.getElementById('lessonStudent');
    studentSelect.innerHTML = state.students.length === 0 ?
        '<option value="">请先添加学生</option>' :
        state.students.map(s => `<option value="${s.id}">${s.name_zh} (余额: ${s.balance})</option>`).join('');
    
    // 设置默认值
    document.getElementById('lessonDate').value = getTodayDate();
    document.getElementById('batchStartDate').value = getTodayDate();
    document.getElementById('batchEndDate').value = getDateAfterDays(30); // 默认30天后
    document.getElementById('lessonStartTime').value = '09:00';
    document.getElementById('lessonEndTime').value = '10:00';
    document.getElementById('lessonType').value = 'regular';
    
    // 重置批量模式
    toggleBatchMode();
    
    openModal('lessonModal');
}

// 切换批量/单节模式
function toggleBatchMode() {
    const mode = document.getElementById('lessonMode').value;
    const singleGroup = document.getElementById('singleDateGroup');
    const batchGroup = document.getElementById('batchDateGroup');
    const batchSummary = document.getElementById('batchSummary');
    
    if (mode === 'batch') {
        singleGroup.style.display = 'none';
        batchGroup.style.display = 'block';
        batchSummary.style.display = 'block';
        updateBatchCount();
    } else {
        singleGroup.style.display = 'flex';
        batchGroup.style.display = 'none';
        batchSummary.style.display = 'none';
    }
}

// 更新批量排课数量预览
function updateBatchCount() {
    const startDate = document.getElementById('batchStartDate').value;
    const endDate = document.getElementById('batchEndDate').value;
    const checkboxes = document.querySelectorAll('#batchDateGroup input[type="checkbox"]:checked');
    
    if (!startDate || !endDate || checkboxes.length === 0) {
        document.getElementById('batchCount').textContent = '0';
        return;
    }
    
    const selectedDays = Array.from(checkboxes).map(cb => parseInt(cb.value));
    let count = 0;
    let current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
        if (selectedDays.includes(current.getDay())) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    
    document.getElementById('batchCount').textContent = count;
}

// 保存排课（支持批量）
async function saveLesson() {
    const mode = document.getElementById('lessonMode').value;
    const id = document.getElementById('editLessonId').value;
    
    // 编辑模式不支持批量
    if (id) {
        await saveSingleLesson(id);
        return;
    }
    
    if (mode === 'batch') {
        await saveBatchLessons();
    } else {
        await saveSingleLesson(null);
    }
}

// 保存单节课
async function saveSingleLesson(editId) {
    const courseId = document.getElementById('lessonCourse').value;
    const teacherId = document.getElementById('lessonTeacher').value;
    const studentId = document.getElementById('lessonStudent').value;
    const date = document.getElementById('lessonDate').value;
    const startTime = document.getElementById('lessonStartTime').value;
    const endTime = document.getElementById('lessonEndTime').value;
    const classroom = document.getElementById('lessonClassroom').value;
    const lessonType = document.getElementById('lessonType').value;
    
    // 验证必填项
    if (!courseId || !teacherId || !studentId || !date) {
        showToast('请填写完整信息', 'error');
        return;
    }
    
    // 验证时间
    if (startTime >= endTime) {
        showToast('结束时间必须晚于开始时间', 'error');
        return;
    }
    
    const course = state.courses.find(c => c.id == courseId);
    const teacher = state.teachers.find(t => t.id == teacherId);
    const student = state.students.find(s => s.id == studentId);
    
    // 冲突检测
    const conflicts = checkScheduleConflicts(
        editId ? parseInt(editId) : null,
        date,
        startTime,
        endTime,
        parseInt(teacherId),
        parseInt(studentId),
        classroom
    );
    
    if (conflicts.length > 0) {
        showToast(`排课冲突：${conflicts.join('；')}`, 'error');
        return;
    }
    
    const data = {
        course_id: parseInt(courseId),
        teacher_id: parseInt(teacherId),
        student_id: parseInt(studentId),
        course_name_zh: course ? course.name_zh : '',
        course_name_en: course ? course.name_en : '',
        teacher_name: teacher ? teacher.name_zh : '',
        student_name: student ? student.name_zh : '',
        schedule_date: date,
        start_time: startTime,
        end_time: endTime,
        classroom: classroom,
        status: 'SCHEDULED',
        type: lessonType  // 'regular', 'trial', or 'makeup'
    };
    
    try {
        if (editId) {
            await updateLesson(parseInt(editId), data);
            showToast('修改成功', 'success');
        } else {
            await addLesson(data);
            showToast('排课成功', 'success');
        }
        
        // 重新加载数据并刷新页面
        state.lessons = await getLessons();
        closeModal('lessonModal');
        renderCurrentPage();
    } catch (error) {
        console.error('保存排课失败:', error);
        showToast('保存失败，请重试', 'error');
    }
}

// 批量保存课程
async function saveBatchLessons() {
    const courseId = document.getElementById('lessonCourse').value;
    const teacherId = document.getElementById('lessonTeacher').value;
    const studentId = document.getElementById('lessonStudent').value;
    const startDate = document.getElementById('batchStartDate').value;
    const endDate = document.getElementById('batchEndDate').value;
    const startTime = document.getElementById('lessonStartTime').value;
    const endTime = document.getElementById('lessonEndTime').value;
    const classroom = document.getElementById('batchClassroom').value;
    const lessonType = document.getElementById('lessonType').value;
    
    // 验证必填项
    if (!courseId || !teacherId || !studentId || !startDate || !endDate) {
        showToast('请填写完整信息', 'error');
        return;
    }
    
    // 获取选中的星期
    const checkboxes = document.querySelectorAll('#batchDateGroup input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showToast('请至少选择一个星期', 'error');
        return;
    }
    
    const selectedDays = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    // 验证时间
    if (startTime >= endTime) {
        showToast('结束时间必须晚于开始时间', 'error');
        return;
    }
    
    const course = state.courses.find(c => c.id == courseId);
    const teacher = state.teachers.find(t => t.id == teacherId);
    const student = state.students.find(s => s.id == studentId);
    
    // 生成日期列表
    const dates = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
        if (selectedDays.includes(current.getDay())) {
            dates.push(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
    }
    
    if (dates.length === 0) {
        showToast('所选日期区间内没有符合条件的日期', 'error');
        return;
    }
    
    // 检查所有日期的冲突
    let conflictDates = [];
    for (const date of dates) {
        const conflicts = checkScheduleConflicts(
            null,
            date,
            startTime,
            endTime,
            parseInt(teacherId),
            parseInt(studentId),
            classroom
        );
        if (conflicts.length > 0) {
            conflictDates.push(date);
        }
    }
    
    if (conflictDates.length > 0) {
        const confirmMsg = `以下日期存在冲突：${conflictDates.join(', ')}\n\n是否跳过冲突日期，仅添加无冲突的课程？`;
        if (!confirm(confirmMsg)) {
            return;
        }
        // 过滤掉冲突日期
        const validDates = dates.filter(d => !conflictDates.includes(d));
        if (validDates.length === 0) {
            showToast('所有日期都存在冲突，无法添加', 'error');
            return;
        }
    }
    
    // 批量添加课程
    showToast('正在批量添加课程...', 'info');
    let successCount = 0;
    
    for (const date of dates) {
        if (conflictDates.includes(date)) continue;
        
        const data = {
            course_id: parseInt(courseId),
            teacher_id: parseInt(teacherId),
            student_id: parseInt(studentId),
            course_name_zh: course ? course.name_zh : '',
            course_name_en: course ? course.name_en : '',
            teacher_name: teacher ? teacher.name_zh : '',
            student_name: student ? student.name_zh : '',
            schedule_date: date,
            start_time: startTime,
            end_time: endTime,
            classroom: classroom,
            status: 'SCHEDULED',
            type: lessonType
        };
        
        try {
            await addLesson(data);
            successCount++;
        } catch (error) {
            console.error(`添加 ${date} 的课程失败:`, error);
        }
    }
    
    // 重新加载数据并刷新页面
    state.lessons = await getLessons();
    closeModal('lessonModal');
    showToast(`成功添加 ${successCount} 节课程`, 'success');
    renderCurrentPage();
}

// 完成课程（修复版 - 考虑课程类型）
async function completeLessonFromDetail() {
    const id = parseInt(document.getElementById('lessonDetailId').value);
    const lesson = state.lessons.find(l => l.id === id);
    
    if (!lesson) {
        showToast('课程不存在', 'error');
        return;
    }
    
    if (lesson.status === 'COMPLETED') {
        showToast('课程已完成，无需重复操作', 'warning');
        return;
    }
    
    if (lesson.status === 'CANCELLED') {
        showToast('已取消的课程无法标记为完成', 'error');
        return;
    }
    
    const student = state.students.find(s => s.id === lesson.student_id);
    if (!student) {
        showToast('找不到学生信息', 'error');
        return;
    }
    
    // 检查课程类型
    const lessonType = lesson.type || 'regular';
    const willDeductBalance = lessonType === 'regular';
    
    let confirmMsg = `确认完成课程吗？\n\n课程：${lesson.course_name_zh}\n学生：${lesson.student_name}`;
    
    if (willDeductBalance) {
        confirmMsg += `\n当前余额：${student.balance}\n完成后余额：${student.balance - 1}`;
    } else {
        const typeNames = {
            'trial': '试听课',
            'makeup': '补课'
        };
        confirmMsg += `\n\n💡 此为${typeNames[lessonType] || '特殊课程'}，不会扣除课时`;
    }
    
    if (!confirm(confirmMsg)) return;
    
    try {
        // 更新课程状态
        await updateLesson(id, { status: 'COMPLETED' });
        
        // 根据课程类型决定是否扣课时
        if (willDeductBalance) {
            await updateStudent(lesson.student_id, { 
                balance: student.balance - 1 
            });
            
            // 生成消息
            await addMessage({
                sender: 'System',
                avatar: '🤖',
                content: `课程已完成，已从 ${lesson.student_name} 扣除 1 课时。当前余额：${student.balance - 1}`,
                time: new Date().toISOString(),
                unread: true
            });
        } else {
            // 生成消息（不扣课时）
            await addMessage({
                sender: 'System',
                avatar: '🤖',
                content: `${lesson.type === 'trial' ? '试听' : '补'}课程已完成，未扣除课时。学生：${lesson.student_name}`,
                time: new Date().toISOString(),
                unread: true
            });
        }
        
        // 重新加载数据
        state.lessons = await getLessons();
        state.students = await getStudents();
        state.messages = await getMessages();
        
        closeModal('lessonDetailModal');
        showToast(willDeductBalance ? '课程已完成，已扣除课时' : '课程已完成', 'success');
        renderCurrentPage();
        updateNotificationDot();
    } catch (error) {
        console.error('完成课程失败:', error);
        showToast('操作失败，请重试', 'error');
    }
}

// 辅助函数：获取N天后的日期
function getDateAfterDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

// 辅助函数：获取今天日期
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// 增强版冲突检测
function checkScheduleConflicts(excludeId, date, startTime, endTime, teacherId, studentId, classroom) {
    const conflicts = [];
    
    // 获取同一日期的所有排课（排除当前编辑的课程）
    const sameDayLessons = state.lessons.filter(l => 
        l.schedule_date === date && 
        l.status !== 'CANCELLED' &&  // 忽略已取消的课程
        (excludeId === null || l.id !== excludeId)
    );
    
    // 检测时间重叠的辅助函数
    function isTimeOverlap(start1, end1, start2, end2) {
        return start1 < end2 && end1 > start2;
    }
    
    for (const lesson of sameDayLessons) {
        const hasTimeOverlap = isTimeOverlap(startTime, endTime, lesson.start_time, lesson.end_time);
        
        if (hasTimeOverlap) {
            // 教师冲突
            if (lesson.teacher_id === teacherId) {
                conflicts.push(`教师「${lesson.teacher_name}」在 ${lesson.start_time}-${lesson.end_time} 已有课程`);
            }
            
            // 学生冲突
            if (lesson.student_id === studentId) {
                conflicts.push(`学生「${lesson.student_name}」在 ${lesson.start_time}-${lesson.end_time} 已有课程`);
            }
            
            // 教室冲突
            if (lesson.classroom === classroom && classroom) {
                conflicts.push(`教室「${classroom}」在 ${lesson.start_time}-${lesson.end_time} 已被占用`);
            }
        }
    }
    
    return conflicts;
}

// 为批量日期选择添加事件监听（在页面加载后调用）
document.addEventListener('DOMContentLoaded', function() {
    // 为批量模式的复选框和日期添加监听
    const batchStartDate = document.getElementById('batchStartDate');
    const batchEndDate = document.getElementById('batchEndDate');
    
    if (batchStartDate) {
        batchStartDate.addEventListener('change', updateBatchCount);
    }
    if (batchEndDate) {
        batchEndDate.addEventListener('change', updateBatchCount);
    }
    
    // 为所有复选框添加监听
    const checkboxes = document.querySelectorAll('#batchDateGroup input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateBatchCount);
    });
});


// 显示课程详情
function showLessonDetail(id) {
    const lesson = state.lessons.find(l => l.id === id);
    if (!lesson) return;
    
    const student = state.students.find(s => s.id === lesson.student_id);
    const studentBalance = student ? student.balance : 0;
    
    const detailHtml = `
        <div class="lesson-detail-content">
            <div class="detail-row"><label>课程：</label><span>${lesson.course_name_zh || '-'}</span></div>
            <div class="detail-row"><label>教师：</label><span>${lesson.teacher_name || '-'}</span></div>
            <div class="detail-row"><label>学生：</label><span>${lesson.student_name || '-'} (余额: <span class="${studentBalance <= 0 ? 'balance-warning' : studentBalance <= 5 ? 'balance-low' : ''}">${studentBalance}</span>)</span></div>
            <div class="detail-row"><label>日期：</label><span>${lesson.schedule_date}</span></div>
            <div class="detail-row"><label>时间：</label><span>${lesson.start_time} - ${lesson.end_time}</span></div>
            <div class="detail-row"><label>教室：</label><span>${lesson.classroom || '-'}</span></div>
            <div class="detail-row"><label>状态：</label><span class="status-badge ${lesson.status === 'COMPLETED' ? 'active' : lesson.status === 'CANCELLED' ? 'inactive' : 'pending'}">${getStatusName(lesson.status)}</span></div>
        </div>
    `;
    
    document.getElementById('lessonDetailContent').innerHTML = detailHtml;
    document.getElementById('lessonDetailId').value = id;
    
    // 根据状态显示/隐藏按钮
    const footer = document.getElementById('lessonDetailFooter');
    if (lesson.status === 'COMPLETED' || lesson.status === 'CANCELLED') {
        footer.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal('lessonDetailModal')">关闭</button>
        `;
    } else {
        footer.innerHTML = `
            <button class="btn btn-danger" onclick="deleteLessonFromDetail()">🗑️ 删除</button>
            <button class="btn btn-warning" onclick="openLeaveModal()">📝 请假/调课</button>
            <button class="btn btn-success" onclick="completeLessonFromDetail()">✅ 完成课程</button>
            <button class="btn btn-primary" onclick="editLessonFromDetail()">✏️ 编辑</button>
        `;
    }
    
    openModal('lessonDetailModal');
}

function editLessonFromDetail() {
    const id = parseInt(document.getElementById('lessonDetailId').value);
    closeModal('lessonDetailModal');
    editLesson(id);
}

async function deleteLessonFromDetail() {
    const id = parseInt(document.getElementById('lessonDetailId').value);
    if (!confirm('确定删除此排课？')) return;
    
    await deleteLesson(id);
    state.lessons = await getLessons();
    closeModal('lessonDetailModal');
    showToast('删除成功', 'success');
    renderCurrentPage();
}

// 保存排课（增强版冲突检测）
async function saveLesson() {
    const id = document.getElementById('editLessonId').value;
    const courseId = document.getElementById('lessonCourse').value;
    const teacherId = document.getElementById('lessonTeacher').value;
    const studentId = document.getElementById('lessonStudent').value;
    const date = document.getElementById('lessonDate').value;
    const startTime = document.getElementById('lessonStartTime').value;
    const endTime = document.getElementById('lessonEndTime').value;
    const classroom = document.getElementById('lessonClassroom').value;
    
    if (!courseId || !teacherId || !studentId || !date) {
        showToast('请填写完整信息', 'error');
        return;
    }
    
    const course = state.courses.find(c => c.id == courseId);
    const teacher = state.teachers.find(t => t.id == teacherId);
    const student = state.students.find(s => s.id == studentId);
    
    // 冲突检测
    const conflicts = checkScheduleConflicts(
        id ? parseInt(id) : null,
        date, startTime, endTime,
        parseInt(teacherId), parseInt(studentId), classroom
    );
    
    if (conflicts.length > 0) {
        showToast(`排课冲突：${conflicts.join('；')}`, 'error');
        return;
    }
    
    const data = {
        course_id: parseInt(courseId),
        teacher_id: parseInt(teacherId),
        student_id: parseInt(studentId),
        course_name_zh: course ? course.name_zh : '',
        course_name_en: course ? course.name_en : '',
        teacher_name: teacher ? teacher.name_zh : '',
        student_name: student ? student.name_zh : '',
        schedule_date: date,
        start_time: startTime,
        end_time: endTime,
        classroom: classroom,
        status: 'SCHEDULED',
        type: 'regular'
    };
    
    if (id) {
        await updateLesson(parseInt(id), data);
        showToast('修改成功', 'success');
    } else {
        await addLesson(data);
        showToast('排课成功', 'success');
    }
    
    state.lessons = await getLessons();
    closeModal('lessonModal');
    renderCurrentPage();
}

// 冲突检测
function checkScheduleConflicts(excludeId, date, startTime, endTime, teacherId, studentId, classroom) {
    const conflicts = [];
    
    const sameDayLessons = state.lessons.filter(l => 
        l.schedule_date === date && 
        l.status !== 'CANCELLED' &&
        (excludeId === null || l.id !== excludeId)
    );
    
    function isTimeOverlap(start1, end1, start2, end2) {
        return start1 < end2 && end1 > start2;
    }
    
    for (const lesson of sameDayLessons) {
        const hasTimeOverlap = isTimeOverlap(startTime, endTime, lesson.start_time, lesson.end_time);
        
        if (hasTimeOverlap) {
            if (lesson.teacher_id === teacherId) {
                conflicts.push(`教师「${lesson.teacher_name}」在 ${lesson.start_time}-${lesson.end_time} 已有课程`);
            }
            if (lesson.student_id === studentId) {
                conflicts.push(`学生「${lesson.student_name}」在 ${lesson.start_time}-${lesson.end_time} 已有课程`);
            }
            if (lesson.classroom === classroom && classroom) {
                conflicts.push(`教室「${classroom}」在 ${lesson.start_time}-${lesson.end_time} 已被占用`);
            }
        }
    }
    
    return conflicts;
}

// ==================== Day 3 功能1: 课时消耗逻辑 ====================
async function completeLessonFromDetail() {
    const lessonId = parseInt(document.getElementById('lessonDetailId').value);
    const lesson = state.lessons.find(l => l.id === lessonId);
    
    if (!lesson) {
        showToast('课程不存在', 'error');
        return;
    }
    
    if (lesson.status === 'COMPLETED') {
        showToast('该课程已经完成', 'warning');
        return;
    }
    
    if (lesson.status === 'CANCELLED') {
        showToast('该课程已取消，无法完成', 'error');
        return;
    }
    
    const student = state.students.find(s => s.id === lesson.student_id);
    const currentBalance = student ? student.balance : 0;
    const newBalance = currentBalance - 1;
    
    let confirmMsg = `确定完成课程「${lesson.course_name_zh}」吗？\n\n`;
    confirmMsg += `学生：${lesson.student_name}\n`;
    confirmMsg += `当前课时余额：${currentBalance}\n`;
    confirmMsg += `完成后余额：${newBalance}\n`;
    
    if (newBalance < 0) {
        confirmMsg += `\n⚠️ 注意：学生课时余额将变为负数！`;
    }
    
    if (!confirm(confirmMsg)) return;
    
    try {
        // 调用数据库函数完成课程并扣减课时
        const result = await completeLessonWithDeduction(lessonId);
        
        if (result.error) {
            showToast(result.error.message || '操作失败', 'error');
            return;
        }
        
        // 刷新数据
        state.lessons = await getLessons();
        state.students = await getStudents();
        state.messages = await getMessages();
        
        closeModal('lessonDetailModal');
        showToast(`课程已完成，扣减1课时，学生余额：${result.consumeResult.newBalance}`, 'success');
        renderCurrentPage();
        updateNotificationDot();
        
    } catch (error) {
        console.error('完成课程失败:', error);
        showToast('操作失败，请重试', 'error');
    }
}

// ==================== Day 3 功能2: 学生课时充值 ====================
function openRechargeModal(studentId) {
    const student = state.students.find(s => s.id === studentId);
    if (!student) {
        showToast('学生不存在', 'error');
        return;
    }
    
    document.getElementById('rechargeStudentId').value = studentId;
    document.getElementById('rechargeStudentName').textContent = student.name_zh || student.name_en;
    document.getElementById('rechargeCurrentBalance').textContent = `${student.balance} 课时`;
    document.getElementById('rechargeAmount').value = 10;
    document.getElementById('rechargeReason').value = '';
    
    updateRechargePreview();
    openModal('rechargeModal');
}

function updateRechargePreview() {
    const studentId = parseInt(document.getElementById('rechargeStudentId').value);
    const student = state.students.find(s => s.id === studentId);
    const currentBalance = student ? student.balance : 0;
    const amount = parseInt(document.getElementById('rechargeAmount').value) || 0;
    const newBalance = currentBalance + amount;
    
    document.getElementById('rechargeNewBalance').textContent = `${newBalance} 课时`;
}

async function confirmRecharge() {
    const studentId = parseInt(document.getElementById('rechargeStudentId').value);
    const amount = parseInt(document.getElementById('rechargeAmount').value);
    const reason = document.getElementById('rechargeReason').value;
    
    if (!amount || amount <= 0) {
        showToast('请输入有效的充值课时数', 'error');
        return;
    }
    
    try {
        const result = await rechargeStudentBalance(studentId, amount, reason);
        
        if (result.error) {
            showToast('充值失败: ' + result.error.message, 'error');
            return;
        }
        
        // 刷新数据
        state.students = await getStudents();
        state.messages = await getMessages();
        
        closeModal('rechargeModal');
        showToast(`充值成功！当前余额：${result.newBalance} 课时`, 'success');
        renderCurrentPage();
        updateNotificationDot();
        
    } catch (error) {
        console.error('充值失败:', error);
        showToast('充值失败，请重试', 'error');
    }
}

// ==================== Day 3 功能3: 请假/调课申请 ====================
function openLeaveModal() {
    const lessonId = parseInt(document.getElementById('lessonDetailId').value);
    const lesson = state.lessons.find(l => l.id === lessonId);
    
    if (!lesson) {
        showToast('课程不存在', 'error');
        return;
    }
    
    document.getElementById('leaveLessonId').value = lessonId;
    document.getElementById('leaveLessonInfo').innerHTML = `
        <div class="lesson-title">${lesson.course_name_zh}</div>
        <div class="lesson-detail">
            👨‍🏫 ${lesson.teacher_name} | 👨‍🎓 ${lesson.student_name}<br>
            📅 ${lesson.schedule_date} ${lesson.start_time}-${lesson.end_time}
        </div>
    `;
    
    document.getElementById('leaveType').value = '请假';
    document.getElementById('leaveReason').value = '';
    document.getElementById('rescheduleFields').style.display = 'none';
    
    // 设置默认调课日期为原日期+7天
    const originalDate = new Date(lesson.schedule_date);
    originalDate.setDate(originalDate.getDate() + 7);
    document.getElementById('rescheduleDate').value = originalDate.toISOString().split('T')[0];
    document.getElementById('rescheduleStartTime').value = lesson.start_time;
    document.getElementById('rescheduleEndTime').value = lesson.end_time;
    
    closeModal('lessonDetailModal');
    openModal('leaveModal');
}

function toggleRescheduleFields() {
    const type = document.getElementById('leaveType').value;
    document.getElementById('rescheduleFields').style.display = type === '调课' ? 'block' : 'none';
}

async function submitLeaveRequest() {
    const lessonId = parseInt(document.getElementById('leaveLessonId').value);
    const type = document.getElementById('leaveType').value;
    const reason = document.getElementById('leaveReason').value;
    
    if (!reason.trim()) {
        showToast('请填写申请原因', 'error');
        return;
    }
    
    const lesson = state.lessons.find(l => l.id === lessonId);
    if (!lesson) {
        showToast('课程不存在', 'error');
        return;
    }
    
    // 构建审批数据
    const approvalData = {
        type: type,
        lesson_id: lessonId,
        lesson_info: `${lesson.course_name_zh} - ${lesson.schedule_date} ${lesson.start_time}`,
        reason: reason,
        applicant: lesson.student_name || '未知',
        status: 'PENDING'
    };
    
    // 如果是调课，添加新时间信息
    if (type === '调课') {
        const newDate = document.getElementById('rescheduleDate').value;
        const newStartTime = document.getElementById('rescheduleStartTime').value;
        const newEndTime = document.getElementById('rescheduleEndTime').value;
        
        if (!newDate) {
            showToast('请选择调整日期', 'error');
            return;
        }
        
        approvalData.new_date = newDate;
        approvalData.new_start_time = newStartTime;
        approvalData.new_end_time = newEndTime;
        approvalData.lesson_info += ` → ${newDate} ${newStartTime}`;
    }
    
    try {
        await addApproval(approvalData);
        state.approvals = await getApprovals();
        
        closeModal('leaveModal');
        showToast(`${type}申请已提交，等待审批`, 'success');
        renderCurrentPage();
        
    } catch (error) {
        console.error('提交申请失败:', error);
        showToast('提交失败，请重试', 'error');
    }
}

// ==================== Day 3 功能3续: 审批处理 ====================
function showApprovalDetail(approvalId) {
    const approval = state.approvals.find(a => a.id === approvalId);
    if (!approval) {
        showToast('审批不存在', 'error');
        return;
    }
    
    document.getElementById('approvalDetailId').value = approvalId;
    document.getElementById('approvalDetailType').value = approval.type;
    document.getElementById('approvalDetailLessonId').value = approval.lesson_id || '';
    
    const detailHtml = `
        <div class="approval-info">
            <div class="info-item"><label>类型：</label><span class="status-badge pending">${approval.type}</span></div>
            <div class="info-item"><label>课程：</label><span>${approval.lesson_info || '-'}</span></div>
            <div class="info-item"><label>申请人：</label><span>${approval.applicant}</span></div>
            <div class="info-item"><label>原因：</label><span>${approval.reason || '-'}</span></div>
            <div class="info-item"><label>时间：</label><span>${formatDate(approval.created_at)}</span></div>
        </div>
    `;
    
    document.getElementById('approvalDetailContent').innerHTML = detailHtml;
    
    // 如果是调课申请，显示新时间确认字段
    if (approval.type === '调课') {
        document.getElementById('approvalRescheduleFields').style.display = 'block';
        document.getElementById('approvalNewDate').value = approval.new_date || '';
        document.getElementById('approvalNewStartTime').value = approval.new_start_time || '';
        document.getElementById('approvalNewEndTime').value = approval.new_end_time || '';
    } else {
        document.getElementById('approvalRescheduleFields').style.display = 'none';
    }
    
    openModal('approvalDetailModal');
}

async function processApproval(status) {
    const approvalId = parseInt(document.getElementById('approvalDetailId').value);
    const type = document.getElementById('approvalDetailType').value;
    const lessonId = document.getElementById('approvalDetailLessonId').value;
    
    const approval = state.approvals.find(a => a.id === approvalId);
    if (!approval) {
        showToast('审批不存在', 'error');
        return;
    }
    
    try {
        if (type === '请假') {
            // 请假审批：通过则取消课程
            await handleLeaveApproval(approvalId, status, lessonId ? parseInt(lessonId) : null);
            
        } else if (type === '调课') {
            // 调课审批：通过则更新课程时间
            const newDate = document.getElementById('approvalNewDate').value;
            const newStartTime = document.getElementById('approvalNewStartTime').value;
            const newEndTime = document.getElementById('approvalNewEndTime').value;
            
            if (status === 'APPROVED' && !newDate) {
                showToast('请填写调整日期', 'error');
                return;
            }
            
            await handleRescheduleApproval(approvalId, status, lessonId ? parseInt(lessonId) : null, newDate, newStartTime, newEndTime);
            
        } else {
            // 其他类型审批
            await updateApproval(approvalId, { status: status });
        }
        
        // 刷新数据
        state.approvals = await getApprovals();
        state.lessons = await getLessons();
        state.messages = await getMessages();
        
        closeModal('approvalDetailModal');
        showToast(status === 'APPROVED' ? '审批已通过' : '审批已拒绝', 'success');
        renderCurrentPage();
        updateNotificationDot();
        
    } catch (error) {
        console.error('处理审批失败:', error);
        showToast('处理失败，请重试', 'error');
    }
}

// 旧版审批处理（保留兼容）
async function handleApproval(id, status) {
    await updateApproval(id, { status });
    state.approvals = await getApprovals();
    showToast(status === 'APPROVED' ? '已通过' : '已拒绝', 'success');
    renderCurrentPage();
}

// 消息已读
async function markMessageAsRead(id) {
    await markMessageRead(id);
    state.messages = await getMessages();
    updateNotificationDot();
    renderCurrentPage();
}

// ==================== 工具函数 ====================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✔' : type === 'error' ? '✕' : '⚠'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showNotifications() {
    const unread = state.messages.filter(m => m.unread).length;
    showToast(`您有 ${unread} 条未读消息`);
}

function updateNotificationDot() {
    const unread = state.messages.filter(m => m.unread).length;
    const dot = document.getElementById('notificationDot');
    dot.classList.toggle('show', unread > 0);
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
}

function getSubjectName(subject) {
    const names = { math: '数学', english: '英语', physics: '物理', chemistry: '化学', chinese: '语文', biology: '生物' };
    return names[subject] || subject || '-';
}

function getTypeName(type) {
    const names = { '1v1': '一对一', '1v3': '一对三', 'class': '小班课' };
    return names[type] || type || '-';
}

function getStatusName(status) {
    const names = { 
        'SCHEDULED': '已排课', 
        'COMPLETED': '已完成', 
        'CANCELLED': '已取消',
        'PENDING': '待确认'
    };
    return names[status] || status || '-';
}

// 周视图相关
let currentWeekOffset = 0;
let currentDayOffset = 0;
let currentMonthOffset = 0;

function getWeekDays() {
    const today = new Date();
    today.setDate(today.getDate() + currentWeekOffset * 7);
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const days = [];
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push({
            date: d.toISOString().split('T')[0],
            dateStr: `${d.getMonth() + 1}月${d.getDate()}日`,
            dateShort: `${d.getMonth() + 1}/${d.getDate()}`,
            dayName: dayNames[i]
        });
    }
    return days;
}

function changeWeek(offset) {
    currentWeekOffset += offset;
    renderCurrentPage();
}

function changeDay(offset) {
    currentDayOffset += offset;
    renderCurrentPage();
}

function changeMonth(offset) {
    currentMonthOffset += offset;
    renderCurrentPage();
}

console.log('App.js 加载完成 - Day 3 更新版');
