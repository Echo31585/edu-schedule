// Supabase 配置
const SUPABASE_URL = 'https://dvvbdxjftehlgzvptbmf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmJkeGpmdGVobGd6dnB0Ym1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTQ2MDUsImV4cCI6MjA4NTYzMDYwNX0.xIoTLmTqZai-F8hIQ06mTkAH3j7-Vhh7sHocswE-Fhk';

// 初始化 Supabase 客户端（改名为 db 避免冲突）
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Supabase 配置已加载');