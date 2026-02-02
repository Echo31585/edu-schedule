// ==================== 数据库操作函数 ====================

// ---------- 教师 Teachers ----------
async function getTeachers() {
    const { data, error } = await db
        .from('teachers')
        .select('*')
        .order('id', { ascending: true });
    if (error) console.error('获取教师失败:', error);
    return data || [];
}

async function addTeacher(teacher) {
    const { data, error } = await db
        .from('teachers')
        .insert([teacher])
        .select();
    if (error) console.error('添加教师失败:', error);
    return { data, error };
}

async function updateTeacher(id, updates) {
    const { data, error } = await db
        .from('teachers')
        .update(updates)
        .eq('id', id)
        .select();
    if (error) console.error('更新教师失败:', error);
    return { data, error };
}

async function deleteTeacher(id) {
    const { error } = await db
        .from('teachers')
        .delete()
        .eq('id', id);
    if (error) console.error('删除教师失败:', error);
    return { error };
}

// ---------- 学生 Students ----------
async function getStudents() {
    const { data, error } = await db
        .from('students')
        .select('*')
        .order('id', { ascending: true });
    if (error) console.error('获取学生失败:', error);
    return data || [];
}

async function addStudent(student) {
    const { data, error } = await db
        .from('students')
        .insert([student])
        .select();
    if (error) console.error('添加学生失败:', error);
    return { data, error };
}

async function updateStudent(id, updates) {
    const { data, error } = await db
        .from('students')
        .update(updates)
        .eq('id', id)
        .select();
    if (error) console.error('更新学生失败:', error);
    return { data, error };
}

async function deleteStudent(id) {
    const { error } = await db
        .from('students')
        .delete()
        .eq('id', id);
    if (error) console.error('删除学生失败:', error);
    return { error };
}

// ---------- 课程 Courses ----------
async function getCourses() {
    const { data, error } = await db
        .from('courses')
        .select('*')
        .order('id', { ascending: true });
    if (error) console.error('获取课程失败:', error);
    return data || [];
}

async function addCourse(course) {
    const { data, error } = await db
        .from('courses')
        .insert([course])
        .select();
    if (error) console.error('添加课程失败:', error);
    return { data, error };
}

async function updateCourse(id, updates) {
    const { data, error } = await db
        .from('courses')
        .update(updates)
        .eq('id', id)
        .select();
    if (error) console.error('更新课程失败:', error);
    return { data, error };
}

async function deleteCourse(id) {
    const { error } = await db
        .from('courses')
        .delete()
        .eq('id', id);
    if (error) console.error('删除课程失败:', error);
    return { error };
}

// ---------- 排课 Lessons ----------
async function getLessons() {
    const { data, error } = await db
        .from('lessons')
        .select('*')
        .order('scheduled_date', { ascending: true });
    if (error) console.error('获取排课失败:', error);
    return data || [];
}

async function addLesson(lesson) {
    const { data, error } = await db
        .from('lessons')
        .insert([lesson])
        .select();
    if (error) console.error('添加排课失败:', error);
    return { data, error };
}

async function updateLesson(id, updates) {
    const { data, error } = await db
        .from('lessons')
        .update(updates)
        .eq('id', id)
        .select();
    if (error) console.error('更新排课失败:', error);
    return { data, error };
}

async function deleteLesson(id) {
    const { error } = await db
        .from('lessons')
        .delete()
        .eq('id', id);
    if (error) console.error('删除排课失败:', error);
    return { error };
}

// ---------- 审批 Approvals ----------
async function getApprovals() {
    const { data, error } = await db
        .from('approvals')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) console.error('获取审批失败:', error);
    return data || [];
}

async function addApproval(approval) {
    const { data, error } = await db
        .from('approvals')
        .insert([approval])
        .select();
    if (error) console.error('添加审批失败:', error);
    return { data, error };
}

async function updateApproval(id, updates) {
    const { data, error } = await db
        .from('approvals')
        .update(updates)
        .eq('id', id)
        .select();
    if (error) console.error('更新审批失败:', error);
    return { data, error };
}

// ---------- 消息 Messages ----------
async function getMessages() {
    const { data, error } = await db
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) console.error('获取消息失败:', error);
    return data || [];
}

async function addMessage(message) {
    const { data, error } = await db
        .from('messages')
        .insert([message])
        .select();
    if (error) console.error('添加消息失败:', error);
    return { data, error };
}

async function markMessageRead(id) {
    const { data, error } = await db
        .from('messages')
        .update({ unread: false })
        .eq('id', id)
        .select();
    if (error) console.error('标记已读失败:', error);
    return { data, error };
}

console.log('数据库操作函数已加载');