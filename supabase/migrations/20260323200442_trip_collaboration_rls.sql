-- 创建团队成员表
CREATE TABLE IF NOT EXISTS public.trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- 创建行程邀请表
CREATE TABLE IF NOT EXISTS public.trip_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  inviter_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email VARCHAR(255),
  token VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) CHECK (role IN ('editor', 'viewer')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE,
  accepted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 开启 RLS
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;

-- 允许用户查看自己参与的行程成员
DROP POLICY IF EXISTS "Users can view members of trips they have access to" ON public.trip_members;
CREATE POLICY "Users can view members of trips they have access to" 
ON public.trip_members FOR SELECT 
USING (
  trip_id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()) OR
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid())
);

-- 允许行程的所有者或编辑者管理成员（除了所有者自己不能被删除，这是应用层逻辑，这里简单处理）
DROP POLICY IF EXISTS "Editors and owners can manage members" ON public.trip_members;
CREATE POLICY "Editors and owners can manage members" 
ON public.trip_members FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members tm 
    WHERE tm.trip_id = public.trip_members.trip_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'editor')
  ) OR 
  EXISTS (
    SELECT 1 FROM public.trips t WHERE t.id = public.trip_members.trip_id AND t.user_id = auth.uid()
  )
);

-- 邀请表的 RLS
DROP POLICY IF EXISTS "Users can view invites for their trips" ON public.trip_invites;
CREATE POLICY "Users can view invites for their trips" 
ON public.trip_invites FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members tm 
    WHERE tm.trip_id = public.trip_invites.trip_id 
    AND tm.user_id = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM public.trips t WHERE t.id = public.trip_invites.trip_id AND t.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Editors and owners can manage invites" ON public.trip_invites;
CREATE POLICY "Editors and owners can manage invites" 
ON public.trip_invites FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members tm 
    WHERE tm.trip_id = public.trip_invites.trip_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'editor')
  ) OR 
  EXISTS (
    SELECT 1 FROM public.trips t WHERE t.id = public.trip_invites.trip_id AND t.user_id = auth.uid()
  )
);

-- 任何人都可以通过 token 查询邀请记录
DROP POLICY IF EXISTS "Anyone can read invites by token" ON public.trip_invites;
CREATE POLICY "Anyone can read invites by token" 
ON public.trip_invites FOR SELECT 
USING (true);

-- 更新 trips 的 RLS 以允许 collaborator 访问
DROP POLICY IF EXISTS "Users can view trips they collaborate on" ON public.trips;
CREATE POLICY "Users can view trips they collaborate on" 
ON public.trips FOR SELECT 
USING (
  auth.uid() = user_id OR 
  is_public = true OR 
  id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Collaborators can update trips" ON public.trips;
CREATE POLICY "Collaborators can update trips" 
ON public.trips FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
);

-- 更新 locations 的 RLS
DROP POLICY IF EXISTS "Users can view locations of trips they collaborate on" ON public.locations;
CREATE POLICY "Users can view locations of trips they collaborate on" 
ON public.locations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.trips t 
    LEFT JOIN public.trip_members tm ON t.id = tm.trip_id
    WHERE t.id = public.locations.trip_id 
    AND (t.user_id = auth.uid() OR t.is_public = true OR tm.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Collaborators can manage locations" ON public.locations;
CREATE POLICY "Collaborators can manage locations" 
ON public.locations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.trips t 
    LEFT JOIN public.trip_members tm ON t.id = tm.trip_id
    WHERE t.id = public.locations.trip_id 
    AND (t.user_id = auth.uid() OR (tm.user_id = auth.uid() AND tm.role IN ('owner', 'editor')))
  )
);

-- 更新 transportations 的 RLS
DROP POLICY IF EXISTS "Users can view transportations of trips they collaborate on" ON public.transportations;
CREATE POLICY "Users can view transportations of trips they collaborate on" 
ON public.transportations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.trips t 
    LEFT JOIN public.trip_members tm ON t.id = tm.trip_id
    WHERE t.id = public.transportations.trip_id 
    AND (t.user_id = auth.uid() OR t.is_public = true OR tm.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Collaborators can manage transportations" ON public.transportations;
CREATE POLICY "Collaborators can manage transportations" 
ON public.transportations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.trips t 
    LEFT JOIN public.trip_members tm ON t.id = tm.trip_id
    WHERE t.id = public.transportations.trip_id 
    AND (t.user_id = auth.uid() OR (tm.user_id = auth.uid() AND tm.role IN ('owner', 'editor')))
  )
);

-- 更新 accommodations 的 RLS
DROP POLICY IF EXISTS "Users can view accommodations of trips they collaborate on" ON public.accommodations;
CREATE POLICY "Users can view accommodations of trips they collaborate on" 
ON public.accommodations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.trips t 
    LEFT JOIN public.trip_members tm ON t.id = tm.trip_id
    WHERE t.id = public.accommodations.trip_id 
    AND (t.user_id = auth.uid() OR t.is_public = true OR tm.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Collaborators can manage accommodations" ON public.accommodations;
CREATE POLICY "Collaborators can manage accommodations" 
ON public.accommodations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.trips t 
    LEFT JOIN public.trip_members tm ON t.id = tm.trip_id
    WHERE t.id = public.accommodations.trip_id 
    AND (t.user_id = auth.uid() OR (tm.user_id = auth.uid() AND tm.role IN ('owner', 'editor')))
  )
);

-- 授权
GRANT ALL ON public.trip_members TO authenticated;
GRANT ALL ON public.trip_invites TO authenticated;
GRANT SELECT ON public.trip_members TO anon;
GRANT SELECT ON public.trip_invites TO anon;