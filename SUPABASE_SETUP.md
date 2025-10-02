# Supabase 설정 가이드

이 문서는 GOGOCAE 프로젝트를 위한 Supabase 설정 방법을 안내합니다.

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 접속 및 로그인
2. "New project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: gogocae (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 입력 (저장 필수)
   - **Region**: Northeast Asia (Seoul) 선택
4. "Create new project" 클릭

## 2. 데이터베이스 스키마 생성

1. Supabase 대시보드에서 **SQL Editor** 메뉴 선택
2. "New query" 클릭
3. `supabase/migrations/20250102_initial_schema.sql` 파일의 전체 내용을 복사하여 붙여넣기
4. "Run" 버튼 클릭하여 실행

## 3. Storage 버킷 생성

### design-files 버킷 생성

1. 왼쪽 메뉴에서 **Storage** 선택
2. "Create a new bucket" 클릭
3. 버킷 설정:
   - **Name**: `design-files`
   - **Public bucket**: ✅ 체크 (공개 버킷)
4. "Create bucket" 클릭

### Storage 정책 설정

1. 생성한 `design-files` 버킷 선택
2. "Policies" 탭 선택
3. "New policy" 클릭하여 다음 정책들을 추가:

#### 정책 1: 인증된 사용자 업로드 허용
```sql
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'design-files');
```

#### 정책 2: 모든 사용자 읽기 허용
```sql
CREATE POLICY "Anyone can view files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'design-files');
```

#### 정책 3: 소유자만 삭제 가능
```sql
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'design-files' AND auth.uid()::text = owner);
```

## 4. 환경 변수 설정

1. Supabase 대시보드에서 **Settings** > **API** 선택
2. 다음 정보를 복사:
   - **Project URL**
   - **anon public key**
   - **service_role key** (⚠️ 절대 클라이언트에 노출하지 마세요)

3. 프로젝트 루트에 `.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 5. 이메일 템플릿 설정 (선택사항)

1. **Authentication** > **Email Templates** 선택
2. 각 템플릿을 한국어로 수정:
   - **Confirm signup**: 회원가입 확인
   - **Magic Link**: 로그인 링크
   - **Change Email Address**: 이메일 변경
   - **Reset Password**: 비밀번호 재설정

## 6. 테스트 데이터 추가

### 차종 데이터 추가

SQL Editor에서 다음 쿼리 실행:

```sql
INSERT INTO vehicle_models (name) VALUES
  ('GV80'),
  ('GV70'),
  ('G90'),
  ('G80'),
  ('G70'),
  ('Kona'),
  ('Tucson'),
  ('Santa Fe')
ON CONFLICT (name) DO NOTHING;
```

### 테스트 사용자 추가

1. **Authentication** > **Users** 메뉴 선택
2. "Add user" > "Create new user" 클릭
3. Manager 계정 생성:
   - Email: manager@test.com
   - Password: Test1234!
   - User Metadata에 다음 추가:
   ```json
   {
     "name": "관리자",
     "department": "CAE팀",
     "role": "manager"
   }
   ```

4. Client 계정 생성:
   - Email: client@test.com
   - Password: Test1234!
   - User Metadata에 다음 추가:
   ```json
   {
     "name": "설계자",
     "department": "설계팀",
     "role": "client"
   }
   ```

## 7. Realtime 활성화 (채팅 기능)

1. **Database** > **Replication** 선택
2. 다음 테이블의 Realtime 활성화:
   - `messages` ✅
   - `analysis_requests` ✅
   - `notifications` ✅

## 8. 프로젝트 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 9. 로그인 테스트

- Manager: manager@test.com / Test1234!
- Client: client@test.com / Test1234!

## 문제 해결

### RLS 정책 오류
- SQL Editor에서 정책이 제대로 생성되었는지 확인
- `SELECT * FROM pg_policies;`로 확인 가능

### Storage 업로드 실패
- Storage 버킷이 public으로 설정되었는지 확인
- Storage 정책이 올바르게 생성되었는지 확인

### Realtime 작동 안 함
- Database > Replication에서 테이블이 활성화되었는지 확인
- 브라우저 콘솔에서 WebSocket 연결 오류 확인

## 추가 설정

### 이메일 알림 설정 (선택)

이메일 알림 기능을 구현하려면:

1. [Resend](https://resend.com) 계정 생성
2. API Key 발급
3. `.env.local`에 추가:
```env
RESEND_API_KEY=your_resend_api_key
```

4. Supabase Edge Function 생성 및 배포 필요 (별도 구현)

---

## 체크리스트

설정이 완료되면 다음 항목들을 확인하세요:

- [ ] Supabase 프로젝트 생성
- [ ] 데이터베이스 스키마 실행
- [ ] Storage 버킷 생성 및 정책 설정
- [ ] 환경 변수 설정 (.env.local)
- [ ] 차종 테스트 데이터 추가
- [ ] 테스트 계정 생성 (Manager, Client)
- [ ] Realtime 활성화
- [ ] 로컬 개발 서버 실행 및 테스트

모든 설정이 완료되면 GOGOCAE를 사용할 준비가 완료됩니다! 🎉
