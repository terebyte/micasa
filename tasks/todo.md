# micasa 웹 P0 - TODO (Appliance 수직 슬라이스)

상세: `plan.md` / 스펙: `../SPEC.md`

## P0 (백엔드)
- [x] P0-1 API 스켈레톤 + `GET /api/health` (cmd/web)
- [x] P0-2 Appliance read API (list/get)
- [x] P0-3 Appliance write API (create/update/delete)
- [x] P0-4 dev 설정(CORS/JSON 에러 봉투)
- [x] ▶ 체크포인트 A: 백엔드 CRUD (httptest green + curl 검증)

## P0 (프론트)
- [x] P0-5 React 셸 (Vite/TS/Tailwind/i18n-ko/PWA/모바일, 토큰: cal.com 라이트 + Notion 틴트 + Linear 다크)
- [x] P0-6 Appliance 목록 화면
- [x] P0-7 Appliance 생성/수정/삭제 UI
- [x] ▶ 체크포인트 B: 웹 API로 생성한 데이터를 `micasa show appliances` 로 조회 (공유코어 패리티 실증)
- [ ] 프론트 vitest 테스트 (다음 단계)
- [ ] 사용자 육안 확인 (브라우저/모바일 뷰포트)

## 이후 (상위)
- [ ] P1 나머지 엔티티 + dashboard/status + 검색
- [ ] P2 chat + settings
- [ ] P3 embed + Docker + 우분투 배포
- [ ] P4 도면/배치도 + HA 연동
