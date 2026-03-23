-- 创建用户表(作为 auth.users 的扩展)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);

-- 创建行程表
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_public BOOLEAN DEFAULT false,
  route_data JSONB,
  total_distance DECIMAL(10,2),
  estimated_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_created_at ON trips(created_at DESC);

-- 创建地点表
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  address TEXT,
  order_index INTEGER,
  visit_time TIME,
  duration_minutes INTEGER,
  notes TEXT,
  custom_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_locations_trip_id ON locations(trip_id);
CREATE INDEX idx_locations_order ON locations(trip_id, order_index);

-- 创建照片表
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_photos_trip_id ON photos(trip_id);
CREATE INDEX idx_photos_location_id ON photos(location_id);

-- 创建交通表（机票/火车等）
CREATE TABLE transportations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- flight, train, bus, etc.
  departure_location VARCHAR(200) NOT NULL,
  arrival_location VARCHAR(200) NOT NULL,
  departure_time TIMESTAMP WITH TIME ZONE,
  arrival_time TIMESTAMP WITH TIME ZONE,
  booking_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_transportations_trip_id ON transportations(trip_id);

-- 创建住宿表（酒店/民宿等）
CREATE TABLE accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  booking_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_accommodations_trip_id ON accommodations(trip_id);

-- 基本访问权限
GRANT SELECT ON users TO anon;
GRANT SELECT ON trips TO anon;
GRANT SELECT ON locations TO anon;
GRANT SELECT ON photos TO anon;
GRANT SELECT ON transportations TO anon;
GRANT SELECT ON accommodations TO anon;

-- 认证用户权限
GRANT ALL PRIVILEGES ON users TO authenticated;
GRANT ALL PRIVILEGES ON trips TO authenticated;
GRANT ALL PRIVILEGES ON locations TO authenticated;
GRANT ALL PRIVILEGES ON photos TO authenticated;
GRANT ALL PRIVILEGES ON transportations TO authenticated;
GRANT ALL PRIVILEGES ON accommodations TO authenticated;

-- RLS策略示例
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own trips" ON trips FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can insert their own trips" ON trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trips" ON trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trips" ON trips FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view public locations" ON locations FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = locations.trip_id AND (trips.user_id = auth.uid() OR trips.is_public = true))
);
CREATE POLICY "Users can manage locations of their trips" ON locations FOR ALL USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = locations.trip_id AND trips.user_id = auth.uid())
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view public photos" ON photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = photos.trip_id AND (trips.user_id = auth.uid() OR trips.is_public = true))
);
CREATE POLICY "Users can manage photos of their trips" ON photos FOR ALL USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = photos.trip_id AND trips.user_id = auth.uid())
);

ALTER TABLE transportations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view public transportations" ON transportations FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = transportations.trip_id AND (trips.user_id = auth.uid() OR trips.is_public = true))
);
CREATE POLICY "Users can manage transportations of their trips" ON transportations FOR ALL USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = transportations.trip_id AND trips.user_id = auth.uid())
);

ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view public accommodations" ON accommodations FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = accommodations.trip_id AND (trips.user_id = auth.uid() OR trips.is_public = true))
);
CREATE POLICY "Users can manage accommodations of their trips" ON accommodations FOR ALL USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = accommodations.trip_id AND trips.user_id = auth.uid())
);
