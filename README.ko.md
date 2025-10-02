# GOGOCAE (Go Go CAE)

설계자와 CAE 해석자를 연결하는 효율적인 해석 요청 관리 플랫폼

## 📋 프로젝트 개요

GOGOCAE는 자동차 회사의 설계자와 CAE 해석 담당자 간의 협업을 효율화하는 SaaS 플랫폼입니다. 해석 요청부터 완료까지의 전체 프로세스를 체계적으로 관리할 수 있습니다.

### 주요 기능

- ✅ **해석 요청 관리**: 설계 파일 업로드부터 완료 보고서까지 체계적 관리
- ✅ **역할 기반 접근 제어**: Manager(해석자)와 Client(설계자) 권한 분리
- ✅ **실시간 알림**: 요청 상태 변경 시 즉시 알림
- ✅ **칸반 보드**: 드래그 앤 드롭으로 직관적인 상태 관리
- ✅ **캘린더 뷰**: 월간 일정 시각화
- ✅ **채팅 시스템**: 요청별 실시간 채팅
- ✅ **차종 기반 관리**: 차종별 요청 그룹핑

## 🚀 기술 스택

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** - UI 컴포넌트
- **React Big Calendar** - 캘린더 뷰
- **@hello-pangea/dnd** - 드래그 앤 드롭

### Backend & Database
- **Supabase**
  - PostgreSQL Database
  - Authentication
  - Storage (파일 업로드)
  - Realtime (채팅, 알림)
  - Row Level Security (RLS)

### 상태 관리 & Form
- **React Query** - 서버 상태 관리
- **Zustand** - 전역 상태 관리
- **React Hook Form** + **Zod** - 폼 검증

## 📦 설치 방법

### 1. 저장소 클론

```bash
git clone <repository-url>
cd gogocae1
```

### 2. 의존성 설치

```bash
npm install
```

### 3. Supabase 설정

[SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 문서를 참고하여 Supabase 프로젝트를 설정하세요.

### 4. 환경 변수 설정

`.env.local` 파일을 생성하고 Supabase 정보를 입력하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 을 열어 확인하세요.

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── (landing)/
│   │   └── page.tsx              # 랜딩 페이지
│   ├── login/                    # 로그인 페이지
│   ├── signup/                   # 회원가입 페이지
│   └── dashboard/
│       ├── layout.tsx            # 대시보드 레이아웃 (네비게이션)
│       ├── page.tsx              # 메인 대시보드
│       ├── requests/
│       │   ├── page.tsx          # 요청 목록
│       │   ├── new/
│       │   │   └── page.tsx      # 새 요청 등록
│       │   └── [id]/
│       │       ├── page.tsx      # 요청 상세
│       │       ├── chat/
│       │       │   └── page.tsx  # 채팅
│       │       └── report/
│       │           └── page.tsx  # 보고서 업로드
│       ├── kanban/
│       │   └── page.tsx          # 칸반 보드
│       ├── calendar/
│       │   └── page.tsx          # 캘린더 뷰
│       ├── vehicles/
│       │   └── page.tsx          # 차종 관리
│       ├── notifications/
│       │   └── page.tsx          # 알림
│       └── profile/
│           └── page.tsx          # 프로필
├── components/
│   ├── ui/                       # shadcn/ui 컴포넌트
│   └── StatusBadge.tsx           # 상태 뱃지 컴포넌트
├── hooks/
│   ├── useAuth.ts                # 인증 훅
│   └── use-toast.ts              # Toast 알림 훅
└── lib/
    └── supabase/
        ├── client.ts             # 클라이언트 Supabase 설정
        ├── server.ts             # 서버 Supabase 설정
        ├── middleware.ts         # 미들웨어
        └── types.ts              # 데이터베이스 타입 정의
```

## 👥 사용자 역할

### Manager (해석자)
- 모든 해석 요청 조회
- 담당자 지정
- 업무 상태 변경
- 완료 보고서 등록
- 칸반 보드 및 캘린더 뷰 사용
- 차종 관리

### Client (설계자)
- 해석 요청 등록
- 본인 요청 건 조회
- 진행 상황 확인
- 완료 보고서 다운로드
- 담당자와 채팅

## 🔄 워크플로우

### 설계자 (Client)
1. 회원가입/로그인
2. 새 해석 요청 등록
3. 차종, 해석명, 설계 파일 업로드
4. 진행 상황 조회
5. 완료 시 보고서 다운로드

### 해석자 (Manager)
1. 로그인
2. 새 요청 알림 확인
3. 담당자 지정
4. 칸반 보드에서 상태 변경
5. 채팅으로 요청자와 소통
6. 작업 완료 후 보고서 업로드

## 🎨 주요 화면

### 대시보드
- 통계 카드 (전체/대기/진행/완료 요청 수)
- 최근 요청 목록
- 빠른 작업 버튼

### 칸반 보드
- 4개 컬럼: 담당자 지정 필요 | 작업 전 | 진행 중 | 완료
- 드래그 앤 드롭으로 상태 변경
- 실시간 업데이트

### 캘린더
- 월간 캘린더 뷰
- 요청일 기준 표시
- 상태별 색상 구분

## 🔐 보안

- Row Level Security (RLS)로 데이터 접근 제어
- 역할 기반 권한 관리
- Supabase Auth를 통한 안전한 인증
- 파일 업로드 검증

## 📝 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 린트 실행
npm run lint
```

## 🐛 문제 해결

일반적인 문제와 해결 방법은 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)의 "문제 해결" 섹션을 참고하세요.

## 📄 라이선스

MIT

## 👨‍💻 개발자

GOGOCAE는 EasyNext 템플릿을 기반으로 개발되었습니다.

---

**문의사항이나 버그 리포트는 Issues 탭에 등록해주세요.**
