-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 차종 테이블
CREATE TABLE vehicle_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 해석 요청 테이블
CREATE TABLE analysis_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES users(id) NOT NULL,
  assigned_to UUID REFERENCES users(id),
  vehicle_model_id UUID REFERENCES vehicle_models(id) NOT NULL,
  parent_request_id UUID REFERENCES analysis_requests(id),

  analysis_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending_assignment'
    CHECK (status IN ('pending_assignment', 'before_start', 'in_progress', 'completed')),

  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_date TIMESTAMPTZ,
  started_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,

  design_files JSONB,
  report_file_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 채팅 메시지 테이블
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES analysis_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 알림 테이블
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  request_id UUID REFERENCES analysis_requests(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 상태 변경 이력 테이블
CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES analysis_requests(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id) NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_analysis_requests_requester ON analysis_requests(requester_id);
CREATE INDEX idx_analysis_requests_assigned_to ON analysis_requests(assigned_to);
CREATE INDEX idx_analysis_requests_status ON analysis_requests(status);
CREATE INDEX idx_analysis_requests_vehicle_model ON analysis_requests(vehicle_model_id);
CREATE INDEX idx_messages_request ON messages(request_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_analysis_requests_updated_at BEFORE UPDATE
    ON analysis_requests FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Users 정책
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Vehicle Models 정책
CREATE POLICY "Everyone can view vehicle models"
  ON vehicle_models FOR SELECT
  USING (true);

CREATE POLICY "Managers can insert vehicle models"
  ON vehicle_models FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
  );

CREATE POLICY "Managers can update vehicle models"
  ON vehicle_models FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
  );

-- Analysis Requests 정책
CREATE POLICY "Managers can view all requests"
  ON analysis_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
  );

CREATE POLICY "Clients can view own requests"
  ON analysis_requests FOR SELECT
  USING (requester_id = auth.uid());

CREATE POLICY "Clients can insert requests"
  ON analysis_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Managers can update all requests"
  ON analysis_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
  );

-- Messages 정책
CREATE POLICY "Managers can view all messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
  );

CREATE POLICY "Clients can view messages in their requests"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analysis_requests
      WHERE analysis_requests.id = messages.request_id
        AND analysis_requests.requester_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages"
  ON messages FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Notifications 정책
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Status History 정책
CREATE POLICY "Everyone can view status history"
  ON status_history FOR SELECT
  USING (true);

CREATE POLICY "Managers can insert status history"
  ON status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
  );

-- Auth 트리거: 새 사용자 생성 시 users 테이블에 자동 추가
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, department, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
