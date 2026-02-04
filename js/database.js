// ==================== 数据库操作函数 ====================
// Day 3 更新版 - 新增课时消耗、充值、审批处理、结算功能

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

// ========== Day 3 新增：学生课时余额操作 ==========

// 充值课时
async function rechargeStudentBalance(studentId, amount, reason = '') {
    // 先获取当前余额
    const { data: student, error: getError } = await db
        .from('students')
        .select('balance, name_zh')
        .eq('id', studentId)
        .single();
    
    if (getError) {
        console.error('获取学生信息失败:', getError);
        return { error: getError };
    }
    
    const newBalance = (student.balance || 0) + amount;
    
    // 更新余额
    const { data, error } = await db
        .from('students')
        .update({ balance: newBalance })
        .eq('id', studentId)
        .select();
    
    if (error) {
        console.error('充值失败:', error);
        return { error };
    }
    
    // 添加系统消息记录
    await addMessage({
        sender: '系统通知',
        avatar: '💰',
        content: `学生「${student.name_zh}」充值 ${amount} 课时，当前余额 ${newBalance} 课时。${reason ? '备注：' + reason : ''}`,
        unread: true
    });
    
    return { data, newBalance, error: null };
}

// 消耗课时（完成课程后调用）
async function consumeStudentBalance(studentId, amount = 1) {
    // 先获取当前余额
    const { data: student, error: getError } = await db
        .from('students')
        .select('balance, name_zh')
        .eq('id', studentId)
        .single();
    
    if (getError) {
        console.error('获取学生信息失败:', getError);
        return { error: getError };
    }
    
    const currentBalance = student.balance || 0;
    const newBalance = currentBalance - amount;
    
    // 更新余额（允许负数，方便后续补缴）
    const { data, error } = await db
        .from('students')
        .update({ balance: newBalance })
        .eq('id', studentId)
        .select();
    
    if (error) {
        console.error('扣减课时失败:', error);
        return { error };
    }
    
    return { 
        data, 
        previousBalance: currentBalance,
        newBalance, 
        studentName: student.name_zh,
        error: null 
    };
}

// 完成课程并扣减课时（原子操作）
async function completeLessonWithDeduction(lessonId) {
    // 获取课程信息
    const { data: lesson, error: lessonError } = await db
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();
    
    if (lessonError) {
        console.error('获取排课信息失败:', lessonError);
        return { error: lessonError };
    }
    
    if (lesson.status === 'COMPLETED') {
        return { error: { message: '该课程已经完成，无法重复操作' } };
    }
    
    if (lesson.status === 'CANCELLED') {
        return { error: { message: '该课程已取消，无法完成' } };
    }
    
    // 扣减学生课时
    const consumeResult = await consumeStudentBalance(lesson.student_id, 1);
    if (consumeResult.error) {
        return { error: consumeResult.error };
    }
    
    // 更新课程状态为已完成
    const { data, error } = await db
        .from('lessons')
        .update({ status: 'COMPLETED' })
        .eq('id', lessonId)
        .select();
    
    if (error) {
        console.error('更新课程状态失败:', error);
        return { error };
    }
    
    // 添加系统消息
    await addMessage({
        sender: '系统通知',
        avatar: '✅',
        content: `课程「${lesson.course_name_zh}」已完成。学生「${consumeResult.studentName}」扣减1课时，剩余 ${consumeResult.newBalance} 课时。`,
        unread: true
    });
    
    return { 
        data, 
        consumeResult,
        error: null 
    };
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

// ========== Day 3 新增：审批流程处理 ==========

// 处理请假审批（通过后取消对应课程）
async function handleLeaveApproval(approvalId, status, lessonId) {
    // 更新审批状态
    const { error: approvalError } = await db
        .from('approvals')
        .update({ status: status })
        .eq('id', approvalId);
    
    if (approvalError) {
        console.error('更新审批状态失败:', approvalError);
        return { error: approvalError };
    }
    
    // 如果通过，取消对应课程
    if (status === 'APPROVED' && lessonId) {
        const { error: lessonError } = await db
            .from('lessons')
            .update({ status: 'CANCELLED' })
            .eq('id', lessonId);
        
        if (lessonError) {
            console.error('取消课程失败:', lessonError);
            return { error: lessonError };
        }
        
        // 添加系统消息
        await addMessage({
            sender: '系统通知',
            avatar: '📝',
            content: `请假申请已通过，相关课程已取消。`,
            unread: true
        });
    }
    
    return { error: null };
}

// 处理调课审批（通过后更新课程时间）
async function handleRescheduleApproval(approvalId, status, lessonId, newDate, newStartTime, newEndTime) {
    // 更新审批状态
    const { error: approvalError } = await db
        .from('approvals')
        .update({ status: status })
        .eq('id', approvalId);
    
    if (approvalError) {
        console.error('更新审批状态失败:', approvalError);
        return { error: approvalError };
    }
    
    // 如果通过，更新课程时间
    if (status === 'APPROVED' && lessonId && newDate) {
        const updates = { scheduled_date: newDate };
        if (newStartTime) updates.start_time = newStartTime;
        if (newEndTime) updates.end_time = newEndTime;
        
        const { error: lessonError } = await db
            .from('lessons')
            .update(updates)
            .eq('id', lessonId);
        
        if (lessonError) {
            console.error('更新课程时间失败:', lessonError);
            return { error: lessonError };
        }
        
        // 添加系统消息
        await addMessage({
            sender: '系统通知',
            avatar: '🔄',
            content: `调课申请已通过，课程已调整至 ${newDate} ${newStartTime || ''}-${newEndTime || ''}。`,
            unread: true
        });
    }
    
    return { error: null };
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

// ========== Day 3 新增：结算相关查询 ==========

// 获取指定月份的教师结算数据
async function getTeacherMonthlyStats(teacherId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const { data, error } = await db
        .from('lessons')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('status', 'COMPLETED')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);
    
    if (error) {
        console.error('获取教师月度统计失败:', error);
        return { data: [], error };
    }
    
    return { data: data || [], error: null };
}

// 获取所有教师的月度结算汇总
async function getAllTeachersSettlement(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const { data, error } = await db
        .from('lessons')
        .select('*')
        .eq('status', 'COMPLETED')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);
    
    if (error) {
        console.error('获取结算数据失败:', error);
        return { data: [], error };
    }
    
    return { data: data || [], error: null };
}

// 获取学生课时消耗统计
async function getStudentConsumptionStats(studentId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const { data, error } = await db
        .from('lessons')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'COMPLETED')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);
    
    if (error) {
        console.error('获取学生消耗统计失败:', error);
        return { data: [], error };
    }
    
    return { data: data || [], error: null };
}

console.log('数据库操作函数已加载 - Day 3 更新版');
