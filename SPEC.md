# micasa 웹 레이어 - SPEC

fork: `terebyte/micasa` (upstream `micasa-dev/micasa`, 모듈경로 유지). 코드는 이 repo, 도메인 결정기록(ADR)은 haengrangabum `.claude/docs/micasa/`.

## 1. 목표 (Objective)
micasa TUI가 하는 **모든 기능을 100% 패리티**로 제공하는 **한국어 웹 UI**. 모바일/아이패드 우선. 궁극적으로 "아이패드 하나로 집의 모든 것을 관리·컨트롤"하는 통합 콘솔.

**패리티 전략(핵심):** 웹은 TUI와 **같은 코어 `internal/data.Store` + 같은 SQLite**를 공유한다. 비즈니스 로직을 웹에 복제하지 않는다. 새 기능은 `internal/data`에 넣어 TUI/웹이 동시에 얻는다.

**사용자:**
- damien (관리자, 전체 기능, 데스크톱/모바일)
- 배우자 (모바일 전용, 비개발자, 한국어, 큐레이션된 단순 뷰) - 자세히 haengrangabum `household-profile`

## 2. 아키텍처
```
            같은 SQLite 파일 (단일 진실)
            /                         \
  TUI (internal/app)        웹 API (신규 cmd/web -> internal/data.Store)
                                        |  REST/JSON
                                React SPA (Vite/TS, PWA, 한국어)
   배포: Go embed 로 React 빌드 내장 -> 단일 바이너리 -> Docker -> 우분투
```
- API: **REST/JSON** (표준·단순). 라우팅은 Go 1.22+ 표준 `net/http` 또는 `chi`.
- 동시성: TUI/웹이 같은 SQLite 접근 -> WAL 모드.
- 프론트: **React 19 + TypeScript + Vite + Tailwind + shadcn/ui**. i18next(한국어 우선, 영어 옵션). PWA(아이패드 홈화면 설치). TanStack Query.
- 디자인: **Linear 베이스 + shadcn**, Apple 고급스러움·Notion 포근함 살짝. 모바일 우선. (design.md: Linear 기준 토큰)

## 3. 범위 (엔티티/기능)
CRUD 대상(전부 `internal/data` 에 store 존재): HouseProfile, Appliance, Vendor, Project, ProjectType, Quote, MaintenanceCategory, MaintenanceItem, Incident, ServiceLogEntry, Document.
추가: dashboard/status, FTS 검색, LLM chat("집 데이터에 질문"), settings.
**향후(별도 페이즈):** 도면/배치도 모듈(새 엔티티+파일저장), Home Assistant 연동(도면=컨트롤 표면).

## 4. 명령 (Commands)
- Go API 개발: `go run ./cmd/web` (기본 :8080, 같은 SQLite 경로)
- Go 테스트: `go test ./...`
- 프론트 개발: `web/` 에서 `pnpm dev` (Vite, API 프록시)
- 프론트 빌드: `pnpm build` -> `web/dist` -> Go embed
- 통합 빌드: `go build ./cmd/web` (embed 포함 단일 바이너리)
- 배포: Docker compose (우분투), 데이터/도면은 마운트 볼륨

## 5. 프로젝트 구조 (신규분)
```
cmd/web/            Go HTTP 엔트리 + 라우팅
internal/webapi/    핸들러(엔티티별) -> internal/data.Store 호출, DTO/직렬화
web/                React 앱 (Vite/TS/Tailwind/shadcn)
  src/
    api/            타입드 API 클라이언트 (TanStack Query)
    features/       엔티티별 화면 (appliances, maintenance, ...)
    components/ui/  shadcn 컴포넌트
    i18n/           ko(기본)/en 리소스
    app/            라우팅·레이아웃(모바일 우선)
  dist/             빌드 산출물 (Go embed 대상)
```
기존 `internal/data`, `internal/app`(TUI)는 그대로. **TUI를 깨지 않는다.**

## 6. 코드 스타일
- Go: 기존 micasa 관례 준수 (Apache 라이선스 헤더, 테이블 주도 테스트, 작은 패키지). 데이터 로직은 `internal/data` 에만.
- TS/React: TypeScript strict, 함수형 컴포넌트, biome 또는 eslint+prettier, Tailwind. 접근성(a11y)·모바일 터치 타깃 준수.
- i18n: 하드코딩 문자열 금지, 전부 i18next 키. 한국어 우선.

## 7. 테스트 전략
- Go API: `net/http/httptest` 로 핸들러 단위/통합 테스트. 기존 micasa 테스트 문화(높은 커버리지) 유지.
- React: vitest + Testing Library (컴포넌트·훅). 핵심 플로우 위주.
- 계약: API 응답 타입을 프론트 타입과 일치(가능하면 생성).

## 8. 경계 (Boundaries)
**항상(Always):**
- 데이터/비즈니스 로직은 `internal/data.Store` 재사용. 웹에 복제 금지.
- TUI·기존 테스트를 깨지 않는다 (패리티 = 같은 코어).
- 한국어 우선 i18n, 모바일 우선.
- 라이브 데이터(SQLite/도면)는 Dropbox/git 밖, 마운트 볼륨.

**먼저 물어볼 것(Ask first):**
- 인증 모델 (아래 열린 결정)
- LAN 밖 노출(원격 접속) 방식
- DB 스키마/마이그레이션 변경
- upstream 과 크게 갈라지는 변경 (기여 가능성 고려)

**절대 금지(Never):**
- 비밀(토큰 등) 커밋
- 기존 TUI/테스트 파괴
- 데이터 로직 이중화

## 9. 페이즈 (구현 순서)
- **P0**: `cmd/web` API 스캐폴딩 + **Appliance 엔티티 end-to-end**(목록/조회/생성/수정/삭제) + React 셸(Linear/shadcn, i18n, 모바일 레이아웃)로 붙여 수직 슬라이스 완성.
- **P1**: 나머지 엔티티 CRUD + dashboard/status + FTS 검색.
- **P2**: LLM chat, settings.
- **P3**: Go embed + Docker compose + 우분투 배포.
- **P4(향후)**: 도면/배치도 모듈, HA 연동(컨트롤 표면).

## 10. 결정 (확정)
1. **인증**: **MVP 무인증(LAN 전용)**. 이후 페이즈에서 household 로그인(세션) auth 추가. (설계는 나중에 auth 미들웨어를 끼우기 쉽게 핸들러 앞단을 열어둔다.)
2. **v1 범위**: **수직 슬라이스 먼저** - Appliance 1개를 API+React 끝까지 완성 후 확장.
3. 확정: 모듈경로 유지(micasa-dev), REST/JSON, SQLite 공유, Linear+shadcn, 한국어우선 PWA, 단일 바이너리(embed).
