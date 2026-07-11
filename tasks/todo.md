# micasa 웹 P0 - TODO (Appliance 수직 슬라이스)

상세: `plan.md` / 스펙: `../SPEC.md`

## P0 (백엔드)
- [x] P0-1 API 스켈레톤 + `GET /api/health` (cmd/web)
- [x] P0-2 Appliance read API (list/get)
- [x] P0-3 Appliance write API (create/update/delete)
- [x] P0-4 dev 설정(CORS/JSON 에러 봉투)
- [~] ▶ 체크포인트 A: 백엔드 CRUD curl 검증 완료. **httptest 자동테스트 추가 남음** - 사용자 확인 대기

## P0 (프론트)
- [ ] P0-5 React 셸 (Vite/TS/Tailwind/shadcn/i18n-ko/PWA/모바일)
- [ ] P0-6 Appliance 목록 화면
- [ ] P0-7 Appliance 생성/수정/삭제 UI
- [ ] ▶ 체크포인트 B: 수직슬라이스 완성 + TUI 패리티 확인 - 사용자 확인

## 이후 (상위)
- [ ] P1 나머지 엔티티 + dashboard/status + 검색
- [ ] P2 chat + settings
- [ ] P3 embed + Docker + 우분투 배포
- [ ] P4 도면/배치도 + HA 연동
