# micasa 웹 레이어 - P0 플랜 (Appliance 수직 슬라이스)

상세 스펙: `../SPEC.md`. 원칙: **수직 슬라이스**(한 태스크 = 브라우저->API->SQLite 한 경로), 각 태스크 검증 후 다음.

## 근거 (코어 인터페이스 - 확인됨)
- `data.Open(path string) (*Store, error)` 로 SQLite 오픈 (TUI와 같은 파일).
- Appliance CRUD: `ListAppliances(includeDeleted)`, `GetAppliance(id)`, `CreateAppliance(*Appliance)`, `UpdateAppliance(Appliance)`, `DeleteAppliance(id)`, `RestoreAppliance(id)`.
- `Appliance` 모델은 이미 `json:` 태그 보유 -> REST 직렬화 즉시 가능.
- 로직 복제 금지: 핸들러는 위 메서드만 호출.

## 의존 그래프
```
P0-1 API 스켈레톤 ─┬─ P0-2 read ─ P0-3 write ─ P0-4 dev/CORS  ─(체크포인트 A: 백엔드 CRUD)
                   └───────────────────────────────────────────────┐
P0-5 React 셸 ── P0-6 목록 화면 ── P0-7 생성/수정/삭제 UI ──(체크포인트 B: 수직슬라이스 완성 + TUI 패리티 확인)
```

## P0 태스크

### P0-1. API 스켈레톤 + health
- `cmd/web/main.go`: DB 경로(flag/env) -> `data.Open` -> `net/http` 서버(:8080). `GET /api/health` -> `{"status":"ok"}`.
- **수용 기준**: `go run ./cmd/web --db <path>` 기동, `curl localhost:8080/api/health` -> 200.
- **검증**: `go build ./cmd/web`; 실행; curl.

### P0-2. Appliance read API
- `internal/webapi/appliance.go`: `GET /api/appliances`(ListAppliances false), `GET /api/appliances/{id}`(GetAppliance). JSON. not-found -> 404, 에러 -> JSON 에러 봉투.
- **수용 기준**: 데모 DB로 curl 시 appliance JSON 반환.
- **검증**: `httptest` 단위 테스트 + 데모 DB curl.

### P0-3. Appliance write API
- `POST /api/appliances`(Create), `PUT /api/appliances/{id}`(Update), `DELETE /api/appliances/{id}`(Delete). 검증 실패 -> 400/422.
- **수용 기준**: curl POST 생성 -> GET 확인, PUT 수정 반영, DELETE 후 목록 제외.
- **검증**: 각 메서드 httptest 테스트.

### P0-4. dev 설정 (CORS/JSON 규약)
- 공통 JSON 에러 봉투, content-type, Vite dev(`localhost:5173`) CORS 허용. (MVP 무인증, 단 핸들러 앞단은 나중 auth 미들웨어 끼우기 쉽게)
- **수용 기준**: 프론트 dev 서버에서 API 호출 성공.

> **체크포인트 A**: 백엔드 Appliance CRUD 동작 (curl + `go test ./...` green). 사용자 확인.

### P0-5. React 셸
- `web/`: Vite+React19+TS, Tailwind, shadcn init, i18next(ko 기본/en), TanStack Query, vite-plugin-pwa, 모바일 우선 레이아웃(Linear 토큰 베이스, Apple/Notion 살짝).
- **수용 기준**: `pnpm dev` 기동, 한국어 앱 셸 표시, 모바일 반응형. `pnpm build` 성공.
- **검증**: 빌드 + 육안(모바일 뷰포트).

### P0-6. Appliance 목록 화면 (read)
- 타입드 API 클라이언트 + TanStack Query 훅. 가전 목록 화면(카드/테이블, 모바일 우선, 한국어 라벨 i18n).
- **수용 기준**: API(데모 데이터)의 가전 목록 표시.
- **검증**: API+프론트 동시 실행, 데이터 확인.

### P0-7. Appliance 생성/수정/삭제 UI
- shadcn 폼(생성/수정), 삭제 확인 다이얼로그. TanStack Query mutation + refetch.
- **수용 기준**: 브라우저에서 전체 CRUD가 API+DB까지 반영.
- **검증**: 브라우저에서 생성/수정/삭제 -> 영속 확인.

> **체크포인트 B (핵심)**: 수직 슬라이스 완성. 그리고 **웹에서 만든 가전이 TUI(`./micasa <db>`)에도 보이는지 확인** = 공유코어 패리티 증명. 사용자 확인.

## 이후 (상위 수준)
- **P1**: 나머지 엔티티(Vendor/Project/Quote/Maintenance/Incident/ServiceLog/Document/House) CRUD 패턴 반복 + dashboard/status + FTS 검색.
- **P2**: LLM chat, settings.
- **P3**: Go `embed`(web/dist) -> 단일 바이너리 + Docker compose + 우분투 배포.
- **P4(향후)**: 도면/배치도 모듈(새 엔티티+파일저장), Home Assistant 연동(도면=컨트롤 표면).

## 경계/체크포인트 규칙
- 각 태스크 후 검증 통과해야 다음. 체크포인트 A/B에서 사용자 확인.
- TUI·기존 테스트 깨지 않기(`go test ./...`). 데이터 로직은 `internal/data`에만.
- 커밋은 태스크 단위, git은 APPROVE 게이트(브랜치 컨벤션). 비밀·라이브데이터 커밋 금지.
