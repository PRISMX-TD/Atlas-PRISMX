-- 找到在 auth.users 中存在，但在 public.users 中不存在的“幽灵账号”并删除
-- 这将清除之前因为没有触发器而注册的不完整账号，让你能用原邮箱重新注册。

DO $$ 
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT au.id, au.email 
        FROM auth.users au 
        LEFT JOIN public.users pu ON au.id = pu.id 
        WHERE pu.id IS NULL
    LOOP
        -- 由于有外键约束，这里需要先删除依赖该用户的数据（如果有的话）
        DELETE FROM public.trips WHERE user_id = user_record.id;
        
        -- 最后删除 auth.users 中的记录
        DELETE FROM auth.users WHERE id = user_record.id;
        
        RAISE NOTICE 'Deleted ghost user: %', user_record.email;
    END LOOP;
END $$;
