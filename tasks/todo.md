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
- [x] P1 나머지 엔티티 CRUD(업체/프로젝트/유지보수/문제/견적/정비기록/문서/집) + 대시보드(홈) + FTS 검색
- [x] P2 settings (통화/단위계). **chat 웹은 범위 제외**: 로컬 LLM 파이프라인·스트리밍 필요, TUI 전용 유지 (추후 별도 페이즈)
- [x] P3 embed 단일 바이너리(web/embed.go + SPA fallback) + deploy/web/Dockerfile + docker-compose.web.yml
- [ ] P3 실배포: 우분투에서 compose up + 데이터 볼륨 이전 (사람 작업)
- [x] 디스코드 알림: 웹훅 설정(설정 화면) + 테스트 발송 + 매일 9시 유지보수/문제 다이제스트 (internal/notify + cmd/web/reminder.go)
- [x] P4 도면/배치도: Room·FloorPlan·PlanMarker 엔티티 + 도면 이미지(Document 재활용) + 마커 오버레이 UI(편집/보기 모드) + HA 프록시(status/states/toggle) + 설정 HA 연동 (설계: plans/floorplan.md)
- [ ] P4 잔여: TUI 탭(rooms/plans) 배선 - 웹 퍼스트라 보류(plans/floorplan.md 근거), FTS에 rooms 추가 여부
- [ ] 도면 편집 고도화(추후): 마커 드래그 이동, 도면 이미지 교체·이름변경·삭제 UI, 방 영역 표시
- [ ] 정기지출 엔티티
- [ ] 문서-가전 연결 UI (API는 entity_kind/entity_id 지원됨)
- [ ] auth(household 로그인) 추가
- [ ] 프론트 vitest 테스트
- [ ] money 입력(원 x100=cents)과 TUI KRW 파싱 일치 검증
