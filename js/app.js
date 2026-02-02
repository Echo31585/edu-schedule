// ==================== 全局状态 ====================
const state = {
    currentRole: 'ADMIN',
    currentUser: null,
    currentPage: 'workbench',
    teachers: [],
    students: [],
    courses: [],
    lessons: [],
    approvals: [],
    messages: []
};

// 用户信息
const mockUsers = {
    ADMIN: { name: '教务管理员', avatar: '👩‍💼' },
    TEACHER: { name: '李老师', avatar: '👨‍🏫' },
    STUDENT: { name: '王同学', avatar: '👨‍🎓' },
    FINANCE: { name: '财务张', avatar: '💰' }
};

// 菜单配置
const menuConfig = {
    ADMIN: ['workbench', 'scheduling', 'users', 'courses', 'approvals'],
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
    const todayLessons = state.lessons.filter(l => l.scheduled_date === getTodayDate()).length;
    const pendingApprovals = state.approvals.filter(a => a.status === 'PENDING').length;
    const lowBalanceStudents = state.students.filter(s => s.balance <= 5).length;
    
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
                <div class="stat-icon">✅</div>
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
            </div>
        </div>
        
        ${lowBalanceStudents > 0 ? `
        <div class="table-container" style="margin-top: 20px; border-left: 4px solid var(--warning);">
            <div class="table-header">
                <h3 class="table-title">⚠️ 课时预警 (${lowBalanceStudents}人)</h3>
            </div>
            <table class="data-table">
                <thead><tr><th>学生</th><th>剩余课时</th><th>状态</th></tr></thead>
                <tbody>
                    ${state.students.filter(s => s.balance <= 5).map(s => `
                        <tr>
                            <td>${s.name_zh || s.name_en}</td>
                            <td>${s.balance}</td>
                            <td><span class="status-badge ${s.balance <= 0 ? 'inactive' : 'pending'}">${s.balance <= 0 ? '已用完' : '偏低'}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
    `;
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
                            <td><span style="color: ${s.balance <= 5 ? 'var(--danger)' : 'inherit'}; font-weight: ${s.balance <= 5 ? '600' : 'normal'};">${s.balance}</span></td>
                            <td><span class="status-badge ${s.status}">${s.status === 'active' ? '在读' : '停课'}</span></td>
                            <td>
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
                            <td><span class="status-badge ${c.status}">${c.status === 'active' ? '启用' : '停用'}</span></td>
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

// ==================== 排课管理 ====================
function renderScheduling(container) {
    const weekDays = getWeekDays();
    const times = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '19:00', '20:00'];
    
    container.innerHTML = `
        <div class="schedule-header">
            <div class="schedule-nav">
                <button onclick="changeWeek(-1)">◀ 上周</button>
                <span class="current-period">${weekDays[0].dateStr} ~ ${weekDays[6].dateStr}</span>
                <button onclick="changeWeek(1)">下周 ▶</button>
            </div>
            <button class="btn btn-primary" onclick="openLessonModal()">+ 新增排课</button>
        </div>
        
        <div class="schedule-grid">
            <div class="schedule-header-cell">时间</div>
            ${weekDays.map(d => `<div class="schedule-header-cell">${d.dayName}<br><small>${d.dateShort}</small></div>`).join('')}
            
            ${times.map(time => `
                <div class="schedule-time-cell">${time}</div>
                ${weekDays.map(d => {
                    const dayLessons = state.lessons.filter(l => l.scheduled_date === d.date && l.start_time === time);
                    return `<div class="schedule-cell">
                        ${dayLessons.map(l => `
                            <div class="schedule-lesson" onclick="viewLesson(${l.id})">
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
                                <button class="btn btn-success btn-sm" onclick="handleApproval(${a.id}, 'APPROVED')">通过</button>
                                <button class="btn btn-danger btn-sm" onclick="handleApproval(${a.id}, 'REJECTED')">拒绝</button>
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
                            <td>${a.type}</td>
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

// ==================== 结算管理 ====================
function renderSettlement(container) {
    const completedLessons = state.lessons.filter(l => l.status === 'COMPLETED').length;
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-value">¥${(completedLessons * 280).toLocaleString()}</div>
                <div class="stat-label">本月预计结算</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value">${completedLessons}</div>
                <div class="stat-label">已完成课时</div>
            </div>
        </div>
        <div class="empty-state">
            <div class="empty-icon">🚧</div>
            <h3>结算详情开发中</h3>
        </div>
    `;
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
function openLessonModal() {
    document.getElementById('lessonModalTitle').textContent = '新增排课';
    document.getElementById('editLessonId').value = '';
    
    // 填充下拉选项
    const courseSelect = document.getElementById('lessonCourse');
    courseSelect.innerHTML = state.courses.map(c => `<option value="${c.id}">${c.name_zh}</option>`).join('');
    
    const teacherSelect = document.getElementById('lessonTeacher');
    teacherSelect.innerHTML = state.teachers.map(t => `<option value="${t.id}">${t.name_zh}</option>`).join('');
    
    const studentSelect = document.getElementById('lessonStudent');
    studentSelect.innerHTML = state.students.map(s => `<option value="${s.id}">${s.name_zh}</option>`).join('');
    
    document.getElementById('lessonDate').value = getTodayDate();
    
    openModal('lessonModal');
}

async function saveLesson() {
    const courseId = document.getElementById('lessonCourse').value;
    const teacherId = document.getElementById('lessonTeacher').value;
    const studentId = document.getElementById('lessonStudent').value;
    
    const course = state.courses.find(c => c.id == courseId);
    const teacher = state.teachers.find(t => t.id == teacherId);
    const student = state.students.find(s => s.id == studentId);
    
    const data = {
        course_id: parseInt(courseId),
        teacher_id: parseInt(teacherId),
        student_id: parseInt(studentId),
        course_name_zh: course ? course.name_zh : '',
        course_name_en: course ? course.name_en : '',
        teacher_name: teacher ? teacher.name_zh : '',
        student_name: student ? student.name_zh : '',
        scheduled_date: document.getElementById('lessonDate').value,
        start_time: document.getElementById('lessonStartTime').value,
        end_time: document.getElementById('lessonEndTime').value,
        classroom: document.getElementById('lessonClassroom').value,
        status: 'SCHEDULED',
        type: 'regular'
    };
    
    if (!data.scheduled_date) {
        showToast('请选择上课日期', 'error');
        return;
    }
    
    // 检查冲突
    const conflict = state.lessons.find(l => 
        l.scheduled_date === data.scheduled_date && 
        l.start_time === data.start_time &&
        (l.teacher_id == data.teacher_id || l.classroom === data.classroom)
    );
    
    if (conflict) {
        showToast('时间或教室冲突！', 'error');
        return;
    }
    
    await addLesson(data);
    state.lessons = await getLessons();
    closeModal('lessonModal');
    showToast('排课成功', 'success');
    renderCurrentPage();
}

function viewLesson(id) {
    const lesson = state.lessons.find(l => l.id === id);
    if (lesson) {
        alert(`课程: ${lesson.course_name_zh}\n教师: ${lesson.teacher_name}\n学生: ${lesson.student_name}\n时间: ${lesson.scheduled_date} ${lesson.start_time}-${lesson.end_time}\n教室: ${lesson.classroom}`);
    }
}

// 审批处理
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
    toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠'}</span><span>${message}</span>`;
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

// 周视图相关
let currentWeekOffset = 0;

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

console.log('App.js 加载完成');